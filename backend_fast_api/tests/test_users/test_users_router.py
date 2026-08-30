# ============================================================
# tests/test_users/test_users_router.py - User Endpoint Tests
# ============================================================

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.users.schemas import (
    ChangePasswordRequest,
    UserDocumentResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.modules.users.service import (
    change_password,
    get_user_documents,
    get_user_profile,
    update_profile,
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


def _sample_profile_row():
    return {
        "user_id": 1,
        "email": "buyer@test.com",
        "full_name": "Buyer User",
        "phone": "+8801700000000",
        "nid": 1234567890,
        "date_of_birth": datetime(1990, 1, 1, tzinfo=timezone.utc),
        "status": "Active",
        "is_2fa_enabled": False,
        "last_login_at": datetime(2026, 3, 1, tzinfo=timezone.utc),
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 3, 1, tzinfo=timezone.utc),
        "verification_status": "Approved",
    }


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


# ============================================================
# Service-level tests
# ============================================================


class TestUserProfileService:
    @pytest.mark.asyncio
    async def test_get_user_profile(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = _sample_profile_row()
        mock_conn.fetch.return_value = [
            {
                "organization_id": 10,
                "organization_name": "Acme Corp",
                "organization_type": "Buyer",
                "role_in_org": "Owner",
                "org_user_id": 1,
            }
        ]

        profile = await get_user_profile(mock_conn, 1)

        assert profile.user_id == 1
        assert profile.email == "buyer@test.com"
        assert len(profile.organizations) == 1
        assert profile.organizations[0].organization_name == "Acme Corp"

    @pytest.mark.asyncio
    async def test_update_profile(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.side_effect = [
            {"user_id": 1},
            _sample_profile_row(),
        ]
        mock_conn.fetch.return_value = []

        profile = await update_profile(
            mock_conn,
            1,
            UserProfileUpdate(full_name="Updated Name"),
        )

        assert profile.full_name == "Buyer User"
        mock_conn.fetchrow.assert_called()

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {"password_hash": "hashed"}

        with patch("app.modules.users.service.verify_password", return_value=False):
            with pytest.raises(Exception) as exc_info:
                await change_password(
                    mock_conn,
                    1,
                    ChangePasswordRequest(
                        current_password="wrong",
                        new_password="newpassword1",
                    ),
                )

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_change_password_success(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {"password_hash": "hashed"}

        with (
            patch("app.modules.users.service.verify_password", return_value=True),
            patch("app.modules.users.service.hash_password", return_value="newhash"),
        ):
            await change_password(
                mock_conn,
                1,
                ChangePasswordRequest(
                    current_password="oldpassword",
                    new_password="newpassword1",
                ),
            )

        mock_conn.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_documents_not_submitted(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = None

        docs = await get_user_documents(mock_conn, 1)

        assert docs.review_status == "NotSubmitted"
        assert docs.nid_front_url is None


# ============================================================
# Router-level tests
# ============================================================


class TestUsersRouter:
    @pytest.mark.asyncio
    @patch("app.modules.users.router.get_db_connection")
    @patch("app.modules.users.router.get_user_profile")
    async def test_get_profile(self, mock_get_profile, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_profile.return_value = UserProfileResponse(
            user_id=1,
            email="buyer@test.com",
            full_name="Buyer User",
            phone="+8801700000000",
            nid=1234567890,
            date_of_birth=datetime(1990, 1, 1, tzinfo=timezone.utc),
            status="Active",
            is_2fa_enabled=False,
            last_login_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
            organizations=[],
            verification_status="Approved",
        )

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.get("/api/users/me", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["email"] == "buyer@test.com"

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client):
        response = await client.get("/api/users/me")

        assert response.status_code == 401

    @pytest.mark.asyncio
    @patch("app.modules.users.router.get_db_connection")
    @patch("app.modules.users.router.change_password")
    async def test_change_password(self, mock_change_password, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_change_password.return_value = None

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.put(
            "/api/users/me/password",
            headers=auth_headers,
            json={
                "current_password": "oldpassword",
                "new_password": "newpassword1",
            },
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully."

    @pytest.mark.asyncio
    @patch("app.modules.users.router.get_db_connection")
    @patch("app.modules.users.router.update_profile")
    async def test_update_profile(self, mock_update_profile, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_update_profile.return_value = UserProfileResponse(
            user_id=1,
            email="buyer@test.com",
            full_name="Updated Name",
            phone="+8801700000000",
            nid=1234567890,
            date_of_birth=datetime(1990, 1, 1, tzinfo=timezone.utc),
            status="Active",
            is_2fa_enabled=False,
            last_login_at=None,
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
            organizations=[],
            verification_status="Pending",
        )

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.put(
            "/api/users/me/profile",
            headers=auth_headers,
            json={"full_name": "Updated Name"},
        )

        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"

    @pytest.mark.asyncio
    @patch("app.modules.users.router.get_db_connection")
    @patch("app.modules.users.router.get_user_documents")
    async def test_get_documents(self, mock_get_documents, mock_db, client, auth_headers):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get_documents.return_value = UserDocumentResponse(
            review_status="Pending",
            nid_front_url="https://example.com/front",
            nid_back_url=None,
            verified_at=None,
        )

        app.dependency_overrides[get_current_user_org] = _current_user

        response = await client.get("/api/users/me/documents", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["review_status"] == "Pending"
