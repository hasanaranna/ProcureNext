# ============================================================
# auth/service.py - Authentication Business Logic
# ============================================================
# PURPOSE:
# Contains all authentication business logic, separated from
# the route handlers for testability and reuse.
#
# FUNCTIONS TO IMPLEMENT:
# - register_user(): Create user record, hash password, trigger
#   email verification and OTP sending
# - authenticate_user(): Validate credentials, check account status,
#   handle 2FA flow
# - verify_email_token(): Validate email verification JWT
# - verify_otp(): Check OTP code against OTP service
# - create_tokens(): Generate access + refresh JWT pair
# - refresh_access_token(): Validate refresh token, issue new access
# - logout_user(): Blacklist access token in Redis
# - request_password_reset(): Generate reset token, send email
# - confirm_password_reset(): Validate token, update password hash
# - enable_2fa(): Generate TOTP secret, store for user
# - disable_2fa(): Remove TOTP secret after verification
# - check_device_recognition(): Determine if login device is known
#   (compare IP/user-agent with past logins)
# - change_phone_number(): Verify both OTPs, update phone
# ============================================================

import asyncpg
from datetime import date
from fastapi import HTTPException, UploadFile

from app.core.security import create_access_token, create_refresh_token, verify_password, hash_password
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse
from app.services.supabase_storage import build_registration_prefix, upload_optional_file


async def authenticate_user(connection: asyncpg.Connection, payload: LoginRequest) -> TokenResponse:
    user = await connection.fetchrow(
        """
        SELECT user_id, email, password_hash, status
        FROM users
        WHERE email = $1
        """,
        payload.email,
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        status=user["status"],
    )

    # Update last login timestamp
    await connection.execute(
        """
        UPDATE users
        SET last_login_at = NOW()
        WHERE user_id = $1
        """,
        user["user_id"],
    )

    access_token = create_access_token({"sub": str(user["user_id"]), "email": user["email"]})
    refresh_token = create_refresh_token({"sub": str(user["user_id"]), "email": user["email"]})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
    )


async def register_employee_user(
    connection: asyncpg.Connection,
    name: str,
    email: str,
    phone: str,
    nid: int,
    date_of_birth: date,
    password: str,
    token: str,
    nid_front: UploadFile | None,
    nid_back: UploadFile | None,
) -> TokenResponse:
    # 1. Validate Invitation
    invitation = await connection.fetchrow(
        """
        SELECT invitation_id, organization_id, status, expires_at
        FROM user_invitations
        WHERE token = $1 AND email = $2
        """,
        token, email
    )
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid invitation token or email.")
    if invitation["status"] != 'Pending':
        raise HTTPException(status_code=400, detail="Invitation is no longer pending.")
    
    # 2. Verify user doesn't already exist
    existing_user = await connection.fetchrow(
        "SELECT user_id, email, nid FROM users WHERE email = $1 OR nid = $2",
        email, nid,
    )
    if existing_user is not None:
        if existing_user["email"] == email:
            raise HTTPException(status_code=409, detail="A user with this email already exists.")
        raise HTTPException(status_code=409, detail="A user with this NID already exists.")
    
    password_hash = hash_password(password)
    storage_prefix = build_registration_prefix(email)
    nid_front_url = await upload_optional_file(nid_front, f"{storage_prefix}/nid")
    nid_back_url = await upload_optional_file(nid_back, f"{storage_prefix}/nid")

    async with connection.transaction():
        # Create User
        user = await connection.fetchrow(
            """
            INSERT INTO users (full_name, email, nid, date_of_birth, password_hash, phone, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Active')
            RETURNING user_id, email, status
            """,
            name, email, nid, date_of_birth, password_hash, phone
        )
        if not user:
            raise HTTPException(status_code=500, detail="Failed to create user.")
        
        user_id = user["user_id"]

        # Add Verification details
        await connection.execute(
            """
            INSERT INTO user_verification (user_id, nid_front_file_path, nid_back_file_path, review_status)
            VALUES ($1, $2, $3, 'Pending')
            """,
            user_id, nid_front_url, nid_back_url
        )

        # Add to Organization Employees (Default Viewer role)
        await connection.execute(
            """
            INSERT INTO organization_employees (organization_id, user_id, role_in_org)
            VALUES ($1, $2, 'Viewer')
            """,
            invitation["organization_id"], user_id
        )

        # Update Invitation Status
        await connection.execute(
            "UPDATE user_invitations SET status = 'Accepted' WHERE invitation_id = $1",
            invitation["invitation_id"]
        )

    # Automatically generate tokens
    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        status=user["status"],
    )
    access_token = create_access_token({"sub": str(user_id), "email": user["email"]})
    refresh_token = create_refresh_token({"sub": str(user_id), "email": user["email"]})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
    )
