# ============================================================
# tests/test_bids/test_bids_router.py - Bid Endpoint Tests
# ============================================================

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.bids.models import BidStatus


# ---------------------------------------------------------------------------
# Helper: creates a mock for get_db_connection as an async context manager
# ---------------------------------------------------------------------------
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


# ============================================================
# POST /bids/vendor/submit-with-documents
# ============================================================

class TestBidSubmission:
    """Tests for the vendor bid submission endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.submit_bid_with_documents")
    async def test_submit_bid_success(
        self, mock_submit_bid, mock_db, client, mock_user_org, auth_headers
    ):
        """Authenticated vendor successfully submits a bid."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_bid_response = {
            "bid_id": 1,
            "vendor_org_id": mock_user_org["organization_id"],
            "submitted_by": mock_user_org["org_user_id"],
            "tender_id": 100,
            "financial_amount": 50000.00,
            "status": BidStatus.Submitted,
        }
        mock_submit_bid.return_value = mock_bid_response

        bid_data = {
            "tender_id": 100,
            "financial_amount": 50000.00
        }
        doc_type_names = ["TIN", "TradeLicense"]

        files = [
            ("files", ("tin.pdf", b"dummy pdf content", "application/pdf")),
            ("files", ("license.pdf", b"dummy license content", "application/pdf")),
        ]

        data = {
            "bid_data": json.dumps(bid_data),
            "doc_type_names": json.dumps(doc_type_names),
        }

        resp = await client.post(
            "/bids/vendor/submit-with-documents",
            headers=auth_headers,
            data=data,
            files=files
        )

        assert resp.status_code == 201
        resp_json = resp.json()
        assert resp_json["bid_id"] == 1
        assert resp_json["tender_id"] == 100
        assert resp_json["financial_amount"] == 50000.00
        assert resp_json["status"] == "Submitted"

        mock_submit_bid.assert_called_once()
        call_kwargs = mock_submit_bid.call_args.kwargs
        assert call_kwargs["connection"] == mock_conn
        assert call_kwargs["tender_id"] == 100
        assert call_kwargs["financial_amount"] == 50000.00
        assert len(call_kwargs["files_data"]) == 2
        assert call_kwargs["files_data"][0]["doc_type_name"] == "TIN"

    @pytest.mark.asyncio
    async def test_submit_bid_invalid_bid_data_json(self, client, auth_headers):
        """Should return 400 when bid_data JSON is invalid."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1}
        
        data = {
            "bid_data": "invalid-json",
        }

        resp = await client.post(
            "/bids/vendor/submit-with-documents",
            headers=auth_headers,
            data=data,
        )

        assert resp.status_code == 400
        assert "Invalid bid_data JSON" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_submit_bid_mismatched_files(self, client, auth_headers):
        """Should return 400 when len(doc_type_names) != len(files)."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1}

        bid_data = {"tender_id": 100, "financial_amount": 50000.00}
        # 2 doc types provided
        doc_type_names = ["TIN", "TradeLicense"]
        # but only 1 file
        files = [
            ("files", ("tin.pdf", b"dummy", "application/pdf")),
        ]

        data = {
            "bid_data": json.dumps(bid_data),
            "doc_type_names": json.dumps(doc_type_names),
        }

        resp = await client.post(
            "/bids/vendor/submit-with-documents",
            headers=auth_headers,
            data=data,
            files=files
        )

        assert resp.status_code == 400
        assert "must match number of files" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.submit_bid_with_documents")
    async def test_submit_bid_db_error(
        self, mock_submit_bid, mock_db, client, auth_headers
    ):
        """Should return 500 when DB throws an exception."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        
        mock_submit_bid.side_effect = Exception("DB failure")

        bid_data = {"tender_id": 100, "financial_amount": 50000.00}
        data = {
            "bid_data": json.dumps(bid_data),
        }

        resp = await client.post(
            "/bids/vendor/submit-with-documents",
            headers=auth_headers,
            data=data,
        )

        assert resp.status_code == 500
        assert "Database error" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self, client):
        """Request without auth token should be rejected with 401."""
        bid_data = {"tender_id": 100, "financial_amount": 50000.00}
        data = {
            "bid_data": json.dumps(bid_data),
        }

        resp = await client.post(
            "/bids/vendor/submit-with-documents",
            data=data,
        )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_bid_by_tender_and_vendor")
    async def test_get_vendor_bid_success(self, mock_get_bid, mock_db, client, auth_headers):
        """Should return the existing bid for a given tender."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_bid.return_value = {
            "bid_id": 1,
            "tender_id": 100,
            "vendor_org_id": 1,
            "submitted_by": 1,
            "financial_amount": 50000.0,
            "status": BidStatus.Submitted,
            "documents": [{"bid_doc_id": 1, "document_type": "TIN", "file_path": "path"}]
        }

        resp = await client.get("/bids/vendor/tender/100", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["bid_id"] == 1
        assert data["financial_amount"] == 50000.0
        assert len(data["documents"]) == 1

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_bid_by_tender_and_vendor")
    async def test_get_vendor_bid_not_found(self, mock_get_bid, mock_db, client, auth_headers):
        """Should return 404 if the vendor has no bid for the tender."""
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_bid.return_value = None

        resp = await client.get("/bids/vendor/tender/100", headers=auth_headers)
        assert resp.status_code == 404
        assert "No bid found" in resp.json()["detail"]
