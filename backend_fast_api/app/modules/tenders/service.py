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

import logging
import asyncpg
from app.modules.tenders.schemas import TenderCreateRequest, TenderUpdateRequest
from app.tasks.document_tasks import upload_tender_documents_to_supabase
from app.modules.payments.service import deduct_tokens_for_tender_publish
from app.services.ml_client import parse_and_embed_tender_pdf, vectorize_text

logger = logging.getLogger(__name__)


def build_visibility_filter(viewer_org_id: int | None, param_idx: int) -> tuple[str, list]:
    """
    Build the SQL fragment that enforces tender visibility rules.

    Public tenders are visible to everyone. Restricted tenders are only visible to
    vendor organizations that have been invited to that specific tender.

    Args:
        viewer_org_id: The viewing organization's id, or None for an anonymous/public caller.
        param_idx: The positional parameter number to bind viewer_org_id to ($1, $2, ...).

    Returns:
        (sql_fragment, params) - the fragment is a leading-AND clause intended to be
        appended to a WHERE clause on a query aliasing the tenders table as `t`.
    """
    if viewer_org_id is None:
        return " AND (t.visibility_type = 'Public' OR t.visibility_type IS NULL)", []
    return (
        f" AND (t.visibility_type = 'Public' OR t.visibility_type IS NULL"
        f" OR EXISTS (SELECT 1 FROM tender_invitations ti"
        f" WHERE ti.tender_id = t.tender_id AND ti.vendor_org_id = ${param_idx}))",
        [viewer_org_id],
    )


async def resolve_nature_id(connection: asyncpg.Connection, nature_str: str | None, nature_id: int | None) -> int | None:
    if nature_id:
        return nature_id
    if not nature_str:
        return None
    cleaned = nature_str.strip()
    row = await connection.fetchrow(
        "SELECT nature_id FROM procurement_nature WHERE name::text ILIKE $1 LIMIT 1",
        cleaned
    )
    if row:
        return row["nature_id"]
    return None

async def resolve_method_id(connection: asyncpg.Connection, method_str: str | None, method_id: int | None) -> int | None:
    if method_id:
        return method_id
    if not method_str:
        return None
    cleaned = method_str.strip()
    # Map common method names to method_code
    if "open tendering" in cleaned.lower() or "otm" in cleaned.lower():
        code = "OTM"
    elif "rfq" in cleaned.lower() or "quotation" in cleaned.lower():
        code = "RFQ"
    elif "rfp" in cleaned.lower() or "proposal" in cleaned.lower():
        code = "RFP"
    elif "reverse" in cleaned.lower() or "auction" in cleaned.lower():
        code = "ReverseAuction"
    elif "direct" in cleaned.lower():
        code = "Direct"
    else:
        code = cleaned

    row = await connection.fetchrow(
        "SELECT method_id FROM procurement_method WHERE method_code::text ILIKE $1 OR description ILIKE $2 LIMIT 1",
        code, f"%{cleaned}%"
    )
    if row:
        return row["method_id"]
    return None

async def resolve_category_id(connection: asyncpg.Connection, category_name: str | None, category_id: int | None) -> int | None:
    if category_id:
        return category_id
    if not category_name or category_name.strip().lower() in ("not applicable", "n/a", "none", "null"):
        return None
    cleaned = category_name.strip()
    row = await connection.fetchrow(
        "SELECT category_id FROM tender_categories WHERE category_name ILIKE $1 LIMIT 1",
        cleaned
    )
    if row:
        return row["category_id"]
    try:
        new_cat = await connection.fetchrow(
            "INSERT INTO tender_categories (category_name) VALUES ($1) RETURNING category_id",
            cleaned[:255]
        )
        return new_cat["category_id"]
    except Exception:
        return None


async def _build_embedding_str(tender_data: TenderCreateRequest) -> str | None:
    if tender_data.embedding and len(tender_data.embedding) == 384:
        return f"[{','.join(str(float(x)) for x in tender_data.embedding)}]"
    if tender_data.description:
        try:
            vec = await vectorize_text(tender_data.description)
            if vec and len(vec) == 384:
                return f"[{','.join(str(float(x)) for x in vec)}]"
        except Exception as e:
            logger.warning("Failed to generate embedding during tender save: %s", e)
    return None


