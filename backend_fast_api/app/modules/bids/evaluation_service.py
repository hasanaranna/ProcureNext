# ============================================================
# bids/evaluation_service.py - Smart Bid Evaluation Business Logic
# ============================================================
# Only this module talks to the DB for the evaluation feature. The ml
# service is stateless: it receives a fully self-contained payload built
# here and returns scores — it never queries anything itself.

import json
import logging
import os
from datetime import datetime, timedelta, timezone

import asyncpg

from app.modules.bids.service import compute_compliance_for_bid
from app.modules.notifications.service import create_notification

logger = logging.getLogger(__name__)

RUN_TIMEOUT_MINUTES = 10
PROMPT_VERSION = "bid_rubric_v1"
DEFAULT_WEIGHT_CONFIG = {"financial": 0.20, "docs": 0.20, "embeddings": 0.05, "llm_rubric": 0.55}


def _parse_jsonb(value):
    """asyncpg returns JSONB columns as raw strings; parse them back to Python objects."""
    if value is None:
        return None
    if isinstance(value, str):
        return json.loads(value)
    return value


def _parse_run_row(row) -> dict:
    run = dict(row)
    run["weight_config"] = _parse_jsonb(run.get("weight_config")) or {}
    return run


async def _verify_tender_ownership(connection: asyncpg.Connection, tender_id: int, buyer_org_id: int) -> dict:
    tender_row = await connection.fetchrow(
        "SELECT tender_id, title, description, eligibility_of_tenderer, budget_min, budget_max, buyer_id "
        "FROM tenders WHERE tender_id = $1",
        tender_id,
    )
    if not tender_row:
        raise KeyError("Tender not found")
    if tender_row["buyer_id"] != buyer_org_id:
        raise PermissionError("You do not have permission to evaluate bids for this tender.")
    return dict(tender_row)


async def get_active_or_recover_run(connection: asyncpg.Connection, tender_id: int) -> dict | None:
    """
    Returns the tender's currently active (pending/running) run, if any.
    A run stuck in 'running'/'pending' past RUN_TIMEOUT_MINUTES is marked
    'failed' here so it always has a way back out, whether this is called
    from the trigger endpoint or a status poll.
    """
    active = await connection.fetchrow(
        """
        SELECT * FROM bid_evaluation_runs
        WHERE tender_id = $1 AND status IN ('pending', 'running')
        ORDER BY triggered_at DESC LIMIT 1
        """,
        tender_id,
    )
    if not active:
        return None

    triggered_at = active["triggered_at"]
    if triggered_at.tzinfo is None:
        triggered_at = triggered_at.replace(tzinfo=timezone.utc)
    is_stuck = datetime.now(timezone.utc) - triggered_at > timedelta(minutes=RUN_TIMEOUT_MINUTES)

    if is_stuck:
        await connection.execute(
            """
            UPDATE bid_evaluation_runs
            SET status = 'failed', error_message = 'Timed out', completed_at = NOW()
            WHERE id = $1
            """,
            active["id"],
        )
        return None

    return _parse_run_row(active)


async def create_evaluation_run(connection: asyncpg.Connection, tender_id: int, triggered_by_org_user_id: int) -> dict:
    row = await connection.fetchrow(
        """
        INSERT INTO bid_evaluation_runs
            (tender_id, triggered_by_user_id, status, model_name, prompt_version, weight_config)
        VALUES ($1, $2, 'pending', $3, $4, $5::jsonb)
        RETURNING *
        """,
        tender_id,
        triggered_by_org_user_id,
        os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        PROMPT_VERSION,
        json.dumps(DEFAULT_WEIGHT_CONFIG),
    )
    return _parse_run_row(row)


async def trigger_evaluation_run(connection: asyncpg.Connection, tender_id: int, buyer_org_id: int, triggered_by_org_user_id: int) -> dict:
    """
    Returns the tender's active run if one is already pending/running
    (never double-dispatches for it), otherwise creates a new run and
    dispatches the scoring job for exactly that new run.
    """
    await _verify_tender_ownership(connection, tender_id, buyer_org_id)

    active_run = await get_active_or_recover_run(connection, tender_id)
    if active_run:
        return active_run

    run = await create_evaluation_run(connection, tender_id, triggered_by_org_user_id)

    from app.tasks.bid_evaluation_tasks import run_bid_evaluation_task
    run_bid_evaluation_task.delay(run["id"], tender_id)

    return run


