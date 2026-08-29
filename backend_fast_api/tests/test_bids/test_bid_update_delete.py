# ============================================================
# tests/test_bids/test_bid_update_delete.py - Bid Update & Deletion Tests
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.bids.models import BidStatus
from app.modules.bids.service import update_bid, delete_bid, delete_bid_document


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

class TestBidUpdateService:
    """Tests for update_bid service function."""

    @pytest.mark.asyncio
    async def test_update_bid_success(self):
        mock_conn = AsyncMock()
        # Mock initial fetchrow
        mock_conn.fetchrow.side_effect = [
            {
                "bid_id": 50,
                "vendor_org_id": 2,
                "submitted_by": 5,
                "tender_id": 10,
                "financial_amount": 10000.0,
                "description": "Old desc",
                "status": "Submitted",
                "tender_status": "Published"
            },
            # Return of UPDATE ... RETURNING *
            {
                "bid_id": 50,
                "vendor_org_id": 2,
                "submitted_by": 5,
                "tender_id": 10,
                "financial_amount": 12000.0,
                "description": "Updated proposal",
                "status": "Submitted"
            }
        ]
        mock_conn.fetch.return_value = [
            {"bid_doc_id": 1, "file_path": "bids/50/doc.pdf", "document_type": "TIN"}
        ]

        result = await update_bid(
            connection=mock_conn,
            bid_id=50,
            vendor_org_id=2,
            financial_amount=12000.0,
            description="Updated proposal"
        )

        assert result["bid_id"] == 50
        assert result["financial_amount"] == 12000.0
        assert result["description"] == "Updated proposal"
        assert len(result["documents"]) == 1

    @pytest.mark.asyncio
    async def test_update_bid_not_found(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = None

        with pytest.raises(KeyError):
            await update_bid(mock_conn, bid_id=999, vendor_org_id=2, financial_amount=100.0)

    @pytest.mark.asyncio
    async def test_update_bid_unauthorized_org(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_id": 50,
            "vendor_org_id": 3, # belongs to org 3
            "status": "Submitted",
            "tender_status": "Published"
        }

        with pytest.raises(PermissionError):
            await update_bid(mock_conn, bid_id=50, vendor_org_id=2, financial_amount=100.0)

    @pytest.mark.asyncio
    async def test_update_bid_accepted_blocked(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_id": 50,
            "vendor_org_id": 2,
            "status": "Accepted",
            "tender_status": "Awarded"
        }

        with pytest.raises(ValueError, match="Cannot update an accepted bid"):
            await update_bid(mock_conn, bid_id=50, vendor_org_id=2, financial_amount=100.0)

    @pytest.mark.asyncio
    async def test_update_bid_tender_closed_blocked(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_id": 50,
            "vendor_org_id": 2,
            "status": "Submitted",
            "tender_status": "Closed"
        }

        with pytest.raises(ValueError, match="Cannot update bid for a tender that is already Closed"):
            await update_bid(mock_conn, bid_id=50, vendor_org_id=2, financial_amount=100.0)


class TestBidDeleteService:
    """Tests for delete_bid and delete_bid_document service functions."""

    @pytest.mark.asyncio
    @patch("app.services.supabase_storage.delete_files")
    async def test_delete_bid_success_cleans_db_and_storage(self, mock_delete_files):
        mock_conn = AsyncMock()
        
        @asynccontextmanager
        async def _fake_tx():
            yield

        mock_conn.transaction = MagicMock(side_effect=_fake_tx)

        mock_conn.fetchrow.return_value = {
            "bid_id": 50,
            "vendor_org_id": 2,
            "status": "Submitted",
            "tender_id": 10,
        }

        # Mock fetch for bid_docs and bid_secs
        mock_conn.fetch.side_effect = [
            [{"file_path": "bids/50/doc1.pdf"}],
            [{"bid_security_doc_path": "bids/50/sec.pdf"}]
        ]

        result = await delete_bid(mock_conn, bid_id=50, vendor_org_id=2)

        assert result["bid_id"] == 50
        assert "deleted successfully" in result["message"]

        # Verify DB delete commands executed
        assert mock_conn.execute.call_count >= 3

        # Verify storage delete_files called
        mock_delete_files.assert_called_once()
        cleaned_paths = mock_delete_files.call_args[0][0]
        assert "bids/50/doc1.pdf" in cleaned_paths
        assert "bids/50/sec.pdf" in cleaned_paths

    @pytest.mark.asyncio
    async def test_delete_bid_accepted_blocked(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_id": 50,
            "vendor_org_id": 2,
            "status": "Accepted"
        }

        with pytest.raises(ValueError, match="Cannot delete an accepted bid"):
            await delete_bid(mock_conn, bid_id=50, vendor_org_id=2)

    @pytest.mark.asyncio
    async def test_delete_bid_unauthorized(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_id": 50,
            "vendor_org_id": 3,
            "status": "Submitted"
        }

        with pytest.raises(PermissionError):
            await delete_bid(mock_conn, bid_id=50, vendor_org_id=2)

    @pytest.mark.asyncio
    @patch("app.services.supabase_storage.delete_files")
    async def test_delete_bid_document_success(self, mock_delete_files):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_doc_id": 12,
            "file_path": "bids/50/license.pdf",
            "vendor_org_id": 2,
            "bid_status": "Submitted"
        }

        result = await delete_bid_document(mock_conn, doc_id=12, vendor_org_id=2)
        assert result["doc_id"] == 12
        mock_conn.execute.assert_called_once_with(
            "DELETE FROM bid_documents WHERE bid_doc_id = $1", 12
        )
        mock_delete_files.assert_called_once_with(["bids/50/license.pdf"])

    @pytest.mark.asyncio
    async def test_delete_bid_document_accepted_blocked(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "bid_doc_id": 12,
            "file_path": "bids/50/license.pdf",
            "vendor_org_id": 2,
            "bid_status": "Accepted"
        }

        with pytest.raises(ValueError, match="Cannot delete documents for an accepted bid"):
            await delete_bid_document(mock_conn, doc_id=12, vendor_org_id=2)


