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


async def get_tender_bid_comparison(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int
) -> dict:
    """
    Fetch comprehensive side-by-side comparison data for all bids submitted on a tender.
    Includes financial metrics, budget deviations, vendor credibility & ratings,
    compliance matrices against required documents, and bid securities.
    """
    # 1. Verify tender ownership
    tender_row = await connection.fetchrow("""
        SELECT tender_id, title, status, budget_min, budget_max, buyer_id
        FROM tenders
        WHERE tender_id = $1 AND buyer_id = $2
    """, tender_id, buyer_org_id)

    if not tender_row:
        exists = await connection.fetchval("SELECT 1 FROM tenders WHERE tender_id = $1", tender_id)
        if exists:
            raise PermissionError("You do not have permission to view bids for this tender.")
        raise KeyError("Tender not found")

    budget_min = float(tender_row["budget_min"]) if tender_row["budget_min"] is not None else None
    budget_max = float(tender_row["budget_max"]) if tender_row["budget_max"] is not None else None

    # 2. Fetch tender required documents
    req_docs_rows = await connection.fetch("""
        SELECT req_doc_id, custom_doc_name, is_mandatory, allowed_roles
        FROM tender_required_documents
        WHERE tender_id = $1
        ORDER BY req_doc_id
    """, tender_id)
    required_documents = [dict(r) for r in req_docs_rows]

    # 3. Fetch bids with vendor organization details, ratings, completed contracts, enlistment status
    bids_query = """
        SELECT 
            b.bid_id,
            b.vendor_org_id,
            b.submitted_by,
            b.tender_id,
            b.financial_amount,
            b.description,
            b.status,
            b.submitted_at,
            b.updated_at,
            o.organization_name AS vendor_name,
            o.address AS vendor_address,
            o.website AS vendor_website,
            o.verification_status AS vendor_verification_status,
            COALESCE(vr.avg_rating, 0.0) AS vendor_rating,
            COALESCE(vr.total_ratings_count, 0) AS total_ratings_count,
            COALESCE(vc.completed_contracts_count, 0) AS completed_contracts_count,
            CASE WHEN ev.enlisted_org_id IS NOT NULL THEN true ELSE false END AS is_enlisted
        FROM bids b
        JOIN organizations o ON b.vendor_org_id = o.organization_id
        LEFT JOIN (
            SELECT 
                vendor_org_id, 
                ROUND(AVG(rating)::numeric, 1)::float AS avg_rating,
                COUNT(*)::int AS total_ratings_count
            FROM vendor_performance
            GROUP BY vendor_org_id
        ) vr ON b.vendor_org_id = vr.vendor_org_id
        LEFT JOIN (
            SELECT 
                wb.vendor_org_id,
                COUNT(*)::int AS completed_contracts_count
            FROM contracts c
            JOIN awards a ON c.award_id = a.award_id
            JOIN bids wb ON a.winning_bid_id = wb.bid_id
            WHERE c.status = 'Completed'
            GROUP BY wb.vendor_org_id
        ) vc ON b.vendor_org_id = vc.vendor_org_id
        LEFT JOIN enlisted_vendors ev ON ev.org_id = $2 AND ev.enlisted_org_id = b.vendor_org_id
        WHERE b.tender_id = $1
        ORDER BY b.submitted_at ASC
    """
    bids_rows = await connection.fetch(bids_query, tender_id, buyer_org_id)
    raw_bids = [dict(r) for r in bids_rows]

    bid_ids = [b["bid_id"] for b in raw_bids]

    # 4. Fetch bid documents
    docs_by_bid: dict[int, list[dict]] = {}
    if bid_ids:
        docs_rows = await connection.fetch("""
            SELECT 
                bd.bid_id, 
                bd.bid_doc_id, 
                bd.req_doc_id,
                bd.file_path, 
                COALESCE(dt.type_name, trd.custom_doc_name, 'Document') AS document_type
            FROM bid_documents bd
            LEFT JOIN tender_required_documents trd ON bd.req_doc_id = trd.req_doc_id
            LEFT JOIN document_types dt ON trd.doc_type_id = dt.type_id
            WHERE bd.bid_id = ANY($1)
        """, bid_ids)

        for doc in docs_rows:
            b_id = doc["bid_id"]
            if b_id not in docs_by_bid:
                docs_by_bid[b_id] = []
            docs_by_bid[b_id].append(dict(doc))

    # 5. Fetch bid securities
    secs_by_bid: dict[int, list[dict]] = {}
    if bid_ids:
        secs_rows = await connection.fetch("""
            SELECT security_id, bid_id, security_amount, security_type, bid_security_doc_path, valid_until
            FROM bid_securities
            WHERE bid_id = ANY($1)
        """, bid_ids)

        for sec in secs_rows:
            b_id = sec["bid_id"]
            if b_id not in secs_by_bid:
                secs_by_bid[b_id] = []
            secs_by_bid[b_id].append(dict(sec))

    # 6. Calculate summary metrics
    amounts = [float(b["financial_amount"]) for b in raw_bids if b["financial_amount"] is not None]
    min_amount = min(amounts) if amounts else None
    max_amount = max(amounts) if amounts else None
    avg_amount = round(sum(amounts) / len(amounts), 2) if amounts else None

    lowest_bid_id = None
    if min_amount is not None:
        for b in raw_bids:
            if b["financial_amount"] is not None and float(b["financial_amount"]) == min_amount:
                lowest_bid_id = b["bid_id"]
                break

    # 7. Build evaluated bids with compliance matrices and analytics
    evaluated_bids = []
    fully_compliant_count = 0

    for b in raw_bids:
        b_id = b["bid_id"]
        b_docs = docs_by_bid.get(b_id, [])
        b_secs = secs_by_bid.get(b_id, [])

        amount = float(b["financial_amount"]) if b["financial_amount"] is not None else None

        # Budget variance
        budget_variance_pct = None
        if amount is not None and budget_max is not None and budget_max > 0:
            budget_variance_pct = round(((amount - budget_max) / budget_max) * 100, 1)

        # Average variance
        avg_variance_pct = None
        if amount is not None and avg_amount is not None and avg_amount > 0:
            avg_variance_pct = round(((amount - avg_amount) / avg_amount) * 100, 1)

        # Build compliance matrix
        # Map submitted docs by req_doc_id
        submitted_by_req_doc: dict[int, dict] = {}
        for d in b_docs:
            if d.get("req_doc_id"):
                submitted_by_req_doc[d["req_doc_id"]] = d

        compliance_matrix = []
        mandatory_missing = 0
        total_req = len(required_documents)
        submitted_req_count = 0

        for req in required_documents:
            r_id = req["req_doc_id"]
            is_mand = req.get("is_mandatory", True)
            submitted_doc = submitted_by_req_doc.get(r_id)

            is_submitted = submitted_doc is not None
            if is_submitted:
                submitted_req_count += 1
            elif is_mand:
                mandatory_missing += 1

            compliance_matrix.append({
                "req_doc_id": r_id,
                "custom_doc_name": req.get("custom_doc_name") or "Document",
                "is_mandatory": is_mand,
                "is_submitted": is_submitted,
                "bid_doc_id": submitted_doc["bid_doc_id"] if submitted_doc else None,
                "file_path": submitted_doc["file_path"] if submitted_doc else None
            })

        if total_req > 0:
            compliance_score_pct = round((submitted_req_count / total_req) * 100, 1)
        else:
            compliance_score_pct = 100.0

        mandatory_satisfied = (mandatory_missing == 0)
        if mandatory_satisfied and (compliance_score_pct >= 100.0 or total_req == 0):
            fully_compliant_count += 1

        is_lowest = (b_id == lowest_bid_id)

        evaluated_bids.append({
            **b,
            "financial_amount": amount,
            "vendor_rating": float(b.get("vendor_rating", 0.0)),
            "total_ratings_count": int(b.get("total_ratings_count", 0)),
            "completed_contracts_count": int(b.get("completed_contracts_count", 0)),
            "is_enlisted": bool(b.get("is_enlisted", False)),
            "budget_variance_pct": budget_variance_pct,
            "avg_variance_pct": avg_variance_pct,
            "is_lowest_bid": is_lowest,
            "compliance_score_pct": compliance_score_pct,
            "mandatory_docs_satisfied": mandatory_satisfied,
            "documents": b_docs,
            "compliance_matrix": compliance_matrix,
            "securities": b_secs
        })

    summary = {
        "total_bids": len(raw_bids),
        "min_amount": min_amount,
        "max_amount": max_amount,
        "avg_amount": avg_amount,
        "budget_min": budget_min,
        "budget_max": budget_max,
        "lowest_bid_id": lowest_bid_id,
        "fully_compliant_bids_count": fully_compliant_count
    }

    return {
        "tender_id": tender_id,
        "tender_title": tender_row["title"],
        "tender_status": tender_row["status"],
        "budget_min": budget_min,
        "budget_max": budget_max,
        "required_documents": required_documents,
        "summary": summary,
        "bids": evaluated_bids
    }


