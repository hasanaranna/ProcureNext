# ============================================================
# middleware/rate_limiter.py - Rate Limiting Middleware
# ============================================================
# PURPOSE:
# Protects API endpoints from abuse by limiting request rates.
# Uses Redis for distributed rate limit counters.
#
# RATE LIMIT TIERS:
# - Public endpoints (no auth): 30 requests/minute per IP
# - Authenticated endpoints: 120 requests/minute per user
# - Auth endpoints (login/register): 10 requests/minute per IP
#   (prevent brute force attacks)
# - Search endpoints: 60 requests/minute per user
# - Payment endpoints: 10 requests/minute per user
# - File upload endpoints: 20 requests/minute per user
#
# IMPLEMENTATION:
# - Uses sliding window algorithm with Redis
# - Returns 429 Too Many Requests when limit exceeded
# - Includes Retry-After header in response
# ============================================================
