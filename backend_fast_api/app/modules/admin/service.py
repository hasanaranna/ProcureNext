# ============================================================
# admin/service.py - Admin Business Logic
# ============================================================
# FUNCTIONS TO IMPLEMENT:
# - modify_user_status(): Ban/suspend/activate user, log action
# - verify_organization(): Review org documents, update status,
#   notify org of verification result
# - verify_user_document(): Review NID, update status, notify user
# - register_admin(): Create new admin account (SuperAdmin only)
# - get_platform_stats(): Quick summary statistics
# - get_user_reports(): List all submitted reports
# - resolve_user_report(): Admin takes action on a report
# - get_pricing_history(): View pricing change log
# ============================================================

# pyrefly: ignore [missing-import]
import asyncpg

from app.modules.admin.schemas import (
    PendingMasterAccount,
    PendingMasterAccountsResponse,
    PendingDocuments,
    ModifyUserStatusRequest,
    VerifyOrgRequest,
)
from app.services.supabase_storage import generate_signed_url_optional, delete_files

from fastapi import HTTPException
from app.tasks.notification_tasks import send_account_status_email_task


async def get_pending_master_accounts(
    connection: asyncpg.Connection,
) -> PendingMasterAccountsResponse:
    """
    Retrieve all master accounts (org Owners) whose user status is 'Pending'.

    Joins:
        users → organization_employees (Owner) → organizations
        users → user_verification (NID docs)
        organizations → organization_documents → document_types (trade license, TIN, VAT, RJSC)
    """

    # Fetch users who are Owners of an organization and still Pending
    rows = await connection.fetch(
        """
        SELECT
            u.user_id,
            u.full_name,
            u.email,
            u.phone,
            u.created_at,
            o.organization_name,
            o.organization_type,
            o.organization_id,
            uv.nid_front_file_path,
            uv.nid_back_file_path
        FROM users u
        JOIN organization_employees oe ON u.user_id = oe.user_id
        JOIN organizations o ON oe.organization_id = o.organization_id
        LEFT JOIN user_verification uv ON u.user_id = uv.user_id
        WHERE u.status = 'Pending'
          AND oe.role_in_org = 'Owner'
        ORDER BY u.created_at DESC
        """,
    )

    if not rows:
        return PendingMasterAccountsResponse(accounts=[], total=0)

    # Batch-load org documents for all relevant organizations
    org_ids = list({row["organization_id"] for row in rows})

    doc_rows = await connection.fetch(
        """
        SELECT
            od.organization_id,
            dt.type_name,
            od.file_path
        FROM organization_documents od
        JOIN document_types dt ON od.document_type_id = dt.type_id
        WHERE od.organization_id = ANY($1)
        ORDER BY od.organization_id, dt.type_name
        """,
        org_ids,
    )

    # Group documents by organization_id
    org_docs: dict[int, dict[str, list[str]]] = {}
    for doc in doc_rows:
        oid = doc["organization_id"]
        tname = doc["type_name"]
        if oid not in org_docs:
            org_docs[oid] = {}
        org_docs[oid].setdefault(tname, []).append(doc["file_path"])

    accounts: list[PendingMasterAccount] = []
    for row in rows:
        oid = row["organization_id"]
        docs = org_docs.get(oid, {})

        # Generate short-lived signed URLs (1 hour) for each document stored
        # as an object path in the private Supabase Storage bucket.
        additional_paths = docs.get("RJSC", [])
        additional_signed = [
            url
            for url in [
                await generate_signed_url_optional(path)
                for path in additional_paths
            ]
            if url is not None
        ]

        pending_docs = PendingDocuments(
            nid_front=await generate_signed_url_optional(row["nid_front_file_path"]),
            nid_back=await generate_signed_url_optional(row["nid_back_file_path"]),
            trade_license=await generate_signed_url_optional(docs.get("TradeLicense", [None])[0]),
            tin_certificate=await generate_signed_url_optional(docs.get("TIN", [None])[0]),
            vat_certificate=await generate_signed_url_optional(docs.get("VAT", [None])[0]),
            additional_docs=additional_signed,
        )

        accounts.append(
            PendingMasterAccount(
                user_id=row["user_id"],
                organization_id=oid,
                full_name=row["full_name"] or "Unknown",
                email=row["email"],
                phone=row["phone"],
                organization_name=row["organization_name"],
                organization_type=row["organization_type"],
                submitted_at=row["created_at"].isoformat() if row["created_at"] else "",
                documents=pending_docs,
            )
        )

    return PendingMasterAccountsResponse(accounts=accounts, total=len(accounts))


async def modify_user_status(
    connection: asyncpg.Connection,
    payload: ModifyUserStatusRequest,
) -> dict:
    """
    Change user status (e.g. Active, Suspended, Pending).
    Also log the action in a production system.
    """
    result = await connection.execute(
        "UPDATE users SET status = $1 WHERE user_id = $2",
        payload.new_status,
        payload.user_id,
    )

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User status updated to {payload.new_status}"}


