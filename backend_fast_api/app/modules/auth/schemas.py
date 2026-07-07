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
