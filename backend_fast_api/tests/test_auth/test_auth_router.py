# ============================================================
# tests/test_auth/test_auth_router.py - Auth Endpoint Tests
# ============================================================
# TEST CASES TO IMPLEMENT:
# - test_register_success: Valid registration creates user
# - test_register_duplicate_email: Rejects duplicate emails
# - test_register_invalid_email: Rejects malformed email
# - test_register_weak_password: Rejects weak passwords
# - test_login_success: Valid credentials return tokens
# - test_login_wrong_password: Rejects wrong password
# - test_login_nonexistent_user: Rejects unknown email
# - test_login_suspended_user: Rejects suspended accounts
# - test_password_reset_request: Sends reset email
# - test_password_reset_confirm: Successfully resets password
# - test_refresh_token: Successfully refreshes access token
# - test_logout: Blacklists token successfully
# - test_enable_2fa: Returns TOTP secret and QR URI
# - test_login_with_2fa: Requires OTP code for 2FA users
# ============================================================
import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

from app.main import app

def _mock_db_ctx(mock_conn):
    """Wrap a mock connection in an async context manager."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx

@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure dependency overrides are cleared after each test."""
    yield
    app.dependency_overrides.clear()

class TestAuthEndpoints:
    """Tests for Authentication endpoints."""

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_success(self, mock_authenticate, mock_db, client):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_authenticate.return_value = {
            "access_token": "mock_jwt_token",
            "refresh_token": "mock_refresh_token",
            "token_type": "bearer",
            "user": {
                "user_id": 1,
                "email": "test@test.com",
                "status": "Active"
            }
        }

        payload = {
            "email": "test@test.com",
            "password": "Password123!"
        }

        resp = await client.post("/api/auth/login", json=payload)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "mock_jwt_token"
        assert data["user"]["email"] == "test@test.com"
        
        from unittest.mock import ANY
        mock_authenticate.assert_called_once_with(mock_conn, ANY)

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_user_success(self, mock_register, mock_db, client):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_register.return_value = {
            "access_token": "mock_jwt_token",
            "refresh_token": "mock_refresh_token",
            "token_type": "bearer",
            "user": {
                "user_id": 2,
                "email": "newuser@test.com",
                "status": "Active"
            }
        }

        form_data = {
            "name": "New User",
            "email": "newuser@test.com",
            "phone": "1234567890",
            "nid": 123456789,
            "date_of_birth": "1990-01-01",
            "password": "Password123!",
            "token": "valid_invite_token"
        }

        resp = await client.post("/api/auth/register-user", data=form_data)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "mock_jwt_token"
        
        # Check kwargs
        call_kwargs = mock_register.call_args.kwargs
        assert call_kwargs["email"] == "newuser@test.com"
        assert call_kwargs["name"] == "New User"

