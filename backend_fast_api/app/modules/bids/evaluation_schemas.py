# ============================================================
# bids/evaluation_schemas.py - Smart Bid Evaluation Pydantic Schemas
# ============================================================

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EvaluationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    triggered_by_user_id: int
    triggered_at: Optional[datetime] = None
    status: str
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    prompt_version: Optional[str] = None
    weight_config: dict
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None


class BidEvaluationResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evaluation_run_id: int
    bid_id: int
    vendor_name: Optional[str] = None
    financial_score: Optional[float] = None
    financial_note: Optional[str] = None
    is_low_outlier: bool = False
    document_score: Optional[float] = None
    missing_documents: list = []
    semantic_relevance_score: Optional[dict] = None
    llm_subscores: Optional[dict] = None
    composite_score: Optional[float] = None
    row_status: str
    created_at: Optional[datetime] = None


class EvaluationRunWithResults(BaseModel):
    run: EvaluationRunResponse
    results: list[BidEvaluationResult] = []
