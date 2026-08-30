# ============================================================
# tests/test_auth/test_password_reset.py
# ============================================================
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.modules.auth.service import (
    request_password_reset,
    verify_password_reset_token,
    confirm_password_reset,
)
from app.services.email import (
    build_password_reset_html,
    build_password_reset_text,
    send_password_reset_email,
)


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


# ===========================================================================
# 1. Service Layer Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_request_password_reset_existing_user():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {
        "user_id": 42,
        "full_name": "Rahim Ahmed",
        "email": "rahim@example.com",
    }
    mock_conn.execute.return_value = None

    with patch("app.tasks.notification_tasks.send_password_reset_email_task.delay") as mock_celery:
        res = await request_password_reset(mock_conn, "rahim@example.com")
        assert "password reset link has been sent" in res["message"]
        # Verify invalidate existing tokens query was executed
        assert mock_conn.execute.call_count >= 2
        # Verify Celery task was called
        mock_celery.assert_called_once()
        call_kwargs = mock_celery.call_args.kwargs
        assert call_kwargs["to_email"] == "rahim@example.com"
        assert "reset-password?token=" in call_kwargs["reset_link"]
        assert call_kwargs["expires_minutes"] == 30


@pytest.mark.asyncio
async def test_request_password_reset_nonexistent_user():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = None

    with patch("app.tasks.notification_tasks.send_password_reset_email_task.delay") as mock_celery:
        res = await request_password_reset(mock_conn, "unknown@example.com")
        assert "password reset link has been sent" in res["message"]
        mock_celery.assert_not_called()


@pytest.mark.asyncio
async def test_verify_password_reset_token_valid():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {
        "reset_id": 1,
        "user_id": 42,
        "email": "rahim@example.com",
        "expires_at": "2026-08-30 19:00:00",
        "used_at": None,
        "is_unexpired": True,
    }

    res = await verify_password_reset_token(mock_conn, "valid_token_123")
    assert res["valid"] is True
    assert res["email"] == "rahim@example.com"


@pytest.mark.asyncio
async def test_verify_password_reset_token_expired():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {
        "reset_id": 1,
        "user_id": 42,
        "email": "rahim@example.com",
        "expires_at": "2026-08-30 18:00:00",
        "used_at": None,
        "is_unexpired": False,
    }

    with pytest.raises(HTTPException) as exc_info:
        await verify_password_reset_token(mock_conn, "expired_token_123")
    assert exc_info.value.status_code == 400
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_password_reset_token_already_used():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {
        "reset_id": 1,
        "user_id": 42,
        "email": "rahim@example.com",
        "expires_at": "2026-08-30 19:00:00",
        "used_at": "2026-08-30 18:35:00",
        "is_unexpired": True,
    }

    with pytest.raises(HTTPException) as exc_info:
        await verify_password_reset_token(mock_conn, "used_token_123")
    assert exc_info.value.status_code == 400
    assert "already been used" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_password_reset_token_not_found():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        await verify_password_reset_token(mock_conn, "nonexistent_token")
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_confirm_password_reset_success():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {
        "reset_id": 1,
        "user_id": 42,
        "email": "rahim@example.com",
        "expires_at": "2026-08-30 19:00:00",
        "used_at": None,
        "is_unexpired": True,
    }

    # Setup transaction context
    @asynccontextmanager
    async def mock_transaction():
        yield

    mock_conn.transaction = mock_transaction
    mock_conn.execute.return_value = None

    res = await confirm_password_reset(mock_conn, "valid_token_123", "NewSecretPass123!")
    assert "successfully reset" in res["message"]
    # Check that update user and update token were called
    assert mock_conn.execute.call_count == 2


@pytest.mark.asyncio
async def test_confirm_password_reset_short_password():
    mock_conn = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await confirm_password_reset(mock_conn, "valid_token_123", "short")
    assert exc_info.value.status_code == 400
    assert "at least 8 characters" in exc_info.value.detail


# ===========================================================================
# 2. Router Endpoint Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_router_password_reset_request():
    mock_conn = AsyncMock()
    with patch("app.modules.auth.router.get_db_connection", side_effect=_mock_db_ctx(mock_conn)):
        with patch("app.modules.auth.router.request_password_reset", return_value={"message": "Reset link sent"}):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post("/api/auth/password-reset/request", json={"email": "test@example.com"})
                assert res.status_code == 200
                assert res.json() == {"message": "Reset link sent"}


@pytest.mark.asyncio
async def test_router_password_reset_verify():
    mock_conn = AsyncMock()
    with patch("app.modules.auth.router.get_db_connection", side_effect=_mock_db_ctx(mock_conn)):
        with patch(
            "app.modules.auth.router.verify_password_reset_token",
            return_value={"valid": True, "email": "test@example.com", "message": "Token valid"},
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.get("/api/auth/password-reset/verify?token=sample_token")
                assert res.status_code == 200
                assert res.json()["valid"] is True
                assert res.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_router_password_reset_confirm():
    mock_conn = AsyncMock()
    with patch("app.modules.auth.router.get_db_connection", side_effect=_mock_db_ctx(mock_conn)):
        with patch(
            "app.modules.auth.router.confirm_password_reset",
            return_value={"message": "Password reset successful"},
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(
                    "/api/auth/password-reset/confirm",
                    json={"token": "sample_token", "new_password": "NewStrongPassword123!"},
                )
                assert res.status_code == 200
                assert res.json()["message"] == "Password reset successful"


# ===========================================================================
# 3. Email Template & Service Tests
# ===========================================================================

def test_password_reset_email_templates():
    html = build_password_reset_html(
        to_email="test@example.com",
        reset_link="http://localhost:3000/reset-password?token=abc",
        user_name="Rahim",
        expires_minutes=30,
    )
    assert "Reset Your ProcureNext Password" in html
    assert "30 minutes" in html
    assert "http://localhost:3000/reset-password?token=abc" in html

    text = build_password_reset_text(
        to_email="test@example.com",
        reset_link="http://localhost:3000/reset-password?token=abc",
        user_name="Rahim",
        expires_minutes=30,
    )
    assert "30 minutes" in text
    assert "http://localhost:3000/reset-password?token=abc" in text
