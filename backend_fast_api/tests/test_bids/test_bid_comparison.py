# ============================================================
# tests/test_bids/test_bid_comparison.py
# Tests for Buyer Bid Comparison Service and API Endpoints
# ============================================================

import pytest
from datetime import datetime, timezone, date
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.bids.service import get_tender_bid_comparison


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestBidComparisonService:
    @pytest.mark.asyncio
    async def test_get_tender_bid_comparison_service_full(self):
        mock_conn = AsyncMock()

        # 1. Tender row
        mock_conn.fetchrow.return_value = {
            "tender_id": 1,
            "title": "Hospital Equipment Tender",
            "status": "Published",
            "budget_min": 50000.0,
            "budget_max": 100000.0,
            "buyer_id": 1,
            "package_type": "SingleItem",
        }

        # 2. Required docs & lot rows
        mock_conn.fetch.side_effect = [
            # tender_items (lots)
            [],
            # tender_required_documents
            [
                {"req_doc_id": 101, "custom_doc_name": "TIN Certificate", "is_mandatory": True, "allowed_roles": ["Owner"]},
                {"req_doc_id": 102, "custom_doc_name": "Trade License", "is_mandatory": True, "allowed_roles": ["Owner"]},
            ],
            # bids_query
            [
                {
                    "bid_id": 11,
                    "vendor_org_id": 201,
                    "submitted_by": 5,
                    "tender_id": 1,
                    "financial_amount": 60000.0,
                    "description": "Premium medical equipment",
                    "status": "Submitted",
                    "submitted_at": datetime(2026, 4, 1, 10, 0, tzinfo=timezone.utc),
                    "updated_at": datetime(2026, 4, 1, 10, 0, tzinfo=timezone.utc),
                    "vendor_name": "MedTech Corp",
                    "vendor_address": "Dhaka, Bangladesh",
                    "vendor_website": "https://medtech.example.com",
                    "vendor_verification_status": "Verified",
                    "vendor_rating": 4.8,
                    "total_ratings_count": 15,
                    "completed_contracts_count": 8,
                    "is_enlisted": True,
                },
                {
                    "bid_id": 12,
                    "vendor_org_id": 202,
                    "submitted_by": 6,
                    "tender_id": 1,
                    "financial_amount": 80000.0,
                    "description": "Standard medical equipment",
                    "status": "Submitted",
                    "submitted_at": datetime(2026, 4, 2, 11, 0, tzinfo=timezone.utc),
                    "updated_at": datetime(2026, 4, 2, 11, 0, tzinfo=timezone.utc),
                    "vendor_name": "BioSupply Ltd",
                    "vendor_address": "Chittagong, Bangladesh",
                    "vendor_website": "https://biosupply.example.com",
                    "vendor_verification_status": "Verified",
                    "vendor_rating": 3.5,
                    "total_ratings_count": 4,
                    "completed_contracts_count": 2,
                    "is_enlisted": False,
                },
            ],
            # bid_documents
            [
                {"bid_id": 11, "bid_doc_id": 501, "req_doc_id": 101, "file_path": "bids/11/tin.pdf", "document_type": "TIN Certificate"},
                {"bid_id": 11, "bid_doc_id": 502, "req_doc_id": 102, "file_path": "bids/11/license.pdf", "document_type": "Trade License"},
                {"bid_id": 12, "bid_doc_id": 503, "req_doc_id": 101, "file_path": "bids/12/tin.pdf", "document_type": "TIN Certificate"},
            ],
            # bid_securities
            [
                {"security_id": 1, "bid_id": 11, "security_amount": 3000.0, "security_type": "BankGuarantee", "bid_security_doc_path": "sec/1.pdf", "valid_until": date(2026, 12, 31)},
            ],
            # bid_items (lot pricing)
            []
        ]

        result = await get_tender_bid_comparison(mock_conn, tender_id=1, buyer_org_id=1)

        assert result["tender_id"] == 1
        assert result["tender_title"] == "Hospital Equipment Tender"
        assert len(result["bids"]) == 2

        # Summary check
        summary = result["summary"]
        assert summary["total_bids"] == 2
        assert summary["min_amount"] == 60000.0
        assert summary["max_amount"] == 80000.0
        assert summary["avg_amount"] == 70000.0
        assert summary["lowest_bid_id"] == 11
        assert summary["fully_compliant_bids_count"] == 1

        # Bid 1 check (MedTech)
        bid1 = result["bids"][0]
        assert bid1["bid_id"] == 11
        assert bid1["is_lowest_bid"] is True
        assert bid1["compliance_score_pct"] == 100.0
        assert bid1["mandatory_docs_satisfied"] is True
        assert bid1["is_enlisted"] is True
        assert bid1["vendor_rating"] == 4.8
        assert bid1["completed_contracts_count"] == 8
        assert len(bid1["securities"]) == 1
        assert bid1["budget_variance_pct"] == -40.0  # (60k - 100k) / 100k = -40%

        # Bid 2 check (BioSupply)
        bid2 = result["bids"][1]
        assert bid2["bid_id"] == 12
        assert bid2["is_lowest_bid"] is False
        assert bid2["compliance_score_pct"] == 50.0  # only 1 of 2 docs
        assert bid2["mandatory_docs_satisfied"] is False
        assert bid2["is_enlisted"] is False
        assert bid2["budget_variance_pct"] == -20.0  # (80k - 100k) / 100k = -20%


