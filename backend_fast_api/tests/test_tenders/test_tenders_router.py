# ============================================================
# tests/test_tenders/test_tenders_router.py - Tender Endpoint Tests
# ============================================================
# Tests for the tender endpoints we introduced:
#   GET /tenders/buyer/my-tenders
#   GET /tenders/seller/all-tenders
#   GET /tenders/{tender_id}/detail
#   GET /tenders/documents/{doc_id}/view
# ============================================================
import json

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org

class TestPublishTender:
    """Tests for publishing a new tender."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_publish_tender_success(self, mock_publish, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10, "org_user_id": 2}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        from datetime import datetime, timezone
        mock_publish.return_value = {
            "tender_id": 1,
            "buyer_id": 10,
            "created_by": 2,
            "title": "New Tender",
            "description": "Description",
            "status": "Published",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        tender_data = {
            "title": "New Tender",
            "description": "Description",
            "category": "IT",
            "procurement_nature": "Goods",
            "procurement_method": "OTM",
            "visibility": "Public",
            "budget_min": 1000.0,
            "budget_max": 5000.0,
            "budget_type": "Fixed",
            "submission_deadline": "2026-12-31T23:59:59Z"
        }

        form_data = {
            "tender_data": json.dumps(tender_data),
            "file_names": json.dumps(["doc1.pdf"])
        }
        
        files = [
            ("files", ("doc1.pdf", b"dummy content", "application/pdf")),
        ]

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            headers=auth_headers,
            data=form_data,
            files=files
        )
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["tender_id"] == 1
        assert data["title"] == "New Tender"
        
        mock_publish.assert_called_once()
        kwargs = mock_publish.call_args.kwargs
        assert kwargs["buyer_id"] == 10
        assert kwargs["user_id"] == 2




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
# GET /tenders/buyer/my-tenders
# ============================================================

class TestBuyerMyTenders:
    """Tests for the buyer's own tenders listing endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_buyer_tenders")
    async def test_returns_buyer_tenders(
        self, mock_get_tenders, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        """Authenticated buyer should get their organization's tenders."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_tenders.return_value = sample_tender_list

        resp = await client.get("/tenders/buyer/my-tenders", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["title"] == "Office Supplies Tender"
        assert data[1]["title"] == "IT Equipment Procurement"
        assert data[0]["buyer_org_name"] == "Acme Corp"
        mock_get_tenders.assert_called_once_with(mock_conn, mock_user_org["organization_id"])

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_buyer_tenders")
    async def test_returns_empty_list_when_no_tenders(
        self, mock_get_tenders, mock_db, client, mock_user_org, auth_headers
    ):
        """Should return empty list when buyer has no tenders."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_tenders.return_value = []

        resp = await client.get("/tenders/buyer/my-tenders", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self, client):
        """Request without auth token should be rejected."""
        resp = await client.get("/tenders/buyer/my-tenders")

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_user_without_org_rejected(self, client, auth_headers):
        """User with no organization_id should get 403."""
        app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 1,
            "email": "no-org@test.com",
            "organization_id": None,
            "org_user_id": None,
        }

        resp = await client.get("/tenders/buyer/my-tenders", headers=auth_headers)

        assert resp.status_code == 403


# ============================================================
# GET /tenders/seller/all-tenders
# ============================================================

