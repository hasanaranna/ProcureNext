# ============================================================
# tests/test_auth/test_auth_service.py
# ============================================================
# Direct (unmocked) unit tests for app.modules.auth.service — covers the
# ban/suspend enforcement added to authenticate_user/authenticate_admin,
# and the new refresh_access_token flow (including access/refresh token
# type confusion protection).
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from app.core.security import create_access_token, create_refresh_token
from app.modules.auth.schemas import LoginRequest
from app.modules.auth.service import authenticate_user, authenticate_admin, refresh_access_token


def _user_row(status: str = "Active"):
    return {
        "user_id": 1,
        "email": "user@test.com",
        "password_hash": "hashed",
        "status": status,
        "full_name": "Test User",
        "role_in_org": "Owner",
        "organization_name": "Test Org",
    }


def _admin_row(status: str = "Active"):
    return {
        "user_id": 9,
        "email": "admin@test.com",
        "password_hash": "hashed",
        "full_name": "Test Admin",
        "status": status,
        "admin_id": 1,
        "admin_role": "SuperAdmin",
    }


class TestAuthenticateUserStatusCheck:
    @pytest.mark.asyncio
    @patch("app.modules.auth.service.verify_password", return_value=True)
    async def test_suspended_user_login_rejected(self, mock_verify):
        conn = AsyncMock()
        conn.fetchrow.return_value = _user_row(status="Suspended")

        with pytest.raises(HTTPException) as exc:
            await authenticate_user(conn, LoginRequest(email="user@test.com", password="pw"))
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    @patch("app.modules.auth.service.verify_password", return_value=True)
    async def test_banned_user_login_rejected(self, mock_verify):
        conn = AsyncMock()
        conn.fetchrow.return_value = _user_row(status="Banned")

        with pytest.raises(HTTPException) as exc:
            await authenticate_user(conn, LoginRequest(email="user@test.com", password="pw"))
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    @patch("app.modules.auth.service.verify_password", return_value=True)
    async def test_active_user_login_allowed(self, mock_verify):
        conn = AsyncMock()
        conn.fetchrow.return_value = _user_row(status="Active")

        resp = await authenticate_user(conn, LoginRequest(email="user@test.com", password="pw"))
        assert resp.access_token


class TestAuthenticateAdminStatusCheck:
    @pytest.mark.asyncio
    @patch("app.modules.auth.service.verify_password", return_value=True)
    async def test_suspended_admin_login_rejected(self, mock_verify):
        conn = AsyncMock()
        conn.fetchrow.return_value = _admin_row(status="Suspended")

        with pytest.raises(HTTPException) as exc:
            await authenticate_admin(conn, LoginRequest(email="admin@test.com", password="pw"))
        assert exc.value.status_code == 403


class TestRefreshAccessToken:
    @pytest.mark.asyncio
    async def test_valid_refresh_token_issues_new_tokens(self):
        conn = AsyncMock()
        conn.fetchrow.side_effect = [
            {"user_id": 5, "email": "user@test.com", "status": "Active"},  # users lookup
            None,  # admins lookup -> not an admin
        ]
        token = create_refresh_token({"sub": "5", "email": "user@test.com"})

        resp = await refresh_access_token(conn, token)

        assert resp.access_token
        assert resp.refresh_token
        assert resp.is_admin is False

    @pytest.mark.asyncio
    async def test_admin_refresh_token_marks_is_admin(self):
        conn = AsyncMock()
        conn.fetchrow.side_effect = [
            {"user_id": 9, "email": "admin@test.com", "status": "Active"},
            {"admin_role": "SuperAdmin"},
        ]
        token = create_refresh_token({"sub": "9", "email": "admin@test.com", "admin_role": "SuperAdmin"})

        resp = await refresh_access_token(conn, token)

        assert resp.is_admin is True

    @pytest.mark.asyncio
    async def test_access_token_rejected_at_refresh_endpoint(self):
        """
        Regression test: an access token and refresh token are both valid,
        correctly-signed JWTs from the same key — only the "type" claim
        tells them apart. Presenting an access token here must fail,
        otherwise anyone holding a live access token could mint fresh
        tokens indefinitely without ever needing the real refresh token.
        """
        conn = AsyncMock()
        token = create_access_token({"sub": "5", "email": "user@test.com"})

        with pytest.raises(HTTPException) as exc:
            await refresh_access_token(conn, token)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_suspended_user_refresh_rejected(self):
        conn = AsyncMock()
        conn.fetchrow.return_value = {"user_id": 5, "email": "user@test.com", "status": "Banned"}
        token = create_refresh_token({"sub": "5", "email": "user@test.com"})

        with pytest.raises(HTTPException) as exc:
            await refresh_access_token(conn, token)
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_garbage_token_rejected(self):
        conn = AsyncMock()
        with pytest.raises(HTTPException) as exc:
            await refresh_access_token(conn, "not-a-real-token")
        assert exc.value.status_code == 401
