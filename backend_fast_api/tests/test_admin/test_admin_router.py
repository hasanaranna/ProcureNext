# ============================================================
# tests/test_admin/test_admin_router.py
# ============================================================
# Covers the three implemented admin endpoints:
#
#   POST /api/auth/admin/login       (tested in test_auth — omitted here)
#   GET  /api/auth/admin/pending-accounts
#   POST /api/auth/admin/verify/{organization_id}
#
# Tests implemented here:
#   - test_verify_organization: Approve org
#   - test_reject_organization: Reject org
#   - test_non_admin_rejected: Regular users cannot access admin
#
# NOTE on test_non_admin_rejected:
#   The admin endpoints currently have NO FastAPI Depends() guard
#   (get_current_admin is a stub in core/dependencies.py that is not
#   yet wired up). The tests below document the CURRENT behaviour
#   (unauthenticated callers can reach the endpoints) and include a
#   clearly-marked TODO test that shows the expected hardened behaviour
#   once the guard is added — so there is no ambiguity for future
#   implementers.


# TEST CASES TO IMPLEMENT:
# - test_modify_user_status: Ban/suspend a user
# - test_update_pricing: Change credit point price
# - test_get_platform_stats: Returns correct metrics
# - test_admin_audit_logging: Admin actions create audit records


# ============================================================
import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager
from fastapi import HTTPException

from app.main import app
from app.modules.auth.dependencies import get_current_admin


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_db_ctx(mock_conn):
    """Wrap a mock asyncpg connection as an async context manager."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure FastAPI dependency overrides don't bleed across tests."""
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_admin_user():
    return {
        "user_id": 99,
        "email": "admin@procurenext.com",
        "full_name": "Platform Admin",
        "admin_id": 1,
        "admin_role": "SuperAdmin",
    }


@pytest.fixture(autouse=True)
def override_admin_auth(mock_admin_user):
    """Authenticated admin for endpoints guarded by get_current_admin."""
    app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    yield
    app.dependency_overrides.pop(get_current_admin, None)


# ===========================================================================
# POST /api/auth/admin/verify/{organization_id}  — verify_organization
# ===========================================================================

