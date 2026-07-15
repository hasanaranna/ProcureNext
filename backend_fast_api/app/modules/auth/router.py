# ============================================================
# auth/router.py - Authentication API Endpoints
# ============================================================
# COVERS: FR-04 (Registration Entry Point), FR-05 (Auth & Account Mgmt)
#
# ENDPOINTS:
#
# POST /auth/register
#   - Register a new user account (step 1 of registration)
#   - Accepts: email, password, phone, NID, date_of_birth
#   - Sends email verification link
#   - Sends mobile OTP for phone verification
#   - Returns: user_id, verification status
#
# POST /auth/verify-email
#   - Verify email address via token sent in registration email
#
# POST /auth/verify-otp
#   - Verify mobile phone number via OTP code
#
# POST /auth/login
#   - Authenticate user with email + password
#   - If 2FA enabled, return partial token requiring OTP step
#   - If login from unrecognized device, require OTP verification
#   - Returns: access_token, refresh_token, user profile summary
#
# POST /auth/login/2fa
#   - Complete 2FA login by providing TOTP code
#
# POST /auth/refresh
#   - Exchange a valid refresh token for a new access token
#
# POST /auth/logout
#   - Invalidate current access token (blacklist in Redis)
#
# POST /auth/password-reset/request
#   - Initiate password reset flow
#   - Sends reset link to registered email
#   - Requires OTP verification as specified in FR-05
#
# POST /auth/password-reset/confirm
#   - Complete password reset with token + new password
#
# PUT /auth/change-phone
#   - Change registered phone number
#   - Requires OTP verification for BOTH new phone and email
#
# POST /auth/enable-2fa
#   - Enable TOTP-based two-factor authentication
#   - Returns QR code / secret for authenticator app setup
#
# POST /auth/disable-2fa
#   - Disable 2FA (requires current TOTP code to confirm)
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from datetime import date
from app.core.db import get_db_connection
from app.modules.auth.schemas import LoginRequest, TokenResponse
from app.modules.auth.service import authenticate_user, register_employee_user
# pyrefly: ignore [missing-import]
import asyncpg

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    try:
        async with get_db_connection() as connection:
            return await authenticate_user(connection, payload)
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.post("/register-user", response_model=TokenResponse)
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    nid: int = Form(...),
    date_of_birth: date = Form(...),
    password: str = Form(...),
    token: str = Form(...),
    nidFront: UploadFile | None = File(None),
    nidBack: UploadFile | None = File(None),
):
    try:
        async with get_db_connection() as connection:
            return await register_employee_user(
                connection,
                name=name,
                email=email,
                phone=phone,
                nid=nid,
                date_of_birth=date_of_birth,
                password=password,
                token=token,
                nid_front=nidFront,
                nid_back=nidBack,
            )
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc
