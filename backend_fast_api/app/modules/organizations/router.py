# ============================================================
# organizations/router.py - Organization Management API Endpoints
# ============================================================
# COVERS: FR-04 (Registration), FR-06 (Profile & Verification)
#
# An organization can be a Buyer, Vendor, or BOTH simultaneously.
# Each org has a Master Account Holder (Owner) who manages members.
#
# ENDPOINTS:
#
# POST /orgs
#   - Create a new organization
#   - Creator becomes the Owner (Master Account Holder)
#   - Accepts: org_name, org_type (Buyer/Vendor), RJSC number,
#     trade_license, TIN, address, description
#   - Org enters "Pending" verification status
#
# GET /orgs/{org_id}
#   - Get organization details (public info for verified orgs)
#
# PUT /orgs/{org_id}
#   - Update organization information (Owner only)
#
# POST /orgs/{org_id}/documents
#   - Upload organizational verification documents
#   - Types: TradeLicense, TIN, VAT, RJSC
#   - Admin verifies these manually
#
# GET /orgs/{org_id}/documents
#   - View organization's verification documents and their statuses
#
# POST /orgs/{org_id}/members
#   - Owner sends affiliation request to a user (by email or user_id)
#   - Assigns a role: ProcurementOfficer, Finance, Viewer
#   - User must accept the request to join
#
# POST /orgs/join/{org_id}
#   - User requests to join an organization using its unique code
#   - Owner must then approve or reject the request
#
# PUT /orgs/{org_id}/members/{user_id}/role
#   - Update a member's role within the organization (Owner only)
#
# DELETE /orgs/{org_id}/members/{user_id}
#   - Remove a member from the organization (Owner only)
#
# POST /orgs/{org_id}/members/{user_id}/accept
#   - User accepts affiliation request from an organization
#
# POST /orgs/{org_id}/members/{user_id}/decline
#   - User declines affiliation request
#
# GET /orgs/{org_id}/members
#   - List all members and their roles in the organization
#
# POST /orgs/report/{org_id}
#   - Report an organization for misconduct
#
# GET /search-organization
#   - Search organizations by name, type, location
# ============================================================

from fastapi import APIRouter

from app.modules.organizations.schemas import OrgInvitationCreateRequest

router = APIRouter(prefix="/api/org", tags=["organizations"])


@router.get("/invitations")
async def list_invitations() -> dict:
	return {"invitations": []}


@router.post("/invitations")
async def create_invitation(payload: OrgInvitationCreateRequest) -> dict:
	# Required debugging hook: print incoming request body in backend console.
	print(f"[POST /api/org/invitations] body={payload.model_dump()}", flush=True)
	return {
		"message": "Invitation payload received.",
		"invitation": payload.model_dump(),
	}


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(invitation_id: int) -> dict:
	return {
		"message": "Invitation canceled.",
		"invitation_id": invitation_id,
	}
