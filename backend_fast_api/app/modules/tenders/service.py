# ============================================================
# tenders/service.py - Tender Business Logic
# ============================================================
# PURPOSE:
# Core business logic for the tender lifecycle.
#
# FUNCTIONS TO IMPLEMENT:
# - create_tender(): Validate buyer org, deduct credits, create
#   tender + lots, upload docs to S3, trigger ML parsing task
# - get_tender(): Fetch tender with visibility enforcement
# - update_tender(): Update tender (Draft only or Published with rules)
# - publish_tender(): Draft -> Published, trigger vendor notifications
# - withdraw_tender(): Cancel tender, handle vendor bid refunds
# - add_amendment(): Upload amendment PDF, notify affected vendors
# - create_lot(): Add lot to tender
# - update_lot(): Modify lot details
# - delete_lot(): Remove lot (if no bids on it)
# - list_buyer_tenders(): Paginated list for buyer dashboard
# - list_public_tenders(): Public tender browsing with limited info
# - get_tender_documents(): Fetch docs with access control
# - create_clarification(): Vendor asks question
# - reply_clarification(): Buyer provides answer
# - list_clarifications(): Q&A thread for a tender
# - auto_close_expired_tenders(): Background job to close tenders
#   past their submission_deadline
#   past their submission_deadline
# ============================================================

import asyncpg
from app.modules.tenders.schemas import TenderCreateRequest
from app.tasks.document_tasks import upload_tender_documents_to_supabase

async def publish_tender_with_documents(
    connection: asyncpg.Connection, 
    buyer_id: int, 
    user_id: int, 
    tender_data: TenderCreateRequest, 
    files_data: list[dict]
) -> dict:
    """
    Creates a tender directly in Published state and queues background file upload.
    """
    
    query = """
        INSERT INTO tenders (
            buyer_id, created_by, title, description, visibility_type, budget_min, budget_max, status,
            submission_deadline, tender_public_date, pre_bid_meeting, tender_opening_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
    """
    
    row = await connection.fetchrow(
        query,
        buyer_id,
        user_id,
        tender_data.title,
        tender_data.description,
        tender_data.visibility_type.value,
        tender_data.budget_min,
        tender_data.budget_max,
        "Published",
        tender_data.submission_deadline,
        tender_data.tender_public_date,
        tender_data.pre_bid_meeting,
        tender_data.tender_opening_date
    )
    
    tender_id = row['tender_id']

    if files_data:
        # Dispatch Celery task to upload the local files to Supabase
        upload_tender_documents_to_supabase.delay(tender_id, files_data)

    return dict(row)
