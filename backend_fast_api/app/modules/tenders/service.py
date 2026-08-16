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
from app.modules.payments.service import deduct_tokens_for_tender_publish

async def publish_tender_with_documents(
    connection: asyncpg.Connection, 
    buyer_id: int, 
    org_user_id: int, 
    user_id: int,
    tender_data: TenderCreateRequest, 
    files_data: list[dict]
) -> dict:
    """
    Creates a tender directly in Published state, deducts tokens, and queues background file upload.
    """
    
    query = """
        INSERT INTO tenders (
            buyer_id, created_by, title, description, visibility_type, budget_min, budget_max, status,
            submission_deadline, tender_public_date, pre_bid_meeting, tender_opening_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
    """
    
    async with connection.transaction():
        row = await connection.fetchrow(
            query,
            buyer_id,
            org_user_id,
            tender_data.title,
            tender_data.description,
            tender_data.visibility_type.value,
            tender_data.budget_min,
            tender_data.budget_max,
            "Published",
            tender_data.submission_deadline.replace(tzinfo=None) if tender_data.submission_deadline else None,
            tender_data.tender_public_date.replace(tzinfo=None) if tender_data.tender_public_date else None,
            tender_data.pre_bid_meeting.replace(tzinfo=None) if tender_data.pre_bid_meeting else None,
            tender_data.tender_opening_date.replace(tzinfo=None) if tender_data.tender_opening_date else None
        )
        
        tender_id = row['tender_id']

        if tender_data.required_seller_docs:
            insert_req_doc_query = """
                INSERT INTO public.tender_required_documents (
                    tender_id, custom_doc_name, is_mandatory, allowed_roles
                )
                VALUES ($1, $2, $3, $4::public.role_in_org[]);
            """
            for doc_entry in tender_data.required_seller_docs:
                doc_name = doc_entry.get("name", "")
                roles = doc_entry.get("allowed_roles", ["Owner"])
                # Ensure Owner is always included
                if "Owner" not in roles:
                    roles = ["Owner"] + roles
                await connection.execute(
                    insert_req_doc_query,
                    tender_id,
                    doc_name,
                    True,
                    roles
                )

        # Deduct configured tokens from buyer organization
        await deduct_tokens_for_tender_publish(
            connection=connection,
            organization_id=buyer_id,
            user_id=user_id,
            tender_id=tender_id,
            tender_title=tender_data.title,
        )

    if files_data:
        # Dispatch Celery task to upload the local files to Supabase
        upload_tender_documents_to_supabase.delay(tender_id, files_data)

    return dict(row)


async def get_buyer_tenders(
    connection: asyncpg.Connection,
    buyer_org_id: int,
) -> list[dict]:
    """
    Fetch all tenders created by the given buyer organization.
    """
    query = """
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            o.organization_name AS buyer_org_name,
            t.submission_deadline,
            t.created_at
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        WHERE t.buyer_id = $1
        ORDER BY t.created_at DESC;
    """
    rows = await connection.fetch(query, buyer_org_id)
    return [dict(row) for row in rows]


async def get_all_published_tenders(
    connection: asyncpg.Connection,
    vendor_org_id: int | None = None,
    enlisted_only: bool = False
) -> list[dict]:
    """
    Fetch all published tenders (for seller browsing).
    If enlisted_only=True and vendor_org_id is provided, only return tenders published
    by buyers that the vendor organization has enlisted (via enlisted_vendors table).
    """
    if enlisted_only and vendor_org_id is not None:
        query = """
            SELECT
                t.tender_id,
                t.title,
                t.description,
                t.status,
                o.organization_name AS buyer_org_name,
                t.submission_deadline,
                t.created_at
            FROM tenders t
            JOIN organizations o ON t.buyer_id = o.organization_id
            JOIN enlisted_vendors ev ON ev.enlisted_org_id = t.buyer_id AND ev.org_id = $1
            WHERE t.status = 'Published'
            ORDER BY t.created_at DESC;
        """
        rows = await connection.fetch(query, vendor_org_id)
        return [dict(row) for row in rows]

    query = """
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            o.organization_name AS buyer_org_name,
            t.submission_deadline,
            t.created_at
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        WHERE t.status = 'Published'
    """
    args = []
    
    if vendor_org_id is not None:
        query += " AND t.buyer_id != $1"
        args.append(vendor_org_id)
        
    query += " ORDER BY t.created_at DESC;"
    
    rows = await connection.fetch(query, *args)
    return [dict(row) for row in rows]


