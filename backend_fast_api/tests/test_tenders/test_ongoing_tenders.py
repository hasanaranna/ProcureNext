# ============================================================
# tests/test_tenders/test_ongoing_tenders.py
# ============================================================
# Tests for ongoing tenders endpoints:
#   GET /tenders/ongoing
#   GET /tenders/ongoing/{tender_id}
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone
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


@pytest.fixture
def sample_ongoing_tender_list():
    return [
        {
            "award_id": 1,
            "awarded_at": datetime(2026, 4, 10, 12, 0, 0, tzinfo=timezone.utc),
            "remarks": "Selected best proposal",
            "tender_id": 101,
            "tender_title": "Network Infrastructure Upgrade",
            "tender_description": "Upgrade core routers and firewalls",
            "tender_status": "Awarded",
            "budget_min": 100000.0,
            "budget_max": 200000.0,
            "submission_deadline": datetime(2026, 4, 1, 23, 59, 59, tzinfo=timezone.utc),
            "tender_created_at": datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
            "winning_bid_id": 201,
            "winning_bid_amount": 150000.0,
            "winning_bid_description": "Full Cisco infrastructure deployment",
            "winning_bid_submitted_at": datetime(2026, 3, 20, 15, 30, 0, tzinfo=timezone.utc),
            "buyer_org_id": 10,
            "buyer_org_name": "Apex Enterprise",
            "vendor_org_id": 50,
            "vendor_org_name": "NetSolutions Ltd",
            "role_in_tender": "buyer",
        }
    ]


@pytest.fixture
def sample_ongoing_tender_detail():
    return {
        "award_id": 1,
        "awarded_at": datetime(2026, 4, 10, 12, 0, 0, tzinfo=timezone.utc),
        "remarks": "Selected best proposal",
        "tender_id": 101,
        "tender_title": "Network Infrastructure Upgrade",
        "tender_description": "Upgrade core routers and firewalls",
        "tender_status": "Awarded",
        "budget_min": 100000.0,
        "budget_max": 200000.0,
        "submission_deadline": datetime(2026, 4, 1, 23, 59, 59, tzinfo=timezone.utc),
        "tender_public_date": datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        "pre_bid_meeting": datetime(2026, 3, 10, 14, 0, 0, tzinfo=timezone.utc),
        "tender_opening_date": datetime(2026, 4, 2, 10, 0, 0, tzinfo=timezone.utc),
        "tender_created_at": datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        "winning_bid_id": 201,
        "winning_bid_amount": 150000.0,
        "winning_bid_description": "Full Cisco infrastructure deployment",
        "winning_bid_submitted_at": datetime(2026, 3, 20, 15, 30, 0, tzinfo=timezone.utc),
        "buyer_org_id": 10,
        "buyer_org_name": "Apex Enterprise",
        "buyer_org_address": "Dhaka, Bangladesh",
        "buyer_org_website": "https://apex.com",
        "vendor_org_id": 50,
        "vendor_org_name": "NetSolutions Ltd",
        "vendor_org_address": "Chittagong, Bangladesh",
        "vendor_org_website": "https://netsolutions.com",
        "role_in_tender": "buyer",
        "tender_documents": [
            {
                "tender_doc_id": 1,
                "file_name": "specs.pdf",
                "file_path": "tenders/101/specs.pdf",
                "uploaded_at": datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
            }
        ],
        "bid_documents": [
            {
                "bid_doc_id": 1,
                "file_path": "bids/201/trade_license.pdf",
                "document_type": "TradeLicense",
            }
        ],
    }


class TestOngoingTendersList:
    """Tests for GET /tenders/ongoing endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_ongoing_tenders")
    async def test_get_ongoing_tenders_as_buyer(
        self, mock_get_ongoing, mock_db, client, mock_user_org, sample_ongoing_tender_list, auth_headers
    ):
        """Authenticated user should receive ongoing tenders for their org."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_ongoing.return_value = sample_ongoing_tender_list

        resp = await client.get("/tenders/ongoing", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["award_id"] == 1
        assert data[0]["tender_title"] == "Network Infrastructure Upgrade"
        assert data[0]["winning_bid_amount"] == 150000.0
        assert data[0]["buyer_org_name"] == "Apex Enterprise"
        assert data[0]["vendor_org_name"] == "NetSolutions Ltd"
        assert data[0]["role_in_tender"] == "buyer"
        mock_get_ongoing.assert_called_once_with(mock_conn, mock_user_org["organization_id"])

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_ongoing_tenders")
    async def test_get_ongoing_tenders_empty(
        self, mock_get_ongoing, mock_db, client, mock_user_org, auth_headers
    ):
        """Returns empty list when organization has no ongoing tenders."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_ongoing.return_value = []

        resp = await client.get("/tenders/ongoing", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_get_ongoing_tenders_unauthenticated(self, client):
        """Unauthenticated request must return 401."""
        resp = await client.get("/tenders/ongoing")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_ongoing_tenders_no_org(self, client, auth_headers):
        """User without organization_id must return 403."""
        app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 1,
            "email": "noorg@test.com",
            "organization_id": None,
            "org_user_id": None,
        }

        resp = await client.get("/tenders/ongoing", headers=auth_headers)
        assert resp.status_code == 403


class TestOngoingTenderDetail:
    """Tests for GET /tenders/ongoing/{tender_id} endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_ongoing_tender_detail")
    async def test_get_ongoing_tender_detail_success(
        self, mock_get_detail, mock_db, client, mock_user_org, sample_ongoing_tender_detail, auth_headers
    ):
        """Should return full ongoing tender details including documents."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_detail.return_value = sample_ongoing_tender_detail

        resp = await client.get("/tenders/ongoing/101", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["tender_id"] == 101
        assert data["award_id"] == 1
        assert data["buyer_org_name"] == "Apex Enterprise"
        assert data["vendor_org_name"] == "NetSolutions Ltd"
        assert len(data["tender_documents"]) == 1
        assert len(data["bid_documents"]) == 1
        assert data["tender_documents"][0]["file_name"] == "specs.pdf"
        assert data["bid_documents"][0]["document_type"] == "TradeLicense"
        mock_get_detail.assert_called_once_with(mock_conn, 101, mock_user_org["organization_id"])

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_ongoing_tender_detail")
    async def test_get_ongoing_tender_detail_not_found(
        self, mock_get_detail, mock_db, client, mock_user_org, auth_headers
    ):
        """Returns 404 when tender is not found or user is not authorized."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_detail.return_value = None

        resp = await client.get("/tenders/ongoing/999", headers=auth_headers)

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_ongoing_tender_detail_unauthenticated(self, client):
        """Unauthenticated request must return 401."""
        resp = await client.get("/tenders/ongoing/101")
        assert resp.status_code == 401
