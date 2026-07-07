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

import secrets

# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import APIRouter, HTTPException

from app.core.database_url import get_database_url
from app.modules.organizations.schemas import OrgInvitationCreateRequest

router = APIRouter(prefix="/api/org", tags=["organizations"])


@router.get("/invitations")
async def list_invitations() -> dict:
	return {"invitations": []}


@router.post("/invitations")
async def create_invitation(payload: OrgInvitationCreateRequest) -> dict:
    # Required debugging hook: print incoming request body in backend console.
    print(f"[POST /api/org/invitations] body={payload.model_dump()}", flush=True)

    token = secrets.token_urlsafe(32)
    database_url = get_database_url()

    if not database_url:
        print("[ERROR] DATABASE_URL is not set in environment variables.", flush=True)
        raise HTTPException(status_code=500, detail="Database connection settings are not configured.")

    try:
        connection = await asyncpg.connect(database_url, ssl="require")
        try:
            # Check if an invitation with the same (organization_id, invited_by, email) already exists
            existing = await connection.fetchrow(
                """
                SELECT invitation_id
                FROM user_invitations
                WHERE organization_id = $1
                  AND invited_by = $2
                  AND email = $3
                """,
                payload.organization_id,
                payload.invited_by,
                payload.email,
            )

            if existing is not None:
                # Update existing invitation: refresh timestamps and regenerate token
                invitation = await connection.fetchrow(
                    """
                    UPDATE user_invitations
                    SET token = $1,
                        created_at = NOW(),
                        expires_at = NOW() + INTERVAL '7 days'
                    WHERE invitation_id = $2
                    RETURNING invitation_id, organization_id, invited_by, email, token, status, created_at, expires_at
                    """,
                    token,
                    existing["invitation_id"],
                )
                message = "Invitation updated."
            else:
                # Insert a new invitation
                invitation = await connection.fetchrow(
                    """
                    INSERT INTO user_invitations (
                        organization_id,
                        invited_by,
                        email,
                        token,
                        status
                    )
                    VALUES ($1, $2, $3, $4, 'Pending')
                    RETURNING invitation_id, organization_id, invited_by, email, token, status, created_at, expires_at
                    """,
                    payload.organization_id,
                    payload.invited_by,
                    payload.email,
                    token,
                )
                message = "Invitation created."

            if invitation is None:
                raise HTTPException(status_code=500, detail="Failed to create invitation: query returned None.")
            return {
                "message": message,
                "invitation": dict(invitation.items()),
            }
        finally:
            await connection.close()
            
    except asyncpg.PostgresError as exc:
        # Captures specific PostgreSQL errors (e.g., unique violation, missing column)
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
        
    except Exception as exc:
        # Captures other Python/connection errors
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc

@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(invitation_id: int) -> dict:
	return {
		"message": "Invitation canceled.",
		"invitation_id": invitation_id,
	}