async def verify_organization(
    connection: asyncpg.Connection,
    organization_id: int,
    payload: VerifyOrgRequest,
) -> dict:
    """
    Verify organization documents and update its status.
    If Rejected, removes the organization and the user.
    """
    async with connection.transaction():
        # Get the owner of this organization before doing anything
        owner = await connection.fetchrow(
            """
            SELECT user_id FROM organization_employees
            WHERE organization_id = $1 AND role_in_org = 'Owner'
            """,
            organization_id,
        )

        if payload.verification_status == "Rejected":
            # ── Collect all file paths before records are deleted ──────────
            file_paths: list[str] = []

            # Capture owner email/name BEFORE deletion for the rejection email
            owner_email = None
            owner_full_name = None
            owner_org_name = None
            if owner:
                owner_info = await connection.fetchrow(
                    """
                    SELECT u.email, u.full_name, o.organization_name
                    FROM users u
                    JOIN organization_employees oe ON u.user_id = oe.user_id
                    JOIN organizations o ON oe.organization_id = o.organization_id
                    WHERE u.user_id = $1 AND oe.organization_id = $2
                    """,
                    owner["user_id"], organization_id,
                )
                if owner_info:
                    owner_email = owner_info["email"]
                    owner_full_name = owner_info["full_name"]
                    owner_org_name = owner_info["organization_name"]

                nid_rows = await connection.fetch(
                    """
                    SELECT nid_front_file_path, nid_back_file_path
                    FROM user_verification
                    WHERE user_id = $1
                    """,
                    owner["user_id"],
                )
                for row in nid_rows:
                    if row["nid_front_file_path"]:
                        file_paths.append(row["nid_front_file_path"])
                    if row["nid_back_file_path"]:
                        file_paths.append(row["nid_back_file_path"])

            org_doc_rows = await connection.fetch(
                "SELECT file_path FROM organization_documents WHERE organization_id = $1",
                organization_id,
            )
            for row in org_doc_rows:
                if row["file_path"]:
                    file_paths.append(row["file_path"])

            # ── Remove DB records ──────────────────────────────────────────
            res = await connection.execute(
                "DELETE FROM organizations WHERE organization_id = $1",
                organization_id,
            )
            if res == "DELETE 0":
                raise HTTPException(status_code=404, detail="Organization not found")

            if owner:
                await connection.execute(
                    "DELETE FROM users WHERE user_id = $1",
                    owner["user_id"],
                )

        # ── Delete files from Supabase Storage (outside transaction so a
        #    storage hiccup doesn't roll back the DB rejection) ────────────
        if payload.verification_status == "Rejected" and file_paths:
            await delete_files(file_paths)

            # Send rejection email (data was captured before deletion)
            if owner_email:
                send_account_status_email_task.delay(
                    to_email=owner_email,
                    full_name=owner_full_name or "User",
                    org_name=owner_org_name or "Your organization",
                    status="Rejected",
                    review_notes=payload.review_notes,
                )

            return {"message": f"Organization {organization_id} has been Rejected and the user was removed."}

        else:
            # Update organization status
            res = await connection.execute(
                "UPDATE organizations SET verification_status = $1 WHERE organization_id = $2",
                payload.verification_status,
                organization_id,
            )
            if res == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Organization not found")

            doc_status = "Approved"
            user_status = "Active"

            # Update org documents status
            await connection.execute(
                "UPDATE organization_documents SET review_status = $1, review_notes = $2 WHERE organization_id = $3",
                doc_status,
                payload.review_notes,
                organization_id,
            )

            if owner:
                user_id = owner["user_id"]
                # Update user status
                await connection.execute(
                    "UPDATE users SET status = $1 WHERE user_id = $2",
                    user_status,
                    user_id,
                )
                # Update user verification documents status
                await connection.execute(
                    "UPDATE user_verification SET review_status = $1 WHERE user_id = $2",
                    doc_status,
                    user_id,
                )

            # Send approval email to the user
            if owner:
                owner_info = await connection.fetchrow(
                    "SELECT email, full_name FROM users WHERE user_id = $1",
                    owner["user_id"],
                )
                if owner_info:
                    org_row = await connection.fetchrow(
                        "SELECT organization_name FROM organizations WHERE organization_id = $1",
                        organization_id,
                    )
                    send_account_status_email_task.delay(
                        to_email=owner_info["email"],
                        full_name=owner_info["full_name"] or "User",
                        org_name=org_row["organization_name"] if org_row else "Your organization",
                        status="Verified",
                        review_notes=payload.review_notes,
                    )

            return {"message": f"Organization {organization_id} has been {payload.verification_status}."}
