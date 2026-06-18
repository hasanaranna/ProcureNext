# ============================================================
# security.py - Authentication & Cryptographic Utilities
# ============================================================
# PURPOSE:
# Centralized security functions used across the application.
#
# RESPONSIBILITIES:
# - Password hashing and verification (bcrypt via passlib)
# - JWT access token creation and decoding
# - JWT refresh token creation and decoding
# - OTP generation and verification (TOTP for 2FA using pyotp)
# - Token blacklisting support (stored in Redis for logout)
#
# USED BY:
# - auth module: login, register, password reset, 2FA
# - dependencies.py: get_current_user token validation
# - middleware: request authentication
# ============================================================
