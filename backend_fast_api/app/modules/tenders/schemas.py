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

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.modules.tenders.models import TenderVisibility, TenderStatus

class TenderCreateRequest(BaseModel):
    title: str
    description: str
    category_id: Optional[int] = None
    category: Optional[str] = None
    nature_id: Optional[int] = None
    method_id: Optional[int] = None
    visibility_type: TenderVisibility = TenderVisibility.Public
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    security_required: bool = False
    security_valid_until: Optional[datetime] = None
    proposal_valid_until: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    required_seller_docs: Optional[List[dict]] = None  # [{name: str, allowed_roles: [str]}]

class TenderResponse(BaseModel):
    tender_id: int
    buyer_id: int
    created_by: int
    title: str
    description: str
    status: TenderStatus
    submission_deadline: Optional[datetime] = None
    tender_public_date: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TenderListItem(BaseModel):
    tender_id: int
    title: str
    description: str
    status: TenderStatus
    buyer_org_name: str
    submission_deadline: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TenderDocumentItem(BaseModel):
    tender_doc_id: int
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RequiredDocumentItem(BaseModel):
    req_doc_id: int
    custom_doc_name: Optional[str] = None
    is_mandatory: bool = True
    allowed_roles: List[str] = ["Owner"]

    class Config:
        from_attributes = True

class UpdateReqDocAccessItem(BaseModel):
    req_doc_id: int
    allowed_roles: List[str]

class UpdateTenderReqDocAccessRequest(BaseModel):
    documents: List[UpdateReqDocAccessItem]

class TenderDetailResponse(BaseModel):
    tender_id: int
    title: str
    description: str
    status: TenderStatus
    buyer_org_name: str
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

    class Config:
        from_attributes = True

class TenderDocumentResponse(BaseModel):
    tender_doc_id: int
    tender_id: int
    file_name: str
    file_path: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True
