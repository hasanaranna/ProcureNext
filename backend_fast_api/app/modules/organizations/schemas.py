# ============================================================
# organizations/schemas.py - Organization Pydantic Schemas
# ============================================================
# PURPOSE:
# Request/response models for organization management.
#
# SCHEMAS TO DEFINE:
# - OrgCreateRequest: name, type (Buyer/Vendor), RJSC, TIN,
#   trade_license, address, website, description
# - OrgUpdateRequest: editable org fields
# - OrgResponse: Full org details including verification status
# - OrgBrief: Minimal org info for listings
# - OrgMemberAdd: user_id/email, role_in_org
# - OrgMemberResponse: user info + role + joined_at
# - OrgRoleUpdate: new role assignment
# - OrgDocumentUpload: document_type, file metadata
# - OrgDocumentResponse: doc_id, type, review_status, review_notes
# - OrgJoinRequest: organization_code
# - AffiliationRequest: request details for accept/decline flow
# - OrgReportRequest: reason, description
# - OrgSearchQuery: name, type, location filters
# ============================================================

from pydantic import BaseModel, EmailStr


class OrgInvitationCreateRequest(BaseModel):
	email: EmailStr
