# ============================================================
# tests/test_core/test_db_init.py - DB Connection Init Check Tests
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.db import check_db_connection
from app.main import lifespan, app


@pytest.mark.asyncio
class TestDbConnectionCheck:
    """Tests for database connection check at init."""

    @patch("app.core.db.get_database_url", return_value="postgresql://user:pass@localhost:5432/db")
    @patch("asyncpg.connect")
    async def test_check_db_connection_success(self, mock_connect, mock_url):
        mock_conn = AsyncMock()
        mock_conn.fetchval.return_value = 1
        mock_connect.return_value = mock_conn

        result = await check_db_connection()
        assert result is True
        mock_connect.assert_called_once()
        mock_conn.fetchval.assert_called_once_with("SELECT 1;")
        mock_conn.close.assert_called_once()

    @patch("app.core.db.get_database_url", return_value=None)
    async def test_check_db_connection_no_url(self, mock_url):
        result = await check_db_connection()
        assert result is False

    @patch("app.core.db.get_database_url", return_value="postgresql://user:pass@localhost:5432/db")
    @patch("asyncpg.connect")
    async def test_check_db_connection_failure(self, mock_connect, mock_url):
        mock_connect.side_effect = ConnectionRefusedError("Connection refused")

        result = await check_db_connection()
        assert result is False

    @patch("app.main.check_db_connection", return_value=True)
    async def test_lifespan_calls_check_db_connection(self, mock_check_db):
        async with lifespan(app):
            pass
        mock_check_db.assert_called_once()

    @patch("app.main.check_db_connection", return_value=True)
    async def test_health_check_connected(self, mock_check, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"

    @patch("app.main.check_db_connection", return_value=False)
    async def test_health_check_disconnected(self, mock_check, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "degraded"
        assert data["database"] == "disconnected"

