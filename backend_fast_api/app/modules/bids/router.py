# ============================================================
# bids/router.py - Bid Management API Endpoints
# ============================================================

import os
import json
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.bids.evaluation_schemas import EvaluationRunResponse, EvaluationRunWithResults
from app.modules.bids.evaluation_service import (
    get_latest_run_with_results,
    get_run_with_results_for_buyer,
    trigger_evaluation_run,
)
from app.modules.bids.schemas import (
    BidResponse,
    BidListItem,
    BidUpdateRequest,
    TenderBidComparisonResponse,
)
from app.modules.bids.service import (
    submit_bid_with_documents,
    get_bid_by_tender_and_vendor,
    get_bid_document_by_id,
    get_bids_for_buyer_tender,
    get_tender_bid_comparison,
    accept_bid_for_tender,
    get_vendor_submitted_bids,
    update_bid,
    delete_bid,
    delete_bid_document
)
from app.services.supabase_storage import generate_signed_url

router = APIRouter(prefix="/bids", tags=["Bids"])


TEMP_UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads")))
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)


@router.post("/vendor/submit-with-documents", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
async def submit_bid(
    bid_data: str = Form(...),
    doc_type_names: str = Form("[]"),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user_org)
):
    """
    Submit a bid with documents.
    - bid_data: JSON string with keys: tender_id, financial_amount
    - doc_type_names: JSON string list of document type names matching the files array
      (e.g. ["TIN", "TradeLicense", "Other"])
    - files: Multiple PDF files to upload
    """
    # 1. Parse JSON inputs
    try:
        bid_dict = json.loads(bid_data)
        tender_id = int(bid_dict["tender_id"])
        financial_amount = float(bid_dict["financial_amount"])
        description = bid_dict.get("description")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid bid_data JSON: {e}")

    try:
        type_names = json.loads(doc_type_names)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type_names JSON: {e}")

    # Filter out empty file uploads (files with no filename)
    actual_files = [f for f in files if f.filename]

    if len(type_names) != len(actual_files):
        raise HTTPException(
            status_code=400,
            detail=f"Number of doc_type_names ({len(type_names)}) must match number of files ({len(actual_files)})"
        )

    # 2. Save files locally to temp folder for Celery
    files_data = []
    for i, file_obj in enumerate(actual_files):
        doc_type_name = type_names[i]
        safe_filename = f"{uuid.uuid4().hex}_{file_obj.filename}"
        local_path = os.path.join(TEMP_UPLOAD_DIR, safe_filename)

        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file_obj.file, buffer)

        files_data.append({
            "local_path": local_path,
            "doc_type_name": doc_type_name,
        })

    vendor_org_id = current_user.get("organization_id", 1)
    org_user_id = current_user.get("org_user_id", 1)
    user_id = current_user.get("user_id") or current_user.get("org_user_id", 1)

    # 3. Save to DB and dispatch background task
    try:
        async with get_db_connection() as connection:
            new_bid = await submit_bid_with_documents(
                connection=connection,
                vendor_org_id=vendor_org_id,
                submitted_by=org_user_id,
                user_id=user_id,
                tender_id=tender_id,
                financial_amount=financial_amount,
                files_data=files_data,
                description=description,
            )
            return new_bid
    except Exception as e:
        for f in files_data:
            if os.path.exists(f["local_path"]):
                try:
                    os.remove(f["local_path"])
                except Exception:
                    pass
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/vendor/tender/{tender_id}", response_model=BidResponse)
async def get_vendor_bid_for_tender(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Fetch the current vendor's bid for a specific tender.
    Returns 404 if no bid has been submitted.
    """
    vendor_org_id = current_user.get("organization_id")
    if not vendor_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            bid = await get_bid_by_tender_and_vendor(connection, tender_id, vendor_org_id)
            if not bid:
                raise HTTPException(status_code=404, detail="No bid found for this tender.")
            return bid
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@router.get("/vendor/my-bids", response_model=List[BidListItem])
async def get_my_bids(
    current_user: dict = Depends(get_current_user_org)
):
    """
    Fetch all bids submitted by the current vendor.
    """
    vendor_org_id = current_user.get("organization_id")
    if not vendor_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            bids = await get_vendor_submitted_bids(connection, vendor_org_id)
            return bids
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@router.get("/documents/{doc_id}/view")
async def view_bid_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Get a signed URL to view a bid document.
    """
    try:
        async with get_db_connection() as connection:
            doc = await get_bid_document_by_id(connection, doc_id)
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            url = await generate_signed_url(doc["file_path"], expires_in=3600)
            if not url:
                raise HTTPException(status_code=500, detail="Failed to generate signed URL")
            
            return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@router.get("/buyer/tender/{tender_id}")
async def get_buyer_bids_for_tender(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Fetch all bids for a specific tender. Buyer only.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            bids = await get_bids_for_buyer_tender(connection, tender_id, buyer_org_id)
            return bids
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/buyer/tender/{tender_id}/compare", response_model=TenderBidComparisonResponse)
async def compare_buyer_bids_for_tender(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Fetch multi-dimensional side-by-side comparison of all bids for a specific tender.
    Buyer only. Includes financial metrics, vendor reputation, document compliance, and securities.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            comparison_data = await get_tender_bid_comparison(connection, tender_id, buyer_org_id)
            return comparison_data
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.post("/buyer/{bid_id}/accept")

async def accept_bid(
    bid_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Accept a specific bid and reject other pending bids for the same tender.
    """
    buyer_org_id = current_user.get("organization_id")
    user_id = current_user.get("org_user_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            accepted_bid = await accept_bid_for_tender(connection, bid_id, buyer_org_id, user_id)
            return {"message": "Bid accepted successfully.", "bid": accepted_bid}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.put("/{bid_id}", response_model=BidResponse)
async def update_existing_bid(
    bid_id: int,
    payload: BidUpdateRequest,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Update a bid's financial amount, description, or status.
    Vendor only. Cannot update an accepted bid or bid for closed/awarded/cancelled tenders.
    """
    vendor_org_id = current_user.get("organization_id")
    if not vendor_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            updated_bid = await update_bid(
                connection=connection,
                bid_id=bid_id,
                vendor_org_id=vendor_org_id,
                financial_amount=payload.financial_amount,
                description=payload.description,
                status=payload.status.value if payload.status else None,
            )
            return updated_bid
    except KeyError:
        raise HTTPException(status_code=404, detail="Bid not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to update this bid.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.delete("/{bid_id}")
async def delete_existing_bid(
    bid_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Delete a bid and clean up all associated documents and storage files.
    Vendor only. Cannot delete an accepted bid.
    """
    vendor_org_id = current_user.get("organization_id")
    if not vendor_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            result = await delete_bid(connection, bid_id, vendor_org_id)
            return result
    except KeyError:
        raise HTTPException(status_code=404, detail="Bid not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this bid.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.delete("/documents/{doc_id}")
async def delete_single_bid_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Delete a single bid document from storage and database.
    Vendor only. Cannot delete if bid is accepted.
    """
    vendor_org_id = current_user.get("organization_id")
    if not vendor_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            result = await delete_bid_document(connection, doc_id, vendor_org_id)
            return result
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# ============================================================
# Smart Bid Evaluation
# ============================================================

@router.post("/buyer/tender/{tender_id}/evaluate", response_model=EvaluationRunResponse, status_code=status.HTTP_202_ACCEPTED)
async def evaluate_tender_bids(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Trigger a smart bid evaluation run for a tender. Buyer only.
    Creates the run row and dispatches the scoring job in the background —
    returns immediately with the run_id rather than blocking on the LLM.
    If a run is already pending/running for this tender, its id is returned
    instead of starting a duplicate.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            run = await trigger_evaluation_run(connection, tender_id, buyer_org_id, current_user["org_user_id"])
        return run
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/buyer/tender/{tender_id}/evaluation-runs/latest", response_model=EvaluationRunWithResults)
async def get_latest_evaluation_run(
    tender_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Lightweight status/results endpoint the frontend polls after triggering
    an evaluation. Also self-heals a run stuck in pending/running past the
    timeout, so the button always has a way back out.
    """
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            data = await get_latest_run_with_results(connection, tender_id, buyer_org_id)
        if not data:
            raise HTTPException(status_code=404, detail="No evaluation run found for this tender.")
        return data
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/buyer/tender/{tender_id}/evaluation-runs/{run_id}", response_model=EvaluationRunWithResults)
async def get_evaluation_run(
    tender_id: int,
    run_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """Fetch one specific past evaluation run and its results. Buyer only."""
    buyer_org_id = current_user.get("organization_id")
    if not buyer_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            data = await get_run_with_results_for_buyer(connection, tender_id, run_id, buyer_org_id)
        if not data:
            raise HTTPException(status_code=404, detail="Evaluation run not found.")
        return data
    except KeyError:
        raise HTTPException(status_code=404, detail="Tender not found.")
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

