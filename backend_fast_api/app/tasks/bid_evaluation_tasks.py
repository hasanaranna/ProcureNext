# ============================================================
# bid_evaluation_tasks.py - Background scoring for Smart Bid Evaluation
# ============================================================

import asyncio
import logging

from app.core.db import get_db_connection
from app.modules.bids.evaluation_service import (
    build_evaluation_payload,
    finalize_run,
    mark_run_running,
    notify_run_finished,
    save_evaluation_results,
)
from app.services.ml_client import score_tender_bids_sync
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="run_bid_evaluation_task", bind=True)
def run_bid_evaluation_task(self, run_id: int, tender_id: int) -> None:
    asyncio.run(_async_run_evaluation(run_id, tender_id))


async def _async_run_evaluation(run_id: int, tender_id: int) -> None:
    async with get_db_connection() as connection:
        triggered_by = await connection.fetchval(
            "SELECT triggered_by_user_id FROM bid_evaluation_runs WHERE id = $1", run_id
        )
        # triggered_by_user_id references organization_employees(org_user_id); resolve the actual user_id for notifications.
        user_id = await connection.fetchval(
            "SELECT user_id FROM organization_employees WHERE org_user_id = $1", triggered_by
        )

        try:
            await mark_run_running(connection, run_id)

            payload = await build_evaluation_payload(connection, tender_id)
            if not payload["bids"]:
                await finalize_run(connection, run_id, "failed", error_message="No bids to evaluate.")
                if user_id:
                    await notify_run_finished(connection, tender_id, run_id, user_id, "failed")
                return

            ml_response = score_tender_bids_sync(payload)

            run_status = await save_evaluation_results(connection, run_id, ml_response.get("results", []))
            await finalize_run(connection, run_id, run_status, model_version=ml_response.get("model_version"))

            if user_id:
                await notify_run_finished(connection, tender_id, run_id, user_id, run_status)

        except Exception as exc:
            logger.exception(f"Bid evaluation run {run_id} for tender {tender_id} failed")
            await finalize_run(connection, run_id, "failed", error_message=str(exc))
            if user_id:
                await notify_run_finished(connection, tender_id, run_id, user_id, "failed")
