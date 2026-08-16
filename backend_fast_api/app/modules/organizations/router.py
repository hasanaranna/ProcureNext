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
from app.modules.organizations.schemas import (
    OrgCreateRequest,
    OrgCreateResponse,
    OrgInvitationCreateRequest,
    OrgSearchItem,
    EnlistedOrgItem,
    OrgProfileResponse
)
from app.modules.organizations.service import (
    create_master_organization,
    create_or_update_invitation,
    get_invitation_details_by_token,
    get_organization_members,
    update_member_role,
    get_organization_invitations,
    delete_organization_invitation,
    search_organizations,
    enlist_organization,
    delist_organization,
    get_enlisted_organizations,
    get_organization_profile
)
from app.services.supabase_storage import (
    build_registration_prefix,
    upload_optional_file,
    upload_optional_files,
    delete_files
)

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
    uploaded_files: list[str] = []

    try:
        # 1. Pre-validate that user doesn't already exist before uploading files
        async with get_db_connection() as connection:
            existing_user = await connection.fetchrow(
                "SELECT user_id, email, nid FROM users WHERE email = $1 OR nid = $2",
                email,
                nid,
            )
            if existing_user is not None:
                if existing_user["email"] == email:
                    raise HTTPException(status_code=409, detail="A user with this email already exists.")
                raise HTTPException(status_code=409, detail="A user with this NID already exists.")

        # 2. Upload files tracking all uploaded paths for cleanup if later step fails
        nid_front_url = await upload_optional_file(nid_front, f"{storage_prefix}/nid")
        if nid_front_url:
            uploaded_files.append(nid_front_url)

        nid_back_url = await upload_optional_file(nid_back, f"{storage_prefix}/nid")
        if nid_back_url:
            uploaded_files.append(nid_back_url)

        trade_license_url = await upload_optional_file(trade_license, f"{storage_prefix}/org")
        if trade_license_url:
            uploaded_files.append(trade_license_url)

        tin_certificate_url = await upload_optional_file(tin_certificate, f"{storage_prefix}/org")
        if tin_certificate_url:
            uploaded_files.append(tin_certificate_url)

        vat_certificate_url = await upload_optional_file(vat_certificate, f"{storage_prefix}/org")
        if vat_certificate_url:
            uploaded_files.append(vat_certificate_url)

        additional_document_urls = await upload_optional_files(additional_docs, f"{storage_prefix}/org/additional")
        uploaded_files.extend(additional_document_urls)

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

        async with get_db_connection() as connection:
            return await create_master_organization(connection, payload)
    except Exception as exc:
        # Clean up any files that were uploaded to Supabase Storage if the operation failed!
        if uploaded_files:
            try:
                await delete_files(uploaded_files)
            except Exception as del_exc:
                print(f"[STORAGE CLEANUP ERROR] {del_exc}", flush=True)

        if isinstance(exc, HTTPException):
            raise exc
        if isinstance(exc, asyncpg.PostgresError):
            print(f"[DB ERROR] {exc}", flush=True)
            raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
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


@router.get("/search", response_model=list[OrgSearchItem])
async def search_orgs(
    q: str | None = None,
    type: str | None = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user_org)
) -> list[dict]:
    """
    Search organizations by keyword (name, description, address) and optional type filter.
    Returns whether each organization is currently enlisted by the caller's organization.
    """
    current_org_id = current_user.get("organization_id")
    try:
        async with get_db_connection() as connection:
            return await search_organizations(
                connection=connection,
                query=q,
                org_type=type,
                current_org_id=current_org_id,
                limit=limit
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.get("/profile/{org_id}", response_model=OrgProfileResponse)
async def get_org_profile(
    org_id: int,
    current_user: dict = Depends(get_current_user_org)
) -> dict:
    """
    Get the full public profile of an organization, including verified documents from Supabase,
    published tenders, and performance rating.
    """
    current_org_id = current_user.get("organization_id")
    try:
        async with get_db_connection() as connection:
            profile = await get_organization_profile(connection, org_id, current_org_id)
            if not profile:
                raise HTTPException(status_code=404, detail="Organization not found.")
            return profile
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.get("/enlisted", response_model=list[EnlistedOrgItem])
async def list_enlisted(
    current_user: dict = Depends(get_current_user_org)
) -> list[dict]:
    """
    List all organizations currently enlisted by the caller's organization.
    """
    current_org_id = current_user.get("organization_id")
    if not current_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await get_enlisted_organizations(connection, current_org_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.post("/enlist/{target_org_id}")
async def enlist_org_endpoint(
    target_org_id: int,
    current_user: dict = Depends(get_current_user_org)
) -> dict:
    """
    Enlist target organization as a vendor or buyer counterpart.
    """
    current_org_id = current_user.get("organization_id")
    org_user_id = current_user.get("org_user_id")
    if not current_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await enlist_organization(connection, current_org_id, target_org_id, org_user_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.delete("/enlist/{target_org_id}")
async def delist_org_endpoint(
    target_org_id: int,
    current_user: dict = Depends(get_current_user_org)
) -> dict:
    """
    Delist / remove target organization from caller organization's enlisted list.
    """
    current_org_id = current_user.get("organization_id")
    if not current_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await delist_organization(connection, current_org_id, target_org_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc
