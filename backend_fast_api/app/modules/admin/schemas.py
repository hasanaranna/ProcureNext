# ============================================================
# admin/schemas.py - Admin Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - ModifyUserStatusRequest: user_id, new_status, reason
# - VerifyOrgRequest: organization_id, verification_status,
#   review_notes
# - VerifyDocumentRequest: document_id, review_status, review_notes
# - AdminRegisterRequest: email, password, admin_role
# - AdminStatsResponse: quick summary stats
# - UserReportListResponse: paginated list of user reports
# - UserReportResolveRequest: report_id, action, notes
# - PricingHistoryResponse: list of pricing changes
# ============================================================

from pydantic import BaseModel
from typing import Optional


class ModifyUserStatusRequest(BaseModel):
    user_id: int
    new_status: str
    reason: Optional[str] = None


class VerifyOrgRequest(BaseModel):
    verification_status: str
    review_notes: Optional[str] = None


class PendingDocuments(BaseModel):
    nid_front: str | None = None
    nid_back: str | None = None
    trade_license: str | None = None
    tin_certificate: str | None = None
    vat_certificate: str | None = None
    additional_docs: list[str] = []


class PendingMasterAccount(BaseModel):
    user_id: int
    organization_id: int
    full_name: str
    email: str
    phone: str | None = None
    organization_name: str
    organization_type: str
    submitted_at: str
    documents: PendingDocuments


class PendingMasterAccountsResponse(BaseModel):
    accounts: list[PendingMasterAccount]
    total: int


class AdminUserListItem(BaseModel):
    user_id: int
    full_name: str
    email: str
    status: str
    organization_name: str | None = None
    role_in_org: str | None = None
    is_admin: bool
    created_at: str


class AdminUserListResponse(BaseModel):
    users: list[AdminUserListItem]
    total: int
    page: int = 1
    limit: int = 10


class PlatformStatsResponse(BaseModel):
    total_tokens_sold: int
    tokens_sold_this_month: int
    approved_owners: int
    approved_owners_this_month: int
    pending_approvals: int
    active_tenders: int
    total_bids: int
    bids_this_month: int
    total_revenue_bdt: float