async def get_tender_detail(
    connection: asyncpg.Connection,
    tender_id: int,
) -> dict | None:
    """
    Fetch full tender details including buyer org name and attached documents.
    """
    tender_query = """
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            o.organization_name AS buyer_org_name,
            t.submission_deadline,
            t.tender_public_date,
            t.pre_bid_meeting,
            t.tender_opening_date,
            t.budget_min,
            t.budget_max,
            t.security_required,
            t.created_at
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        WHERE t.tender_id = $1;
    """
    row = await connection.fetchrow(tender_query, tender_id)
    if row is None:
        return None

    result = dict(row)

    docs_query = """
        SELECT tender_doc_id, file_name, file_path, uploaded_at
        FROM tender_documents
        WHERE tender_id = $1
        ORDER BY uploaded_at;
    """
    doc_rows = await connection.fetch(docs_query, tender_id)
    result["documents"] = [dict(d) for d in doc_rows]

    req_docs_query = """
        SELECT req_doc_id, custom_doc_name, is_mandatory, allowed_roles
        FROM public.tender_required_documents
        WHERE tender_id = $1
        ORDER BY req_doc_id;
    """
    req_doc_rows = await connection.fetch(req_docs_query, tender_id)
    result["required_documents"] = [dict(r) for r in req_doc_rows]

    return result


async def update_tender_required_document_roles(
    connection: asyncpg.Connection,
    tender_id: int,
    updates: list[dict]
) -> None:
    query = """
        UPDATE public.tender_required_documents
        SET allowed_roles = $1::public.role_in_org[]
        WHERE req_doc_id = $2 AND tender_id = $3;
    """
    for item in updates:
        roles = item["allowed_roles"]
        if "Owner" not in roles:
            roles = ["Owner"] + roles
        await connection.execute(query, roles, item["req_doc_id"], tender_id)


async def get_ongoing_tenders(
    connection: asyncpg.Connection,
    org_id: int
) -> list[dict]:
    """
    Fetch all ongoing (awarded) tenders where the caller's organization is
    either the buyer or the winning vendor.
    """
    query = """
        SELECT
            a.award_id,
            a.awarded_at,
            a.remarks,
            t.tender_id,
            t.title AS tender_title,
            t.description AS tender_description,
            t.status AS tender_status,
            t.budget_min,
            t.budget_max,
            t.submission_deadline,
            t.created_at AS tender_created_at,
            b.bid_id AS winning_bid_id,
            b.financial_amount AS winning_bid_amount,
            b.description AS winning_bid_description,
            b.submitted_at AS winning_bid_submitted_at,
            buyer_org.organization_id AS buyer_org_id,
            buyer_org.organization_name AS buyer_org_name,
            vendor_org.organization_id AS vendor_org_id,
            vendor_org.organization_name AS vendor_org_name,
            CASE
                WHEN t.buyer_id = $1 THEN 'buyer'
                ELSE 'vendor'
            END AS role_in_tender
        FROM awards a
        JOIN tenders t ON a.tender_id = t.tender_id
        JOIN bids b ON a.winning_bid_id = b.bid_id
        JOIN organizations buyer_org ON t.buyer_id = buyer_org.organization_id
        JOIN organizations vendor_org ON b.vendor_org_id = vendor_org.organization_id
        WHERE t.buyer_id = $1 OR b.vendor_org_id = $1
        ORDER BY a.awarded_at DESC;
    """
    rows = await connection.fetch(query, org_id)
    return [dict(row) for row in rows]


