# ============================================================
# tests/test_tenders/test_tender_delete.py - Tender Deletion Tests
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.tenders.service import delete_tender, delete_tender_document


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


# ============================================================
# Service Level Tests
# ============================================================

class TestTenderDeleteService:
    """Tests for delete_tender and delete_tender_document service functions."""

    @pytest.mark.asyncio
    @patch("app.services.supabase_storage.delete_files")
    async def test_delete_tender_success_cleans_db_and_storage(self, mock_delete_files):
        mock_conn = AsyncMock()
        
        @asynccontextmanager
        async def _fake_tx():
            yield

        mock_conn.transaction = MagicMock(side_effect=_fake_tx)

        # Mock tender row
        mock_conn.fetchrow.return_value = {
            "tender_id": 10,
            "buyer_id": 1,
            "status": "Published"
        }

        # Mock gathering storage file paths:
        # 1. tender_docs
        # 2. bid_docs
        # 3. bid_secs
        # 4. contract_docs
        mock_conn.fetch.side_effect = [
            [{"file_path": "tenders/10/spec.pdf"}, {"file_path": "tenders/10/boq.pdf"}],
            [{"file_path": "bids/101/proposal.pdf"}],
            [{"bid_security_doc_path": "bids/101/guarantee.pdf"}],
            []
        ]

        result = await delete_tender(mock_conn, tender_id=10, buyer_org_id=1)

        assert result["tender_id"] == 10
        assert "deleted successfully" in result["message"]

        # Verify DB transaction executed and tables deleted
        assert mock_conn.execute.call_count >= 10

        # Verify Supabase storage delete_files called with all gathered paths
        mock_delete_files.assert_called_once()
        cleaned_paths = mock_delete_files.call_args[0][0]
        assert "tenders/10/spec.pdf" in cleaned_paths
        assert "tenders/10/boq.pdf" in cleaned_paths
        assert "bids/101/proposal.pdf" in cleaned_paths
        assert "bids/101/guarantee.pdf" in cleaned_paths

    @pytest.mark.asyncio
    async def test_delete_tender_not_found_raises_keyerror(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = None

        with pytest.raises(KeyError):
            await delete_tender(mock_conn, tender_id=999, buyer_org_id=1)

    @pytest.mark.asyncio
    async def test_delete_tender_unauthorized_org_raises_permission_error(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "tender_id": 10,
            "buyer_id": 2, # belongs to org 2
            "status": "Published"
        }

        with pytest.raises(PermissionError):
            await delete_tender(mock_conn, tender_id=10, buyer_org_id=1) # org 1 tries to delete

    @pytest.mark.asyncio
    async def test_delete_tender_awarded_raises_value_error(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "tender_id": 10,
            "buyer_id": 1,
            "status": "Awarded"
        }

        with pytest.raises(ValueError, match="Cannot delete an awarded tender"):
            await delete_tender(mock_conn, tender_id=10, buyer_org_id=1)

    @pytest.mark.asyncio
    @patch("app.services.supabase_storage.delete_files")
    async def test_delete_tender_document_service_success(self, mock_delete_files):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "tender_doc_id": 5,
            "file_path": "tenders/10/doc5.pdf",
            "buyer_id": 1,
            "tender_id": 10
        }

        result = await delete_tender_document(mock_conn, doc_id=5, buyer_org_id=1)

        assert result["doc_id"] == 5
        mock_conn.execute.assert_called_once_with(
            "DELETE FROM tender_documents WHERE tender_doc_id = $1", 5
        )
        mock_delete_files.assert_called_once_with(["tenders/10/doc5.pdf"])

    @pytest.mark.asyncio
    async def test_delete_tender_document_unauthorized(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "tender_doc_id": 5,
            "file_path": "tenders/10/doc5.pdf",
            "buyer_id": 2,
            "tender_id": 10
        }

        with pytest.raises(PermissionError):
            await delete_tender_document(mock_conn, doc_id=5, buyer_org_id=1)


# ============================================================
# Router Level Tests
# ============================================================

class TestTenderDeleteRouter:
    """Tests for DELETE /tenders/{tender_id} and DELETE /tenders/documents/{doc_id}."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender")
    async def test_delete_tender_endpoint_success(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.return_value = {"message": "Tender and all associated data deleted successfully.", "tender_id": 10}

        resp = await client.delete("/tenders/10", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["tender_id"] == 10
        mock_delete.assert_called_once_with(mock_conn, 10, 1)

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender")
    async def test_delete_tender_endpoint_not_found(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.side_effect = KeyError("Tender not found")

        resp = await client.delete("/tenders/999", headers=auth_headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender")
    async def test_delete_tender_endpoint_forbidden(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.side_effect = PermissionError("You do not have permission to delete this tender.")

        resp = await client.delete("/tenders/10", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender")
    async def test_delete_tender_endpoint_awarded_bad_request(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.side_effect = ValueError("Cannot delete an awarded tender.")

        resp = await client.delete("/tenders/10", headers=auth_headers)
        assert resp.status_code == 400
        assert "Cannot delete an awarded tender" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_delete_tender_unauthenticated(self, client):
        resp = await client.delete("/tenders/10")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_tender_no_org(self, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": None, "org_user_id": 10}
        resp = await client.delete("/tenders/10", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender_document")
    async def test_delete_tender_document_endpoint_success(
        self, mock_delete_doc, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete_doc.return_value = {"message": "Tender document deleted successfully.", "doc_id": 5}

        resp = await client.delete("/tenders/documents/5", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["doc_id"] == 5
        mock_delete_doc.assert_called_once_with(mock_conn, 5, 1)

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender_document")
    async def test_delete_tender_document_endpoint_not_found(
        self, mock_delete_doc, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete_doc.side_effect = KeyError("Document not found")

        resp = await client.delete("/tenders/documents/999", headers=auth_headers)
        assert resp.status_code == 404
