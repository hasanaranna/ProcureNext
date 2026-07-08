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
from datetime import date
from typing import Literal

# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from pydantic import BaseModel

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.organizations.schemas import OrgCreateRequest, OrgCreateResponse, OrgInvitationCreateRequest
from app.modules.organizations.service import (
    create_master_organization,
    create_or_update_invitation,
    get_invitation_details_by_token,
    get_organization_members,
    update_member_role,
    get_organization_invitations,
    delete_organization_invitation
)
from app.services.supabase_storage import build_registration_prefix, upload_optional_file, upload_optional_files

router = APIRouter(prefix="/api/org", tags=["organizations"])


@router.post("/orgs", response_model=OrgCreateResponse, status_code=201)
async def create_organization(
    name: str = Form(...),
    organization_name: str = Form(..., alias="organizationName"),
    email: str = Form(...),
    phone: str = Form(...),
    nid: int = Form(...),
    date_of_birth: date = Form(...),
    password: str = Form(...),
    organization_type: Literal["Buyer", "Vendor"] = Form("Buyer"),
    address: str | None = Form(None),
    website: str | None = Form(None),
    description: str | None = Form(None),
    nid_front: UploadFile | None = File(None, alias="nidFront"),
    nid_back: UploadFile | None = File(None, alias="nidBack"),
    trade_license: UploadFile | None = File(None, alias="tradeLicense"),
    tin_certificate: UploadFile | None = File(None, alias="tinCertificate"),
    vat_certificate: UploadFile | None = File(None, alias="vatCertificate"),
    additional_docs: list[UploadFile] = File(default=[], alias="additionalDocs"),
) -> OrgCreateResponse:
    storage_prefix = build_registration_prefix(email)

    nid_front_url = await upload_optional_file(nid_front, f"{storage_prefix}/nid")
    nid_back_url = await upload_optional_file(nid_back, f"{storage_prefix}/nid")
    trade_license_url = await upload_optional_file(trade_license, f"{storage_prefix}/org")
    tin_certificate_url = await upload_optional_file(tin_certificate, f"{storage_prefix}/org")
    vat_certificate_url = await upload_optional_file(vat_certificate, f"{storage_prefix}/org")
    additional_document_urls = await upload_optional_files(additional_docs, f"{storage_prefix}/org/additional")

    payload = OrgCreateRequest(
        full_name=name,
        email=email,
        phone=phone,
        nid=nid,
        date_of_birth=date_of_birth,
        password=password,
        organization_name=organization_name,
        organization_type=organization_type,
        address=address,
        website=website,
        description=description,
        nid_front_url=nid_front_url,
        nid_back_url=nid_back_url,
        trade_license_url=trade_license_url,
        tin_certificate_url=tin_certificate_url,
        vat_certificate_url=vat_certificate_url,
        additional_document_urls=additional_document_urls,
    )

    print(
        f"[POST /api/org/orgs] body={payload.model_dump(exclude={'password'})}",
        flush=True,
    )

    try:
        async with get_db_connection() as connection:
            return await create_master_organization(connection, payload)
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.get("/invitation-details")
async def get_invitation_details(token: str):
    try:
        async with get_db_connection() as connection:
            details = await get_invitation_details_by_token(connection, token)
            return {"invitation": details}
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc

@router.get("/invitations")
async def list_invitations(current_user: dict = Depends(get_current_user_org)) -> dict:
    try:
        async with get_db_connection() as connection:
            invitations = await get_organization_invitations(connection, current_user["organization_id"])
            return {"invitations": invitations}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.post("/invitations")
async def create_invitation(payload: OrgInvitationCreateRequest, current_user: dict = Depends(get_current_user_org)) -> dict:
    # Use context from authenticated user
    organization_id = current_user["organization_id"]
    invited_by = current_user["user_id"]
    token = secrets.token_urlsafe(32)

    try:
        async with get_db_connection() as connection:
            return await create_or_update_invitation(
                connection,
                organization_id=organization_id,
                invited_by=invited_by,
                email=payload.email,
                token=token,
            )
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc

@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(invitation_id: int, current_user: dict = Depends(get_current_user_org)) -> dict:
    try:
        async with get_db_connection() as connection:
            return await delete_organization_invitation(
                connection, 
                invitation_id=invitation_id,
                organization_id=current_user["organization_id"],
                current_user_role=current_user["role_in_org"]
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc

@router.get("/members")
async def list_members(current_user: dict = Depends(get_current_user_org)) -> dict:
    try:
        async with get_db_connection() as connection:
            members = await get_organization_members(connection, current_user["organization_id"])
            return {"members": members}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc

class RoleUpdateRequest(BaseModel):
    role: str

@router.patch("/members/{org_user_id}/role")
async def update_member_role_endpoint(
    org_user_id: int, 
    payload: RoleUpdateRequest,
    current_user: dict = Depends(get_current_user_org)
) -> dict:
    try:
        async with get_db_connection() as connection:
            return await update_member_role(
                connection,
                organization_id=current_user["organization_id"],
                target_org_user_id=org_user_id,
                new_role=payload.role,
                current_user_role=current_user["role_in_org"]
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc
