# ============================================================
# middleware/request_logging.py - Request/Response Logging
# ============================================================
# PURPOSE:
# Structured logging of all HTTP requests and responses for
# debugging, monitoring, and performance tracking.
#
# LOGS INCLUDE:
# - Request: method, path, query params, client IP, user-agent,
#   authenticated user_id (if available), timestamp
# - Response: status code, response time (ms), content length
#
# DESIGN:
# - Uses Python's logging module with structured JSON format
# - Sensitive data (passwords, tokens) is redacted
# - Request bodies are not logged to avoid PII exposure
# - Correlates requests with a unique request_id header
# - Useful for debugging and performance monitoring
# ============================================================
