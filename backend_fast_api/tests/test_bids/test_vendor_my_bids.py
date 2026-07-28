# ============================================================
# tests/test_bids/test_vendor_my_bids.py
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.bids.models import BidStatus


def _mock_db_ctx(mock_conn):
    """Wrap a mock connection in an async context manager compatible with `async with`."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure dependency overrides are cleared after each test."""
    yield
    app.dependency_overrides.clear()


class TestVendorMyBids:
    """Tests for the vendor fetching their submitted bids endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_vendor_submitted_bids")
    async def test_get_my_bids_success(self, mock_get_vendor_bids, mock_db, client, auth_headers):
        """Authenticated vendor successfully retrieves their bids."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_vendor_bids.return_value = [
            {
                "bid_id": 1,
                "tender_id": 100,
                "tender_title": "Construction of Bridge",
                "financial_amount": 500000.0,
                "status": BidStatus.Submitted,
                "submitted_at": "2026-07-28T10:00:00Z"
            }
        ]

        resp = await client.get(
            "/bids/vendor/my-bids",
            headers=auth_headers
        )

        assert resp.status_code == 200
        resp_json = resp.json()
        assert len(resp_json) == 1
        assert resp_json[0]["bid_id"] == 1
        assert resp_json[0]["tender_id"] == 100
        assert resp_json[0]["tender_title"] == "Construction of Bridge"
        assert resp_json[0]["financial_amount"] == 500000.0
        assert resp_json[0]["status"] == "Submitted"

        mock_get_vendor_bids.assert_called_once()
        call_kwargs = mock_get_vendor_bids.call_args.args
        assert call_kwargs[1] == 1  # vendor_org_id

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_vendor_submitted_bids")
    async def test_get_my_bids_empty(self, mock_get_vendor_bids, mock_db, client, auth_headers):
        """Returns an empty list if the vendor has no submitted bids."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_vendor_bids.return_value = []

        resp = await client.get(
            "/bids/vendor/my-bids",
            headers=auth_headers
        )

        assert resp.status_code == 200
        resp_json = resp.json()
        assert resp_json == []

    @pytest.mark.asyncio
    async def test_get_my_bids_unauthenticated(self, client):
        """Request without auth token should be rejected with 401."""
        resp = await client.get(
            "/bids/vendor/my-bids"
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_my_bids_no_org(self, client, auth_headers):
        """Should return 403 when the user does not belong to any organization."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": None}
        
        resp = await client.get(
            "/bids/vendor/my-bids",
            headers=auth_headers
        )

        assert resp.status_code == 403
        assert "User does not belong to any organization" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_vendor_submitted_bids")
    async def test_get_my_bids_db_error(self, mock_get_vendor_bids, mock_db, client, auth_headers):
        """Should return 500 when DB throws an exception."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        
        mock_get_vendor_bids.side_effect = Exception("DB failure")

        resp = await client.get(
            "/bids/vendor/my-bids",
            headers=auth_headers
        )

        assert resp.status_code == 500
        assert "Database error" in resp.json()["detail"]
