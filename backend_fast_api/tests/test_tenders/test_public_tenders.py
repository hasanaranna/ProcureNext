# ============================================================
# tests/test_tenders/test_public_tenders.py
# Tests for Public Active Tenders browsing and detailed public notices
# ============================================================

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager
from httpx import AsyncClient, ASGITransport
from app.main import app


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.mark.asyncio
async def test_public_active_tenders_browsing():
    mock_conn = AsyncMock()
    now = datetime.now(timezone.utc)
    mock_conn.fetch.return_value = [
        {
            "tender_id": 101,
            "title": "Supply of High-Voltage Transformers",
            "description": "Procurement of 33/11kV 20MVA Power Transformers for sub-station upgrades.",
            "status": "Published",
            "visibility_type": "Public",
            "buyer_org_name": "National Power Grid Co.",
            "buyer_org_type": "Public Sector Buyer",
            "buyer_verified": True,
            "category_name": "Power & Energy",
            "procurement_nature": "Goods",
            "procurement_method": "Open Tendering Method (OTM)",
            "budget_min": 15000000.0,
            "budget_max": 20000000.0,
            "security_required": True,
            "submission_deadline": now + timedelta(days=14),
            "tender_public_date": now - timedelta(days=2),
            "created_at": now - timedelta(days=2),
        }
    ]

    with patch("app.modules.tenders.router.get_db_connection", return_value=_mock_db_ctx(mock_conn)()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/tenders/public/active")
            assert res.status_code == 200
            data = res.json()
            assert len(data) == 1
            assert data[0]["tender_id"] == 101
            assert data[0]["buyer_org_name"] == "National Power Grid Co."
            assert data[0]["procurement_nature"] == "Goods"


@pytest.mark.asyncio
async def test_public_tender_detail_notice():
    mock_conn = AsyncMock()
    now = datetime.now(timezone.utc)
    mock_conn.fetchrow.return_value = {
        "tender_id": 101,
        "title": "Supply of High-Voltage Transformers",
        "description": "Detailed Scope: Supply, installation, testing and commissioning of 33/11kV transformers.",
        "status": "Published",
        "visibility_type": "Public",
        "buyer_org_name": "National Power Grid Co.",
        "buyer_org_type": "Public Sector Buyer",
        "buyer_verified": True,
        "buyer_org_website": "https://powergrid.gov.bd",
        "category_name": "Power & Energy",
        "procurement_nature": "Goods",
        "procurement_method": "Open Tendering Method (OTM)",
        "budget_min": 15000000.0,
        "budget_max": 20000000.0,
        "security_required": True,
        "security_valid_until": (now + timedelta(days=90)),
        "proposal_valid_until": (now + timedelta(days=60)),
        "tender_public_date": now - timedelta(days=2),
        "pre_bid_meeting": now + timedelta(days=5),
        "tender_opening_date": now + timedelta(days=14, hours=2),
        "submission_deadline": now + timedelta(days=14),
        "created_at": now - timedelta(days=2),
    }

    mock_conn.fetch.return_value = [
        {"req_doc_id": 1, "custom_doc_name": "Trade License 2026", "is_mandatory": True},
        {"req_doc_id": 2, "custom_doc_name": "ISO 9001 Quality Certificate", "is_mandatory": True},
        {"req_doc_id": 3, "custom_doc_name": "Past 5-Year Experience Portfolio", "is_mandatory": False},
    ]

    with patch("app.modules.tenders.router.get_db_connection", return_value=_mock_db_ctx(mock_conn)()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/tenders/public/101")
            assert res.status_code == 200
            data = res.json()
            assert data["tender_id"] == 101
            assert data["title"] == "Supply of High-Voltage Transformers"
            assert data["procurement_method"] == "Open Tendering Method (OTM)"
            assert len(data["required_documents"]) == 3
            assert data["required_documents"][0]["custom_doc_name"] == "Trade License 2026"


@pytest.mark.asyncio
async def test_public_tender_not_found():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = None

    with patch("app.modules.tenders.router.get_db_connection", return_value=_mock_db_ctx(mock_conn)()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/tenders/public/99999")
            assert res.status_code == 404
