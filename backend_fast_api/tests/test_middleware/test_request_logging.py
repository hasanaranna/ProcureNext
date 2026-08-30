# ============================================================
# tests/test_middleware/test_request_logging.py
# ============================================================

import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import pytest

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestRequestLoggingMiddleware:
    @pytest.mark.asyncio
    async def test_health_endpoint_not_logged(self, client, caplog):
        with caplog.at_level("INFO", logger="app.request"):
            response = await client.get("/health")

        assert response.status_code == 200
        assert not any("request_id" in record.message for record in caplog.records)

    @pytest.mark.asyncio
    async def test_api_request_emits_structured_log(self, client, caplog):
        with caplog.at_level("INFO", logger="app.request"):
            response = await client.get("/tenders/public/active")

        assert response.status_code in (200, 500)
        request_logs = [
            json.loads(record.message)
            for record in caplog.records
            if record.name == "app.request"
        ]
        assert len(request_logs) == 1
        assert request_logs[0]["method"] == "GET"
        assert request_logs[0]["path"] == "/tenders/public/active"
        assert "duration_ms" in request_logs[0]
        assert response.headers.get("X-Request-Id")

    @pytest.mark.asyncio
    async def test_sensitive_path_redacted(self, client, caplog):
        with caplog.at_level("INFO", logger="app.request"):
            await client.post(
                "/api/auth/login",
                json={"email": "user@test.com", "password": "secret"},
            )

        request_logs = [
            record
            for record in caplog.records
            if record.name == "app.request"
        ]
        assert request_logs == []

    @pytest.mark.asyncio
    @patch("app.middleware.request_logging._extract_user_id", return_value=42)
    @patch("app.modules.notifications.router.get_db_connection")
    @patch("app.modules.notifications.router.get_unread_count", new_callable=AsyncMock, return_value=0)
    async def test_user_id_included_when_available(
        self, _mock_count, mock_db, _mock_user_id, client, caplog, auth_headers
    ):
        from contextlib import asynccontextmanager

        mock_conn = AsyncMock()

        @asynccontextmanager
        async def _ctx():
            yield mock_conn

        mock_db.side_effect = _ctx
        app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 42,
            "email": "buyer@test.com",
            "organization_id": 10,
            "role_in_org": "Owner",
            "org_user_id": 1,
        }

        with caplog.at_level("INFO", logger="app.request"):
            await client.get("/notifications/unread-count", headers=auth_headers)

        request_logs = [
            json.loads(record.message)
            for record in caplog.records
            if record.name == "app.request"
        ]
        assert request_logs
        assert request_logs[0]["user_id"] == 42
