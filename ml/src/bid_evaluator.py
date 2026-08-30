# ============================================================
# ml/src/bid_evaluator.py - Smart Bid Evaluation (Stages 1-4)
# ============================================================
# Stateless: everything needed to score a tender's bids arrives in the
# request payload. This module never touches a database.

import logging
import os
import statistics
from typing import Optional

from src.schemas import (
    BidCompliance,
    BidRubricScore,
    BidScoringInput,
    BidScoringResult,
    SemanticRelevance,
    TenderEvaluationRequest,
    TenderEvaluationResponse,
)
from src.tender_parser import generate_embedding

logger = logging.getLogger(__name__)

LLM_MAX_ATTEMPTS = 3

RUBRIC_SYSTEM_PROMPT = """
You are a Procurement Bid Evaluation Agent.

You will be given a tender's requirements and a single vendor's bid description.
Score the bid on three dimensions, each 0-100, with a one-line justification grounded
only in the given text:
- clarity: how clearly the bid communicates what is being offered
- completeness: how thoroughly the bid addresses the tender's stated requirements
- feasibility: how realistic/deliverable the bid appears given its own description

Also list any risk_flags (short phrases, e.g. "vague delivery timeline",
"no mention of required certification") — an empty list if none — with a one-line
risk_justification summarizing them (empty string if no flags).

Rules:
- Do not invent or hallucinate facts not present in the bid or tender text.
- Base every score and justification strictly on the provided text.
- Be concise: justifications are one sentence each.
"""


def _financial_score_for(amount: float, budget_min: Optional[float], budget_max: Optional[float]) -> tuple[float, str]:
    """Reward bids at/under the budget midpoint. Monotonic, capped at 100. Never penalizes low bids."""
    if budget_max is None or budget_max <= 0:
        return 50.0, "No budget ceiling on file to compare against."

    midpoint = ((budget_min or 0) + budget_max) / 2 if budget_min else budget_max * 0.75

    if amount <= 0:
        return 0.0, "Invalid or zero bid amount."

    if amount <= midpoint:
        pct_under = (midpoint - amount) / midpoint * 100 if midpoint > 0 else 0
        score = min(100.0, 80.0 + pct_under * 0.4)
        note = f"{pct_under:.0f}% under the budget midpoint."
    elif amount <= budget_max:
        pct_over_mid = (amount - midpoint) / midpoint * 100 if midpoint > 0 else 0
        score = max(50.0, 80.0 - pct_over_mid)
        note = f"{pct_over_mid:.0f}% above the budget midpoint, within budget ceiling."
    else:
        pct_over_max = (amount - budget_max) / budget_max * 100
        score = max(0.0, 50.0 - pct_over_max)
        note = f"{pct_over_max:.0f}% over the budget ceiling."

    return round(score, 2), note


def score_financial(
    bids: list[BidScoringInput],
    budget_min: Optional[float],
    budget_max: Optional[float],
) -> dict[int, tuple[float, str, bool]]:
    """Per-bid (score, note, is_low_outlier). Outlier detection compares each
    bid to the median of the tender's own bids — informational only, never
    subtracted from the score. A quartile/IQR split was used previously, but
    at the handful of bids a tender typically gets, a single second bid that's
    merely cheaper (not a true lowball) lands in the same "lower half" as the
    real outlier and drags the fence down enough to mask it. Comparing
    straight to the median avoids that masking regardless of sample size."""
    amounts = [b.financial_amount for b in bids if b.financial_amount is not None and b.financial_amount > 0]

    low_fence = None
    if len(amounts) >= 2:
        median_amount = statistics.median(amounts)
        low_fence = median_amount * 0.5

    results: dict[int, tuple[float, str, bool]] = {}
    for bid in bids:
        amount = bid.financial_amount
        if amount is None or amount <= 0:
            results[bid.bid_id] = (0.0, "No financial amount submitted.", False)
            continue

        score, note = _financial_score_for(amount, budget_min, budget_max)
        is_low_outlier = low_fence is not None and amount < low_fence
        if is_low_outlier:
            note += " Flagged as a statistical outlier (well below the other bids) — verify delivery feasibility."
        results[bid.bid_id] = (score, note, is_low_outlier)

    return results


def score_documents(compliance: BidCompliance) -> tuple[float, list[str]]:
    """Thin conversion of the compliance block backend already computed via
    its tender_required_documents/bid_documents join."""
    score = max(0.0, min(100.0, round(compliance.document_score_pct, 2)))
    return score, list(compliance.missing_documents)


