import json
import logging
import time
import uuid
from typing import Callable

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.security import ALGORITHM, SECRET_KEY

logger = logging.getLogger("app.request")

SKIP_PATH_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
    "/favicon.ico",
    "/api/auth/login",
    "/api/auth/register-user",
    "/api/auth/refresh",
)

SENSITIVE_PATH_FRAGMENTS = (
    "/password",
    "/login",
    "/register",
    "/refresh",
)


def _extract_user_id(request: Request) -> int | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError, TypeError):
        return None


def _sanitize_path(path: str) -> str:
    lowered = path.lower()
    if any(fragment in lowered for fragment in SENSITIVE_PATH_FRAGMENTS):
        return "<redacted>"
    return path


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Structured JSON request/response logging with timing and request IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if any(path.startswith(prefix) for prefix in SKIP_PATH_PREFIXES):
            return await call_next(request)

        request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        log_record = {
            "request_id": request_id,
            "method": request.method,
            "path": _sanitize_path(path),
            "query": request.url.query or None,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("User-Agent"),
            "user_id": _extract_user_id(request),
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "content_length": response.headers.get("content-length"),
        }
        logger.info(json.dumps(log_record, default=str))
        response.headers["X-Request-Id"] = request_id
        return response
