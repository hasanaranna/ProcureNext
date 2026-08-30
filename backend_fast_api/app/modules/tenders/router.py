# ============================================================
# tenders/router.py - Tender Management API Endpoints
# ============================================================
# COVERS: FR-08 (Tender Creation & Management), FR-02 (Browse Tenders)
#
# Tenders are the core entity. A Buyer organization creates tenders,
# Vendor organizations bid on them.
#
# ENDPOINTS:
#
# --- Buyer Endpoints ---
#
# POST /buyer/tender
#   - Create a new tender (draft or publish immediately)
#   - Accepts: title, description, category, procurement_nature,
#     procurement_method, visibility (Public/Restricted), budget_min,
#     budget_max, budget_type, submission_deadline, document_price,
#     security_required, evaluation_type, required_documents_list,
#     bid_bond_amount
#   - Supports single-item or packaged tenders (multiple lots)
#   - Uploaded PDFs sent to ML service for parsing & vectorization
#   - Deducts credit points from buyer's account
#
# GET /buyer/jobs
#   - List all tenders created by the buyer's organization
#   - Filter by status: Draft, Published, Closed, Awarded, Cancelled
#
# PUT /tenders/{tender_id}
#   - Update tender details (only if Draft or Published with no bids)
#
# POST /tenders/{tender_id}/publish
#   - Publish a draft tender (changes status Draft -> Published)
#   - Triggers notifications to matching vendors
#
# POST /tenders/{tender_id}/withdraw
#   - Cancel/withdraw a tender
#   - No refund of points for buyer, but refund for vendors who bid
#
# POST /tenders/{tender_id}/amendments
#   - Upload an amendment PDF explaining changes to a published tender
#   - Notifies all vendors who have viewed/bid on this tender
#
# POST /tenders/{tender_id}/lots
#   - Add a lot/package to a tender
#
# PUT /tenders/{tender_id}/lots/{lot_id}
#   - Update lot details
#
# DELETE /tenders/{tender_id}/lots/{lot_id}
#   - Remove a lot from a tender
#
# --- Tender Detail (Public & Auth) ---
#
# GET /tenders/{tender_id}
#   - Get full tender details
#   - Public users: see limited info (title, buyer, category, dates)
#   - Registered users: see full details based on visibility settings
#   - Restricted tenders: only visible to invited vendors with signed NDA
#
# GET /tenders/{tender_id}/documents
#   - Download tender documents (PDFs, scope of work, BOQ)
#   - Public docs available to all; restricted docs need auth + NDA
#
# --- Clarifications ---
#
# GET /tenders/{tender_id}/clarifications
#   - View clarification Q&A for a tender (vendor questions + buyer answers)
#
# POST /tenders/{tender_id}/clarifications
#   - Vendor asks a clarification question about the tender
#
# POST /tenders/{tender_id}/clarifications/{query_id}/reply
#   - Buyer answers a vendor's clarification question
# ============================================================

import os
import json
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, status
from fastapi.responses import JSONResponse
from celery.result import AsyncResult
from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.tenders.schemas import (
    TenderCreateRequest,
    TenderUpdateRequest,
    TenderResponse,
    TenderListItem,
    TenderDetailResponse,
    UpdateTenderReqDocAccessRequest,
    OngoingTenderListItem,
    OngoingTenderDetail,
    PublicTenderListItem,
    PublicTenderDetailResponse,
    TenderPdfExtractResponse,
    TenderPdfJobResponse,
    TenderPdfJobStatus,
    VendorRecommendationResponse,
)
from app.modules.tenders.service import (
    publish_tender_with_documents,
    save_draft_with_documents,
    publish_draft_tender,
    update_tender,
    withdraw_tender,
    get_buyer_tenders,
    get_all_published_tenders,
    get_tender_detail,
    update_tender_required_document_roles,
    get_ongoing_tenders,
    get_ongoing_tender_detail,
    delete_tender,
    delete_tender_document,
    get_public_active_tenders,
    get_public_tender_detail,
    get_vendor_recommendations_for_tender,
)
from app.services.ml_client import parse_and_embed_tender_pdf
from app.tasks.celery_app import celery_app
from app.tasks.ml_tasks import create_tender_from_pdf_task

router = APIRouter(prefix="/tenders", tags=["Tenders"])


TEMP_UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads")))
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)


