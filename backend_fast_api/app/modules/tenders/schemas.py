# ============================================================
# tenders/schemas.py - Tender Pydantic Schemas
# ============================================================
# PURPOSE:
# Request/response models for tender management.
#
# SCHEMAS TO DEFINE:
#
# Requests:
# - TenderCreateRequest: title, description, category_id, nature_id,
#   method_id, visibility_type, budget_min, budget_max, budget_type,
#   submission_deadline, document_price, security_required,
#   evaluation_type, lots (optional list of LotCreate)
# - TenderUpdateRequest: editable tender fields
# - LotCreateRequest: lot_title, description, budget, delivery_location,
#   tentative_start_date, tentative_completion_date
# - LotUpdateRequest: editable lot fields
# - TenderAmendmentRequest: description of changes, file upload
# - ClarificationRequest: question text
# - ClarificationReplyRequest: answer text
#
# Responses:
# - TenderResponse: Full tender details including buyer org, lots,
#   documents, status, dates, category info
# - TenderListItem: Summary for listing views
# - TenderPublicSummary: Limited info visible to unregistered users
#   (title, buyer name, category, dates - NO detailed description)
# - LotResponse: lot details
# - TenderDocumentResponse: file info
# - ClarificationResponse: question, answer, timestamps
# - TenderAmendmentResponse: amendment details
# ============================================================

from enum import Enum
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.modules.tenders.models import TenderVisibility, TenderStatus

class TenderPackageType(str, Enum):
    SingleItem = "SingleItem"
    PackagedLots = "PackagedLots"

class TenderItemCreate(BaseModel):
    lot_number: str = "LOT-1"
    item_name: str
    specifications: Optional[str] = None
    quantity: float
    unit_of_measure: str
    estimated_unit_price: Optional[float] = None

class TenderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    item_id: int
    tender_id: int
    lot_number: str
    item_name: str
    specifications: Optional[str] = None
    quantity: float
    unit_of_measure: str
    estimated_unit_price: Optional[float] = None

class TenderCreateRequest(BaseModel):
    title: str
    description: str
    category_id: Optional[int] = None
    category: Optional[str] = None
    nature_id: Optional[int] = None
    procurement_nature: Optional[str] = None
    method_id: Optional[int] = None
    procurement_method: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    embedding: Optional[List[float]] = None
    visibility_type: TenderVisibility = TenderVisibility.Public
    package_type: TenderPackageType = TenderPackageType.SingleItem
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    bid_bond_amount: Optional[float] = 0.0
    security_required: bool = False
    security_valid_until: Optional[datetime] = None
    proposal_valid_until: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    scheduled_publish_at: Optional[datetime] = None
    required_seller_docs: Optional[List[dict]] = None  # [{name: str, allowed_roles: [str]}]
    items: Optional[List[TenderItemCreate]] = None

class TenderUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    category: Optional[str] = None
    nature_id: Optional[int] = None
    procurement_nature: Optional[str] = None
    method_id: Optional[int] = None
    procurement_method: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    embedding: Optional[List[float]] = None
    visibility_type: Optional[TenderVisibility] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    required_seller_docs: Optional[List[dict]] = None

class TenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_id: int
    buyer_id: int
    created_by: int
    title: str
    description: str
    status: TenderStatus
    category: Optional[str] = None
    procurement_nature: Optional[str] = None
    procurement_method: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    package_type: Optional[str] = "SingleItem"
    bid_bond_amount: Optional[float] = None
    scheduled_publish_at: Optional[datetime] = None
    visibility_type: Optional[str] = "Public"
    created_at: datetime

class TenderPdfExtractResponse(BaseModel):
    title: str
    description: str
    procurement_nature: Optional[str] = None
    procurement_method: Optional[str] = None
    category: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    embedding: Optional[List[float]] = None

class TenderPdfJobResponse(BaseModel):
    task_id: str
    status: str = "processing"
    message: str = "Tender PDF processing started."

class TenderPdfJobStatus(BaseModel):
    task_id: str
    status: str
    result: Optional[TenderResponse] = None
    error: Optional[str] = None

class TenderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_id: int
    title: str
    description: str
    status: TenderStatus
    buyer_org_name: str
    submission_deadline: Optional[datetime] = None
    created_at: datetime

class TenderDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_doc_id: int
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    uploaded_at: Optional[datetime] = None

class RequiredDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    req_doc_id: int
    custom_doc_name: Optional[str] = None
    is_mandatory: bool = True
    allowed_roles: List[str] = ["Owner"]

class UpdateReqDocAccessItem(BaseModel):
    req_doc_id: int
    allowed_roles: List[str]

class UpdateTenderReqDocAccessRequest(BaseModel):
    documents: List[UpdateReqDocAccessItem]

class TenderDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_id: int
    title: str
    description: str
    status: TenderStatus
    buyer_org_name: str
    category_name: Optional[str] = None
    procurement_nature: Optional[str] = None
    procurement_method: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    security_required: bool = False
    created_at: datetime
    documents: List[TenderDocumentItem] = []
    required_documents: List[RequiredDocumentItem] = []
    can_manage_document_access: Optional[bool] = None
    bid_count: int = 0

class TenderDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_doc_id: int
    tender_id: int
    file_name: str
    file_path: str
    uploaded_at: datetime


class OngoingTenderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    award_id: int
    tender_id: int
    tender_title: str
    tender_description: Optional[str] = None
    tender_status: str
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    tender_created_at: Optional[datetime] = None
    awarded_at: Optional[datetime] = None
    remarks: Optional[str] = None
    winning_bid_id: int
    winning_bid_amount: Optional[float] = None
    winning_bid_description: Optional[str] = None
    winning_bid_submitted_at: Optional[datetime] = None
    buyer_org_id: int
    buyer_org_name: str
    vendor_org_id: int
    vendor_org_name: str
    role_in_tender: Optional[str] = None
    contract_id: Optional[int] = None
    contract_status: Optional[str] = "Active"


class OngoingTenderBidDocument(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bid_doc_id: int
    file_path: Optional[str] = None
    document_type: str


class OngoingTenderDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    award_id: int
    tender_id: int
    tender_title: str
    tender_description: str
    tender_status: str
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    tender_created_at: Optional[datetime] = None
    awarded_at: Optional[datetime] = None
    remarks: Optional[str] = None
    winning_bid_id: int
    winning_bid_amount: Optional[float] = None
    winning_bid_description: Optional[str] = None
    winning_bid_submitted_at: Optional[datetime] = None
    buyer_org_id: int
    buyer_org_name: str
    buyer_org_address: Optional[str] = None
    winner_org_id: Optional[int] = None
    buyer_org_website: Optional[str] = None
    vendor_org_id: int
    vendor_org_name: str
    vendor_org_address: Optional[str] = None
    vendor_org_website: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    contract_id: Optional[int] = None
    contract_status: Optional[str] = "Active"
    role_in_tender: Optional[str] = "vendor"
    tender_documents: List[TenderDocumentItem] = []
    bid_documents: List[OngoingTenderBidDocument] = []


class PublicRequiredDocItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    req_doc_id: int
    custom_doc_name: Optional[str] = None
    is_mandatory: bool = True


class PublicTenderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_id: int
    title: str
    description: str
    status: str
    visibility_type: Optional[str] = "Public"
    category_name: Optional[str] = None
    procurement_nature: Optional[str] = None
    procurement_method: Optional[str] = None
    buyer_org_name: str
    buyer_org_type: Optional[str] = None
    buyer_verified: bool = True
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    security_required: bool = False
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    created_at: datetime


class PublicTenderDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_id: int
    title: str
    description: str
    status: str
    visibility_type: Optional[str] = "Public"
    category_name: Optional[str] = None
    procurement_nature: Optional[str] = None
    procurement_method: Optional[str] = None
    eligibility_of_tenderer: Optional[str] = None
    buyer_org_name: str
    buyer_org_type: Optional[str] = None
    buyer_verified: bool = True
    buyer_org_website: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    security_required: bool = False
    security_valid_until: Optional[datetime] = None
    proposal_valid_until: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    created_at: datetime
    required_documents: List[PublicRequiredDocItem] = []


class VendorRecommendationItem(BaseModel):
    vendor_id: int
    vendor_name: str
    vendor_address: Optional[str] = None
    vendor_verification_status: Optional[str] = None
    match_score: float
    category_match: bool
    is_enlisted: bool
    avg_seller_rating: float
    total_reviews_count: int
    certifications: List[str] = []
    reasons: List[str] = []


class VendorRecommendationResponse(BaseModel):
    tender_id: int
    tender_title: str
    total_recommendations: int
    recommendations: List[VendorRecommendationItem]

