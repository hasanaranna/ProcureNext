# ============================================================
# services/email.py - Email Service
# ============================================================
# PURPOSE:
# Sends transactional emails via SMTP (or SES in production).
#
# EMAIL TYPES TO SUPPORT:
# - Email verification (registration flow)
# - Password reset link
# - OTP code delivery (backup to SMS)
# - Tender invitation notification
# - Bid status update (submitted, accepted, rejected)
# - Award notification (NOA issuance)
# - Payment confirmation
# - Document verification result
# - Affiliation request notification
# - Deadline reminder alerts
# - Dispute status updates
#
# FUNCTIONS TO IMPLEMENT:
# - send_email(to, subject, template, context): Send a templated email
# - send_verification_email(user, token): Registration verification
# - send_password_reset_email(user, token): Password reset
# - send_otp_email(user, otp_code): OTP via email
# - send_notification_email(user, notification): Generic notification
#
# Uses HTML email templates stored in a templates/ directory.
# Emails are sent asynchronously via Celery tasks to avoid
# blocking the main request thread.
# ============================================================