def _parse_tender_form_payload(tender_data: str, file_names: str, files: List[UploadFile]):
    try:
        tender_dict = json.loads(tender_data)
        tender_req = TenderCreateRequest(**tender_dict)
        custom_names = json.loads(file_names) if file_names else []
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {exc}") from exc

    if not isinstance(custom_names, list):
        raise HTTPException(status_code=400, detail="file_names must be a JSON array.")
    if len(custom_names) != len(files):
        raise HTTPException(status_code=400, detail="Number of file_names must match number of files.")

    files_data = []
    for i, file_obj in enumerate(files):
        if not file_obj.filename:
            continue
        custom_name = custom_names[i]
        safe_filename = f"{uuid.uuid4().hex}_{file_obj.filename}"
        local_path = os.path.join(TEMP_UPLOAD_DIR, safe_filename)
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file_obj.file, buffer)
        files_data.append({"local_path": local_path, "custom_name": custom_name})

    return tender_req, files_data


def _cleanup_local_files(files_data: list[dict]) -> None:
    for f in files_data:
        local_path = f.get("local_path")
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception:
                pass

@router.post("/extract-from-pdf", response_model=TenderPdfExtractResponse)
async def extract_from_pdf(
    file: UploadFile = File(...)
):
    """
    Send only the PDF to extract structured JSON and 384-dimensional vector embedding.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        content = await file.read()
        parsed = await parse_and_embed_tender_pdf(content)
        return TenderPdfExtractResponse(
            title=parsed.title,
            description=parsed.description,
            procurement_nature=parsed.procurement_nature,
            procurement_method=parsed.procurement_method,
            category=parsed.category,
            eligibility_of_tenderer=parsed.eligibility_of_tenderer,
            budget_min=parsed.budget_min,
            budget_max=parsed.budget_max,
            submission_deadline=parsed.submission_deadline,
            tender_public_date=parsed.tender_public_date,
            pre_bid_meeting=parsed.pre_bid_meeting,
            tender_opening_date=parsed.tender_opening_date,
            embedding=parsed.embedding
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {e}")


@router.post("/buyer/create-from-pdf", response_model=TenderPdfJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_tender_from_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_org)
):
    """
    Queue async tender creation from PDF.
    Poll GET /buyer/create-from-pdf/jobs/{task_id} for the result.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    local_path = os.path.join(TEMP_UPLOAD_DIR, safe_filename)

    try:
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temporary PDF file: {e}")

    buyer_id = current_user.get("organization_id", 1)
    org_user_id = current_user.get("org_user_id", 1)
    user_id = current_user.get("user_id") or current_user.get("org_user_id", 1)

    task = create_tender_from_pdf_task.delay(
        buyer_id=buyer_id,
        org_user_id=org_user_id,
        user_id=user_id,
        pdf_path=local_path,
        original_filename=file.filename,
    )

    return TenderPdfJobResponse(
        task_id=task.id,
        status="processing",
        message="Tender PDF processing started.",
    )


@router.get("/buyer/create-from-pdf/jobs/{task_id}", response_model=TenderPdfJobStatus)
async def get_create_tender_from_pdf_job(task_id: str):
    result = AsyncResult(task_id, app=celery_app)

    if result.state == "PENDING":
        return TenderPdfJobStatus(task_id=task_id, status="processing")
    if result.state == "STARTED":
        return TenderPdfJobStatus(task_id=task_id, status="processing")
    if result.state == "SUCCESS":
        return TenderPdfJobStatus(task_id=task_id, status="completed", result=result.result)
    if result.state == "FAILURE":
        error_message = str(result.result) if result.result else "Tender PDF processing failed."
        return TenderPdfJobStatus(task_id=task_id, status="failed", error=error_message)

    return TenderPdfJobStatus(task_id=task_id, status=result.state.lower())


