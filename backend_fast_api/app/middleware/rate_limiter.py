# ============================================================
# middleware/rate_limiter.py - Rate Limiting Middleware
# ============================================================
# PURPOSE:
# Protects sensitive, unauthenticated auth endpoints from brute-force
# and email-enumeration abuse. Uses Redis for counters so the limit is
# shared across worker processes.
#
# SCOPE:
# Only the auth endpoints listed in RATE_LIMITED_PATHS are limited here
# (login, admin login, registration, password-reset request) — these are
# the endpoints an attacker can hit without already holding a valid
# token, so they're the ones that need protection from scripted abuse.
#
# IMPLEMENTATION:
# - Fixed-window counter per (client key, path) in Redis, via INCR + EXPIRE.
# - Returns 429 Too Many Requests with a Retry-After header when exceeded.
# - Fails OPEN (allows the request through, logs a warning) if Redis is
#   unreachable, so a cache outage doesn't take the whole login flow down.
# - Note: in this deployment, browser traffic is proxied through the
#   Next.js server (see frontend/app/api/**/route.ts), so the client key
#   ends up being the proxy's address for all users rather than each
#   visitor's real IP. This still caps the total brute-force request rate
#   against these endpoints; per-visitor limiting would require the proxy
#   to forward the original client IP in a trusted header.
# ============================================================

import logging
import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.services.redis import get_redis_client

logger = logging.getLogger(__name__)

# path -> (max requests, window in seconds)
RATE_LIMITED_PATHS: dict[str, tuple[int, int]] = {
    "/api/auth/login": (10, 60),
    "/api/auth/admin/login": (10, 60),
    "/api/auth/register-user": (10, 60),
    "/api/auth/password-reset/request": (5, 60),
}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        limit_config = RATE_LIMITED_PATHS.get(request.url.path)
        if limit_config is None or request.method != "POST":
            return await call_next(request)

        max_requests, window_seconds = limit_config
        client_ip = request.client.host if request.client else "unknown"
        window = int(time.time() // window_seconds)
        key = f"ratelimit:{request.url.path}:{client_ip}:{window}"

        try:
            redis_client = get_redis_client()
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, window_seconds)
        except Exception:
            logger.warning("Rate limiter: Redis unavailable, failing open.", exc_info=True)
            return await call_next(request)

        if count > max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again shortly."},
                headers={"Retry-After": str(window_seconds)},
            )

        return await call_next(request)
