# ============================================================
# tests/test_organizations/test_org_search_enlist.py
# ============================================================
# Tests for organization discovery, search, enlisting, and public profile:
#   GET /api/org/search
#   GET /api/org/profile/{org_id}
#   GET /api/org/enlisted
#   POST /api/org/enlist/{target_org_id}
#   DELETE /api/org/enlist/{target_org_id}
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


def _mock_db_ctx(mock_conn):
    """Wrap a mock connection in an async context manager."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure dependency overrides are cleared after each test."""
    yield
    app.dependency_overrides.clear()


class TestOrganizationSearch:
    """Tests for GET /api/org/search."""

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.search_organizations")
    async def test_search_orgs_success(self, mock_search, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "user_id": 1,
            "org_user_id": 1,
            "role_in_org": "Owner"
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_search.return_value = [
            {
                "organization_id": 20,
                "organization_name": "Apex Vendor Ltd",
                "organization_type": "Vendor",
                "address": "Dhaka, Bangladesh",
                "website": "https://apexvendor.com",
                "description": "Leading IT hardware vendor",
                "verification_status": "Verified",
                "tin_number": "1234567890",
                "bin_number": "9876543210",
                "created_at": datetime(2026, 1, 15, tzinfo=timezone.utc),
                "is_enlisted": True
            }
        ]

        resp = await client.get("/api/org/search?q=apex&type=Vendor", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["organization_name"] == "Apex Vendor Ltd"
        assert data[0]["organization_type"] == "Vendor"
        assert data[0]["is_enlisted"] is True
        mock_search.assert_called_once_with(
            connection=mock_conn,
            query="apex",
            org_type="Vendor",
            current_org_id=10,
            limit=50
        )

    @pytest.mark.asyncio
    async def test_search_orgs_unauthenticated(self, client):
        resp = await client.get("/api/org/search?q=apex")
        assert resp.status_code == 401


class TestOrganizationEnlistment:
    """Tests for enlisting and delisting organizations."""

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.enlist_organization")
    async def test_enlist_org_success(self, mock_enlist, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "user_id": 1,
            "org_user_id": 2,
            "role_in_org": "Owner"
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_enlist.return_value = {
            "message": "Organization enlisted successfully.",
            "enlisted_org_id": 25
        }

        resp = await client.post("/api/org/enlist/25", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["enlisted_org_id"] == 25
        mock_enlist.assert_called_once_with(mock_conn, 10, 25, 2)

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.delist_organization")
    async def test_delist_org_success(self, mock_delist, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "user_id": 1,
            "org_user_id": 2,
            "role_in_org": "Owner"
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_delist.return_value = {
            "message": "Organization delisted successfully.",
            "delisted_org_id": 25
        }

        resp = await client.delete("/api/org/enlist/25", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["delisted_org_id"] == 25
        mock_delist.assert_called_once_with(mock_conn, 10, 25)

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.get_enlisted_organizations")
    async def test_list_enlisted_orgs(self, mock_get_enlisted, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "user_id": 1,
            "org_user_id": 2,
            "role_in_org": "Owner"
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_enlisted.return_value = [
            {
                "organization_id": 25,
                "organization_name": "Global Supplies Ltd",
                "organization_type": "Vendor",
                "address": "Dhaka",
                "website": "https://globalsupplies.com",
                "description": "Office goods supplier",
                "verification_status": "Verified",
                "enlisted_at": datetime(2026, 3, 1, tzinfo=timezone.utc)
            }
        ]

        resp = await client.get("/api/org/enlisted", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["organization_name"] == "Global Supplies Ltd"
        mock_get_enlisted.assert_called_once_with(mock_conn, 10)


class TestOrganizationProfile:
    """Tests for GET /api/org/profile/{org_id}."""

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.get_organization_profile")
    async def test_get_profile_success(self, mock_profile, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "user_id": 1,
            "org_user_id": 2,
            "role_in_org": "Owner"
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_profile.return_value = {
            "organization_id": 25,
            "organization_name": "Global Supplies Ltd",
            "organization_type": "Vendor",
            "address": "Banani, Dhaka",
            "website": "https://globalsupplies.com",
            "description": "Certified enterprise hardware vendor",
            "verification_status": "Verified",
            "tin_number": "123-456",
            "bin_number": "789-012",
            "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "member_count": 8,
            "is_enlisted": True,
            "documents": [
                {
                    "document_id": 1,
                    "document_type": "TradeLicense",
                    "file_path": "org/25/trade.pdf",
                    "file_url": "https://supabase.co/storage/v1/object/sign/org/25/trade.pdf?token=xyz",
                    "review_status": "Approved",
                    "uploaded_at": datetime(2026, 1, 2, tzinfo=timezone.utc)
                }
            ],
            "published_tenders": [],
            "performance": {
                "average_rating": 4.8,
                "total_reviews": 12,
                "recent_feedback": [
                    {
                        "rating": 5.0,
                        "feedback": "Prompt delivery and excellent hardware quality.",
                        "completion_status": "OnTime",
                        "recorded_at": datetime(2026, 3, 10, tzinfo=timezone.utc).isoformat()
                    }
                ]
            }
        }

        resp = await client.get("/api/org/profile/25", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["organization_name"] == "Global Supplies Ltd"
        assert data["member_count"] == 8
        assert data["is_enlisted"] is True
        assert len(data["documents"]) == 1
        assert data["documents"][0]["file_url"] is not None
        assert data["performance"]["average_rating"] == 4.8
        mock_profile.assert_called_once_with(mock_conn, 25, 10)

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.get_organization_profile")
    async def test_get_profile_not_found(self, mock_profile, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "user_id": 1,
            "org_user_id": 2,
            "role_in_org": "Owner"
        }
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_profile.return_value = None

        resp = await client.get("/api/org/profile/9999", headers=auth_headers)

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()
