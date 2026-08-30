# ============================================================
# auth/schemas.py - Authentication Pydantic Schemas
# ============================================================
# PURPOSE:
# Request and response models for all auth endpoints.
#
# SCHEMAS TO DEFINE:
#
# Requests:
# - RegisterRequest: email, password, phone, nid, date_of_birth
# - LoginRequest: email, password
# - TwoFactorRequest: partial_token, otp_code
# - PasswordResetRequest: email
# - PasswordResetConfirm: token, new_password
# - OTPVerifyRequest: phone, otp_code
# - ChangePhoneRequest: new_phone, email_otp, phone_otp
# - RefreshTokenRequest: refresh_token
#
# Responses:
# - TokenResponse: access_token, refresh_token, token_type, expires_in
# - RegisterResponse: user_id, email, verification_status, message
# - TwoFactorSetupResponse: secret, qr_code_uri
# - MessageResponse: message (generic success response)
#
# VALIDATION:
# - Email format validation
# - Password strength rules (min length, complexity)
# - NID format validation
# - Phone number format validation (Bangladesh format)
# ============================================================

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: int
    email: str
    status: str
    full_name: str | None = None
    organization_name: str | None = None
    role_in_org: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class AdminUserResponse(BaseModel):
    user_id: int
    admin_id: int
    email: str
    full_name: str | None = None
    admin_role: str
    status: str


class AdminTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AdminUserResponse


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetVerifyResponse(BaseModel):
    valid: bool
    email: str | None = None
    message: str | None = None


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str
