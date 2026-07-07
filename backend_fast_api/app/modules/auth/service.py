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
from fastapi import HTTPException

from app.core.security import create_access_token, create_refresh_token, verify_password
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse


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
