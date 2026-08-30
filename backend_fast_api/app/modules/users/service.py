# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import HTTPException, UploadFile

from app.core.security import hash_password, verify_password
from app.modules.users.schemas import (
    ChangePasswordRequest,
    OrganizationMembership,
    UserDocumentResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.services.supabase_storage import (
    build_registration_prefix,
    delete_files,
    generate_signed_url_optional,
    upload_optional_file,
)


async def get_user_profile(connection: asyncpg.Connection, user_id: int) -> UserProfileResponse:
    user = await connection.fetchrow(
        """
        SELECT
            u.user_id,
            u.email,
            u.full_name,
            u.phone,
            u.nid,
            u.date_of_birth,
            u.status,
            u.is_2fa_enabled,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            uv.review_status AS verification_status
        FROM users u
        LEFT JOIN user_verification uv ON uv.user_id = u.user_id
        WHERE u.user_id = $1
        """,
        user_id,
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    org_rows = await connection.fetch(
        """
        SELECT
            oe.organization_id,
            o.organization_name,
            o.organization_type::text AS organization_type,
            oe.role_in_org::text AS role_in_org,
            oe.org_user_id
        FROM organization_employees oe
        JOIN organizations o ON o.organization_id = oe.organization_id
        WHERE oe.user_id = $1
        ORDER BY o.organization_name
        """,
        user_id,
    )

    organizations = [OrganizationMembership(**dict(row)) for row in org_rows]
    return UserProfileResponse(
        **dict(user),
        organizations=organizations,
    )


async def update_profile(
    connection: asyncpg.Connection,
    user_id: int,
    payload: UserProfileUpdate,
) -> UserProfileResponse:
    if payload.full_name is None and payload.phone is None:
        raise HTTPException(status_code=400, detail="No profile fields provided to update.")

    row = await connection.fetchrow(
        """
        UPDATE users
        SET
            full_name = COALESCE($2, full_name),
            phone = COALESCE($3, phone),
            updated_at = NOW()
        WHERE user_id = $1
        RETURNING user_id
        """,
        user_id,
        payload.full_name,
        payload.phone,
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    return await get_user_profile(connection, user_id)


async def change_password(
    connection: asyncpg.Connection,
    user_id: int,
    payload: ChangePasswordRequest,
) -> None:
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current password.",
        )

    row = await connection.fetchrow(
        "SELECT password_hash FROM users WHERE user_id = $1",
        user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(payload.current_password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    new_hash = hash_password(payload.new_password)
    await connection.execute(
        """
        UPDATE users
        SET password_hash = $2, updated_at = NOW()
        WHERE user_id = $1
        """,
        user_id,
        new_hash,
    )


async def get_user_documents(
    connection: asyncpg.Connection,
    user_id: int,
) -> UserDocumentResponse:
    row = await connection.fetchrow(
        """
        SELECT review_status, nid_front_file_path, nid_back_file_path, verified_at
        FROM user_verification
        WHERE user_id = $1
        """,
        user_id,
    )
    if not row:
        return UserDocumentResponse(review_status="NotSubmitted")

    return UserDocumentResponse(
        review_status=row["review_status"],
        nid_front_url=await generate_signed_url_optional(row["nid_front_file_path"]),
        nid_back_url=await generate_signed_url_optional(row["nid_back_file_path"]),
        verified_at=row["verified_at"],
    )


async def upload_verification_documents(
    connection: asyncpg.Connection,
    user_id: int,
    email: str,
    nid_front: UploadFile | None,
    nid_back: UploadFile | None,
) -> UserDocumentResponse:
    if nid_front is None and nid_back is None:
        raise HTTPException(status_code=400, detail="At least one document file is required.")

    existing = await connection.fetchrow(
        """
        SELECT nid_front_file_path, nid_back_file_path
        FROM user_verification
        WHERE user_id = $1
        """,
        user_id,
    )

    storage_prefix = build_registration_prefix(email)
    uploaded_files: list[str] = []
    old_files_to_delete: list[str] = []

    try:
        nid_front_path = await upload_optional_file(nid_front, f"{storage_prefix}/nid")
        if nid_front_path:
            uploaded_files.append(nid_front_path)
            if existing and existing["nid_front_file_path"]:
                old_files_to_delete.append(existing["nid_front_file_path"])

        nid_back_path = await upload_optional_file(nid_back, f"{storage_prefix}/nid")
        if nid_back_path:
            uploaded_files.append(nid_back_path)
            if existing and existing["nid_back_file_path"]:
                old_files_to_delete.append(existing["nid_back_file_path"])

        if existing:
            await connection.execute(
                """
                UPDATE user_verification
                SET
                    nid_front_file_path = COALESCE($2, nid_front_file_path),
                    nid_back_file_path = COALESCE($3, nid_back_file_path),
                    review_status = 'Pending',
                    verified_by = NULL,
                    verified_at = NULL
                WHERE user_id = $1
                """,
                user_id,
                nid_front_path,
                nid_back_path,
            )
        else:
            await connection.execute(
                """
                INSERT INTO user_verification (
                    user_id,
                    nid_front_file_path,
                    nid_back_file_path,
                    review_status
                )
                VALUES ($1, $2, $3, 'Pending')
                """,
                user_id,
                nid_front_path,
                nid_back_path,
            )
    except Exception:
        if uploaded_files:
            try:
                await delete_files(uploaded_files)
            except Exception:
                pass
        raise

    if old_files_to_delete:
        try:
            await delete_files(old_files_to_delete)
        except Exception:
            pass

    return await get_user_documents(connection, user_id)
