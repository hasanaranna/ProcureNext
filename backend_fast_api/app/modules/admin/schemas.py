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