async def get_ongoing_tender_detail(
    connection: asyncpg.Connection,
    tender_id: int,
    org_id: int
) -> dict | None:
    """
    Fetch full detail of a specific ongoing (awarded) tender if the caller's
    organization is either the buyer or the winning vendor.
    """
    query = """
        SELECT
            a.award_id,
            a.awarded_at,
            a.remarks,
            t.tender_id,
            t.title AS tender_title,
            t.description AS tender_description,
            t.status AS tender_status,
            t.budget_min,
            t.budget_max,
            t.submission_deadline,
            t.tender_public_date,
            t.pre_bid_meeting,
            t.tender_opening_date,
            t.created_at AS tender_created_at,
            b.bid_id AS winning_bid_id,
            b.financial_amount AS winning_bid_amount,
            b.description AS winning_bid_description,
            b.submitted_at AS winning_bid_submitted_at,
            buyer_org.organization_id AS buyer_org_id,
            buyer_org.organization_name AS buyer_org_name,
            buyer_org.address AS buyer_org_address,
            buyer_org.website AS buyer_org_website,
            vendor_org.organization_id AS vendor_org_id,
            vendor_org.organization_name AS vendor_org_name,
            vendor_org.address AS vendor_org_address,
            vendor_org.website AS vendor_org_website,
            CASE
                WHEN t.buyer_id = $2 THEN 'buyer'
                ELSE 'vendor'
            END AS role_in_tender
        FROM awards a
        JOIN tenders t ON a.tender_id = t.tender_id
        JOIN bids b ON a.winning_bid_id = b.bid_id
        JOIN organizations buyer_org ON t.buyer_id = buyer_org.organization_id
        JOIN organizations vendor_org ON b.vendor_org_id = vendor_org.organization_id
        WHERE t.tender_id = $1 AND (t.buyer_id = $2 OR b.vendor_org_id = $2);
    """
    row = await connection.fetchrow(query, tender_id, org_id)
    if row is None:
        return None

    result = dict(row)

    # Tender documents
    docs_query = """
        SELECT tender_doc_id, file_name, file_path, uploaded_at
        FROM tender_documents
        WHERE tender_id = $1
        ORDER BY uploaded_at;
    """
    doc_rows = await connection.fetch(docs_query, tender_id)
    result["tender_documents"] = [dict(d) for d in doc_rows]

    # Winning Bid documents
    bid_docs_query = """
        SELECT
            bd.bid_doc_id,
            bd.file_path,
            COALESCE(dt.type_name, trd.custom_doc_name, 'Document') AS document_type
        FROM bid_documents bd
        LEFT JOIN tender_required_documents trd ON bd.req_doc_id = trd.req_doc_id
        LEFT JOIN document_types dt ON trd.doc_type_id = dt.type_id
        WHERE bd.bid_id = $1;
    """
    bid_doc_rows = await connection.fetch(bid_docs_query, result["winning_bid_id"])
    result["bid_documents"] = [dict(bd) for bd in bid_doc_rows]

    return result