# ============================================================
# Router Level Tests
# ============================================================

class TestBidUpdateDeleteRouter:
    """Tests for PUT /bids/{bid_id}, DELETE /bids/{bid_id}, and DELETE /bids/documents/{doc_id}."""

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.update_bid")
    async def test_update_bid_endpoint_success(
        self, mock_update, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 5}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_update.return_value = {
            "bid_id": 50,
            "vendor_org_id": 2,
            "submitted_by": 5,
            "tender_id": 10,
            "financial_amount": 75000.0,
            "description": "Updated notes",
            "status": "Submitted",
            "documents": []
        }

        payload = {
            "financial_amount": 75000.0,
            "description": "Updated notes"
        }

        resp = await client.put("/bids/50", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["bid_id"] == 50
        assert data["financial_amount"] == 75000.0
        assert data["description"] == "Updated notes"

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.update_bid")
    async def test_update_bid_endpoint_forbidden(
        self, mock_update, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 5}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_update.side_effect = PermissionError("You do not have permission to update this bid.")

        resp = await client.put("/bids/50", json={"financial_amount": 100.0}, headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.delete_bid")
    async def test_delete_bid_endpoint_success(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 5}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.return_value = {"message": "Bid and all associated documents deleted successfully.", "bid_id": 50}

        resp = await client.delete("/bids/50", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["bid_id"] == 50
        mock_delete.assert_called_once_with(mock_conn, 50, 2)

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.delete_bid")
    async def test_delete_bid_endpoint_accepted_bad_request(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 5}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.side_effect = ValueError("Cannot delete an accepted bid.")

        resp = await client.delete("/bids/50", headers=auth_headers)
        assert resp.status_code == 400
        assert "Cannot delete an accepted bid" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.delete_bid_document")
    async def test_delete_bid_document_endpoint_success(
        self, mock_delete_doc, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 5}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete_doc.return_value = {"message": "Bid document deleted successfully.", "doc_id": 12}

        resp = await client.delete("/bids/documents/12", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["doc_id"] == 12
        mock_delete_doc.assert_called_once_with(mock_conn, 12, 2)
