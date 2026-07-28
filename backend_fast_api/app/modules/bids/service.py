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

async def get_bid_document_by_id(connection: asyncpg.Connection, doc_id: int) -> dict | None:
    """Fetch bid document by its ID."""
    query = "SELECT * FROM bid_documents WHERE bid_doc_id = $1"
    row = await connection.fetchrow(query, doc_id)
    return dict(row) if row else None

async def get_bids_for_buyer_tender(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int
) -> list[dict]:
    """
    Fetch all bids for a specific tender, verifying the tender belongs to the buyer.
    Includes vendor organization names and bid documents.
    """
    # First verify the tender belongs to the buyer
    tender_query = "SELECT tender_id FROM tenders WHERE tender_id = $1 AND buyer_id = $2"
    tender_row = await connection.fetchrow(tender_query, tender_id, buyer_org_id)
    if not tender_row:
        raise ValueError("Tender not found or does not belong to this organization.")

    # Fetch bids with vendor organization details
    bids_query = """
        SELECT b.*, o.organization_name as vendor_name
        FROM bids b
        JOIN organizations o ON b.vendor_org_id = o.organization_id
        WHERE b.tender_id = $1
    """
    bids_rows = await connection.fetch(bids_query, tender_id)
    
    if not bids_rows:
        return []

    bids_list = [dict(r) for r in bids_rows]
    bid_ids = [b["bid_id"] for b in bids_list]

    # Fetch documents for these bids
    docs_query = """
        SELECT bd.bid_id, bd.bid_doc_id, bd.file_path, dt.type_name as document_type
        FROM bid_documents bd
        JOIN document_types dt ON bd.doc_type_id = dt.type_id
        WHERE bd.bid_id = ANY($1)
    """
    docs_rows = await connection.fetch(docs_query, bid_ids)
    
    # Group documents by bid_id
    docs_by_bid = {}
    for doc in docs_rows:
        bid_id = doc["bid_id"]
        if bid_id not in docs_by_bid:
            docs_by_bid[bid_id] = []
        docs_by_bid[bid_id].append(dict(doc))
        
    for bid in bids_list:
        bid["documents"] = docs_by_bid.get(bid["bid_id"], [])
        
    return bids_list

async def accept_bid_for_tender(
    connection: asyncpg.Connection,
    bid_id: int,
    buyer_org_id: int,
    user_id: int
) -> dict:
    """
    Accepts a specific bid, rejects other pending bids, updates the tender status,
    and creates an award record.
    """
    async with connection.transaction():
        # 1. Verify bid and tender ownership
        verify_query = """
            SELECT b.tender_id, t.buyer_id, t.status as tender_status, b.status as bid_status
            FROM bids b
            JOIN tenders t ON b.tender_id = t.tender_id
            WHERE b.bid_id = $1
        """
        row = await connection.fetchrow(verify_query, bid_id)
        
        if not row:
            raise ValueError("Bid not found.")
        
        if row["buyer_id"] != buyer_org_id:
            raise ValueError("You do not have permission to accept this bid.")
            
        if row["tender_status"] in ('Awarded', 'Cancelled', 'Closed'):
            raise ValueError(f"Cannot accept bid, tender is already {row['tender_status']}.")
            
        if row["bid_status"] not in ('Draft', 'Submitted', 'UnderEvaluation'):
            raise ValueError(f"Cannot accept bid with status {row['bid_status']}.")
            
        tender_id = row["tender_id"]

        # 2. Update selected bid status to 'Accepted'
        update_accepted_query = """
            UPDATE bids SET status = 'Accepted', updated_at = NOW()
            WHERE bid_id = $1
            RETURNING *
        """
        accepted_bid = dict(await connection.fetchrow(update_accepted_query, bid_id))

        # 3. Update other pending bids to 'Rejected'
        update_rejected_query = """
            UPDATE bids SET status = 'Rejected', updated_at = NOW()
            WHERE tender_id = $1 AND bid_id != $2 AND status IN ('Draft', 'Submitted', 'UnderEvaluation')
        """
        await connection.execute(update_rejected_query, tender_id, bid_id)

        # 4. Update tender status to 'Awarded'
        update_tender_query = """
            UPDATE tenders SET status = 'Awarded', updated_at = NOW()
            WHERE tender_id = $1
        """
        await connection.execute(update_tender_query, tender_id)

        # 5. Insert record into awards
        insert_award_query = """
            INSERT INTO awards (winning_bid_id, awarded_by, tender_id)
            VALUES ($1, $2, $3)
            RETURNING *
        """
        await connection.execute(insert_award_query, bid_id, user_id, tender_id)

        return accepted_bid
