# ============================================================
# auth/dependencies.py - Auth-Specific Dependencies
# ============================================================
# PURPOSE:
# Auth-specific FastAPI dependencies that extend the core
# dependencies for specialized authentication flows.
#
# DEPENDENCIES TO DEFINE:
# - get_token_from_header(): Extract Bearer token from Authorization
# - validate_refresh_token(): Validate refresh token is not expired/blacklisted
# - require_email_verified(): Ensure user has completed email verification
# - require_phone_verified(): Ensure user has completed OTP verification
# - require_fully_verified(): Both email and phone must be verified
# ============================================================