async def _insert_required_seller_docs(
    connection: asyncpg.Connection,
    tender_id: int,
    required_seller_docs: list[dict] | None,
) -> None:
    if not required_seller_docs:
        return
    insert_req_doc_query = """
        INSERT INTO public.tender_required_documents (
            tender_id, custom_doc_name, is_mandatory, allowed_roles
        )
        VALUES ($1, $2, $3, $4::public.role_in_org[]);
    """
    for doc_entry in required_seller_docs:
        doc_name = doc_entry.get("name", "")
        roles = doc_entry.get("allowed_roles", ["Owner"])
        if "Owner" not in roles:
            roles = ["Owner"] + roles
        await connection.execute(
            insert_req_doc_query,
            tender_id,
            doc_name,
            True,
            roles,
        )


async def _dispatch_tender_document_upload(tender_id: int, files_data: list[dict]) -> None:
    if not files_data:
        return
    try:
        upload_tender_documents_to_supabase.delay(tender_id, files_data)
    except Exception as e:
        logger.warning("Failed to dispatch Celery upload task: %s", e)


async def create_tender_with_documents(
    connection: asyncpg.Connection,
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    tender_data: TenderCreateRequest,
    files_data: list[dict],
    *,
    status: str = "Published",
    deduct_tokens: bool | None = None,
) -> dict:
    """
    Create a tender with optional documents.
    Draft tenders do not deduct tokens; Published tenders do by default.
    """
    if status not in ("Draft", "Published"):
        raise ValueError(f"Invalid tender status for creation: {status}")
    if deduct_tokens is None:
        deduct_tokens = status == "Published"

    nature_id = await resolve_nature_id(connection, tender_data.procurement_nature, tender_data.nature_id)
    method_id = await resolve_method_id(connection, tender_data.procurement_method, tender_data.method_id)
    category_id = await resolve_category_id(connection, tender_data.category, tender_data.category_id)
    embedding_str = await _build_embedding_str(tender_data)

    # Validate packaging rules if items provided
    pkg_type_val = tender_data.package_type.value if hasattr(tender_data.package_type, "value") else str(tender_data.package_type)
    if tender_data.items is not None:
        if pkg_type_val == "SingleItem" and len(tender_data.items) != 1:
            raise ValueError("SingleItem tender must contain exactly one item/lot.")
        elif pkg_type_val == "PackagedLots" and len(tender_data.items) < 2:
            raise ValueError("PackagedLots tender must contain at least two items/lots.")

    query = """
        INSERT INTO tenders (
            buyer_id, created_by, title, description, category_id, nature_id, method_id,
            eligibility_of_tenderer, visibility_type, budget_min, budget_max, status,
            submission_deadline, tender_public_date, pre_bid_meeting, tender_opening_date,
            package_type, bid_bond_amount, scheduled_publish_at,
            embedding
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17::public.tender_package_type, $18, $19,
            $20::vector
        )
        RETURNING *;
    """

    async with connection.transaction():
        row = await connection.fetchrow(
            query,
            buyer_id,
            org_user_id,
            tender_data.title,
            tender_data.description,
            category_id,
            nature_id,
            method_id,
            tender_data.eligibility_of_tenderer,
            tender_data.visibility_type.value if hasattr(tender_data.visibility_type, "value") else str(tender_data.visibility_type),
            tender_data.budget_min,
            "Draft" if (tender_data.scheduled_publish_at and tender_data.scheduled_publish_at > datetime.utcnow()) else status,
            tender_data.submission_deadline.replace(tzinfo=None) if tender_data.submission_deadline else None,
            tender_data.tender_public_date.replace(tzinfo=None) if tender_data.tender_public_date else None,
            tender_data.pre_bid_meeting.replace(tzinfo=None) if tender_data.pre_bid_meeting else None,
            tender_data.tender_opening_date.replace(tzinfo=None) if tender_data.tender_opening_date else None,
            pkg_type_val,
            tender_data.bid_bond_amount or 0.00,
            tender_data.scheduled_publish_at.replace(tzinfo=None) if tender_data.scheduled_publish_at else None,
            embedding_str,
        )

        tender_id = row['tender_id']

        # Insert items / lots if specified
        if tender_data.items:
            insert_item_query = """
                INSERT INTO public.tender_items (
                    tender_id, lot_number, item_name, specifications, quantity, unit_of_measure, estimated_unit_price
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            """
            for itm in tender_data.items:
                await connection.execute(
                    insert_item_query,
                    tender_id,
                    itm.lot_number,
                    itm.item_name,
                    itm.specifications,
                    itm.quantity,
                    itm.unit_of_measure,
                    itm.estimated_unit_price
                )

        await _insert_required_seller_docs(connection, tender_id, tender_data.required_seller_docs)

        # Do not deduct tokens if scheduled for future publishing
        should_deduct = deduct_tokens and not (tender_data.scheduled_publish_at and tender_data.scheduled_publish_at > datetime.utcnow())
        if should_deduct:
            await deduct_tokens_for_tender_publish(
                connection=connection,
                organization_id=buyer_id,
                user_id=user_id,
                tender_id=tender_id,
                tender_title=tender_data.title,
            )

    await _dispatch_tender_document_upload(tender_id, files_data)

    ret = dict(row)
    if "category" not in ret and tender_data.category:
        ret["category"] = tender_data.category
    if "procurement_nature" not in ret and tender_data.procurement_nature:
        ret["procurement_nature"] = tender_data.procurement_nature
    if "procurement_method" not in ret and tender_data.procurement_method:
        ret["procurement_method"] = tender_data.procurement_method
    return ret