async def delete_tender(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int
) -> dict:
    """
    Deletes a tender, its related DB records (cascading all bids, documents, chat, messages, awards),
    and cleans up all associated storage files from Supabase.
    Only the owning buyer organization can delete the tender.
    Awarded tenders cannot be deleted.
    """
    from app.services.supabase_storage import delete_files
    import logging
    logger = logging.getLogger(__name__)

    # 1. Verify tender exists and ownership
    tender_row = await connection.fetchrow(
        "SELECT tender_id, buyer_id, status FROM tenders WHERE tender_id = $1",
        tender_id
    )
    if not tender_row:
        raise KeyError("Tender not found")

    if tender_row["buyer_id"] != buyer_org_id:
        raise PermissionError("You do not have permission to delete this tender.")

    if tender_row["status"] == "Awarded":
        raise ValueError("Cannot delete an awarded tender.")

    # 2. Gather all storage file paths for cleanup
    # Tender documents
    tender_docs = await connection.fetch(
        "SELECT file_path FROM tender_documents WHERE tender_id = $1",
        tender_id
    )
    # Bid documents for all bids on this tender
    bid_docs = await connection.fetch("""
        SELECT bd.file_path
        FROM bid_documents bd
        JOIN bids b ON bd.bid_id = b.bid_id
        WHERE b.tender_id = $1
    """, tender_id)
    # Bid security documents
    bid_secs = await connection.fetch("""
        SELECT bs.bid_security_doc_path
        FROM bid_securities bs
        JOIN bids b ON bs.bid_id = b.bid_id
        WHERE b.tender_id = $1
    """, tender_id)
    # Contract documents (if any exist)
    contract_docs = await connection.fetch("""
        SELECT c.contract_document_path
        FROM contracts c
        JOIN awards a ON c.award_id = a.award_id
        WHERE a.tender_id = $1
    """, tender_id)

    storage_paths = [r["file_path"] for r in tender_docs if r.get("file_path")]
    storage_paths.extend([r["file_path"] for r in bid_docs if r.get("file_path")])
    storage_paths.extend([r["bid_security_doc_path"] for r in bid_secs if r.get("bid_security_doc_path")])
    storage_paths.extend([r["contract_document_path"] for r in contract_docs if r.get("contract_document_path")])

    # 3. Perform database cascading deletions within a transaction
    async with connection.transaction():
        # Chat
        await connection.execute("""
            DELETE FROM tender_chat_seen
            WHERE message_id IN (
                SELECT m.message_id
                FROM tender_chat_messages m
                JOIN tender_chat_rooms r ON m.room_id = r.room_id
                WHERE r.tender_id = $1
            )
        """, tender_id)
        await connection.execute("""
            DELETE FROM tender_chat_messages
            WHERE room_id IN (SELECT room_id FROM tender_chat_rooms WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("""
            DELETE FROM tender_chat_participants
            WHERE room_id IN (SELECT room_id FROM tender_chat_rooms WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("DELETE FROM tender_chat_rooms WHERE tender_id = $1", tender_id)

        # Message threads
        await connection.execute("""
            DELETE FROM messages
            WHERE thread_id IN (SELECT thread_id FROM message_threads WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("""
            DELETE FROM thread_participants
            WHERE thread_id IN (SELECT thread_id FROM message_threads WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("DELETE FROM message_threads WHERE tender_id = $1", tender_id)

        # Notifications
        await connection.execute("""
            DELETE FROM notification_recipients
            WHERE notification_id IN (
                SELECT notification_id FROM notifications
                WHERE (reference_type = 'TENDER' AND reference_id = $1)
                   OR (reference_type = 'BID' AND reference_id IN (SELECT bid_id FROM bids WHERE tender_id = $1))
            )
        """, tender_id)
        await connection.execute("""
            DELETE FROM notifications
            WHERE (reference_type = 'TENDER' AND reference_id = $1)
               OR (reference_type = 'BID' AND reference_id IN (SELECT bid_id FROM bids WHERE tender_id = $1))
        """, tender_id)

        # Awards & contracts
        await connection.execute("""
            DELETE FROM vendor_performance
            WHERE contract_id IN (
                SELECT c.contract_id FROM contracts c
                JOIN awards a ON c.award_id = a.award_id
                WHERE a.tender_id = $1
            )
        """, tender_id)
        await connection.execute("""
            DELETE FROM contracts
            WHERE award_id IN (SELECT award_id FROM awards WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("DELETE FROM awards WHERE tender_id = $1", tender_id)

        # Bids
        await connection.execute("""
            DELETE FROM bid_documents
            WHERE bid_id IN (SELECT bid_id FROM bids WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("""
            DELETE FROM bid_securities
            WHERE bid_id IN (SELECT bid_id FROM bids WHERE tender_id = $1)
        """, tender_id)
        await connection.execute("DELETE FROM bids WHERE tender_id = $1", tender_id)

        # Tender sub-tables
        await connection.execute("DELETE FROM tender_documents WHERE tender_id = $1", tender_id)
        await connection.execute("DELETE FROM tender_required_documents WHERE tender_id = $1", tender_id)
        await connection.execute("DELETE FROM tender_invitations WHERE tender_id = $1", tender_id)
        await connection.execute("DELETE FROM tender_vendor_suggestions WHERE tender_id = $1", tender_id)

        # Tender itself
        await connection.execute("DELETE FROM tenders WHERE tender_id = $1", tender_id)

    # 4. Clean up storage files after successful DB transaction
    if storage_paths:
        try:
            await delete_files(storage_paths)
        except Exception as e:
            logger.warning(f"Failed to delete storage files for tender {tender_id}: {e}")

    return {"message": "Tender and all associated data deleted successfully.", "tender_id": tender_id}


async def delete_tender_document(
    connection: asyncpg.Connection,
    doc_id: int,
    buyer_org_id: int
) -> dict:
    """
    Deletes a specific tender document from storage and database.
    Only the owning buyer organization can delete the document.
    """
    from app.services.supabase_storage import delete_files
    import logging
    logger = logging.getLogger(__name__)

    doc_row = await connection.fetchrow("""
        SELECT td.tender_doc_id, td.file_path, t.buyer_id, td.tender_id
        FROM tender_documents td
        JOIN tenders t ON td.tender_id = t.tender_id
        WHERE td.tender_doc_id = $1
    """, doc_id)

    if not doc_row:
        raise KeyError("Document not found")

    if doc_row["buyer_id"] != buyer_org_id:
        raise PermissionError("You do not have permission to delete this document.")

    file_path = doc_row["file_path"]

    await connection.execute("DELETE FROM tender_documents WHERE tender_doc_id = $1", doc_id)

    if file_path:
        try:
            await delete_files([file_path])
        except Exception as e:
            logger.warning(f"Failed to delete storage file {file_path}: {e}")

    return {"message": "Tender document deleted successfully.", "doc_id": doc_id}


async def get_public_active_tenders(
    connection: asyncpg.Connection,
    category_id: int | None = None,
    search: str | None = None,
) -> list[dict]:
    """
    Fetch active, publicly visible published tenders for unregistered users.
    Filters out restricted and draft/cancelled tenders.
    """
    query = """
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            t.visibility_type,
            o.organization_name AS buyer_org_name,
            o.organization_type AS buyer_org_type,
            (o.verification_status = 'Verified') AS buyer_verified,
            tc.category_name,
            pn.nature_name AS procurement_nature,
            pm.method_name AS procurement_method,
            t.budget_min,
            t.budget_max,
            t.security_required,
            t.submission_deadline,
            t.tender_public_date,
            t.created_at
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        LEFT JOIN tender_categories tc ON t.category_id = tc.category_id
        LEFT JOIN procurement_nature pn ON t.nature_id = pn.nature_id
        LEFT JOIN procurement_method pm ON t.method_id = pm.method_id
        WHERE t.status = 'Published'
          AND (t.visibility_type = 'Public' OR t.visibility_type IS NULL)
    """
    params = []
    p_idx = 1

    if category_id is not None:
        query += f" AND t.category_id = ${p_idx}"
        params.append(category_id)
        p_idx += 1

    if search:
        query += f" AND (t.title ILIKE ${p_idx} OR t.description ILIKE ${p_idx} OR o.organization_name ILIKE ${p_idx})"
        params.append(f"%{search}%")
        p_idx += 1

    query += " ORDER BY t.created_at DESC;"

    rows = await connection.fetch(query, *params)
    return [dict(r) for r in rows]


async def get_public_tender_detail(
    connection: asyncpg.Connection,
    tender_id: int,
) -> dict | None:
    """
    Fetch detailed public notice information for an active public tender.
    Does not expose private documents or bidder information.
    """
    query = """
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            t.visibility_type,
            o.organization_name AS buyer_org_name,
            o.organization_type AS buyer_org_type,
            (o.verification_status = 'Verified') AS buyer_verified,
            o.website_url AS buyer_org_website,
            tc.category_name,
            pn.nature_name AS procurement_nature,
            pm.method_name AS procurement_method,
            t.budget_min,
            t.budget_max,
            t.security_required,
            t.security_valid_until,
            t.proposal_valid_until,
            t.tender_public_date,
            t.pre_bid_meeting,
            t.tender_opening_date,
            t.submission_deadline,
            t.created_at
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        LEFT JOIN tender_categories tc ON t.category_id = tc.category_id
        LEFT JOIN procurement_nature pn ON t.nature_id = pn.nature_id
        LEFT JOIN procurement_method pm ON t.method_id = pm.method_id
        WHERE t.tender_id = $1
          AND t.status = 'Published'
          AND (t.visibility_type = 'Public' OR t.visibility_type IS NULL);
    """
    row = await connection.fetchrow(query, tender_id)
    if not row:
        return None

    result = dict(row)

    # Fetch required document eligibility checklist
    req_docs_query = """
        SELECT req_doc_id, custom_doc_name, is_mandatory
        FROM public.tender_required_documents
        WHERE tender_id = $1
        ORDER BY req_doc_id;
    """
    req_doc_rows = await connection.fetch(req_docs_query, tender_id)
    result["required_documents"] = [dict(r) for r in req_doc_rows]

    return result



