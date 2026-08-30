# ============================================================
# tests/test_payments/test_token_deductions_and_grants.py
# Unit Tests for Token Deductions & Welcome Grants
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from fastapi import HTTPException
from datetime import datetime, timezone
from decimal import Decimal

from app.modules.payments.service import (
    deduct_tokens_for_tender_publish,
    deduct_tokens_for_bid_submission,
)


@asynccontextmanager
async def _fake_tx():
    yield


@pytest.mark.asyncio
class TestTokenDeductionsAndGrants:

    async def test_tender_publish_deduction_success(self):
        conn = AsyncMock()
        conn.transaction = MagicMock(side_effect=_fake_tx)

        # Mock platform pricing query
        conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }
        # Mock organization current balance query
        conn.fetchval.return_value = 250

        new_bal = await deduct_tokens_for_tender_publish(
            connection=conn,
            organization_id=10,
            user_id=1,
            tender_id=100,
            tender_title="IT Equipment Supply",
        )

        assert new_bal == 200  # 250 - 50 = 200
        conn.execute.assert_any_call(
            "UPDATE organizations SET credit_balance = $1 WHERE organization_id = $2",
            200,
            10,
        )

    async def test_tender_publish_insufficient_tokens_raises_400(self):
        conn = AsyncMock()
        conn.transaction = MagicMock(side_effect=_fake_tx)

        # Pricing requires 50 tokens
        conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }
        # Organization only has 30 tokens
        conn.fetchval.return_value = 30

        with pytest.raises(HTTPException) as exc_info:
            await deduct_tokens_for_tender_publish(
                connection=conn,
                organization_id=10,
                user_id=1,
                tender_id=100,
                tender_title="IT Equipment Supply",
            )

        assert exc_info.value.status_code == 400
        assert "Insufficient tokens" in exc_info.value.detail
        assert "requires 50 tokens" in exc_info.value.detail

    async def test_bid_submission_deduction_success(self):
        conn = AsyncMock()
        conn.transaction = MagicMock(side_effect=_fake_tx)

        # Pricing requires 20 tokens for bid
        conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }
        # Org has 100 tokens
        conn.fetchval.return_value = 100

        new_bal = await deduct_tokens_for_bid_submission(
            connection=conn,
            organization_id=15,
            user_id=2,
            bid_id=55,
            tender_id=100,
            tender_title="IT Equipment Supply",
        )

        assert new_bal == 80  # 100 - 20 = 80
        conn.execute.assert_any_call(
            "UPDATE organizations SET credit_balance = $1 WHERE organization_id = $2",
            80,
            15,
        )

    async def test_bid_submission_insufficient_tokens_raises_400(self):
        conn = AsyncMock()
        conn.transaction = MagicMock(side_effect=_fake_tx)

        conn.fetchrow.return_value = {
            "pricing_id": 1,
            "price_per_token": Decimal("1.00"),
            "tender_publish_cost": 50,
            "bid_cost": 20,
            "updated_at": datetime.now(timezone.utc),
        }
        # Org only has 10 tokens
        conn.fetchval.return_value = 10

        with pytest.raises(HTTPException) as exc_info:
            await deduct_tokens_for_bid_submission(
                connection=conn,
                organization_id=15,
                user_id=2,
                bid_id=55,
                tender_id=100,
                tender_title="IT Equipment Supply",
            )

        assert exc_info.value.status_code == 400
        assert "Insufficient tokens" in exc_info.value.detail
        assert "requires 20 tokens" in exc_info.value.detail