async def publish_tender_with_documents(
    connection: asyncpg.Connection,
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    tender_data: TenderCreateRequest,
    files_data: list[dict],
) -> dict:
    """Creates a tender directly in Published state, deducts tokens, saves embedding, queues uploads."""
    return await create_tender_with_documents(
        connection=connection,
        buyer_id=buyer_id,
        org_user_id=org_user_id,
        user_id=user_id,
        tender_data=tender_data,
        files_data=files_data,
        status="Published",
        deduct_tokens=True,
    )


async def save_draft_with_documents(
    connection: asyncpg.Connection,
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    tender_data: TenderCreateRequest,
    files_data: list[dict],
) -> dict:
    """Save a tender as Draft without deducting tokens."""
    return await create_tender_with_documents(
        connection=connection,
        buyer_id=buyer_id,
        org_user_id=org_user_id,
        user_id=user_id,
        tender_data=tender_data,
        files_data=files_data,
        status="Draft",
        deduct_tokens=False,
    )


async def publish_draft_tender(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int,
    user_id: int,
) -> dict:
    """Publish an existing Draft tender and deduct tokens."""
    row = await connection.fetchrow(
        "SELECT tender_id, buyer_id, status, title FROM tenders WHERE tender_id = $1",
        tender_id,
    )
    if not row:
        raise KeyError("Tender not found")
    if row["buyer_id"] != buyer_org_id:
        raise PermissionError("You do not have permission to publish this tender.")
    if row["status"] != "Draft":
        raise ValueError("Only draft tenders can be published.")

    async with connection.transaction():
        await deduct_tokens_for_tender_publish(
            connection=connection,
            organization_id=buyer_org_id,
            user_id=user_id,
            tender_id=tender_id,
            tender_title=row["title"],
        )
        updated = await connection.fetchrow(
            "UPDATE tenders SET status = 'Published' WHERE tender_id = $1 RETURNING *",
            tender_id,
        )

    return dict(updated)


async def _count_tender_bids(connection: asyncpg.Connection, tender_id: int) -> int:
    return int(
        await connection.fetchval(
            "SELECT COUNT(*) FROM bids WHERE tender_id = $1",
            tender_id,
        )
        or 0
    )


