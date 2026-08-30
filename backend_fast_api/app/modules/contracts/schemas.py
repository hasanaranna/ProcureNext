# ============================================================
# contracts/schemas.py - Contract & Review Pydantic Schemas
# ============================================================

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.modules.contracts.models import ContractStatus, ReviewPartyRole


class MutualReviewCreateRequest(BaseModel):
    overall_rating: int = Field(..., ge=1, le=5, description="Overall performance rating (1 to 5 stars)")
    quality_score: Optional[int] = Field(None, ge=1, le=5, description="Quality of deliverables (1 to 5)")
    timeliness_score: Optional[int] = Field(None, ge=1, le=5, description="Timeliness / SLA compliance (1 to 5)")
    communication_score: Optional[int] = Field(None, ge=1, le=5, description="Responsiveness & communication (1 to 5)")
    review_text: str = Field(..., min_length=5, description="Detailed review feedback")


class MutualReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: int
    contract_id: int
    tender_id: int
    reviewer_org_id: int
    reviewee_org_id: int
    party_role: str
    overall_rating: int
    quality_score: Optional[int] = None
    timeliness_score: Optional[int] = None
    communication_score: Optional[int] = None
    review_text: str
    created_at: datetime


class ContractCompleteResponse(BaseModel):
    contract_id: int
    status: str
    message: str


class ContractReviewsSummaryResponse(BaseModel):
    contract_id: int
    total_reviews: int
    reviews: List[MutualReviewResponse] = []
