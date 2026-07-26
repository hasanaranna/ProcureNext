# ============================================================
# bids/service.py - Bid Business Logic
# ============================================================

import asyncpg
from app.tasks.document_tasks import upload_bid_documents_to_supabase


async def submit_bid_with_documents(
    connection: asyncpg.Connection,
    vendor_org_id: int,
    submitted_by: int,
    tender_id: int,
    financial_amount: float,
    files_data: list[dict],
) -> dict:
    """
    Creates a bid in Submitted state and queues background file upload.
    Mirrors the tender publishing flow exactly.
    """

    query = """
        INSERT INTO bids (
            vendor_org_id, submitted_by, tender_id, financial_amount, status
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    """

    row = await connection.fetchrow(
        query,
        vendor_org_id,
        submitted_by,
        tender_id,
        financial_amount,
        "Submitted",
    )

    bid_id = row["bid_id"]

    if files_data:
        # Dispatch Celery task to upload the local files to Supabase
        upload_bid_documents_to_supabase.delay(bid_id, files_data)

    return dict(row)

async def get_bid_by_tender_and_vendor(
    connection: asyncpg.Connection,
    tender_id: int,
    vendor_org_id: int
) -> dict | None:
    """
    Fetch a vendor's bid for a specific tender, including documents.
    """
    bid_query = """
        SELECT * FROM bids 
        WHERE tender_id = $1 AND vendor_org_id = $2
    """
    bid_row = await connection.fetchrow(bid_query, tender_id, vendor_org_id)
    if not bid_row:
        return None

    bid_dict = dict(bid_row)

    docs_query = """
        SELECT bd.bid_doc_id, bd.file_path, dt.type_name as document_type
        FROM bid_documents bd
        JOIN document_types dt ON bd.doc_type_id = dt.type_id
        WHERE bd.bid_id = $1
    """
    docs_rows = await connection.fetch(docs_query, bid_dict["bid_id"])
    bid_dict["documents"] = [dict(r) for r in docs_rows]

    return bid_dict
