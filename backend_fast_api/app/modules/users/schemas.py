# ============================================================
# users/schemas.py - User Pydantic Schemas
# ============================================================
# PURPOSE:
# Request/response models for user management endpoints.
#
# SCHEMAS TO DEFINE:
# - UserProfile: Full user profile response (id, email, phone,
#   nid, status, 2fa status, created_at, organizations list)
# - UserProfileUpdate: Editable profile fields
# - UserSettings: Notification preferences, language, timezone
# - UserDocumentUpload: document_type, file metadata
# - UserDocumentResponse: document_id, type, status, uploaded_at
# - ChangePasswordRequest: current_password, new_password
# - UserReportRequest: reason, description
# - UserBrief: Minimal user info for embedding in other responses
# ============================================================
