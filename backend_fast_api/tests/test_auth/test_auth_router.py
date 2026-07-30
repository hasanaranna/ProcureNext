# ============================================================
# tests/test_auth/test_auth_router.py - Auth Endpoint Tests
# ============================================================
# Covers all implemented auth endpoints:
#
#   POST /api/auth/login            — regular user login
#   POST /api/auth/register-user    — invited employee registration
#   POST /api/auth/admin/login      — admin login (returns AdminTokenResponse)
#
# Test strategy: patch get_db_connection + the service function so
# each test runs entirely in-memory without a real DB or Redis.
# ============================================================
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from fastapi import HTTPException

from app.main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_db_ctx(mock_conn):
    """Wrap a mock asyncpg connection as an async context manager."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


def _make_token_response(email: str = "user@test.com", user_id: int = 1, status: str = "Active"):
    """Build a realistic TokenResponse dict that service.authenticate_user returns."""
    return {
        "access_token": "mock_access_token",
        "refresh_token": "mock_refresh_token",
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "email": email,
            "status": status,
            "full_name": "Test User",
            "organization_name": "Acme Corp",
            "role_in_org": "Owner",
        },
    }


def _make_admin_token_response(email: str = "admin@procurenext.com", user_id: int = 99):
    """Build a realistic AdminTokenResponse dict that service.authenticate_admin returns."""
    return {
        "access_token": "mock_admin_access_token",
        "refresh_token": "mock_admin_refresh_token",
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "admin_id": 1,
            "email": email,
            "full_name": "Super Admin",
            "admin_role": "SuperAdmin",
            "status": "Active",
        },
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure FastAPI dependency overrides don't bleed across tests."""
    yield
    app.dependency_overrides.clear()


# ===========================================================================
# POST /api/auth/login
# ===========================================================================

class TestLogin:
    """Tests for the regular user login endpoint."""

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_success_returns_tokens(self, mock_authenticate, mock_db, client):
        """Valid credentials → 200 with access_token, refresh_token, and user object."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.return_value = _make_token_response()

        resp = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "Password123!"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "mock_access_token"
        assert data["refresh_token"] == "mock_refresh_token"
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "user@test.com"
        assert data["user"]["status"] == "Active"

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_success_user_fields_present(self, mock_authenticate, mock_db, client):
        """Response user object should contain all UserResponse fields."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.return_value = _make_token_response()

        resp = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "Password123!"},
        )

        user = resp.json()["user"]
        assert "user_id" in user
        assert "email" in user
        assert "status" in user
        # Optional fields should be present (may be None)
        assert "full_name" in user
        assert "organization_name" in user
        assert "role_in_org" in user

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_pending_account_still_returns_200(self, mock_authenticate, mock_db, client):
        """A Pending user CAN log in — the frontend decides what to show them.
        The backend returns 200; status field carries 'Pending'."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.return_value = _make_token_response(status="Pending")

        resp = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "Password123!"},
        )

        assert resp.status_code == 200
        assert resp.json()["user"]["status"] == "Pending"

    # ── Auth failures ────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_wrong_password_returns_401(self, mock_authenticate, mock_db, client):
        """Wrong password → service raises 401 → endpoint returns 401."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = HTTPException(
            status_code=401, detail="Invalid email or password."
        )

        resp = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "WrongPassword!"},
        )

        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_nonexistent_email_returns_401(self, mock_authenticate, mock_db, client):
        """Email not found in DB → service raises 401 (no user enumeration)."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = HTTPException(
            status_code=401, detail="Invalid email or password."
        )

        resp = await client.post(
            "/api/auth/login",
            json={"email": "ghost@nowhere.com", "password": "SomePass123!"},
        )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_suspended_user_returns_401(self, mock_authenticate, mock_db, client):
        """Suspended account → service raises 401."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = HTTPException(
            status_code=401, detail="Account is suspended."
        )

        resp = await client.post(
            "/api/auth/login",
            json={"email": "suspended@test.com", "password": "Password123!"},
        )

        assert resp.status_code == 401

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_login_invalid_email_format_returns_422(self, client):
        """Malformed email address → Pydantic validation error → 422."""
        resp = await client.post(
            "/api/auth/login",
            json={"email": "not-an-email", "password": "Password123!"},
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_password_returns_422(self, client):
        """Missing required field → 422."""
        resp = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com"},
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_empty_body_returns_422(self, client):
        """Completely empty body → 422."""
        resp = await client.post("/api/auth/login", json={})

        assert resp.status_code == 422

    # ── Service errors ───────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.authenticate_user")
    async def test_login_db_error_returns_500(self, mock_authenticate, mock_db, client):
        """Unexpected DB error → router catches it → 500."""
        import asyncpg
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = asyncpg.PostgresError("connection refused")

        resp = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "Password123!"},
        )

        assert resp.status_code == 500


