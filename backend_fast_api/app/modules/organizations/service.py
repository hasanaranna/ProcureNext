import secrets

# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import HTTPException

from app.core.security import hash_password
from app.modules.organizations.schemas import OrgCreateRequest, OrgCreateResponse, OrganizationSummary, UserSummary


async def _generate_unique_join_code(connection: asyncpg.Connection) -> str:
    for _ in range(10):
        code = secrets.token_urlsafe(8)
        existing = await connection.fetchval(
            "SELECT organization_id FROM organizations WHERE unique_join_code = $1",
            code,
        )
        if existing is None:
            return code
    raise HTTPException(status_code=500, detail="Failed to generate a unique organization join code.")


async def _get_document_type_ids(connection: asyncpg.Connection) -> dict[str, int]:
    rows = await connection.fetch("SELECT type_id, type_name FROM document_types")
    return {row["type_name"]: row["type_id"] for row in rows}


async def create_master_organization(
    connection: asyncpg.Connection,
    payload: OrgCreateRequest,
) -> OrgCreateResponse:
    existing_user = await connection.fetchrow(
        "SELECT user_id, email, nid FROM users WHERE email = $1 OR nid = $2",
        payload.email,
        payload.nid,
    )
    if existing_user is not None:
        if existing_user["email"] == payload.email:
            raise HTTPException(status_code=409, detail="A user with this email already exists.")
        raise HTTPException(status_code=409, detail="A user with this NID already exists.")

    password_hash = hash_password(payload.password)
    join_code = await _generate_unique_join_code(connection)
    document_types = await _get_document_type_ids(connection)

    async with connection.transaction():
        user = await connection.fetchrow(
            """
            INSERT INTO users (
                full_name,
                email,
                nid,
                date_of_birth,
                password_hash,
                phone,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
            RETURNING user_id, full_name, email, phone, status
            """,
            payload.full_name,
            payload.email,
            payload.nid,
            payload.date_of_birth,
            password_hash,
            payload.phone,
        )

        if user is None:
            raise HTTPException(status_code=500, detail="Failed to create user.")

        user_id = user["user_id"]

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
            payload.nid_front_url,
            payload.nid_back_url,
        )

        organization = await connection.fetchrow(
            """
            INSERT INTO organizations (
                primary_contact,
                organization_name,
                organization_type,
                address,
                website,
                description,
                verification_status,
                tin_number,
                bin_number,
                unique_join_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9)
            RETURNING
                organization_id,
                organization_name,
                organization_type,
                verification_status,
                unique_join_code,
                tin_number,
                bin_number,
                created_at
            """,
            user_id,
            payload.organization_name,
            payload.organization_type,
            payload.address,
            payload.website,
            payload.description,
            payload.tin_certificate_url,
            payload.vat_certificate_url,
            join_code,
        )

        if organization is None:
            raise HTTPException(status_code=500, detail="Failed to create organization.")

        organization_id = organization["organization_id"]

        await connection.execute(
            """
            INSERT INTO organization_employees (
                organization_id,
                user_id,
                role_in_org
            )
            VALUES ($1, $2, 'Owner')
            """,
            organization_id,
            user_id,
        )

        document_urls = {
            "TradeLicense": payload.trade_license_url,
            "TIN": payload.tin_certificate_url,
            "VAT": payload.vat_certificate_url,
        }

        for type_name, file_url in document_urls.items():
            if not file_url:
                continue

            type_id = document_types.get(type_name)
            if type_id is None:
                continue

            await connection.execute(
                """
                INSERT INTO organization_documents (
                    organization_id,
                    document_type_id,
                    file_path,
                    review_status
                )
                VALUES ($1, $2, $3, 'Pending')
                """,
                organization_id,
                type_id,
                file_url,
            )

        for file_url in payload.additional_document_urls:
            rjsc_type_id = document_types.get("RJSC")
            if rjsc_type_id is None:
                continue

            await connection.execute(
                """
                INSERT INTO organization_documents (
                    organization_id,
                    document_type_id,
                    file_path,
                    review_status
                )
                VALUES ($1, $2, $3, 'Pending')
                """,
                organization_id,
                rjsc_type_id,
                file_url,
            )

    return OrgCreateResponse(
        message="Organization created successfully.",
        user=UserSummary(
            user_id=user["user_id"],
            full_name=user["full_name"],
            email=user["email"],
            phone=user["phone"],
            status=user["status"],
        ),
        organization=OrganizationSummary(
            organization_id=organization["organization_id"],
            organization_name=organization["organization_name"],
            organization_type=organization["organization_type"],
            verification_status=organization["verification_status"],
            unique_join_code=organization["unique_join_code"],
            tin_number=organization["tin_number"],
            bin_number=organization["bin_number"],
            created_at=organization["created_at"],
        ),
    )


async def create_or_update_invitation(
    connection: asyncpg.Connection,
    organization_id: int,
    invited_by: int,
    email: str,
    token: str,
) -> dict:
    """Create a new invitation or re-issue an existing one with fresh timestamps."""
    existing = await connection.fetchrow(
        """
        SELECT invitation_id
        FROM user_invitations
        WHERE organization_id = $1
          AND invited_by = $2
          AND email = $3
        """,
        organization_id,
        invited_by,
        email,
    )

    if existing is not None:
        invitation = await connection.fetchrow(
            """
            UPDATE user_invitations
            SET token = $1,
                created_at = NOW(),
                expires_at = NOW() + INTERVAL '7 days'
            WHERE invitation_id = $2
            RETURNING invitation_id, organization_id, invited_by, email, token, status, created_at, expires_at
            """,
            token,
            existing["invitation_id"],
        )
        message = "Invitation updated."
    else:
        invitation = await connection.fetchrow(
            """
            INSERT INTO user_invitations (
                organization_id,
                invited_by,
                email,
                token,
                status
            )
            VALUES ($1, $2, $3, $4, 'Pending')
            RETURNING invitation_id, organization_id, invited_by, email, token, status, created_at, expires_at
            """,
            organization_id,
            invited_by,
            email,
            token,
        )
        message = "Invitation created."

    if invitation is None:
        raise HTTPException(status_code=500, detail="Failed to create invitation: query returned None.")

    return {
        "message": message,
        "invitation": dict(invitation.items()),
    }


async def get_invitation_details_by_token(connection: asyncpg.Connection, token: str) -> dict:
    row = await connection.fetchrow(
        """
        SELECT 
            i.email, 
            i.status, 
            i.organization_id, 
            o.organization_name,
            (i.expires_at > NOW()) as is_valid
        FROM user_invitations i
        JOIN organizations o ON i.organization_id = o.organization_id
        WHERE i.token = $1
        """,
        token,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    return {
        "email": row["email"],
        "organization_name": row["organization_name"],
        "organization_id": row["organization_id"],
        "status": row["status"],
        "is_valid": row["is_valid"] and row["status"] == 'Pending'
    }
