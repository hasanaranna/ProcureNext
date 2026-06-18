# ============================================================
# audit/router.py - Audit Log API Endpoints
# ============================================================
# COVERS: FR-18/FR-22 (Audit Trail & Immutable Logging)
#
# All critical actions are logged with user, timestamp, and
# immutable hash signatures for tamper-evidence.
#
# CRITICAL ACTIONS LOGGED:
# - Tender creation, update, publish, cancel
# - Bid submission, amendment, withdrawal
# - Award/NOA issuance and acceptance
# - Payment transactions (purchase, refund)
# - Document verification actions (approve, reject)
# - User login, password reset
# - Organization creation, member changes
# - Contract signing confirmations
# - Dispute creation and resolution
# - Admin moderation actions (ban, unblock)
#
# ENDPOINTS (Admin only):
#
# GET /admin/logs
#   - View audit logs with filters
#   - Filterable by: user_id, action_type, entity_type,
#     date range, IP address
#   - Paginated, ordered by timestamp descending
#
# GET /admin/logs/{user_id}
#   - View audit logs for a specific user
#
# GET /admin/logs/entity/{entity_type}/{entity_id}
#   - View all logs related to a specific entity
#   - e.g., all actions on tender T-123
#
# GET /admin/logs/verify
#   - Verify audit log integrity by checking hash chain
#   - Detects if any log entries have been tampered with
# ============================================================