async def update_tender(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int,
    tender_data: TenderUpdateRequest,
) -> dict:
    """Update tender fields. Draft: any field. Published: only when no bids exist."""
    row = await connection.fetchrow(
        "SELECT tender_id, buyer_id, status FROM tenders WHERE tender_id = $1",
        tender_id,
    )
    if not row:
        raise KeyError("Tender not found")
    if row["buyer_id"] != buyer_org_id:
        raise PermissionError("You do not have permission to update this tender.")

    status = row["status"]
    if status in ("Awarded", "Cancelled", "Closed"):
        raise ValueError(f"Cannot update a tender with status '{status}'.")

    bid_count = await _count_tender_bids(connection, tender_id)
    if status == "Published" and bid_count > 0:
        raise ValueError("Cannot update a published tender that already has bids.")

    updates: dict = {}
    if tender_data.title is not None:
        updates["title"] = tender_data.title
    if tender_data.description is not None:
        updates["description"] = tender_data.description
    if tender_data.eligibility_of_tenderer is not None:
        updates["eligibility_of_tenderer"] = tender_data.eligibility_of_tenderer
    if tender_data.budget_min is not None:
        updates["budget_min"] = tender_data.budget_min
    if tender_data.budget_max is not None:
        updates["budget_max"] = tender_data.budget_max
    if tender_data.submission_deadline is not None:
        updates["submission_deadline"] = tender_data.submission_deadline.replace(tzinfo=None)
    if tender_data.tender_public_date is not None:
        updates["tender_public_date"] = tender_data.tender_public_date.replace(tzinfo=None)
    if tender_data.pre_bid_meeting is not None:
        updates["pre_bid_meeting"] = tender_data.pre_bid_meeting.replace(tzinfo=None)
    if tender_data.tender_opening_date is not None:
        updates["tender_opening_date"] = tender_data.tender_opening_date.replace(tzinfo=None)
    if tender_data.visibility_type is not None:
        updates["visibility_type"] = (
            tender_data.visibility_type.value
            if hasattr(tender_data.visibility_type, "value")
            else str(tender_data.visibility_type)
        )

    if tender_data.category is not None or tender_data.category_id is not None:
        updates["category_id"] = await resolve_category_id(
            connection, tender_data.category, tender_data.category_id
        )
    if tender_data.procurement_nature is not None or tender_data.nature_id is not None:
        updates["nature_id"] = await resolve_nature_id(
            connection, tender_data.procurement_nature, tender_data.nature_id
        )
    if tender_data.procurement_method is not None or tender_data.method_id is not None:
        updates["method_id"] = await resolve_method_id(
            connection, tender_data.procurement_method, tender_data.method_id
        )
    if tender_data.embedding is not None and len(tender_data.embedding) == 384:
        updates["embedding"] = f"[{','.join(str(float(x)) for x in tender_data.embedding)}]"

    if not updates and tender_data.required_seller_docs is None:
        raise ValueError("No fields provided to update.")

    async with connection.transaction():
        if updates:
            set_parts = []
            values = []
            idx = 1
            for column, value in updates.items():
                if column == "embedding":
                    set_parts.append(f"{column} = ${idx}::vector")
                else:
                    set_parts.append(f"{column} = ${idx}")
                values.append(value)
                idx += 1
            values.append(tender_id)
            query = f"UPDATE tenders SET {', '.join(set_parts)} WHERE tender_id = ${idx} RETURNING *"
            updated_row = await connection.fetchrow(query, *values)
        else:
            updated_row = await connection.fetchrow(
                "SELECT * FROM tenders WHERE tender_id = $1",
                tender_id,
            )

        if tender_data.required_seller_docs is not None:
            await connection.execute(
                "DELETE FROM public.tender_required_documents WHERE tender_id = $1",
                tender_id,
            )
            await _insert_required_seller_docs(
                connection, tender_id, tender_data.required_seller_docs
            )

    return dict(updated_row)


