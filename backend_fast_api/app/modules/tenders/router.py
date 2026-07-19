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
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.tenders.schemas import TenderCreateRequest, TenderResponse
from app.modules.tenders.service import publish_tender_with_documents

router = APIRouter(prefix="/tenders", tags=["Tenders"])

TEMP_UPLOAD_DIR = "/app/uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

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
    # 1. Parse JSON inputs
    try:
        tender_dict = json.loads(tender_data)
        tender_req = TenderCreateRequest(**tender_dict)
        custom_names = json.loads(file_names)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {e}")

    if len(custom_names) != len(files):
        raise HTTPException(status_code=400, detail="Number of file_names must match number of files")

    # 2. Save files locally to temp folder for Celery
    files_data = []
    for i, file_obj in enumerate(files):
        if not file_obj.filename:
            continue
            
        custom_name = custom_names[i]
        safe_filename = f"{uuid.uuid4().hex}_{file_obj.filename}"
        local_path = os.path.join(TEMP_UPLOAD_DIR, safe_filename)
        
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file_obj.file, buffer)
            
        files_data.append({
            "local_path": local_path,
            "custom_name": custom_name
        })

    # Dummy organization_id retrieval for buyer (in a real app, this comes from current_user)
    # Using 1 for simplicity since this is a POC. The real auth logic needs to fetch it.
    buyer_id = current_user.get("organization_id", 1)
    org_user_id = current_user.get("org_user_id", 1)

    # 3. Save to DB and Dispatch background task
    try:
        async with get_db_connection() as connection:
            new_tender = await publish_tender_with_documents(
                connection=connection,
                buyer_id=buyer_id,
                user_id=org_user_id,
                tender_data=tender_req,
                files_data=files_data
            )
            return new_tender
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

