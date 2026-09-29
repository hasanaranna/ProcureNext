# ============================================================
# tests/test_core/test_auth_dependencies.py
# ============================================================
# Regression tests for app.modules.auth.dependencies:
#   - get_current_user_org rejects a suspended/banned user's token
#   - get_current_user_org rejects a refresh token presented as an access token
# Exercised through a real protected route (GET /api/users/me) with the
# DB connection mocked, so the actual dependency code path runs.
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

from app.core.security import create_access_token, create_refresh_token


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


class TestGetCurrentUserOrgStatusAndTypeChecks:
    @pytest.mark.asyncio
    @patch("app.modules.auth.dependencies.get_db_connection")
    async def test_suspended_user_token_rejected(self, mock_db, client):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_conn.fetchrow.return_value = {
            "user_id": 1,
            "email": "user@test.com",
            "status": "Suspended",
            "organization_id": 10,
            "role_in_org": "Owner",
            "org_user_id": 1,
        }
        token = create_access_token({"sub": "1", "email": "user@test.com"})

        resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_refresh_token_rejected_as_access_token(self, client):
        """
        Regression test: a refresh token is a valid, correctly-signed JWT
        too. Without the "type" check in get_current_user_org, it would be
        accepted anywhere an access token is, letting a 7-day refresh token
        be used directly for API calls instead of only to mint access tokens.
        """
        token = create_refresh_token({"sub": "1", "email": "user@test.com"})

        resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 401