# ===========================================================================
# POST /api/auth/register-user
# ===========================================================================

class TestRegisterUser:
    """Tests for the invited employee registration endpoint."""

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_success_returns_tokens(self, mock_register, mock_db, client):
        """Valid form data with a valid invite token → 200 with token pair."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_register.return_value = _make_token_response(email="newuser@test.com", user_id=2)

        resp = await client.post(
            "/api/auth/register-user",
            data={
                "name": "New User",
                "email": "newuser@test.com",
                "phone": "01712345678",
                "nid": 1234567890,
                "date_of_birth": "1995-06-15",
                "password": "StrongPass123!",
                "token": "valid-invite-token-abc",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "mock_access_token"
        assert data["user"]["email"] == "newuser@test.com"

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_passes_correct_fields_to_service(self, mock_register, mock_db, client):
        """Service should be called with the exact form values submitted."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_register.return_value = _make_token_response(email="newuser@test.com")

        await client.post(
            "/api/auth/register-user",
            data={
                "name": "Alice Smith",
                "email": "alice@test.com",
                "phone": "01712345678",
                "nid": 9876543210,
                "date_of_birth": "1990-01-01",
                "password": "StrongPass123!",
                "token": "invite-token-xyz",
            },
        )

        call_kwargs = mock_register.call_args.kwargs
        assert call_kwargs["name"] == "Alice Smith"
        assert call_kwargs["email"] == "alice@test.com"
        assert call_kwargs["phone"] == "01712345678"
        assert call_kwargs["nid"] == 9876543210
        assert call_kwargs["password"] == "StrongPass123!"
        assert call_kwargs["token"] == "invite-token-xyz"

    # ── Invitation errors ────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_invalid_token_returns_400(self, mock_register, mock_db, client):
        """Invalid invitation token → service raises 400."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_register.side_effect = HTTPException(
            status_code=400, detail="Invalid invitation token or email."
        )

        resp = await client.post(
            "/api/auth/register-user",
            data={
                "name": "Bob",
                "email": "bob@test.com",
                "phone": "01712345678",
                "nid": 1111111111,
                "date_of_birth": "1990-01-01",
                "password": "StrongPass123!",
                "token": "expired-token",
            },
        )

        assert resp.status_code == 400
        assert "invitation" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_used_invitation_returns_400(self, mock_register, mock_db, client):
        """Invitation already accepted → service raises 400."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_register.side_effect = HTTPException(
            status_code=400, detail="Invitation is no longer pending."
        )

        resp = await client.post(
            "/api/auth/register-user",
            data={
                "name": "Carol",
                "email": "carol@test.com",
                "phone": "01712345678",
                "nid": 2222222222,
                "date_of_birth": "1992-03-10",
                "password": "StrongPass123!",
                "token": "already-used-token",
            },
        )

        assert resp.status_code == 400
        assert "pending" in resp.json()["detail"].lower()

    # ── Duplicate user errors ────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_duplicate_email_returns_409(self, mock_register, mock_db, client):
        """Email already registered → service raises 409."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_register.side_effect = HTTPException(
            status_code=409, detail="A user with this email already exists."
        )

        resp = await client.post(
            "/api/auth/register-user",
            data={
                "name": "Dave",
                "email": "existing@test.com",
                "phone": "01712345678",
                "nid": 3333333333,
                "date_of_birth": "1988-07-22",
                "password": "StrongPass123!",
                "token": "valid-token",
            },
        )

        assert resp.status_code == 409
        assert "email" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.auth.router.get_db_connection")
    @patch("app.modules.auth.router.register_employee_user")
    async def test_register_duplicate_nid_returns_409(self, mock_register, mock_db, client):
        """NID already used by another account → service raises 409."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_register.side_effect = HTTPException(
            status_code=409, detail="A user with this NID already exists."
        )

        resp = await client.post(
            "/api/auth/register-user",
            data={
                "name": "Eve",
                "email": "eve@test.com",
                "phone": "01712345678",
                "nid": 9999999999,
                "date_of_birth": "1991-11-05",
                "password": "StrongPass123!",
                "token": "valid-token",
            },
        )

        assert resp.status_code == 409
        assert "nid" in resp.json()["detail"].lower()

    # ── Missing fields ───────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_register_missing_token_returns_422(self, client):
        """Invitation token is required — omitting it → 422."""
        resp = await client.post(
            "/api/auth/register-user",
            data={
                "name": "Frank",
                "email": "frank@test.com",
                "phone": "01712345678",
                "nid": 4444444444,
                "date_of_birth": "1993-02-14",
                "password": "StrongPass123!",
                # token intentionally omitted
            },
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_name_returns_422(self, client):
        """Name field is required — omitting it → 422."""
        resp = await client.post(
            "/api/auth/register-user",
            data={
                "email": "frank@test.com",
                "phone": "01712345678",
                "nid": 4444444444,
                "date_of_birth": "1993-02-14",
                "password": "StrongPass123!",
                "token": "valid-token",
            },
        )

        assert resp.status_code == 422


# ===========================================================================
# POST /api/auth/admin/login
# ===========================================================================

class TestAdminLogin:
    """
    Tests for the admin-specific login endpoint.
    This endpoint returns AdminTokenResponse (with admin_id, admin_role)
    and is the trigger for the frontend to store admin_user in sessionStorage
    and for the API proxy to set admin_access_token / admin_refresh_token
    HttpOnly cookies.
    """

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_success_returns_admin_token_response(
        self, mock_authenticate, mock_db, client
    ):
        """Valid admin credentials → 200 with AdminTokenResponse shape."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.return_value = _make_admin_token_response()

        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@procurenext.com", "password": "AdminPass123!"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "mock_admin_access_token"
        assert data["refresh_token"] == "mock_admin_refresh_token"
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_response_contains_admin_fields(
        self, mock_authenticate, mock_db, client
    ):
        """AdminTokenResponse.user must include admin_id and admin_role
        (not present in regular UserResponse) so the frontend/proxy can
        distinguish an admin session from a regular user session."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.return_value = _make_admin_token_response()

        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@procurenext.com", "password": "AdminPass123!"},
        )

        user = resp.json()["user"]
        assert "admin_id" in user
        assert "admin_role" in user
        assert user["admin_role"] == "SuperAdmin"
        assert user["email"] == "admin@procurenext.com"

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_calls_authenticate_admin_not_authenticate_user(
        self, mock_authenticate, mock_db, client
    ):
        """Ensure the admin endpoint delegates to authenticate_admin (which checks
        the admins table), not authenticate_user (which doesn't)."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.return_value = _make_admin_token_response()

        await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@procurenext.com", "password": "AdminPass123!"},
        )

        mock_authenticate.assert_called_once()
        call_args = mock_authenticate.call_args
        # First positional arg is the connection; second is the LoginRequest payload
        login_payload = call_args.args[1]
        assert login_payload.email == "admin@procurenext.com"

    # ── Auth failures ────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_wrong_password_returns_401(
        self, mock_authenticate, mock_db, client
    ):
        """Wrong password for a real admin account → 401."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = HTTPException(
            status_code=401,
            detail="Invalid credentials or insufficient privileges.",
        )

        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@procurenext.com", "password": "WrongPassword!"},
        )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_regular_user_cannot_login_as_admin(
        self, mock_authenticate, mock_db, client
    ):
        """A user who exists in `users` but NOT in `admins` → 401.
        The error message must not reveal whether the email exists
        (no user enumeration)."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = HTTPException(
            status_code=401,
            detail="Invalid credentials or insufficient privileges.",
        )

        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "regularuser@test.com", "password": "Password123!"},
        )

        assert resp.status_code == 401
        # Must NOT hint that the email doesn't have admin role specifically
        assert "privileges" in resp.json()["detail"].lower() or \
               "invalid" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_nonexistent_email_returns_401(
        self, mock_authenticate, mock_db, client
    ):
        """Email doesn't exist at all → 401 (same generic message, no enumeration)."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = HTTPException(
            status_code=401,
            detail="Invalid credentials or insufficient privileges.",
        )

        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "ghost@nowhere.com", "password": "Password123!"},
        )

        assert resp.status_code == 401

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_admin_login_invalid_email_format_returns_422(self, client):
        """Malformed email → Pydantic validation rejects it before service runs → 422."""
        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "not-an-email", "password": "AdminPass123!"},
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_admin_login_missing_password_returns_422(self, client):
        """Password field required → 422."""
        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@procurenext.com"},
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_admin_login_empty_body_returns_422(self, client):
        """Empty JSON body → 422."""
        resp = await client.post("/api/auth/admin/login", json={})

        assert resp.status_code == 422

    # ── Service / DB errors ──────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.authenticate_admin")
    async def test_admin_login_db_error_returns_500(
        self, mock_authenticate, mock_db, client
    ):
        """Unexpected DB error during admin login → router catches → 500."""
        import asyncpg
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_authenticate.side_effect = asyncpg.PostgresError("timeout")

        resp = await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@procurenext.com", "password": "AdminPass123!"},
        )

        assert resp.status_code == 500
