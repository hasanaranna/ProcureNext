# ============================================================
# bids/service.py - Bid Business Logic
# ============================================================

import asyncpg
from app.tasks.document_tasks import upload_bid_documents_to_supabase
from app.modules.payments.service import deduct_tokens_for_bid_submission


async def submit_bid_with_documents(
    connection: asyncpg.Connection,
    vendor_org_id: int,
    submitted_by: int,
    user_id: int,
    tender_id: int,
    financial_amount: float,
    files_data: list[dict],
    description: str | None = None,
) -> dict:
    """
    Creates a bid in Submitted state, deducts tokens, and queues background file upload.
    Mirrors the tender publishing flow exactly.
    """

    # Fetch tender title for transaction description
    tender_row = await connection.fetchrow("SELECT title FROM tenders WHERE tender_id = $1", tender_id)
    tender_title = tender_row["title"] if tender_row else None

    query = """
        INSERT INTO bids (
            vendor_org_id, submitted_by, tender_id, financial_amount, description, status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    """

    async with connection.transaction():
        row = await connection.fetchrow(
            query,
            vendor_org_id,
            submitted_by,
            tender_id,
            financial_amount,
            description,
            "Submitted",
        )

        bid_id = row["bid_id"]

        # Deduct configured tokens from vendor organization
        await deduct_tokens_for_bid_submission(
            connection=connection,
            organization_id=vendor_org_id,
            user_id=user_id,
            tender_id=tender_id,
            bid_id=bid_id,
            tender_title=tender_title,
        )

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
        SELECT 
            bd.bid_doc_id, 
            bd.file_path, 
            COALESCE(dt.type_name, trd.custom_doc_name, 'Document') AS document_type
        FROM bid_documents bd
        LEFT JOIN tender_required_documents trd ON bd.req_doc_id = trd.req_doc_id
        LEFT JOIN document_types dt ON trd.doc_type_id = dt.type_id
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
        SELECT 
            bd.bid_id, 
            bd.bid_doc_id, 
            bd.file_path, 
            COALESCE(dt.type_name, trd.custom_doc_name, 'Document') AS document_type
        FROM bid_documents bd
        LEFT JOIN tender_required_documents trd ON bd.req_doc_id = trd.req_doc_id
        LEFT JOIN document_types dt ON trd.doc_type_id = dt.type_id
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

async def get_vendor_submitted_bids(
    connection: asyncpg.Connection,
    vendor_org_id: int
) -> list[dict]:
    """
    Fetch all bids submitted by a specific vendor.
    Includes the associated tender title.
    """
    bids_query = """
        SELECT b.*, t.title as tender_title
        FROM bids b
        JOIN tenders t ON b.tender_id = t.tender_id
        WHERE b.vendor_org_id = $1
        ORDER BY b.submitted_at DESC
    """
    bids_rows = await connection.fetch(bids_query, vendor_org_id)
    return [dict(r) for r in bids_rows]


async def update_bid(
    connection: asyncpg.Connection,
    bid_id: int,
    vendor_org_id: int,
    financial_amount: float | None = None,
    description: str | None = None,
    status: str | None = None,
) -> dict:
    """
    Update bid details (financial amount, description, status).
    Only the owning vendor organization can update the bid.
    Cannot update if bid is already Accepted or if the tender is Awarded/Closed/Cancelled.
    """
    # 1. Fetch bid and associated tender status
    bid_row = await connection.fetchrow("""
        SELECT b.*, t.status as tender_status
        FROM bids b
        JOIN tenders t ON b.tender_id = t.tender_id
        WHERE b.bid_id = $1
    """, bid_id)

    if not bid_row:
        raise KeyError("Bid not found")

    if bid_row["vendor_org_id"] != vendor_org_id:
        raise PermissionError("You do not have permission to update this bid.")

    if bid_row["status"] == "Accepted":
        raise ValueError("Cannot update an accepted bid.")

    if bid_row["tender_status"] in ("Closed", "Awarded", "Cancelled"):
        raise ValueError(f"Cannot update bid for a tender that is already {bid_row['tender_status']}.")

    # 2. Build dynamic update statement
    fields = []
    args = []
    idx = 1

    if financial_amount is not None:
        fields.append(f"financial_amount = ${idx}")
        args.append(financial_amount)
        idx += 1

    if description is not None:
        fields.append(f"description = ${idx}")
        args.append(description)
        idx += 1

    if status is not None:
        fields.append(f"status = ${idx}")
        args.append(status)
        idx += 1

    if fields:
        fields.append("updated_at = NOW()")
        args.append(bid_id)
        update_query = f"UPDATE bids SET {', '.join(fields)} WHERE bid_id = ${idx} RETURNING *"
        updated_row = await connection.fetchrow(update_query, *args)
        result = dict(updated_row)
    else:
        result = dict(bid_row)

    # 3. Attach documents to response
    docs_query = """
        SELECT 
            bd.bid_doc_id, 
            bd.file_path, 
            COALESCE(dt.type_name, trd.custom_doc_name, 'Document') AS document_type
        FROM bid_documents bd
        LEFT JOIN tender_required_documents trd ON bd.req_doc_id = trd.req_doc_id
        LEFT JOIN document_types dt ON trd.doc_type_id = dt.type_id
        WHERE bd.bid_id = $1
    """
    docs_rows = await connection.fetch(docs_query, bid_id)
    result["documents"] = [dict(r) for r in docs_rows]

    return result