def score_embedding_similarity(tender_text: str, bid_text: str) -> tuple[float, float]:
    """Cosine similarity between freshly-generated tender/bid embeddings
    (computed together so both come from the same model-or-fallback path)."""
    import numpy as np

    tender_vec = np.array(generate_embedding(tender_text or "tender"))
    bid_vec = np.array(generate_embedding(bid_text or "bid"))

    denom = (np.linalg.norm(tender_vec) * np.linalg.norm(bid_vec))
    raw_cosine = float(np.dot(tender_vec, bid_vec) / denom) if denom > 0 else 0.0
    raw_cosine = max(-1.0, min(1.0, raw_cosine))
    normalized = round((raw_cosine + 1) / 2 * 100, 2)  # cosine [-1,1] -> [0,100]

    return round(raw_cosine, 4), normalized


def score_llm_rubric(tender_text: str, bid_text: str) -> Optional[BidRubricScore]:
    """Calls Groq (structured output) with a couple of retries. Returns None
    if the model still won't return clean, valid JSON — caller marks the bid
    needs_review rather than failing the whole run."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        logger.warning("GROQ_API_KEY not configured; skipping LLM rubric stage.")
        return None

    last_error: Optional[Exception] = None
    for attempt in range(1, LLM_MAX_ATTEMPTS + 1):
        try:
            from langchain_groq import ChatGroq
            from langchain.agents import create_agent

            agent_llm = ChatGroq(
                model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                api_key=groq_api_key,
                temperature=0.1,
                stop=None,
            )
            agent = create_agent(
                model=agent_llm,
                system_prompt=RUBRIC_SYSTEM_PROMPT,
                response_format=BidRubricScore,
            )
            response = agent.invoke({
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            f"Tender requirements:\n{tender_text}\n\n"
                            f"Vendor bid description:\n{bid_text}"
                        ),
                    }
                ]
            })
            structured_res = response.get("structured_response")
            if isinstance(structured_res, BidRubricScore):
                return structured_res
            if isinstance(structured_res, dict):
                return BidRubricScore(**structured_res)
            raise ValueError("Groq response had no valid structured_response.")
        except Exception as exc:
            last_error = exc
            logger.warning(f"LLM rubric attempt {attempt}/{LLM_MAX_ATTEMPTS} failed: {exc}")

    logger.error(f"LLM rubric failed after {LLM_MAX_ATTEMPTS} attempts: {last_error}")
    return None


def score_tender_bids(request: TenderEvaluationRequest) -> TenderEvaluationResponse:
    tender_text = "\n".join(
        part for part in [request.title, request.description, request.eligibility_of_tenderer] if part
    )
    weights = request.weight_config

    financial_by_bid = score_financial(request.bids, request.budget_min, request.budget_max)

    results: list[BidScoringResult] = []
    model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    for bid in request.bids:
        fin_score, fin_note, is_low_outlier = financial_by_bid.get(bid.bid_id, (0.0, "", False))
        doc_score, missing_docs = score_documents(bid.compliance)
        raw_cosine, embed_normalized = score_embedding_similarity(tender_text, bid.description)
        rubric = score_llm_rubric(tender_text, bid.description)

        if rubric is not None:
            llm_overall = (rubric.clarity_score + rubric.completeness_score + rubric.feasibility_score) / 3
            composite = round(
                weights.get("financial", 0.20) * fin_score
                + weights.get("docs", 0.20) * doc_score
                + weights.get("embeddings", 0.05) * embed_normalized
                + weights.get("llm_rubric", 0.55) * llm_overall,
                2,
            )
            row_status = "success"
            raw_llm_response = rubric.model_dump()
        else:
            composite = None
            row_status = "needs_review"
            raw_llm_response = None

        results.append(BidScoringResult(
            bid_id=bid.bid_id,
            financial_score=fin_score,
            financial_note=fin_note,
            is_low_outlier=is_low_outlier,
            document_score=doc_score,
            missing_documents=missing_docs,
            semantic_relevance_score=SemanticRelevance(raw=raw_cosine, normalized=embed_normalized),
            llm_subscores=rubric,
            composite_score=composite,
            raw_llm_response=raw_llm_response,
            row_status=row_status,
        ))

    return TenderEvaluationResponse(
        model_name=model_name,
        model_version=model_name,
        prompt_version=request.prompt_version,
        results=results,
    )