class TestVerifyOrganization:
    """
    Tests for the org verification endpoint.

    Service behaviour:
      - payload.verification_status == "Verified"
          → UPDATE organizations SET verification_status = 'Verified'
          → UPDATE organization_documents SET review_status = 'Approved'
          → UPDATE users SET status = 'Active'   (owner)
          → UPDATE user_verification SET review_status = 'Approved'  (owner)
          → returns {"message": "Organization <id> has been Verified."}

      - payload.verification_status == "Rejected"
          → DELETE FROM organizations
          → DELETE FROM users   (owner)
          → delete_files() called for stored documents
          → returns {"message": "Organization <id> has been Rejected and the user was removed."}

      - org not found → 404
    """

    # ── Approve (Verified) ───────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_org_approved_returns_200(self, mock_verify, mock_db, client):
        """Admin approves org → 200 with success message."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {"message": "Organization 42 has been Verified."}

        resp = await client.post(
            "/api/auth/admin/verify/42",
            json={"verification_status": "Verified"},
        )

        assert resp.status_code == 200
        assert "Verified" in resp.json()["message"]
        assert "42" in resp.json()["message"]

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_org_approved_calls_service_with_correct_args(
        self, mock_verify, mock_db, client
    ):
        """Service must receive the org_id from the URL and payload from the body."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {"message": "Organization 10 has been Verified."}

        await client.post(
            "/api/auth/admin/verify/10",
            json={"verification_status": "Verified", "review_notes": "All docs look good."},
        )

        mock_verify.assert_called_once()
        args = mock_verify.call_args.args
        # args: (connection, organization_id, payload)
        assert args[1] == 10
        assert args[2].verification_status == "Verified"
        assert args[2].review_notes == "All docs look good."

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_org_approved_with_review_notes(self, mock_verify, mock_db, client):
        """Optional review_notes field is accepted and forwarded."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {"message": "Organization 5 has been Verified."}

        resp = await client.post(
            "/api/auth/admin/verify/5",
            json={
                "verification_status": "Verified",
                "review_notes": "Trade license verified. TIN and VAT docs confirmed.",
            },
        )

        assert resp.status_code == 200

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_org_approved_without_review_notes(self, mock_verify, mock_db, client):
        """review_notes is optional — omitting it is valid."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {"message": "Organization 7 has been Verified."}

        resp = await client.post(
            "/api/auth/admin/verify/7",
            json={"verification_status": "Verified"},
        )

        assert resp.status_code == 200

    # ── Reject ───────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_reject_org_returns_200_with_removal_message(
        self, mock_verify, mock_db, client
    ):
        """Admin rejects org → service deletes org + owner → 200 with rejection message."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {
            "message": "Organization 99 has been Rejected and the user was removed."
        }

        resp = await client.post(
            "/api/auth/admin/verify/99",
            json={"verification_status": "Rejected", "review_notes": "Documents appear fraudulent."},
        )

        assert resp.status_code == 200
        body = resp.json()["message"]
        assert "Rejected" in body
        assert "99" in body
        assert "removed" in body

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_reject_org_calls_service_with_rejected_status(
        self, mock_verify, mock_db, client
    ):
        """Service receives verification_status='Rejected', triggering the deletion path."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {
            "message": "Organization 3 has been Rejected and the user was removed."
        }

        await client.post(
            "/api/auth/admin/verify/3",
            json={"verification_status": "Rejected", "review_notes": "Fake documents."},
        )

        mock_verify.assert_called_once()
        args = mock_verify.call_args.args
        assert args[1] == 3
        assert args[2].verification_status == "Rejected"
        assert args[2].review_notes == "Fake documents."

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_reject_org_without_notes_is_valid(self, mock_verify, mock_db, client):
        """Rejection without review_notes is allowed (notes are optional)."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {
            "message": "Organization 6 has been Rejected and the user was removed."
        }

        resp = await client.post(
            "/api/auth/admin/verify/6",
            json={"verification_status": "Rejected"},
        )

        assert resp.status_code == 200

    # ── Not found ────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_nonexistent_org_returns_404(self, mock_verify, mock_db, client):
        """Org not in DB → service raises 404 → endpoint re-raises it."""
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.side_effect = HTTPException(
            status_code=404, detail="Organization not found"
        )

        resp = await client.post(
            "/api/auth/admin/verify/999",
            json={"verification_status": "Verified"},
        )

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_verify_org_missing_verification_status_returns_422(self, client):
        """verification_status is required — omitting it → 422."""
        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={},  # missing required field
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_verify_org_non_integer_id_returns_422(self, client):
        """organization_id path parameter must be an int → 422 for non-numeric values."""
        resp = await client.post(
            "/api/auth/admin/verify/not-a-number",
            json={"verification_status": "Verified"},
        )

        assert resp.status_code == 422

    # ── DB / service errors ───────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_org_db_error_returns_500(self, mock_verify, mock_db, client):
        """Uncaught DB error → router wraps it into 500."""
        import asyncpg
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.side_effect = asyncpg.PostgresError("deadlock detected")

        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={"verification_status": "Verified"},
        )

        assert resp.status_code == 500


# ===========================================================================
# test_non_admin_rejected — access control on admin endpoints
# ===========================================================================

class TestNonAdminRejected:
    """Access control on admin endpoints guarded by get_current_admin."""

    @pytest.fixture(autouse=True)
    def clear_admin_override(self):
        app.dependency_overrides.pop(get_current_admin, None)
        yield

    @pytest.mark.asyncio
    async def test_verify_endpoint_returns_401_for_unauthenticated_caller(self, client):
        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={"verification_status": "Verified"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.auth.dependencies.get_db_connection")
    async def test_verify_endpoint_returns_403_for_regular_user_token(
        self, mock_db, client, auth_headers
    ):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_conn.fetchrow.return_value = None

        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={"verification_status": "Verified"},
            headers=auth_headers,
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_pending_accounts_returns_401_for_unauthenticated_caller(self, client):
        resp = await client.get("/api/auth/admin/pending-accounts")
        assert resp.status_code == 401