async def withdraw_tender(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int,
) -> dict:
    """Soft-cancel a tender (status -> Cancelled) and notify vendors who bid."""
    from app.modules.notifications.service import create_notification

    row = await connection.fetchrow(
        "SELECT tender_id, buyer_id, status, title FROM tenders WHERE tender_id = $1",
        tender_id,
    )
    if not row:
        raise KeyError("Tender not found")
    if row["buyer_id"] != buyer_org_id:
        raise PermissionError("You do not have permission to cancel this tender.")
    if row["status"] in ("Awarded", "Cancelled", "Closed"):
        raise ValueError(f"Cannot cancel a tender with status '{row['status']}'.")

    async with connection.transaction():
        updated = await connection.fetchrow(
            "UPDATE tenders SET status = 'Cancelled' WHERE tender_id = $1 RETURNING tender_id, status, title",
            tender_id,
        )

        bidders = await connection.fetch(
            """
            SELECT DISTINCT u.user_id, t.title AS tender_title
            FROM bids b
            JOIN organization_employees oe
              ON b.vendor_org_id = oe.organization_id AND oe.role_in_org = 'Owner'
            JOIN users u ON oe.user_id = u.user_id
            JOIN tenders t ON b.tender_id = t.tender_id
            WHERE b.tender_id = $1
              AND b.status NOT IN ('Withdrawn', 'Draft')
            """,
            tender_id,
        )

        for bidder in bidders:
            try:
                await create_notification(
                    connection,
                    user_id=bidder["user_id"],
                    title="Tender Cancelled",
                    message=f"The tender \"{bidder['tender_title']}\" has been cancelled by the buyer.",
                    notification_type="Tender",
                    action_url="/view-my-bids",
                )
            except Exception as exc:
                logger.warning("Failed to notify bidder %s about cancellation: %s", bidder["user_id"], exc)

    return {
        "message": f"Tender #{tender_id} has been cancelled.",
        "tender_id": updated["tender_id"],
        "status": updated["status"],
        "title": updated["title"],
    }


async def auto_close_expired_tenders(connection: asyncpg.Connection) -> int:
    """Close published tenders past their submission deadline."""
    result = await connection.execute(
        """
        UPDATE tenders
        SET status = 'Closed'
        WHERE status = 'Published'
          AND submission_deadline IS NOT NULL
          AND submission_deadline < NOW()
        """
    )
    # asyncpg returns e.g. 'UPDATE 3'
    try:
        return int(result.split()[-1])
    except (ValueError, IndexError):
        return 0


async def create_tender_from_parsed_pdf(
    connection: asyncpg.Connection,
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    pdf_path: str,
    original_filename: str,
    parsed,
) -> dict:
    tender_req = TenderCreateRequest(
        title=parsed.title or "Untitled Tender",
        description=parsed.description or parsed.title or "No description provided",
        category=parsed.category,
        procurement_nature=parsed.procurement_nature,
        procurement_method=parsed.procurement_method,
        eligibility_of_tenderer=parsed.eligibility_of_tenderer,
        budget_min=parsed.budget_min,
        budget_max=parsed.budget_max,
        tender_public_date=parsed.tender_public_date,
        submission_deadline=parsed.submission_deadline,
        pre_bid_meeting=parsed.pre_bid_meeting,
        tender_opening_date=parsed.tender_opening_date,
        embedding=parsed.embedding,
    )

    files_data = [{
        "local_path": pdf_path,
        "custom_name": original_filename,
    }]

    return await publish_tender_with_documents(
        connection=connection,
        buyer_id=buyer_id,
        org_user_id=org_user_id,
        user_id=user_id,
        tender_data=tender_req,
        files_data=files_data,
    )


async def create_tender_from_pdf_file(
    connection: asyncpg.Connection,
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    pdf_path: str,
    original_filename: str = "tender.pdf",
) -> dict:
    """
    Parses the tender PDF via ML service, then creates the tender in Published state.
    """
    parsed = await parse_and_embed_tender_pdf(pdf_path)
    return await create_tender_from_parsed_pdf(
        connection=connection,
        buyer_id=buyer_id,
        org_user_id=org_user_id,
        user_id=user_id,
        pdf_path=pdf_path,
        original_filename=original_filename,
        parsed=parsed,
    )