@router.post("/buyer/publish-with-documents", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
async def publish_with_documents(
    tender_data: str = Form(...),
    file_names: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user_org)
):
    """
    Publish a tender with documents.
    - tender_data: JSON string of TenderCreateRequest
    - file_names: JSON string list of custom names matching the files array length
    - files: Multiple files to upload
    """
    # 1. Parse JSON inputs and save any uploaded files
    try:
        tender_req, files_data = _parse_tender_form_payload(tender_data, file_names, files)
    except HTTPException:
        raise

    buyer_id = current_user.get("organization_id", 1)
    org_user_id = current_user.get("org_user_id", 1)
    user_id = current_user.get("user_id") or current_user.get("org_user_id", 1)

    try:
        async with get_db_connection() as connection:
            new_tender = await publish_tender_with_documents(
                connection=connection,
                buyer_id=buyer_id,
                org_user_id=org_user_id,
                user_id=user_id,
                tender_data=tender_req,
                files_data=files_data
            )
            return new_tender
    except Exception as e:
        _cleanup_local_files(files_data)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.post("/buyer/draft-with-documents", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
async def save_draft_with_documents_endpoint(
    tender_data: str = Form(...),
    file_names: str = Form(default="[]"),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user_org),
):
    """
    Save a tender as Draft without deducting tokens. Documents are optional.
    """
    try:
        tender_req, files_data = _parse_tender_form_payload(tender_data, file_names, files)
    except HTTPException:
        raise

    if not tender_req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required to save a draft.")

    buyer_id = current_user.get("organization_id", 1)
    org_user_id = current_user.get("org_user_id", 1)
    user_id = current_user.get("user_id") or current_user.get("org_user_id", 1)

    try:
        async with get_db_connection() as connection:
            return await save_draft_with_documents(
                connection=connection,
                buyer_id=buyer_id,
                org_user_id=org_user_id,
                user_id=user_id,
                tender_data=tender_req,
                files_data=files_data,
            )
    except Exception as e:
        _cleanup_local_files(files_data)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {e}")



