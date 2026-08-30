# ============================================================
# tests/test_payments/test_token_packages_admin.py - Admin Pricing & Package Tests
# ============================================================
# COVERS:
# - GET /api/auth/admin/pricing
# - POST /api/auth/admin/pricing
# - GET /api/auth/admin/packages
# - POST /api/auth/admin/packages
# - PUT /api/auth/admin/packages/{package_id}
# - DELETE /api/auth/admin/packages/{package_id}
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from decimal import Decimal

from app.main import app
from app.modules.auth.dependencies import get_current_admin


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_admin_user():
    return {
        "user_id": 99,
        "email": "admin@procurenext.com",
        "full_name": "Platform Admin",
        "admin_id": 1,
        "admin_role": "SuperAdmin",
    }


@pytest.mark.asyncio
class TestAdminTokenAndPackages:

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_get_pricing(self, mock_db, client, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.25"),
            "tender_publish_cost": 60,
            "bid_cost": 25,
            "updated_at": datetime.now(timezone.utc),
        }

        resp = await client.get("/api/auth/admin/pricing")
        assert resp.status_code == 200
        data = resp.json()
        assert data["price_per_token"] == 1.25
        assert data["tender_publish_cost"] == 60
        assert data["bid_cost"] == 25

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_update_pricing(self, mock_db, client, auth_headers, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("2.00"),
            "tender_publish_cost": 80,
            "bid_cost": 30,
            "updated_at": datetime.now(timezone.utc),
        }

        payload = {
            "price_per_token": 2.00,
            "tender_publish_cost": 80,
            "bid_cost": 30,
        }

        resp = await client.post("/api/auth/admin/pricing", headers=auth_headers, json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["price_per_token"] == 2.00
        assert data["tender_publish_cost"] == 80
        assert data["bid_cost"] == 30

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_list_packages(self, mock_db, client, auth_headers, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        # 1. Pricing query
        mock_conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }

        # 2. Packages list query
        mock_conn.fetch.return_value = [
            {
                "package_id": 1,
                "package_name": "Starter",
                "token_amount": 100,
                "price_bdt": Decimal("100.00"),
                "badge": None,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "package_id": 2,
                "package_name": "Summer Deal",
                "token_amount": 500,
                "price_bdt": Decimal("400.00"),
                "badge": "Save 20%",
                "is_active": False,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
        ]

        resp = await client.get("/api/auth/admin/packages", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["package_name"] == "Starter"
        assert data[1]["package_name"] == "Summer Deal"
        assert data[1]["is_active"] is False
        assert data[1]["savings_percentage"] == 20

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_create_package(self, mock_db, client, auth_headers, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.fetchrow.side_effect = [
            {
                "pricing_id": 1,
                "price_per_token": Decimal("1.00"),
                "tender_publish_cost": 50,
                "bid_cost": 20,
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "package_id": 10,
                "package_name": "Growth Pro",
                "token_amount": 1000,
                "price_bdt": Decimal("750.00"),
                "badge": "Best Value",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
        ]

        payload = {
            "package_name": "Growth Pro",
            "token_amount": 1000,
            "price_bdt": 750.00,
            "badge": "Best Value",
            "is_active": True,
        }

        resp = await client.post("/api/auth/admin/packages", headers=auth_headers, json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["package_id"] == 10
        assert data["package_name"] == "Growth Pro"
        assert data["token_amount"] == 1000
        assert data["price_bdt"] == 750.00
        assert data["savings_percentage"] == 25
        assert data["savings_bdt"] == 250.00

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_update_package(self, mock_db, client, auth_headers, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        existing_pkg = {
            "package_id": 5,
            "package_name": "Old Package",
            "token_amount": 250,
            "price_bdt": Decimal("250.00"),
            "badge": None,
            "is_active": True,
        }

        updated_pkg = {
            "package_id": 5,
            "package_name": "Updated Package",
            "token_amount": 300,
            "price_bdt": Decimal("240.00"),
            "badge": "Hot",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        mock_conn.fetchrow.side_effect = [
            {
                "pricing_id": 1,
                "price_per_token": Decimal("1.00"),
                "tender_publish_cost": 50,
                "bid_cost": 20,
                "updated_at": datetime.now(timezone.utc),
            },
            existing_pkg,
            updated_pkg,
        ]

        payload = {
            "package_name": "Updated Package",
            "token_amount": 300,
            "price_bdt": 240.00,
            "badge": "Hot",
        }

        resp = await client.put("/api/auth/admin/packages/5", headers=auth_headers, json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["package_name"] == "Updated Package"
        assert data["token_amount"] == 300
        assert data["price_bdt"] == 240.00
        assert data["savings_percentage"] == 20
        assert data["savings_bdt"] == 60.00

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_delete_package(self, mock_db, client, auth_headers, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.execute.return_value = "DELETE 1"

        resp = await client.delete("/api/auth/admin/packages/5", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    @patch("app.modules.admin.router.get_db_connection")
    async def test_admin_delete_package_not_found(self, mock_db, client, auth_headers, mock_admin_user):
        app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.execute.return_value = "DELETE 0"

        resp = await client.delete("/api/auth/admin/packages/999", headers=auth_headers)
        assert resp.status_code == 404
