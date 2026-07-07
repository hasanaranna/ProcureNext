# ============================================================
# services/sms.py - SMS & OTP Service
# ============================================================
# PURPOSE:
# Integrates with a third-party OTP/SMS service provider for
# mobile phone verification and 2FA.
#
# REQUIREMENTS (from PDF):
# - OTP verification for registration (phone verification)
# - OTP for login from unrecognized devices
# - OTP for password reset confirmation
# - OTP for phone number changes (both old and new numbers)
# - Platform owner must provide NID to OTP service provider
#
# FUNCTIONS TO IMPLEMENT:
# - send_otp(phone_number): Generate and send OTP via SMS
# - verify_otp(phone_number, code): Validate OTP code
# - generate_otp(): Create a time-based OTP code
# - is_otp_expired(phone_number): Check if OTP has expired
#
# OTP codes should be stored temporarily in Redis with TTL
# (e.g., 5-minute expiry).
# ============================================================