async def get_buyer_tenders(
    connection: asyncpg.Connection,
    buyer_org_id: int,
    status: str | None = None,
) -> list[dict]:
    """
    Fetch tenders created by the given buyer organization.
    Optionally filter by tender status.
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
    """
    args: list = [buyer_org_id]
    if status:
        query += " AND t.status = $2"
        args.append(status)
    query += " ORDER BY t.created_at DESC;"
    rows = await connection.fetch(query, *args)
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
        """
        args = [vendor_org_id]
        visibility_sql, visibility_args = build_visibility_filter(vendor_org_id, len(args) + 1)
        query += visibility_sql
        args.extend(visibility_args)

        query += " ORDER BY t.created_at DESC;"
        rows = await connection.fetch(query, *args)
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

    visibility_sql, visibility_args = build_visibility_filter(vendor_org_id, len(args) + 1)
    query += visibility_sql
    args.extend(visibility_args)

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
            t.created_by,
            t.buyer_id,
            t.title,
            t.description,
            t.eligibility_of_tenderer,
            t.status,
            o.organization_name AS buyer_org_name,
            tc.category_name,
            pn.name::text AS procurement_nature,
            pm.method_code::text AS procurement_method,
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
        LEFT JOIN tender_categories tc ON t.category_id = tc.category_id
        LEFT JOIN procurement_nature pn ON t.nature_id = pn.nature_id
        LEFT JOIN procurement_method pm ON t.method_id = pm.method_id
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
    result["bid_count"] = await _count_tender_bids(connection, tender_id)

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
            c.contract_id,
            COALESCE(c.status::text, 'Active') AS contract_status,
            CASE
                WHEN t.buyer_id = $1 THEN 'buyer'
                ELSE 'vendor'
            END AS role_in_tender
        FROM awards a
        JOIN tenders t ON a.tender_id = t.tender_id
        JOIN bids b ON a.winning_bid_id = b.bid_id
        JOIN organizations buyer_org ON t.buyer_id = buyer_org.organization_id
        JOIN organizations vendor_org ON b.vendor_org_id = vendor_org.organization_id
        LEFT JOIN contracts c ON c.award_id = a.award_id
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
            c.contract_id,
            COALESCE(c.status::text, 'Active') AS contract_status,
            CASE
                WHEN t.buyer_id = $2 THEN 'buyer'
                ELSE 'vendor'
            END AS role_in_tender
        FROM awards a
        JOIN tenders t ON a.tender_id = t.tender_id
        JOIN bids b ON a.winning_bid_id = b.bid_id
        JOIN organizations buyer_org ON t.buyer_id = buyer_org.organization_id
        JOIN organizations vendor_org ON b.vendor_org_id = vendor_org.organization_id
        LEFT JOIN contracts c ON c.award_id = a.award_id
        WHERE t.tender_id = $1 AND (t.buyer_id = $2 OR b.vendor_org_id = $2);
    """
    row = await connection.fetchrow(query, tender_id, org_id)
    if row is None:
        return None

    result = dict(row)

    # Ensure a contract record exists for this award
    if not result.get("contract_id"):
        try:
            cid = await connection.fetchval("""
                INSERT INTO contracts (award_id, contract_value, status, signed_at)
                VALUES ($1, $2, 'Active', NOW())
                RETURNING contract_id
            """, result["award_id"], result.get("winning_bid_amount"))
            result["contract_id"] = cid
            result["contract_status"] = "Active"
        except Exception:
            pass

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

    if tender_row["status"] == "Published":
        bid_count = await _count_tender_bids(connection, tender_id)
        if bid_count > 0:
            raise ValueError(
                "Cannot delete a published tender that has bids. Cancel it instead."
            )

    if tender_row["status"] == "Cancelled":
        raise ValueError("Cancelled tenders cannot be deleted.")

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

        from app.modules.notifications.service import delete_notifications_for_tender
        await delete_notifications_for_tender(connection, tender_id)

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
            t.eligibility_of_tenderer,
            t.status,
            t.visibility_type,
            o.organization_name AS buyer_org_name,
            o.organization_type AS buyer_org_type,
            (o.verification_status = 'Verified') AS buyer_verified,
            tc.category_name,
            pn.name::text AS procurement_nature,
            pm.method_code::text AS procurement_method,
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
            t.eligibility_of_tenderer,
            t.status,
            t.visibility_type,
            o.organization_name AS buyer_org_name,
            o.organization_type AS buyer_org_type,
            (o.verification_status = 'Verified') AS buyer_verified,
            o.website_url AS buyer_org_website,
            tc.category_name,
            pn.name::text AS procurement_nature,
            pm.method_code::text AS procurement_method,
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


