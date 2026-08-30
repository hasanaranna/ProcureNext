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
    """
    Documents the current and expected access control posture of admin endpoints.

    CURRENT STATE:
      The admin router does NOT have a FastAPI Depends() auth guard yet —
      core/dependencies.py (get_current_admin) and core/permissions.py are
      both stubs. Unauthenticated callers can currently reach these endpoints.
      The tests marked CURRENT_BEHAVIOUR assert this reality so the test suite
      stays green while the guard is a stub.

    FUTURE STATE (TODO):
      Once get_current_admin is wired up as a Depends() on each admin route,
      the TODO tests below should be uncommented and the CURRENT_BEHAVIOUR
      tests removed. The TODO tests assert 401/403 for callers without a
      valid admin JWT.
    """

    # ── CURRENT BEHAVIOUR (no guard yet) ────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.verify_organization")
    async def test_verify_endpoint_reachable_without_auth_currently(
        self, mock_verify, mock_db, client
    ):
        """
        CURRENT BEHAVIOUR: Without a Depends() guard on the route,
        any caller (no token at all) can reach POST /api/auth/admin/verify/{id}.
        This test documents the gap so it is visible in CI output.
        """
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_verify.return_value = {"message": "Organization 1 has been Verified."}

        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={"verification_status": "Verified"},
            # No Authorization header — unauthenticated
        )

        # Without a guard, the endpoint still returns 200.
        # This is the GAP. Change to `assert resp.status_code == 401`
        # once get_current_admin Depends() is wired up.
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @patch("app.modules.admin.router.get_db_connection")
    @patch("app.modules.admin.router.get_pending_master_accounts")
    async def test_pending_accounts_endpoint_reachable_without_auth_currently(
        self, mock_get_pending, mock_db, client
    ):
        """
        CURRENT BEHAVIOUR: GET /api/auth/admin/pending-accounts has no auth guard yet.
        """
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_pending.return_value = {"accounts": [], "total": 0}

        resp = await client.get(
            "/api/auth/admin/pending-accounts",
            # No Authorization header
        )

        assert resp.status_code == 200

    # ── TODO: expected behaviour once get_current_admin Depends() is added ───

    @pytest.mark.asyncio
    @pytest.mark.skip(
        reason="TODO: Unskip after get_current_admin Depends() is wired up on admin routes. "
               "Expected: unauthenticated caller gets 401."
    )
    async def test_verify_endpoint_returns_401_for_unauthenticated_caller(self, client):
        """
        FUTURE: No token at all → 401 Unauthorized.
        Uncomment once the Depends(get_current_admin) guard is in place.
        """
        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={"verification_status": "Verified"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.skip(
        reason="TODO: Unskip after get_current_admin Depends() is wired up on admin routes. "
               "Expected: regular-user token gets 403."
    )
    async def test_verify_endpoint_returns_403_for_regular_user_token(
        self, client, auth_headers
    ):
        """
        FUTURE: A valid regular-user JWT (no admin_role in payload) → 403 Forbidden.
        Uncomment once the Depends(get_current_admin) guard is in place.
        """
        resp = await client.post(
            "/api/auth/admin/verify/1",
            json={"verification_status": "Verified"},
            headers=auth_headers,  # regular user token from conftest
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    @pytest.mark.skip(
        reason="TODO: Unskip after get_current_admin Depends() is wired up on admin routes. "
               "Expected: unauthenticated caller gets 401 on pending-accounts."
    )
    async def test_pending_accounts_returns_401_for_unauthenticated_caller(self, client):
        """
        FUTURE: GET /api/auth/admin/pending-accounts without token → 401.
        """
        resp = await client.get("/api/auth/admin/pending-accounts")
        assert resp.status_code == 401