class TestBidComparisonEndpoint:
    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_tender_bid_comparison")
    async def test_compare_endpoint_success(self, mock_get_comp, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_comp.return_value = {
            "tender_id": 1,
            "tender_title": "Test Tender",
            "tender_status": "Published",
            "budget_min": 1000.0,
            "budget_max": 5000.0,
            "required_documents": [],
            "summary": {
                "total_bids": 1,
                "min_amount": 2500.0,
                "max_amount": 2500.0,
                "avg_amount": 2500.0,
                "budget_min": 1000.0,
                "budget_max": 5000.0,
                "lowest_bid_id": 10,
                "fully_compliant_bids_count": 1
            },
            "bids": [
                {
                    "bid_id": 10,
                    "vendor_org_id": 2,
                    "submitted_by": 5,
                    "tender_id": 1,
                    "financial_amount": 2500.0,
                    "description": "Good proposal",
                    "status": "Submitted",
                    "submitted_at": datetime(2026, 3, 1, tzinfo=timezone.utc),
                    "updated_at": datetime(2026, 3, 1, tzinfo=timezone.utc),
                    "vendor_name": "Vendor A",
                    "vendor_address": "Dhaka",
                    "vendor_website": "https://a.com",
                    "vendor_verification_status": "Verified",
                    "vendor_rating": 4.5,
                    "total_ratings_count": 10,
                    "completed_contracts_count": 5,
                    "is_enlisted": True,
                    "budget_variance_pct": -50.0,
                    "avg_variance_pct": 0.0,
                    "is_lowest_bid": True,
                    "compliance_score_pct": 100.0,
                    "mandatory_docs_satisfied": True,
                    "documents": [],
                    "compliance_matrix": [],
                    "securities": []
                }
            ]
        }

        resp = await client.get("/bids/buyer/tender/1/compare", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tender_id"] == 1
        assert data["summary"]["total_bids"] == 1
        assert len(data["bids"]) == 1
        assert data["bids"][0]["vendor_name"] == "Vendor A"
        assert data["bids"][0]["is_lowest_bid"] is True

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_tender_bid_comparison")
    async def test_compare_endpoint_tender_not_found(self, mock_get_comp, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_comp.side_effect = KeyError("Tender not found")

        resp = await client.get("/bids/buyer/tender/999/compare", headers=auth_headers)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.get_tender_bid_comparison")
    async def test_compare_endpoint_unauthorized_buyer(self, mock_get_comp, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 99, "org_user_id": 10}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_comp.side_effect = PermissionError("You do not have permission")

        resp = await client.get("/bids/buyer/tender/1/compare", headers=auth_headers)
        assert resp.status_code == 403
        assert "permission" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_compare_endpoint_no_org(self, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"org_user_id": 10}
        resp = await client.get("/bids/buyer/tender/1/compare", headers=auth_headers)
        assert resp.status_code == 403