async def get_vendor_recommendations_for_tender(
    connection: asyncpg.Connection,
    tender_id: int,
    buyer_org_id: int
) -> dict:
    """
    FR-09: Calculate and return explainable vendor recommendations for a specific tender.
    Factors in:
      - Category Match: 35%
      - Mutual Historical Rating: 30%
      - Enlistment with Buyer: 20%
      - Verified Certifications: 15%
    """
    # 1. Fetch tender details
    tender_row = await connection.fetchrow("""
        SELECT tender_id, title, category_id, visibility_type, buyer_id
        FROM tenders
        WHERE tender_id = $1
    """, tender_id)
    is_exclusive = str(tender_row["visibility_type"]).lower() in ("exclusive", "enlisted")

    # 2. Fetch candidate vendor organizations (excluding the buyer)
    vendors_query = """
        SELECT 
            o.organization_id AS vendor_id,
            o.organization_name AS vendor_name,
            o.address AS vendor_address,
            o.verification_status AS vendor_verification_status,
            COALESCE(r.seller_avg_rating, 
                (SELECT ROUND(AVG(rating)::numeric, 2) FROM vendor_performance WHERE vendor_org_id = o.organization_id), 
                3.00
            )::float AS avg_seller_rating,
            COALESCE(r.seller_review_count,
                (SELECT COUNT(*) FROM vendor_performance WHERE vendor_org_id = o.organization_id),
                0
            )::int AS total_reviews_count,
            CASE WHEN ev.enlisted_org_id IS NOT NULL THEN true ELSE false END AS is_enlisted
        FROM organizations o
        LEFT JOIN organization_reputation r ON o.organization_id = r.organization_id
        LEFT JOIN enlisted_vendors ev ON ev.org_id = $2 AND ev.enlisted_org_id = o.organization_id
        WHERE o.organization_id <> $2
        ORDER BY o.organization_id
    """
    vendor_rows = await connection.fetch(vendors_query, tender_id, buyer_org_id)

    recommendations = []
    for v in vendor_rows:
        v_dict = dict(v)
        vendor_id = v_dict["vendor_id"]

        # Check category match via previous bids/awards or tender_vendor_suggestions
        cat_match_row = await connection.fetchval("""
            SELECT 1 FROM bids b
            JOIN tenders t ON b.tender_id = t.tender_id
            WHERE b.vendor_org_id = $1 AND t.category_id = $2
            LIMIT 1
        """, vendor_id, tender_cat_id)
        has_category_match = bool(cat_match_row) or (tender_cat_id is None)

        # Check certifications in organization_documents
        cert_rows = await connection.fetch("""
            SELECT dt.type_name
            FROM organization_documents od
            JOIN document_types dt ON od.doc_type_id = dt.type_id
            WHERE od.organization_id = $1
              AND dt.type_name ILIKE ANY(ARRAY['%iso%', '%cert%', '%license%'])
        """, vendor_id)
        certs = [r["type_name"] for r in cert_rows]

        # Scoring Logic
        is_enlisted = v_dict["is_enlisted"]
        if is_exclusive and not is_enlisted:
            continue

        cat_score = 1.0 if has_category_match else 0.15
        avg_rating = float(v_dict["avg_seller_rating"])
        rating_score = min(max(avg_rating / 5.0, 0.0), 1.0)
        enlist_score = 1.0 if is_enlisted else 0.0
        cert_score = 1.0 if len(certs) > 0 else 0.35

        composite_score = (
            (0.35 * cat_score) +
            (0.30 * rating_score) +
            (0.20 * enlist_score) +
            (0.15 * cert_score)
        ) * 100.0

        reasons = []
        if has_category_match:
            reasons.append("Proven category capability from historical bids")
        if avg_rating >= 4.0:
            reasons.append(f"High mutual satisfaction rating ({avg_rating:.1f}/5.0 stars)")
        if is_enlisted:
            reasons.append("Officially enlisted partner organization")
        if certs:
            reasons.append(f"Verified certifications on file: {', '.join(certs[:2])}")
        if not reasons:
            reasons.append("Active supplier on ProcureNext platform")

        recommendations.append({
            "vendor_id": vendor_id,
            "vendor_name": v_dict["vendor_name"],
            "vendor_address": v_dict["vendor_address"],
            "vendor_verification_status": v_dict["vendor_verification_status"],
            "match_score": round(composite_score, 1),
            "category_match": has_category_match,
            "is_enlisted": is_enlisted,
            "avg_seller_rating": avg_rating,
            "total_reviews_count": v_dict["total_reviews_count"],
            "certifications": certs,
            "reasons": reasons
        })

    # Sort descending by match score
    recommendations.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "tender_id": tender_id,
        "tender_title": tender_row["title"],
        "total_recommendations": len(recommendations),
        "recommendations": recommendations[:15]
    }