async def delete_bid(
    connection: asyncpg.Connection,
    bid_id: int,
    vendor_org_id: int
) -> dict:
    """
    Deletes a bid, associated DB records (bid documents, securities, notifications),
    and cleans up all associated storage files from Supabase.
    Only the owning vendor organization can delete the bid.
    Accepted bids cannot be deleted.
    """
    from app.services.supabase_storage import delete_files
    import logging
    logger = logging.getLogger(__name__)

    # 1. Verify bid exists and ownership
    bid_row = await connection.fetchrow(
        "SELECT bid_id, vendor_org_id, status FROM bids WHERE bid_id = $1",
        bid_id
    )
    if not bid_row:
        raise KeyError("Bid not found")

    if bid_row["vendor_org_id"] != vendor_org_id:
        raise PermissionError("You do not have permission to delete this bid.")

    if bid_row["status"] == "Accepted":
        raise ValueError("Cannot delete an accepted bid.")

    # 2. Gather storage files for cleanup
    bid_docs = await connection.fetch(
        "SELECT file_path FROM bid_documents WHERE bid_id = $1", bid_id
    )
    bid_secs = await connection.fetch(
        "SELECT bid_security_doc_path FROM bid_securities WHERE bid_id = $1", bid_id
    )

    storage_paths = [r["file_path"] for r in bid_docs if r.get("file_path")]
    storage_paths.extend([r["bid_security_doc_path"] for r in bid_secs if r.get("bid_security_doc_path")])

    # 3. Perform database cascading deletions within a transaction
    async with connection.transaction():
        # Notifications
        await connection.execute("""
            DELETE FROM notification_recipients
            WHERE notification_id IN (
                SELECT notification_id FROM notifications
                WHERE reference_type = 'BID' AND reference_id = $1
            )
        """, bid_id)
        await connection.execute("""
            DELETE FROM notifications
            WHERE reference_type = 'BID' AND reference_id = $1
        """, bid_id)

        # Bid documents and securities
        await connection.execute("DELETE FROM bid_documents WHERE bid_id = $1", bid_id)
        await connection.execute("DELETE FROM bid_securities WHERE bid_id = $1", bid_id)

        # Bid record
        await connection.execute("DELETE FROM bids WHERE bid_id = $1", bid_id)

    # 4. Clean up storage files after successful DB transaction
    if storage_paths:
        try:
            await delete_files(storage_paths)
        except Exception as e:
            logger.warning(f"Failed to delete storage files for bid {bid_id}: {e}")

    return {"message": "Bid and all associated documents deleted successfully.", "bid_id": bid_id}


async def delete_bid_document(
    connection: asyncpg.Connection,
    doc_id: int,
    vendor_org_id: int
) -> dict:
    """
    Deletes a specific bid document from storage and database.
    Only the owning vendor organization can delete the document.
    Cannot delete if bid is already Accepted.
    """
    from app.services.supabase_storage import delete_files
    import logging
    logger = logging.getLogger(__name__)

    doc_row = await connection.fetchrow("""
        SELECT bd.bid_doc_id, bd.file_path, b.vendor_org_id, b.status as bid_status
        FROM bid_documents bd
        JOIN bids b ON bd.bid_id = b.bid_id
        WHERE bd.bid_doc_id = $1
    """, doc_id)

    if not doc_row:
        raise KeyError("Document not found")

    if doc_row["vendor_org_id"] != vendor_org_id:
        raise PermissionError("You do not have permission to delete this document.")

    if doc_row["bid_status"] == "Accepted":
        raise ValueError("Cannot delete documents for an accepted bid.")

    file_path = doc_row["file_path"]

    await connection.execute("DELETE FROM bid_documents WHERE bid_doc_id = $1", doc_id)

    if file_path:
        try:
            await delete_files([file_path])
        except Exception as e:
            logger.warning(f"Failed to delete storage file {file_path}: {e}")

    return {"message": "Bid document deleted successfully.", "doc_id": doc_id}

