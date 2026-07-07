# ============================================================
# admin/router.py - Admin Dashboard & Moderation API Endpoints
# ============================================================
# COVERS: FR-17/FR-21 (Admin Dashboard & Moderation)
#
# All endpoints require Admin role (SuperAdmin or PlatformAdmin).
#
# ENDPOINTS:
#
# --- Authentication ---
#
# POST /auth/admin/login
#   - Admin-specific login (may have different 2FA requirements)
#
# POST /auth/admin/register
#   - Register a new admin (SuperAdmin only can create other admins)
#
# --- User & Organization Moderation ---
#
# PUT /admin/modify-user-status
#   - Change user status: Active, Suspended, Banned
#   - Accepts: user_id, new_status, reason
#   - Creates audit log entry
#
# POST /auth/admin/verify/{organization_id}
#   - Admin manually verifies organization documents
#   - Reviews: TradeLicense, TIN, VAT, RJSC certificates
#   - Sets organization verification_status to Verified or Rejected
#   - Notifies the organization of the result
#
# POST /admin/verify-user-document/{document_id}
#   - Admin verifies a user's NID document
#   - Sets document verification_status
#   - Notifies user
#
# --- Platform Configuration ---
#
# POST /admin/update-price
#   - Update the price per credit point (in BDT)
#   - Creates a new pricing entry (effective immediately)
#
# GET /admin/pricing-history
#   - View history of pricing changes
#
# --- Reporting (see reports module for detailed endpoints) ---
#
# GET /admin/stats
#   - Quick platform statistics summary
#
# --- Reports & User Management ---
#
# GET /admin/user-reports
#   - View all user/org reports submitted by platform users
#
# PUT /admin/user-reports/{report_id}
#   - Admin resolves a report (take action or dismiss)
# ============================================================
