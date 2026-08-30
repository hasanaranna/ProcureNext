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

# pyrefly: ignore [missing-import]
import asyncpg
from datetime import date
from fastapi import HTTPException, UploadFile

from app.core.security import create_access_token, create_refresh_token, verify_password, hash_password
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse, AdminTokenResponse, AdminUserResponse
from app.services.supabase_storage import build_registration_prefix, upload_optional_file, delete_files


async def authenticate_user(connection: asyncpg.Connection, payload: LoginRequest) -> TokenResponse:
    # Added JOIN to get full_name, organization_name, and role_in_org
    user = await connection.fetchrow(
        """
        SELECT 
            u.user_id, u.email, u.password_hash, u.status, u.full_name,
            oe.role_in_org,
            o.organization_name
        FROM users u
        LEFT JOIN organization_employees oe ON u.user_id = oe.user_id
        LEFT JOIN organizations o ON oe.organization_id = o.organization_id
        WHERE u.email = $1
        """,
        payload.email,
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Update last login timestamp
    await connection.execute(
        """
        UPDATE users
        SET last_login_at = NOW()
        WHERE user_id = $1
        """,
        user["user_id"],
    )

    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        status=user["status"],
        full_name=user["full_name"],
        organization_name=user["organization_name"],
        role_in_org=user["role_in_org"],
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
    # 1. Validate Invitation (Added JOIN to get organization_name)
    invitation = await connection.fetchrow(
        """
        SELECT i.invitation_id, i.organization_id, i.status, i.expires_at, o.organization_name
        FROM user_invitations i
        JOIN organizations o ON i.organization_id = o.organization_id
        WHERE i.token = $1 AND i.email = $2
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
    uploaded_files: list[str] = []

    try:
        nid_front_url = await upload_optional_file(nid_front, f"{storage_prefix}/nid")
        if nid_front_url:
            uploaded_files.append(nid_front_url)

        nid_back_url = await upload_optional_file(nid_back, f"{storage_prefix}/nid")
        if nid_back_url:
            uploaded_files.append(nid_back_url)

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
    except Exception:
        if uploaded_files:
            try:
                await delete_files(uploaded_files)
            except Exception:
                pass
        raise


    # Automatically generate tokens
    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        status=user["status"],
        full_name=name,
        organization_name=invitation["organization_name"],
        role_in_org="Viewer"
    )
    access_token = create_access_token({"sub": str(user_id), "email": user["email"]})
    refresh_token = create_refresh_token({"sub": str(user_id), "email": user["email"]})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
    )


async def authenticate_admin(connection: asyncpg.Connection, payload: LoginRequest) -> AdminTokenResponse:
    """
    Authenticate a platform admin.

    Looks up the user by email, confirms the row exists in the `admins`
    table (i.e. the user actually holds an admin role), verifies the
    bcrypt password hash, then returns a JWT pair.
    """
    row = await connection.fetchrow(
        """
        SELECT
            u.user_id,
            u.email,
            u.password_hash,
            u.full_name,
            u.status,
            a.admin_id,
            a.admin_role
        FROM users u
        JOIN admins a ON u.user_id = a.user_id
        WHERE u.email = $1
        """,
        payload.email,
    )

    # Use a generic error message to avoid leaking whether the email exists
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials or insufficient privileges.")

    if not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials or insufficient privileges.")

    # Stamp last login time on the underlying user record
    await connection.execute(
        "UPDATE users SET last_login_at = NOW() WHERE user_id = $1",
        row["user_id"],
    )

    admin_user = AdminUserResponse(
        user_id=row["user_id"],
        admin_id=row["admin_id"],
        email=row["email"],
        full_name=row["full_name"],
        admin_role=row["admin_role"],
        status=row["status"],
    )

    # Include admin_role in the JWT payload so guards can verify it without
    # an extra DB round-trip on every protected admin request.
    token_data = {
        "sub": str(row["user_id"]),
        "email": row["email"],
        "admin_role": row["admin_role"],
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return AdminTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=admin_user,
    )


async def request_password_reset(connection: asyncpg.Connection, email: str) -> dict:
    """
    Generate a 30-minute password reset token and send reset instructions to user's email.
    """
    import secrets
    import os
    import asyncio

    clean_email = email.strip().lower()
    user = await connection.fetchrow(
        "SELECT user_id, full_name, email FROM users WHERE LOWER(email) = $1",
        clean_email,
    )

    # For security best practice, do not reveal if email is not registered
    if not user:
        return {"message": "If an account with this email exists, a password reset link has been sent to your email."}

    user_id = user["user_id"]
    user_name = user["full_name"]
    user_email = user["email"]

    # Invalidate any previously issued unused tokens for this user
    await connection.execute(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        user_id,
    )

    # Generate a cryptographically secure token
    token = secrets.token_urlsafe(32)

    # Insert token with 30-minute validity
    await connection.execute(
        """
        INSERT INTO password_reset_tokens (user_id, email, token, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')
        """,
        user_id,
        user_email,
        token,
    )

    # Construct the reset password link
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    # Asynchronously dispatch email via Celery task (with background thread fallback)
    try:
        from app.tasks.notification_tasks import send_password_reset_email_task
        send_password_reset_email_task.delay(
            to_email=user_email,
            reset_link=reset_link,
            user_name=user_name,
            expires_minutes=30,
        )
        print(f"[PASSWORD RESET] Dispatched reset email Celery task to {user_email}", flush=True)
    except Exception as task_exc:
        print(f"[PASSWORD RESET FALLBACK] Celery dispatch failed ({task_exc}). Using background thread...", flush=True)
        from app.services.email import send_password_reset_email
        asyncio.create_task(
            asyncio.to_thread(
                send_password_reset_email,
                to_email=user_email,
                reset_link=reset_link,
                user_name=user_name,
                expires_minutes=30,
            )
        )

    return {"message": "If an account with this email exists, a password reset link has been sent to your email."}


async def verify_password_reset_token(connection: asyncpg.Connection, token: str) -> dict:
    """
    Verify that a password reset token exists, is not expired, and has not been used.
    """
    row = await connection.fetchrow(
        """
        SELECT 
            t.reset_id,
            t.user_id,
            t.email,
            t.expires_at,
            t.used_at,
            (t.expires_at > NOW()) AS is_unexpired
        FROM password_reset_tokens t
        WHERE t.token = $1
        """,
        token,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Invalid password reset link.")

    if row["used_at"] is not None:
        raise HTTPException(status_code=400, detail="This password reset link has already been used.")

    if not row["is_unexpired"]:
        raise HTTPException(status_code=400, detail="This password reset link has expired (valid for 30 minutes). Please request a new one.")

    return {
        "valid": True,
        "email": row["email"],
        "message": "Password reset token is valid.",
    }


async def confirm_password_reset(connection: asyncpg.Connection, token: str, new_password: str) -> dict:
    """
    Validate reset token and update user's password hash.
    """
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    row = await connection.fetchrow(
        """
        SELECT 
            t.reset_id,
            t.user_id,
            t.email,
            t.expires_at,
            t.used_at,
            (t.expires_at > NOW()) AS is_unexpired
        FROM password_reset_tokens t
        WHERE t.token = $1
        """,
        token,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Invalid password reset link.")

    if row["used_at"] is not None:
        raise HTTPException(status_code=400, detail="This password reset link has already been used.")

    if not row["is_unexpired"]:
        raise HTTPException(status_code=400, detail="This password reset link has expired. Please request a new one.")

    new_hash = hash_password(new_password)

    async with connection.transaction():
        # Update user's password
        await connection.execute(
            """
            UPDATE users
            SET password_hash = $1,
                updated_at = NOW()
            WHERE user_id = $2
            """,
            new_hash,
            row["user_id"],
        )

        # Mark token as used
        await connection.execute(
            """
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE reset_id = $1
            """,
            row["reset_id"],
        )

    return {"message": "Password has been successfully reset. You can now log in with your new password."}