class TestSellerAllTenders:
    """Tests for the seller's published tenders browsing endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_all_published_tenders")
    async def test_returns_all_published_tenders(
        self, mock_get_tenders, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        """Authenticated seller should see all published tenders."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_tenders.return_value = sample_tender_list

        resp = await client.get("/tenders/seller/all-tenders", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        # All returned tenders should be Published
        for tender in data:
            assert tender["status"] == "Published"
        mock_get_tenders.assert_called_once_with(mock_conn)

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_all_published_tenders")
    async def test_returns_empty_when_no_published_tenders(
        self, mock_get_tenders, mock_db, client, mock_user_org, auth_headers
    ):
        """Should return empty list when no tenders are published."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_tenders.return_value = []

        resp = await client.get("/tenders/seller/all-tenders", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self, client):
        """Request without auth token should be rejected."""
        resp = await client.get("/tenders/seller/all-tenders")

        assert resp.status_code == 401


# ============================================================
# GET /tenders/{tender_id}/detail
# ============================================================

class TestTenderDetail:
    """Tests for the tender detail endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_tender_detail")
    async def test_returns_tender_detail(
        self, mock_get_detail, mock_db, client, mock_user_org, sample_tender_row, sample_document_rows, auth_headers
    ):
        """Should return full tender details including documents."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        detail = {**sample_tender_row, "documents": sample_document_rows}
        mock_get_detail.return_value = detail

        resp = await client.get("/tenders/1/detail", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["tender_id"] == 1
        assert data["title"] == "Office Supplies Tender"
        assert data["buyer_org_name"] == "Acme Corp"
        assert len(data["documents"]) == 2
        assert data["documents"][0]["file_name"] == "requirements.pdf"
        assert data["documents"][1]["file_name"] == "item_list.pdf"
        assert data["budget_min"] == 10000.00
        assert data["security_required"] is False
        mock_get_detail.assert_called_once_with(mock_conn, 1)

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_tender_detail")
    async def test_tender_not_found_returns_404(
        self, mock_get_detail, mock_db, client, mock_user_org, auth_headers
    ):
        """Should return 404 for a non-existent tender."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_detail.return_value = None

        resp = await client.get("/tenders/999/detail", headers=auth_headers)

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_tender_detail")
    async def test_tender_detail_with_no_documents(
        self, mock_get_detail, mock_db, client, mock_user_org, sample_tender_row, auth_headers
    ):
        """Should return tender with empty documents list."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        detail = {**sample_tender_row, "documents": []}
        mock_get_detail.return_value = detail

        resp = await client.get("/tenders/1/detail", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["documents"] == []

    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self, client):
        """Request without auth token should be rejected."""
        resp = await client.get("/tenders/1/detail")

        assert resp.status_code == 401


# ============================================================
# GET /tenders/documents/{doc_id}/view
# ============================================================

class TestDocumentView:
    """Tests for the document signed URL endpoint."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.services.supabase_storage.generate_signed_url")
    async def test_returns_signed_url(
        self, mock_signed_url, mock_db, client, mock_user_org, auth_headers
    ):
        """Should return a JSON response with signed URL and file name."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        # Mock DB fetchrow to return a document row
        mock_row = MagicMock()
        mock_row.__getitem__ = lambda self, key: {
            "file_name": "requirements.pdf",
            "file_path": "tenders/1/abc123_requirements.pdf",
        }[key]
        mock_conn.fetchrow.return_value = mock_row
        mock_signed_url.return_value = "https://supabase.co/storage/v1/object/sign/documents/tenders/1/abc123_requirements.pdf?token=xyz"

        resp = await client.get("/tenders/documents/1/view", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data
        assert "supabase" in data["url"]
        assert data["file_name"] == "requirements.pdf"

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    async def test_document_not_found_returns_404(
        self, mock_db, client, mock_user_org, auth_headers
    ):
        """Should return 404 for non-existent document."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_conn.fetchrow.return_value = None

        resp = await client.get("/tenders/documents/999/view", headers=auth_headers)

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    async def test_document_missing_file_path_returns_404(
        self, mock_db, client, mock_user_org, auth_headers
    ):
        """Should return 404 when document exists but file_path is null."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_row = MagicMock()
        mock_row.__getitem__ = lambda self, key: {
            "file_name": "orphan.pdf",
            "file_path": None,
        }[key]
        mock_conn.fetchrow.return_value = mock_row

        resp = await client.get("/tenders/documents/1/view", headers=auth_headers)

        assert resp.status_code == 404
        assert "missing" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self, client):
        """Request without auth token should be rejected."""
        resp = await client.get("/tenders/documents/1/view")

        assert resp.status_code == 401
