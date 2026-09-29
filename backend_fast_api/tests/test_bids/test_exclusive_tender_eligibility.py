# ============================================================
# tests/test_bids/test_exclusive_tender_eligibility.py
# ============================================================
# Regression tests for the enlisted-vendor enforcement added to
# submit_bid_with_documents: an "Exclusive" tender (visibility_type=
# 'Exclusive') must reject bids from vendor orgs the buyer hasn't
# enlisted, since the visibility filter alone only keeps such tenders
# out of browse/search results — it doesn't stop a direct bid submission
# by a vendor who already has the tender_id.
# ============================================================

import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.modules.bids.service import submit_bid_with_documents


class TestExclusiveTenderEligibility:
    @pytest.mark.asyncio
    async def test_non_enlisted_vendor_rejected_on_exclusive_tender(self):
        conn = AsyncMock()
        conn.fetchrow.return_value = {
            "title": "Confidential Supply Contract",
            "buyer_id": 100,
            "visibility_type": "Exclusive",
        }
        conn.fetchval.return_value = None  # not present in enlisted_vendors

        with pytest.raises(HTTPException) as exc:
            await submit_bid_with_documents(
                connection=conn,
                vendor_org_id=200,
                submitted_by=1,
                user_id=1,
                tender_id=5,
                financial_amount=1000.0,
                files_data=[],
            )
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_enlisted_vendor_passes_eligibility_check(self):
        """
        An enlisted vendor must clear the eligibility check (i.e. not get a
        403) — the function should proceed past it into the actual bid
        insert, which is exercised at the router level elsewhere.
        """
        conn = AsyncMock()
        conn.fetchrow.return_value = {
            "title": "Confidential Supply Contract",
            "buyer_id": 100,
            "visibility_type": "Exclusive",
        }
        conn.fetchval.return_value = 1  # present in enlisted_vendors

        try:
            await submit_bid_with_documents(
                connection=conn,
                vendor_org_id=200,
                submitted_by=1,
                user_id=1,
                tender_id=5,
                financial_amount=1000.0,
                files_data=[],
            )
        except HTTPException as exc:
            assert exc.status_code != 403, "an enlisted vendor must not be rejected as ineligible"
        except Exception:
            # Downstream mocking (transaction/token deduction/etc.) isn't the
            # point of this test — only that eligibility itself didn't block it.
            pass

    @pytest.mark.asyncio
    async def test_public_tender_skips_enlistment_check_entirely(self):
        """A Public tender must not even query enlisted_vendors."""
        conn = AsyncMock()
        conn.fetchrow.return_value = {
            "title": "Open Supply Contract",
            "buyer_id": 100,
            "visibility_type": "Public",
        }

        try:
            await submit_bid_with_documents(
                connection=conn,
                vendor_org_id=200,
                submitted_by=1,
                user_id=1,
                tender_id=5,
                financial_amount=1000.0,
                files_data=[],
            )
        except Exception:
            pass

        conn.fetchval.assert_not_called()

    @pytest.mark.asyncio
    async def test_nonexistent_tender_returns_404(self):
        conn = AsyncMock()
        conn.fetchrow.return_value = None

        with pytest.raises(HTTPException) as exc:
            await submit_bid_with_documents(
                connection=conn,
                vendor_org_id=200,
                submitted_by=1,
                user_id=1,
                tender_id=999999,
                financial_amount=1000.0,
                files_data=[],
            )
        assert exc.value.status_code == 404