@router.get("/buyer/my-tenders", response_model=List[TenderListItem])
async def list_buyer_tenders(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_org),
):
    """
    List tenders owned by the current user's buyer organization.
    Optionally filter by status (Draft, Published, Closed, Awarded, Cancelled).
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            tenders = await get_buyer_tenders(connection, buyer_org_id, status=status)
            return tenders
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/public/active", response_model=List[PublicTenderListItem])
async def list_active_public_tenders(
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Public Read-Only Endpoint: Browse currently active published tenders.
    Accessible without authentication by unregistered visitors.
    """
    try:
        async with get_db_connection() as connection:
            return await get_public_active_tenders(
                connection=connection,
                category_id=category_id,
                search=search,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/public/{tender_id}", response_model=PublicTenderDetailResponse)
async def get_public_tender_detail_endpoint(
    tender_id: int,
):
    """
    Public Read-Only Endpoint: Retrieve complete public notice, scope,
    administrative/legal details, key dates, financial terms, and eligibility checklist.
    Accessible without authentication.
    """
    try:
        async with get_db_connection() as connection:
            tender = await get_public_tender_detail(connection, tender_id)
            if tender is None:
                raise HTTPException(status_code=404, detail="Public tender not found or is restricted/closed.")
            return tender
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/seller/all-tenders", response_model=List[TenderListItem])

async def list_all_tenders_for_seller(
    enlisted_only: bool = False,
    current_user: dict = Depends(get_current_user_org)
):
    """
    List all published tenders for seller browsing, optionally filtered by enlisted buyers.
    """
    try:
        vendor_org_id = current_user.get("organization_id")
        async with get_db_connection() as connection:
            tenders = await get_all_published_tenders(
                connection,
                vendor_org_id=vendor_org_id,
                enlisted_only=enlisted_only
            )
            return tenders
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/{tender_id}/detail", response_model=TenderDetailResponse)
async def get_tender_details(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Get full details of a specific tender (including documents).
    """
    try:
        async with get_db_connection() as connection:
            tender = await get_tender_detail(connection, tender_id)
            if tender is None:
                raise HTTPException(status_code=404, detail="Tender not found")
                
            buyer_id = tender["buyer_id"]
            org_row = await connection.fetchrow(
                "SELECT primary_contact FROM organizations WHERE organization_id = $1",
                buyer_id
            )
            primary_contact = org_row["primary_contact"] if org_row else None
            
            user_id = current_user.get("user_id")
            org_user_id = current_user.get("org_user_id")
            role_in_org = current_user.get("role_in_org")
            
            can_manage = False
            if org_user_id == tender["created_by"]:
                can_manage = True
            elif user_id == primary_contact or role_in_org == "Owner":
                can_manage = True
                
            tender["can_manage_document_access"] = can_manage
            
            return tender
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/{tender_id}/recommendations", response_model=VendorRecommendationResponse)
async def get_tender_vendor_recommendations(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    FR-09: Fetch explainable recommendations of top matching vendors for a tender.
    Buyer only. Evaluates category capabilities, mutual ratings, certifications, and enlistment.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await get_vendor_recommendations_for_tender(connection, tender_id, buyer_org_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendations: {e}")


@router.get("/documents/{doc_id}/view")
async def view_tender_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Generate a signed URL for a tender document and return it.
    """
    from app.services.supabase_storage import generate_signed_url

    try:
        async with get_db_connection() as connection:
            row = await connection.fetchrow(
                "SELECT file_name, file_path FROM tender_documents WHERE tender_doc_id = $1",
                doc_id
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Document not found")

            file_path = row["file_path"]
            if not file_path:
                raise HTTPException(status_code=404, detail="Document file path is missing")

            signed_url = await generate_signed_url(file_path, expires_in=3600)
            return {"url": signed_url, "file_name": row["file_name"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating document URL: {e}")


@router.put("/{tender_id}/required-documents/access")
async def update_required_document_access(
    tender_id: int,
    payload: UpdateTenderReqDocAccessRequest,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Update role-based access control for required documents of a tender.
    """
    try:
        async with get_db_connection() as connection:
            row = await connection.fetchrow(
                "SELECT created_by, buyer_id FROM tenders WHERE tender_id = $1", 
                tender_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Tender not found")
                
            tender_created_by = row["created_by"]
            buyer_id = row["buyer_id"]
            
            org_row = await connection.fetchrow(
                "SELECT primary_contact FROM organizations WHERE organization_id = $1",
                buyer_id
            )
            primary_contact = org_row["primary_contact"] if org_row else None
            
            user_id = current_user.get("user_id")
            org_user_id = current_user.get("org_user_id")
            role_in_org = current_user.get("role_in_org")
            
            is_authorized = False
            if org_user_id == tender_created_by:
                is_authorized = True
            elif user_id == primary_contact or role_in_org == "Owner":
                is_authorized = True
                
            if not is_authorized:
                return JSONResponse(
                    status_code=403,
                    content={
                        "status": 403,
                        "code": "ACCESS_DENIED",
                        "message": "Permission denied. Only the tender creator or organization owner can modify document access settings."
                    }
                )

            updates = [item.dict() for item in payload.documents]
            await update_tender_required_document_roles(connection, tender_id, updates)
            return {"message": "Document access updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/ongoing", response_model=List[OngoingTenderListItem])
async def list_ongoing_tenders(
    current_user: dict = Depends(get_current_user_org)
):
    """
    List all ongoing (awarded) tenders for the current user's organization.
    Supports both Buyer and Vendor organizations.
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            tenders = await get_ongoing_tenders(connection, org_id)
            return tenders
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/ongoing/{tender_id}", response_model=OngoingTenderDetail)
async def get_ongoing_tender(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Get full details for a specific ongoing (awarded) tender.
    Accessible only if the caller's organization is the buyer or the winning vendor.
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            tender = await get_ongoing_tender_detail(connection, tender_id, org_id)
            if not tender:
                raise HTTPException(status_code=404, detail="Ongoing tender not found or access denied.")
            return tender
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.put("/{tender_id}", response_model=TenderResponse)
async def update_tender_endpoint(
    tender_id: int,
    payload: TenderUpdateRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """Update a Draft tender, or a Published tender with no bids."""
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await update_tender(connection, tender_id, buyer_org_id, payload)
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to update this tender.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.post("/{tender_id}/publish", response_model=TenderResponse)
async def publish_draft_tender_endpoint(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """Publish a Draft tender and deduct tokens."""
    buyer_org_id = current_user.get("organization_id")
    user_id = current_user.get("user_id") or current_user.get("org_user_id")
    if not buyer_org_id or not user_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await publish_draft_tender(connection, tender_id, buyer_org_id, user_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to publish this tender.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.post("/{tender_id}/withdraw")
async def withdraw_tender_endpoint(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """Cancel a tender (soft delete — status becomes Cancelled)."""
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await withdraw_tender(connection, tender_id, buyer_org_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to cancel this tender.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.delete("/{tender_id}")
async def delete_existing_tender(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Delete a tender and clean up all associated records and storage files.
    Buyer only. Cannot delete awarded tenders.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            result = await delete_tender(connection, tender_id, buyer_org_id)
            return result
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this tender.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.delete("/documents/{doc_id}")
async def delete_single_tender_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Delete a single tender document from storage and database.
    Buyer only.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            result = await delete_tender_document(connection, doc_id, buyer_org_id)
            return result
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


