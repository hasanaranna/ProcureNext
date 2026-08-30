# ============================================================
# bids/schemas.py - Bid Pydantic Schemas
# ============================================================

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from app.modules.bids.models import BidStatus


class BidDocumentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bid_doc_id: int
    file_path: Optional[str] = None
    document_type: str
    allowed_roles: Optional[list[str]] = None
    has_access: Optional[bool] = None
    req_doc_id: Optional[int] = None


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


class BidSecurityInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    security_id: int
    security_amount: Optional[float] = None
    security_type: Optional[str] = None
    bid_security_doc_path: Optional[str] = None
    valid_until: Optional[date] = None


class BidDocumentComplianceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    req_doc_id: int
    custom_doc_name: Optional[str] = None
    is_mandatory: bool = True
    is_submitted: bool = False
    bid_doc_id: Optional[int] = None
    file_path: Optional[str] = None


class BidItemLotPricing(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    bid_item_id: Optional[int] = None
    tender_item_id: int
    lot_number: str
    item_name: str
    offered_quantity: float
    unit_price: float
    total_price: float
    compliance_remarks: Optional[str] = None


class BuyerBidComparisonItem(BaseModel):
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

    # Vendor Intelligence
    vendor_name: str
    vendor_address: Optional[str] = None
    vendor_website: Optional[str] = None
    vendor_verification_status: Optional[str] = None
    vendor_rating: Optional[float] = 0.0
    total_ratings_count: Optional[int] = 0
    completed_contracts_count: Optional[int] = 0
    is_enlisted: Optional[bool] = False

    # Financial Analytics
    budget_variance_pct: Optional[float] = None
    avg_variance_pct: Optional[float] = None
    is_lowest_bid: bool = False

    # Compliance & Documents
    compliance_score_pct: float = 0.0
    mandatory_docs_satisfied: bool = True
    documents: List[BidDocumentInfo] = []
    compliance_matrix: List[BidDocumentComplianceItem] = []
    securities: List[BidSecurityInfo] = []
    lot_pricing: List[BidItemLotPricing] = []


class BidComparisonSummary(BaseModel):
    total_bids: int = 0
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    avg_amount: Optional[float] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    lowest_bid_id: Optional[int] = None
    fully_compliant_bids_count: int = 0


class TenderBidComparisonResponse(BaseModel):
    tender_id: int
    tender_title: str
    tender_status: str
    package_type: Optional[str] = "SingleItem"
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    lots: List[dict] = []
    required_documents: List[dict] = []
    summary: BidComparisonSummary
    bids: List[BuyerBidComparisonItem]


