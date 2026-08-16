# ============================================================
# tests/test_payments/test_payments_router.py - Payment & Token Tests
# ============================================================
# COVERS: FR-08 (Credit Points & Payments / Monetization)
# - GET /payments/balance
# - GET /payments/pricing
# - GET /payments/packages
# - POST /payments/purchase
# - GET /payments/transactions
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from decimal import Decimal

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@asynccontextmanager
async def _fake_tx():
    yield


@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
class TestPaymentsRouter:

    @patch("app.modules.payments.router.get_db_connection")
    async def test_get_balance_success(self, mock_db, client, auth_headers, mock_user_org):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.fetchrow.return_value = {
            "organization_id": 10,
            "organization_name": "Test Organization",
            "credit_balance": 350,
            "user_id": 1,
            "role_in_org": "Owner",
        }

        resp = await client.get("/payments/balance", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["organization_id"] == 10
        assert data["credit_balance"] == 350
        assert data["organization_name"] == "Test Organization"

    @patch("app.modules.payments.router.get_db_connection")
    async def test_get_balance_no_org_forbidden(self, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"user_id": 1, "organization_id": None}
        resp = await client.get("/payments/balance", headers=auth_headers)
        assert resp.status_code == 403

    @patch("app.modules.payments.router.get_db_connection")
    async def test_get_pricing_public(self, mock_db, client):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.50"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }

        resp = await client.get("/payments/pricing")
        assert resp.status_code == 200
        data = resp.json()
        assert data["price_per_token"] == 1.50
        assert data["tender_publish_cost"] == 50
        assert data["bid_cost"] == 20

    @patch("app.modules.payments.router.get_db_connection")
    async def test_get_active_packages_with_savings(self, mock_db, client):
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        # 1. Base pricing query
        mock_conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }

        # 2. Packages query
        mock_conn.fetch.return_value = [
            {
                "package_id": 1,
                "package_name": "Starter Pack",
                "token_amount": 100,
                "price_bdt": Decimal("100.00"),
                "badge": None,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "package_id": 2,
                "package_name": "Pro Business",
                "token_amount": 500,
                "price_bdt": Decimal("400.00"),
                "badge": "Save 20%",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
        ]

        resp = await client.get("/payments/packages")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["package_name"] == "Starter Pack"
        assert data[0]["savings_percentage"] == 0

        assert data[1]["package_name"] == "Pro Business"
        assert data[1]["token_amount"] == 500
        assert data[1]["price_bdt"] == 400.00
        assert data[1]["original_price_bdt"] == 500.00
        assert data[1]["savings_percentage"] == 20
        assert data[1]["savings_bdt"] == 100.00

    @patch("app.modules.payments.router.get_db_connection")
    async def test_purchase_tokens_custom_rate(self, mock_db, client, auth_headers, mock_user_org):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.transaction = MagicMock(side_effect=_fake_tx)
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        pricing_row = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }

        mock_conn.fetchrow.side_effect = [
            pricing_row,               # platform pricing
            None,                      # package match lookup (none)
            {"credit_balance": 1000},  # org update balance
            {"transaction_id": 101},   # payments insert
            {"transaction_id": 501},   # credit_transactions insert
        ]

        payload = {
            "tokens": 750,
            "payment_method": "SSLCommerz",
            "card_type": "bKash",
        }

        resp = await client.post("/payments/purchase", headers=auth_headers, json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["tokens_added"] == 750
        assert data["new_balance"] == 1000
        assert data["amount_paid_bdt"] == 750.00
        assert data["payment_reference"].startswith("SSL-")

    @patch("app.modules.payments.router.get_db_connection")
    async def test_purchase_tokens_package_discounted_rate(self, mock_db, client, auth_headers, mock_user_org):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.transaction = MagicMock(side_effect=_fake_tx)
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        pricing_row = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }
        pkg_row = {
            "price_bdt": Decimal("400.00"),
            "package_name": "Pro Business",
        }

        mock_conn.fetchrow.side_effect = [
            pricing_row,              # platform pricing
            pkg_row,                  # package match lookup (500 tokens for 400 Tk)
            {"credit_balance": 750},  # org update balance
            {"transaction_id": 102},  # payments insert
            {"transaction_id": 502},  # credit_transactions insert
        ]

        payload = {
            "tokens": 500,
            "payment_method": "SSLCommerz",
            "card_type": "VISA",
        }

        resp = await client.post("/payments/purchase", headers=auth_headers, json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["tokens_added"] == 500
        assert data["amount_paid_bdt"] == 400.00
        assert data["new_balance"] == 750

    @patch("app.modules.payments.router.get_db_connection")
    async def test_purchase_tokens_invalid_amount(self, mock_db, client, auth_headers, mock_user_org):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        payload = {"tokens": 0, "payment_method": "SSLCommerz"}
        resp = await client.post("/payments/purchase", headers=auth_headers, json=payload)
        assert resp.status_code == 422  # Pydantic validation error (tokens > 0)

    @patch("app.modules.payments.router.get_db_connection")
    async def test_list_transactions_history(self, mock_db, client, auth_headers, mock_user_org):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_conn.fetchval.side_effect = [
            2,   # total_count
            500, # current_balance
        ]

        now = datetime.now(timezone.utc)
        mock_conn.fetch.return_value = [
            {
                "transaction_id": 1,
                "organization_id": 10,
                "user_id": 1,
                "user_name": "Test User",
                "amount": Decimal("250"),
                "transaction_type": "Purchase",
                "payment_reference": "SSL-ABC12345",
                "balance_after": Decimal("500"),
                "description": "Purchased 250 tokens",
                "payment_method": "SSLCommerz (bKash)",
                "created_at": now,
            },
            {
                "transaction_id": 2,
                "organization_id": 10,
                "user_id": 1,
                "user_name": "Test User",
                "amount": Decimal("-50"),
                "transaction_type": "Deduct",
                "payment_reference": "TND-10",
                "balance_after": Decimal("250"),
                "description": "Tender Publishing Fee",
                "payment_method": "Platform Fee",
                "created_at": now,
            },
        ]

        resp = await client.get("/payments/transactions?limit=10&offset=0", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 2
        assert data["current_balance"] == 500
        assert len(data["transactions"]) == 2
        assert data["transactions"][0]["transaction_type"] == "Purchase"
        assert data["transactions"][0]["amount"] == 250.0
        assert data["transactions"][1]["transaction_type"] == "Deduct"
        assert data["transactions"][1]["amount"] == -50.0
