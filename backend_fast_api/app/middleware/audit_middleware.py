import json
import logging
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from jose import jwt, JWTError

from app.core.security import SECRET_KEY, ALGORITHM
from app.core.db import get_db_connection
from app.modules.audit.service import write_to_audit_outbox

logger = logging.getLogger(__name__)

SKIP_PATH_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
    "/favicon.ico",
    "/api/auth/login",
    "/api/auth/refresh",
    "/admin/audit",
)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Non-blocking HTTP middleware for automatic audit event capture
    on state-changing API operations.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        method = request.method
        path = request.url.path

        # Only audit state-changing actions
        if method not in ("POST", "PUT", "PATCH", "DELETE"):
            return await call_next(request)

        # Skip non-audited endpoints
        for prefix in SKIP_PATH_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # Extract user if available from Bearer token
        user_id = None
        user_email = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                sub = payload.get("sub")
                if sub:
                    user_id = int(sub)
                user_email = payload.get("email")
            except (JWTError, ValueError):
                pass

        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")

        # Execute downstream route handler
        response = await call_next(request)

        # Only log successful or non-server-error responses (2xx, 3xx, 4xx)
        if response.status_code < 500:
            action_type = f"HTTP_{method}"
            entity_type = path.strip("/").split("/")[0] if path.strip("/") else "root"
            entity_id = path

            # Write asynchronously to outbox (non-blocking)
            try:
                async with get_db_connection() as connection:
                    await write_to_audit_outbox(
                        connection=connection,
                        action_type=action_type,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        user_id=user_id,
                        user_email=user_email,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        new_values={"status_code": response.status_code, "path": path},
                    )
            except Exception as e:
                logger.warning(f"AuditMiddleware failed to buffer outbox event: {e}")

        return response
