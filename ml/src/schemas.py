from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ProcurementDocument(BaseModel):
    procurement_nature: str = "Goods"
    procurement_method: str = "Open Tendering Method"
    title: str = ""
    category: str = "Not applicable"
    eligibility_of_tenderer: str = ""
    description: str = ""
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    tender_public_date: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    embedding: Optional[List[float]] = None


class TextEmbedRequest(BaseModel):
    text: str = Field(min_length=1)


class TextEmbedResponse(BaseModel):
    embedding: List[float]


# ============================================================
# Smart Bid Evaluation schemas
# ============================================================

class BidCompliance(BaseModel):
    """Precomputed document-compliance facts for one bid (backend already joined
    tender_required_documents / bid_documents — ml has no DB access)."""
    document_score_pct: float = 100.0
    missing_documents: List[str] = Field(default_factory=list)
    mandatory_docs_satisfied: bool = True


class BidScoringInput(BaseModel):
    bid_id: int
    financial_amount: Optional[float] = None
    description: str = ""
    compliance: BidCompliance = Field(default_factory=BidCompliance)


class TenderEvaluationRequest(BaseModel):
    tender_id: int
    title: str = ""
    description: str = ""
    eligibility_of_tenderer: str = ""
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    weight_config: dict = Field(
        default_factory=lambda: {"financial": 0.20, "docs": 0.20, "embeddings": 0.05, "llm_rubric": 0.55}
    )
    prompt_version: str = "bid_rubric_v1"
    bids: List[BidScoringInput] = Field(default_factory=list)


class BidRubricScore(BaseModel):
    """Structured LLM rubric output for a single bid. Populated only from the
    given tender/bid text — never hallucinated."""
    clarity_score: float = Field(ge=0, le=100)
    clarity_justification: str = ""
    completeness_score: float = Field(ge=0, le=100)
    completeness_justification: str = ""
    feasibility_score: float = Field(ge=0, le=100)
    feasibility_justification: str = ""
    risk_flags: List[str] = Field(default_factory=list)
    risk_justification: str = ""


class SemanticRelevance(BaseModel):
    raw: float
    normalized: float


class BidScoringResult(BaseModel):
    bid_id: int
    financial_score: Optional[float] = None
    financial_note: str = ""
    is_low_outlier: bool = False
    document_score: Optional[float] = None
    missing_documents: List[str] = Field(default_factory=list)
    semantic_relevance_score: Optional[SemanticRelevance] = None
    llm_subscores: Optional[BidRubricScore] = None
    composite_score: Optional[float] = None
    raw_llm_response: Optional[dict] = None
    row_status: str = "success"  # success | needs_review | failed


class TenderEvaluationResponse(BaseModel):
    model_name: str = ""
    model_version: str = ""
    prompt_version: str = "bid_rubric_v1"
    results: List[BidScoringResult] = Field(default_factory=list)
