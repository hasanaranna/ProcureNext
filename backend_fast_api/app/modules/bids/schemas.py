# ============================================================
# bids/schemas.py - Bid Pydantic Schemas
# ============================================================

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.modules.bids.models import BidStatus


class BidDocumentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bid_doc_id: int
    file_path: Optional[str] = None
    document_type: str

class BidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bid_id: int
    vendor_org_id: int
    submitted_by: int
    tender_id: int
    financial_amount: Optional[float] = None
    description: Optional[str] = None
    status: BidStatus
    submitted_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    documents: Optional[list[BidDocumentInfo]] = None


class BidListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bid_id: int
    tender_id: int
    tender_title: Optional[str] = None
    financial_amount: Optional[float] = None
    description: Optional[str] = None
    status: BidStatus
    submitted_at: Optional[datetime] = None


class BidUpdateRequest(BaseModel):
    financial_amount: Optional[float] = None
    description: Optional[str] = None
    status: Optional[BidStatus] = None