async def build_evaluation_payload(connection: asyncpg.Connection, tender_id: int) -> dict:
    """
    Gathers everything the ml service needs to score every bid on this
    tender in a single call: tender text/budget, and per-bid financial
    amount + description + precomputed document compliance.
    """
    tender_row = await connection.fetchrow(
        "SELECT tender_id, title, description, eligibility_of_tenderer, budget_min, budget_max "
        "FROM tenders WHERE tender_id = $1",
        tender_id,
    )
    if not tender_row:
        raise KeyError("Tender not found")

    required_docs_rows = await connection.fetch(
        """
        SELECT req_doc_id, custom_doc_name, is_mandatory
        FROM tender_required_documents
        WHERE tender_id = $1
        ORDER BY req_doc_id
        """,
        tender_id,
    )
    required_documents = [dict(r) for r in required_docs_rows]

    bids_rows = await connection.fetch(
        "SELECT bid_id, financial_amount, description FROM bids WHERE tender_id = $1",
        tender_id,
    )

    bid_ids = [b["bid_id"] for b in bids_rows]
    docs_by_bid: dict[int, list[dict]] = {}
    if bid_ids:
        docs_rows = await connection.fetch(
            "SELECT bid_id, bid_doc_id, req_doc_id, file_path FROM bid_documents WHERE bid_id = ANY($1)",
            bid_ids,
        )
        for doc in docs_rows:
            docs_by_bid.setdefault(doc["bid_id"], []).append(dict(doc))

    bids_payload = []
    for b in bids_rows:
        compliance = compute_compliance_for_bid(required_documents, docs_by_bid.get(b["bid_id"], []))
        missing_documents = [
            item["custom_doc_name"] for item in compliance["compliance_matrix"]
            if item["is_mandatory"] and not item["is_submitted"]
        ]
        bids_payload.append({
            "bid_id": b["bid_id"],
            "financial_amount": float(b["financial_amount"]) if b["financial_amount"] is not None else None,
            "description": b["description"] or "",
            "compliance": {
                "document_score_pct": compliance["compliance_score_pct"],
                "missing_documents": missing_documents,
                "mandatory_docs_satisfied": compliance["mandatory_satisfied"],
            },
        })

    return {
        "tender_id": tender_id,
        "title": tender_row["title"] or "",
        "description": tender_row["description"] or "",
        "eligibility_of_tenderer": tender_row["eligibility_of_tenderer"] or "",
        "budget_min": float(tender_row["budget_min"]) if tender_row["budget_min"] is not None else None,
        "budget_max": float(tender_row["budget_max"]) if tender_row["budget_max"] is not None else None,
        "weight_config": DEFAULT_WEIGHT_CONFIG,
        "prompt_version": PROMPT_VERSION,
        "bids": bids_payload,
    }


async def save_evaluation_results(connection: asyncpg.Connection, run_id: int, results: list[dict]) -> str:
    """Bulk-inserts bid_evaluations rows (append-only) and returns the
    derived overall run status."""
    if not results:
        return "failed"

    for r in results:
        await connection.execute(
            """
            INSERT INTO bid_evaluations (
                evaluation_run_id, bid_id, financial_score, financial_note, is_low_outlier,
                document_score, missing_documents, semantic_relevance_score, llm_subscores,
                composite_score, raw_llm_response, row_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12)
            """,
            run_id,
            r["bid_id"],
            r.get("financial_score"),
            r.get("financial_note"),
            r.get("is_low_outlier", False),
            r.get("document_score"),
            json.dumps(r.get("missing_documents") or []),
            json.dumps(r.get("semantic_relevance_score")) if r.get("semantic_relevance_score") is not None else None,
            json.dumps(r.get("llm_subscores")) if r.get("llm_subscores") is not None else None,
            r.get("composite_score"),
            json.dumps(r.get("raw_llm_response")) if r.get("raw_llm_response") is not None else None,
            r.get("row_status", "success"),
        )

    statuses = {r.get("row_status", "success") for r in results}
    if statuses == {"success"}:
        return "completed"
    if "success" in statuses:
        return "partial"
    return "failed"


