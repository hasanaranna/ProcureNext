# ============================================================
# tests/test_tenders/test_tender_lifecycle.py
# Phase 2: draft, publish, edit, withdraw, auto-close
# ============================================================

import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.tenders.schemas import TenderCreateRequest, TenderUpdateRequest
from app.modules.tenders.service import (
    auto_close_expired_tenders,
    create_tender_with_documents,
    delete_tender,
    publish_draft_tender,
    save_draft_with_documents,
    update_tender,
    withdraw_tender,
)
from app.tasks.tender_tasks import auto_close_expired_tenders_task


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


def _fake_transaction(mock_conn):
    @asynccontextmanager
    async def _tx():
        yield
    mock_conn.transaction = MagicMock(side_effect=_tx)


def _sample_tender_row(*, tender_id=5, buyer_id=10, status="Draft", title="Test Tender"):
    return {
        "tender_id": tender_id,
        "buyer_id": buyer_id,
        "created_by": 2,
        "title": title,
        "description": "Description",
        "status": status,
        "created_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def tender_create_payload():
    return TenderCreateRequest(
        title="Office Supplies",
        description="Procurement of stationery",
        procurement_nature="Goods",
        procurement_method="OTM",
        category="construction",
        budget_max=5000.0,
    )


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


# ============================================================
# Service-level tests
# ============================================================


class TestCreateTenderWithDocumentsService:
    @pytest.mark.asyncio
    @patch("app.modules.tenders.service.upload_tender_documents_to_supabase")
    @patch("app.modules.tenders.service.deduct_tokens_for_tender_publish")
    @patch("app.modules.tenders.service._build_embedding_str", new_callable=AsyncMock)
    @patch("app.modules.tenders.service.resolve_category_id", new_callable=AsyncMock, return_value=1)
    @patch("app.modules.tenders.service.resolve_method_id", new_callable=AsyncMock, return_value=1)
    @patch("app.modules.tenders.service.resolve_nature_id", new_callable=AsyncMock, return_value=1)
    async def test_save_draft_does_not_deduct_tokens(
        self,
        _nature,
        _method,
        _category,
        _embedding,
        mock_deduct,
        _upload,
        tender_create_payload,
    ):
        mock_conn = AsyncMock()
        _fake_transaction(mock_conn)
        _embedding.return_value = None
        mock_conn.fetchrow.return_value = _sample_tender_row(status="Draft")

        result = await save_draft_with_documents(
            mock_conn, buyer_id=10, org_user_id=2, user_id=2,
            tender_data=tender_create_payload, files_data=[],
        )

        assert result["status"] == "Draft"
        mock_deduct.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.modules.tenders.service.upload_tender_documents_to_supabase")
    @patch("app.modules.tenders.service.deduct_tokens_for_tender_publish", new_callable=AsyncMock)
    @patch("app.modules.tenders.service._build_embedding_str", new_callable=AsyncMock)
    @patch("app.modules.tenders.service.resolve_category_id", new_callable=AsyncMock, return_value=1)
    @patch("app.modules.tenders.service.resolve_method_id", new_callable=AsyncMock, return_value=1)
    @patch("app.modules.tenders.service.resolve_nature_id", new_callable=AsyncMock, return_value=1)
    async def test_publish_create_deducts_tokens(
        self,
        _nature,
        _method,
        _category,
        _embedding,
        mock_deduct,
        mock_upload,
        tender_create_payload,
    ):
        mock_conn = AsyncMock()
        _fake_transaction(mock_conn)
        _embedding.return_value = None
        mock_conn.fetchrow.return_value = _sample_tender_row(status="Published")
        mock_upload.delay = MagicMock()

        result = await create_tender_with_documents(
            mock_conn, buyer_id=10, org_user_id=2, user_id=2,
            tender_data=tender_create_payload, files_data=[],
            status="Published",
        )

        assert result["status"] == "Published"
        mock_deduct.assert_awaited_once()
        mock_deduct.assert_awaited_with(
            connection=mock_conn,
            organization_id=10,
            user_id=2,
            tender_id=5,
            tender_title="Office Supplies",
        )


class TestPublishDraftTenderService:
    @pytest.mark.asyncio
    @patch("app.modules.tenders.service.deduct_tokens_for_tender_publish", new_callable=AsyncMock)
    async def test_publish_draft_success(self, mock_deduct):
        mock_conn = AsyncMock()
        _fake_transaction(mock_conn)
        mock_conn.fetchrow.side_effect = [
            _sample_tender_row(status="Draft"),
            _sample_tender_row(status="Published"),
        ]

        result = await publish_draft_tender(mock_conn, tender_id=5, buyer_org_id=10, user_id=2)

        assert result["status"] == "Published"
        mock_deduct.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_publish_draft_not_found(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = None

        with pytest.raises(KeyError, match="Tender not found"):
            await publish_draft_tender(mock_conn, tender_id=99, buyer_org_id=10, user_id=2)

    @pytest.mark.asyncio
    async def test_publish_draft_wrong_org(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = _sample_tender_row(buyer_id=99)

        with pytest.raises(PermissionError):
            await publish_draft_tender(mock_conn, tender_id=5, buyer_org_id=10, user_id=2)

    @pytest.mark.asyncio
    async def test_publish_draft_already_published(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = _sample_tender_row(status="Published")

        with pytest.raises(ValueError, match="Only draft tenders"):
            await publish_draft_tender(mock_conn, tender_id=5, buyer_org_id=10, user_id=2)


class TestUpdateTenderService:
    @pytest.mark.asyncio
    async def test_update_draft_title(self):
        mock_conn = AsyncMock()
        _fake_transaction(mock_conn)
        mock_conn.fetchrow.side_effect = [
            {"tender_id": 5, "buyer_id": 10, "status": "Draft"},
            _sample_tender_row(status="Draft", title="Updated Title"),
        ]
        mock_conn.fetchval.return_value = 0

        result = await update_tender(
            mock_conn, tender_id=5, buyer_org_id=10,
            tender_data=TenderUpdateRequest(title="Updated Title"),
        )

        assert result["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_published_with_bids_rejected(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {"tender_id": 5, "buyer_id": 10, "status": "Published"}
        mock_conn.fetchval.return_value = 3

        with pytest.raises(ValueError, match="already has bids"):
            await update_tender(
                mock_conn, tender_id=5, buyer_org_id=10,
                tender_data=TenderUpdateRequest(title="Nope"),
            )

    @pytest.mark.asyncio
    async def test_update_cancelled_rejected(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {"tender_id": 5, "buyer_id": 10, "status": "Cancelled"}

        with pytest.raises(ValueError, match="Cannot update"):
            await update_tender(
                mock_conn, tender_id=5, buyer_org_id=10,
                tender_data=TenderUpdateRequest(title="Nope"),
            )

    @pytest.mark.asyncio
    async def test_update_no_fields_rejected(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {"tender_id": 5, "buyer_id": 10, "status": "Draft"}
        mock_conn.fetchval.return_value = 0

        with pytest.raises(ValueError, match="No fields provided"):
            await update_tender(
                mock_conn, tender_id=5, buyer_org_id=10,
                tender_data=TenderUpdateRequest(),
            )


class TestWithdrawTenderService:
    @pytest.mark.asyncio
    @patch("app.modules.notifications.service.create_notification", new_callable=AsyncMock)
    async def test_withdraw_published_notifies_bidders(self, mock_notify):
        mock_conn = AsyncMock()
        _fake_transaction(mock_conn)
        mock_conn.fetchrow.side_effect = [
            _sample_tender_row(status="Published"),
            {"tender_id": 5, "status": "Cancelled", "title": "Test Tender"},
        ]
        mock_conn.fetch.return_value = [{"user_id": 42, "tender_title": "Test Tender"}]

        result = await withdraw_tender(mock_conn, tender_id=5, buyer_org_id=10)

        assert result["status"] == "Cancelled"
        mock_notify.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_withdraw_awarded_rejected(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = _sample_tender_row(status="Awarded")

        with pytest.raises(ValueError, match="Cannot cancel"):
            await withdraw_tender(mock_conn, tender_id=5, buyer_org_id=10)


class TestAutoCloseExpiredTendersService:
    @pytest.mark.asyncio
    async def test_auto_close_returns_count(self):
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = "UPDATE 4"

        closed = await auto_close_expired_tenders(mock_conn)

        assert closed == 4
        mock_conn.execute.assert_awaited_once()


class TestDeleteTenderLifecycleRules:
    @pytest.mark.asyncio
    async def test_delete_published_with_bids_rejected(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "tender_id": 10,
            "buyer_id": 1,
            "status": "Published",
        }
        mock_conn.fetchval.return_value = 2

        with pytest.raises(ValueError, match="Cancel it instead"):
            await delete_tender(mock_conn, tender_id=10, buyer_org_id=1)

    @pytest.mark.asyncio
    async def test_delete_cancelled_rejected(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {
            "tender_id": 10,
            "buyer_id": 1,
            "status": "Cancelled",
        }

        with pytest.raises(ValueError, match="Cancelled tenders cannot be deleted"):
            await delete_tender(mock_conn, tender_id=10, buyer_org_id=1)


class TestAutoCloseCeleryTask:
    @patch("app.tasks.tender_tasks.asyncio.run", return_value=3)
    def test_auto_close_task_returns_closed_count(self, mock_run):
        result = auto_close_expired_tenders_task()
        assert result == {"closed_count": 3}
        mock_run.assert_called_once()


# ============================================================
# Router-level tests
# ============================================================


class TestTenderLifecycleRouter:
    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.save_draft_with_documents")
    async def test_save_draft_endpoint(self, mock_save, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_save.return_value = _sample_tender_row(status="Draft")

        resp = await client.post(
            "/tenders/buyer/draft-with-documents",
            headers=auth_headers,
            data={
                "tender_data": json.dumps(
                    {"title": "Draft Tender", "description": "Desc", "visibility_type": "Public"}
                ),
                "file_names": "[]",
            },
        )

        assert resp.status_code == 201
        assert resp.json()["status"] == "Draft"
        mock_save.assert_called_once()

    @pytest.mark.asyncio
    async def test_save_draft_requires_title(self, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }

        resp = await client.post(
            "/tenders/buyer/draft-with-documents",
            headers=auth_headers,
            data={
                "tender_data": json.dumps({"title": "  ", "description": "Desc"}),
                "file_names": "[]",
            },
        )

        assert resp.status_code == 400
        assert "Title is required" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_save_draft_unauthenticated(self, client):
        resp = await client.post(
            "/tenders/buyer/draft-with-documents",
            data={
                "tender_data": json.dumps({"title": "Draft", "description": "Desc"}),
                "file_names": "[]",
            },
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_draft_tender")
    async def test_publish_draft_endpoint(self, mock_publish, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_publish.return_value = _sample_tender_row(status="Published")

        resp = await client.post("/tenders/5/publish", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "Published"

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_draft_tender")
    async def test_publish_draft_not_found(self, mock_publish, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_publish.side_effect = KeyError("Tender not found")

        resp = await client.post("/tenders/999/publish", headers=auth_headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_draft_tender")
    async def test_publish_draft_bad_request_when_not_draft(
        self, mock_publish, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_publish.side_effect = ValueError("Only draft tenders can be published.")

        resp = await client.post("/tenders/5/publish", headers=auth_headers)
        assert resp.status_code == 400

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.update_tender")
    async def test_update_tender_endpoint(self, mock_update, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_update.return_value = _sample_tender_row(status="Draft", title="Updated")

        resp = await client.put(
            "/tenders/5",
            headers=auth_headers,
            json={"title": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.update_tender")
    async def test_update_tender_with_bids_returns_400(
        self, mock_update, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_update.side_effect = ValueError("Cannot update a published tender that already has bids.")

        resp = await client.put(
            "/tenders/5",
            headers=auth_headers,
            json={"title": "Updated"},
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.withdraw_tender")
    async def test_withdraw_tender_endpoint(self, mock_withdraw, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_withdraw.return_value = {
            "message": "Tender #5 has been cancelled.",
            "tender_id": 5,
            "status": "Cancelled",
            "title": "Tender",
        }

        resp = await client.post("/tenders/5/withdraw", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "Cancelled"

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.withdraw_tender")
    async def test_withdraw_awarded_returns_400(self, mock_withdraw, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_withdraw.side_effect = ValueError("Cannot cancel a tender with status 'Awarded'.")

        resp = await client.post("/tenders/5/withdraw", headers=auth_headers)
        assert resp.status_code == 400

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.delete_tender")
    async def test_delete_published_with_bids_returns_400(
        self, mock_delete, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10, "org_user_id": 2, "user_id": 2,
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.side_effect = ValueError(
            "Cannot delete a published tender that has bids. Cancel it instead."
        )

        resp = await client.delete("/tenders/5", headers=auth_headers)
        assert resp.status_code == 400
        assert "Cancel it instead" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_buyer_tenders")
    async def test_buyer_my_tenders_status_filter(
        self, mock_get_tenders, mock_db, client, mock_user_org, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_tenders.return_value = []

        resp = await client.get("/tenders/buyer/my-tenders?status=Draft", headers=auth_headers)

        assert resp.status_code == 200
        mock_get_tenders.assert_called_once_with(
            mock_conn, mock_user_org["organization_id"], status="Draft"
        )

    @pytest.mark.asyncio
    async def test_publish_unauthenticated(self, client):
        resp = await client.post("/tenders/5/publish")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_withdraw_unauthenticated(self, client):
        resp = await client.post("/tenders/5/withdraw")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_unauthenticated(self, client):
        resp = await client.put("/tenders/5", json={"title": "X"})
        assert resp.status_code == 401
