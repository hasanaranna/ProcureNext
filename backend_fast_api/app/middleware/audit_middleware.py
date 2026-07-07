# ============================================================
# middleware/audit_middleware.py - Automatic Audit Logging
# ============================================================
# PURPOSE:
# Automatically captures audit log entries for critical API
# operations (state-changing requests) without requiring each
# endpoint to manually call the audit service.
#
# HOW IT WORKS:
# - Intercepts POST, PUT, PATCH, DELETE requests
# - Captures: user_id, IP address, endpoint, request body
# - After response, logs the action with old/new value snapshots
# - Skips non-critical endpoints (health checks, search, etc.)
#
# For particularly critical actions (award, payment, tender publish),
# individual services may also explicitly call the audit service
# for more detailed logging with old/new value diffs.
#
# DESIGN:
# - Lightweight: adds minimal latency to requests
# - Non-blocking: audit log writes are async/background
# - Hash chain: each log entry references previous entry's hash
# ============================================================