async def mark_run_running(connection: asyncpg.Connection, run_id: int) -> None:
    await connection.execute("UPDATE bid_evaluation_runs SET status = 'running' WHERE id = $1", run_id)


async def finalize_run(
    connection: asyncpg.Connection,
    run_id: int,
    status: str,
    model_version: str | None = None,
    error_message: str | None = None,
) -> None:
    await connection.execute(
        """
        UPDATE bid_evaluation_runs
        SET status = $2, model_version = COALESCE($3, model_version), error_message = $4, completed_at = NOW()
        WHERE id = $1
        """,
        run_id,
        status,
        model_version,
        error_message,
    )


async def notify_run_finished(connection: asyncpg.Connection, tender_id: int, run_id: int, user_id: int, status: str) -> None:
    tender_row = await connection.fetchrow("SELECT title FROM tenders WHERE tender_id = $1", tender_id)
    tender_title = tender_row["title"] if tender_row else "your tender"

    title_by_status = {
        "completed": "Bid Evaluation Complete",
        "partial": "Bid Evaluation Completed (Needs Review)",
        "failed": "Bid Evaluation Failed",
    }
    message_by_status = {
        "completed": f'Smart bid evaluation finished for "{tender_title}". Results are ready to review.',
        "partial": f'Smart bid evaluation finished for "{tender_title}", but some bids need manual review.',
        "failed": f'Smart bid evaluation failed for "{tender_title}". You can re-trigger it from the tender page.',
    }

    await create_notification(
        connection,
        user_id=user_id,
        title=title_by_status.get(status, "Bid Evaluation Update"),
        message=message_by_status.get(status, f'Bid evaluation run #{run_id} finished with status {status}.'),
        notification_type="BidEvaluation",
        action_url=f"/view-my-tender/{tender_id}",
    )


async def get_run_with_results(connection: asyncpg.Connection, run_id: int) -> dict | None:
    run_row = await connection.fetchrow("SELECT * FROM bid_evaluation_runs WHERE id = $1", run_id)
    if not run_row:
        return None

    results_rows = await connection.fetch(
        """
        SELECT be.*, o.organization_name AS vendor_name
        FROM bid_evaluations be
        JOIN bids b ON be.bid_id = b.bid_id
        JOIN organizations o ON b.vendor_org_id = o.organization_id
        WHERE be.evaluation_run_id = $1
        ORDER BY be.composite_score DESC NULLS LAST
        """,
        run_id,
    )

    results = []
    for r in results_rows:
        item = dict(r)
        item["missing_documents"] = _parse_jsonb(item.get("missing_documents")) or []
        item["semantic_relevance_score"] = _parse_jsonb(item.get("semantic_relevance_score"))
        item["llm_subscores"] = _parse_jsonb(item.get("llm_subscores"))
        results.append(item)

    return {"run": _parse_run_row(run_row), "results": results}


async def get_run_with_results_for_buyer(connection: asyncpg.Connection, tender_id: int, run_id: int, buyer_org_id: int) -> dict | None:
    await _verify_tender_ownership(connection, tender_id, buyer_org_id)

    owns_run = await connection.fetchval(
        "SELECT 1 FROM bid_evaluation_runs WHERE id = $1 AND tender_id = $2", run_id, tender_id
    )
    if not owns_run:
        return None

    return await get_run_with_results(connection, run_id)


async def get_latest_run_with_results(connection: asyncpg.Connection, tender_id: int, buyer_org_id: int) -> dict | None:
    await _verify_tender_ownership(connection, tender_id, buyer_org_id)
    await get_active_or_recover_run(connection, tender_id)  # self-heal a stuck run on poll

    latest = await connection.fetchrow(
        "SELECT id FROM bid_evaluation_runs WHERE tender_id = $1 ORDER BY triggered_at DESC LIMIT 1",
        tender_id,
    )
    if not latest:
        return None

    return await get_run_with_results(connection, latest["id"])
