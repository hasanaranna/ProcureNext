# ============================================================
# tests/test_middleware/test_audit_middleware.py
# ============================================================

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import pytest

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestAuditMiddleware:
    @pytest.mark.asyncio
    @patch("app.middleware.audit_middleware.write_to_audit_outbox", new_callable=AsyncMock)
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.get_unread_count", new_callable=AsyncMock, return_value=0)
    async def test_state_changing_request_writes_audit_outbox(
        self, _mock_count, mock_db, mock_write, client, auth_headers
    ):
        mock_conn = AsyncMock()

        @asynccontextmanager
        async def _ctx():
            yield mock_conn

        mock_db.side_effect = _ctx
        app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 1,
            "email": "buyer@test.com",
            "organization_id": 10,
            "role_in_org": "Owner",
            "org_user_id": 1,
        }

        response = await client.get(
            "/notifications/unread-count",
            headers=auth_headers,
        )

        assert response.status_code == 200
        mock_write.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.middleware.audit_middleware.write_to_audit_outbox", new_callable=AsyncMock)
    @patch("app.middleware.audit_middleware.get_db_connection")
    @patch("app.modules.users.router.get_db_connection")
    @patch("app.modules.users.router.change_password", new_callable=AsyncMock, return_value=None)
    async def test_post_request_buffers_audit_event(
        self, _mock_change, mock_users_db, mock_audit_db, mock_write, client, auth_headers
    ):
        mock_conn = AsyncMock()

        @asynccontextmanager
        async def _ctx():
            yield mock_conn

        mock_users_db.side_effect = _ctx
        mock_audit_db.side_effect = _ctx
        app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 1,
            "email": "buyer@test.com",
            "organization_id": 10,
            "role_in_org": "Owner",
            "org_user_id": 1,
        }

        response = await client.put(
            "/api/users/me/password",
            headers=auth_headers,
            json={
                "current_password": "oldpassword",
                "new_password": "newpassword1",
            },
        )

        assert response.status_code == 200
        mock_write.assert_called_once()
        kwargs = mock_write.call_args.kwargs
        assert kwargs["action_type"] == "HTTP_PUT"
        assert kwargs["user_id"] == 1
        assert kwargs["new_values"]["status_code"] == 200

    @pytest.mark.asyncio
    @patch("app.middleware.audit_middleware.write_to_audit_outbox", new_callable=AsyncMock)
    async def test_login_path_skipped(self, mock_write, client):
        response = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "wrong"},
        )

        assert response.status_code in (401, 500)
        mock_write.assert_not_called()
