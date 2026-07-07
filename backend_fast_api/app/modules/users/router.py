# ============================================================
# users/router.py - User Management API Endpoints
# ============================================================
# COVERS: FR-06 (Profile Management & Verification)
#
# ENDPOINTS:
#
# GET /users/me
#   - Get current authenticated user's full profile
#   - Returns: user details, verification status, associated orgs
#
# PUT /users/me/profile
#   - Update user profile information
#   - Accepts: personal details, contact info
#
# PUT /users/me/password
#   - Change password (requires current password)
#
# PUT /users/me/settings
#   - Update user preferences/settings
#   - Accepts: notification preferences, language, timezone
#
# POST /users/me/documents
#   - Upload identity verification document (NID, passport photo)
#   - Files stored in S3/MinIO, path saved in user_documents table
#   - Document enters "Pending" verification status
#   - Admin will manually verify and mark as Approved/Rejected
#
# GET /users/me/documents
#   - List all uploaded verification documents and their statuses
#
# PUT /users/me/documents/{document_id}
#   - Re-upload / update a verification document
#
# DELETE /users/me
#   - Delete user account (soft delete or full removal per policy)
#   - Requires password confirmation
#
# POST /users/report/{user_id}
#   - Report another user for misconduct
# ============================================================
