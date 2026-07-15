# ============================================================
# admin/router.py - Admin Dashboard & Moderation API Endpoints
# ============================================================
# COVERS: FR-17/FR-21 (Admin Dashboard & Moderation)
#
# All endpoints require Admin role (SuperAdmin or PlatformAdmin).
#
# ENDPOINTS:
#
# --- Authentication ---
#
# POST /auth/admin/login
#   - Admin-specific login (may have different 2FA requirements)
#
# POST /auth/admin/register
#   - Register a new admin (SuperAdmin only can create other admins)
#
# --- User & Organization Moderation ---
#
# PUT /admin/modify-user-status
#   - Change user status: Active, Suspended, Banned
#   - Accepts: user_id, new_status, reason
#   - Creates audit log entry
#
# POST /auth/admin/verify/{organization_id}
#   - Admin manually verifies organization documents
#   - Reviews: TradeLicense, TIN, VAT, RJSC certificates
#   - Sets organization verification_status to Verified or Rejected
#   - Notifies the organization of the result
#
# POST /admin/verify-user-document/{document_id}
#   - Admin verifies a user's NID document
#   - Sets document verification_status
#   - Notifies user
#
# --- Platform Configuration ---
#
# POST /admin/update-price
#   - Update the price per credit point (in BDT)
#   - Creates a new pricing entry (effective immediately)
#
# GET /admin/pricing-history
#   - View history of pricing changes
#
# --- Reporting (see reports module for detailed endpoints) ---
#
# GET /admin/stats
#   - Quick platform statistics summary
#
# --- Reports & User Management ---
#
# GET /admin/user-reports
#   - View all user/org reports submitted by platform users
#
# PUT /admin/user-reports/{report_id}
#   - Admin resolves a report (take action or dismiss)
# ============================================================

from fastapi import APIRouter, HTTPException
from app.core.db import get_db_connection
from app.modules.auth.schemas import LoginRequest, AdminTokenResponse
from app.modules.auth.service import authenticate_admin
from app.modules.admin.schemas import PendingMasterAccountsResponse, VerifyOrgRequest
from app.modules.admin.service import get_pending_master_accounts, verify_organization
# pyrefly: ignore [missing-import]
import asyncpg

# Prefix /api/auth so the full URL is POST /api/auth/admin/login,
# matching the frontend fetch call and the existing API proxy rule.
router = APIRouter(prefix="/api/auth", tags=["admin"])


@router.post("/admin/login", response_model=AdminTokenResponse)
async def admin_login(payload: LoginRequest):
    """
    Admin-only login endpoint.
    Verifies the user exists in the `admins` table and that the
    password matches the bcrypt hash stored in `users.password_hash`.
    Returns a JWT pair with `admin_role` embedded in the token payload.
    """
    try:
        async with get_db_connection() as connection:
            return await authenticate_admin(connection, payload)
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.get("/admin/pending-accounts", response_model=PendingMasterAccountsResponse)
async def list_pending_master_accounts():
    """
    Retrieve all master accounts (organization Owners) whose user
    status is still 'Pending', including their NID documents and
    organization regulatory documents.
    """
    try:
        async with get_db_connection() as connection:
            return await get_pending_master_accounts(connection)
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.post("/admin/verify/{organization_id}")
async def verify_organization_endpoint(organization_id: int, payload: VerifyOrgRequest):
    """
    Admin manually verifies organization documents.
    Sets organization verification_status to Verified or Rejected.
    Also updates the owner's status and document statuses.
    """
    try:
        async with get_db_connection() as connection:
            return await verify_organization(connection, organization_id, payload)
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc
