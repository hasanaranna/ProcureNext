import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org

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

class TestBuyerBids:
    """Tests for the buyer bid evaluation endpoints."""

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_bids_for_buyer_tender")
    async def test_get_buyer_bids_success(self, mock_get_bids, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_bids.return_value = [
            {
                "bid_id": 1,
                "tender_id": 100,
                "vendor_org_id": 5,
                "financial_amount": 50000.0,
                "status": "Submitted",
                "vendor_name": "Vendor A"
            }
        ]

        resp = await client.get("/bids/buyer/tender/100", headers=auth_headers)
        
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["bid_id"] == 1
        assert data[0]["vendor_name"] == "Vendor A"
        
        mock_get_bids.assert_called_once_with(mock_conn, 100, 10)

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_bids_for_buyer_tender")
    async def test_get_buyer_bids_invalid_tender(self, mock_get_bids, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_bids.side_effect = ValueError("Tender not found or does not belong to this organization.")

        resp = await client.get("/bids/buyer/tender/999", headers=auth_headers)
        
        assert resp.status_code == 400
        assert "Tender not found" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.accept_bid_for_tender")
    async def test_accept_bid_success(self, mock_accept_bid, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10, "org_user_id": 2}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_accept_bid.return_value = {
            "bid_id": 1,
            "status": "Accepted"
        }

        resp = await client.post("/bids/buyer/1/accept", headers=auth_headers)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Bid accepted successfully."
        assert data["bid"]["status"] == "Accepted"
        
        mock_accept_bid.assert_called_once_with(mock_conn, 1, 10, 2)

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.accept_bid_for_tender")
    async def test_accept_bid_invalid(self, mock_accept_bid, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10, "org_user_id": 2}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_accept_bid.side_effect = ValueError("Cannot accept bid, tender is already Awarded.")

        resp = await client.post("/bids/buyer/1/accept", headers=auth_headers)
        
        assert resp.status_code == 400
        assert "already Awarded" in resp.json()["detail"]


# ===========================================================================
# accept_bid_for_tender: which tender states allow an award
# ===========================================================================

class _Stop(Exception):
    """Raised by the mock connection once the accept UPDATE is reached."""


def _accept_conn(tender_status: str):
    from unittest.mock import AsyncMock, MagicMock

    conn = MagicMock()
    tx = MagicMock()
    tx.__aenter__ = AsyncMock(return_value=None)
    tx.__aexit__ = AsyncMock(return_value=False)
    conn.transaction.return_value = tx

    verify_row = {"tender_id": 7, "buyer_id": 1, "tender_status": tender_status, "bid_status": "Submitted"}

    async def fetchrow(query, *args):
        if "UPDATE bids SET status = 'Accepted'" in query:
            raise _Stop()
        return verify_row

    conn.fetchrow = AsyncMock(side_effect=fetchrow)
    conn.execute = AsyncMock()
    return conn


class TestAcceptBidTenderStatus:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("tender_status", ["Published", "Closed"])
    async def test_bid_can_be_accepted_while_open_or_after_deadline(self, tender_status):
        from app.modules.bids.service import accept_bid_for_tender

        with pytest.raises(_Stop):
            await accept_bid_for_tender(_accept_conn(tender_status), bid_id=44, buyer_org_id=1, user_id=5)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("tender_status", ["Awarded", "Cancelled", "Draft"])
    async def test_bid_cannot_be_accepted_on_finished_or_unpublished_tender(self, tender_status):
        from app.modules.bids.service import accept_bid_for_tender

        with pytest.raises(ValueError, match=f"tender is {tender_status}"):
            await accept_bid_for_tender(_accept_conn(tender_status), bid_id=44, buyer_org_id=1, user_id=5)
