# ============================================================
# tests/test_notifications/test_notifications_router.py
# ============================================================

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.notifications.service import (
    delete_notification,
    get_unread_count,
    get_user_notifications,
    mark_all_read,
    mark_as_read,
)


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn

    return _ctx


def _current_user():
    return {
        "user_id": 1,
        "email": "buyer@test.com",
        "organization_id": 10,
        "role_in_org": "Owner",
        "org_user_id": 1,
    }


def _sample_notification(*, notification_id=1, is_read=False):
    return {
        "notification_id": notification_id,
        "user_id": 1,
        "title": "Tender Published",
        "message": "Your tender was published.",
        "type": "System",
        "action_url": "/view-my-tender/5",
        "is_read": is_read,
        "created_at": datetime(2026, 3, 15, tzinfo=timezone.utc),
    }


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestNotificationService:
    @pytest.mark.asyncio
    async def test_mark_as_read_returns_true_when_updated(self):
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = "UPDATE 1"

        updated = await mark_as_read(mock_conn, 1, 1)

        assert updated is True

    @pytest.mark.asyncio
    async def test_mark_as_read_returns_false_when_missing(self):
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = "UPDATE 0"

        updated = await mark_as_read(mock_conn, 99, 1)

        assert updated is False

    @pytest.mark.asyncio
    async def test_mark_all_read_parses_count(self):
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = "UPDATE 3"

        count = await mark_all_read(mock_conn, 1)

        assert count == 3

    @pytest.mark.asyncio
    async def test_get_unread_count(self):
        mock_conn = AsyncMock()
        mock_conn.fetchval.return_value = 4

        count = await get_unread_count(mock_conn, 1)

        assert count == 4

    @pytest.mark.asyncio
    async def test_delete_notification(self):
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = "DELETE 1"

        deleted = await delete_notification(mock_conn, 1, 1)

        assert deleted is True

    @pytest.mark.asyncio
    async def test_get_user_notifications_unread_filter(self):
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = [_sample_notification()]

        rows = await get_user_notifications(mock_conn, 1, status="unread")

        assert len(rows) == 1
        assert rows[0]["title"] == "Tender Published"


class TestNotificationsRouter:
    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.get_user_notifications")
    async def test_get_notifications(self, mock_get, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get.return_value = [_sample_notification()]

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.get("/notifications/list", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Tender Published"

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client):
        response = await client.get("/notifications/list")

        assert response.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.mark_as_read")
    async def test_mark_read(self, mock_mark, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_mark.return_value = True

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.patch("/notifications/1/read", headers=auth_headers)

        assert response.status_code == 200
        assert "marked as read" in response.json()["message"]

    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.mark_as_read")
    async def test_mark_read_not_found(self, mock_mark, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_mark.return_value = False

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.patch("/notifications/99/read", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.mark_all_read")
    async def test_mark_all_read(self, mock_mark_all, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_mark_all.return_value = 2

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.patch("/notifications/read-all", headers=auth_headers)

        assert response.status_code == 200
        assert "2" in response.json()["message"]

    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.get_unread_count")
    async def test_unread_count(self, mock_count, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_count.return_value = 5

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.get("/notifications/unread-count", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["count"] == 5

    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.delete_notification")
    async def test_delete_notification(self, mock_delete, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.return_value = True

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.delete("/notifications/1", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["message"] == "Notification deleted"

    @pytest.mark.asyncio
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.delete_notification")
    async def test_delete_notification_not_found(
        self, mock_delete, mock_db, client, auth_headers
    ):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_delete.return_value = False

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.delete("/notifications/99", headers=auth_headers)

        assert response.status_code == 404
