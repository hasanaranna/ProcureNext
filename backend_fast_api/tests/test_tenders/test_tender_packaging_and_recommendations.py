# ============================================================
# tests/test_tenders/test_tender_packaging_and_recommendations.py
# Tests for FR-08 (Packaged Tenders, Lots, Bid-Bond, Scheduling)
# and FR-09 (Vendor Matching & AI Recommendations)
# ============================================================

import json
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestTenderCreationEdgeCases:
    """Edge case tests for tender packaging (FR-08), lots, bid-bond, and scheduled publishing."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_create_single_item_tender_success(self, mock_publish, mock_db, client, auth_headers, mock_user_org):
        """Single-item tender with exactly 1 lot item creates successfully."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_publish.return_value = {
            "tender_id": 10,
            "buyer_id": 10,
            "created_by": 1,
            "title": "Single Item Tender",
            "description": "Procurement of office laptops",
            "package_type": "SingleItem",
            "status": "Published",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        tender_data = {
            "title": "Single Item Tender",
            "description": "Procurement of office laptops",
            "package_type": "SingleItem",
            "items": [
                {
                    "lot_number": "LOT-1",
                    "item_name": "Laptops",
                    "specifications": "Core i7, 16GB RAM",
                    "quantity": 25,
                    "unit_of_measure": "Units",
                    "estimated_unit_price": 80000.0
                }
            ]
        }

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            data={
                "tender_data": json.dumps(tender_data),
                "file_names": json.dumps(["specs.pdf"])
            },
            files=[("files", ("specs.pdf", b"pdf content", "application/pdf"))],
            headers=auth_headers
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["package_type"] == "SingleItem"
        assert data["tender_id"] == 10

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_single_item_tender_multiple_items_edge_case(self, mock_publish, mock_db, client, auth_headers, mock_user_org):
        """SingleItem tender with more than 1 item raises 400 Bad Request."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_publish.side_effect = ValueError("SingleItem tender must contain exactly one item/lot.")

        tender_data = {
            "title": "Invalid Single Item",
            "description": "Two lots for single item",
            "package_type": "SingleItem",
            "items": [
                {"lot_number": "LOT-1", "item_name": "Cement", "quantity": 100, "unit_of_measure": "Bags"},
                {"lot_number": "LOT-2", "item_name": "Steel Rod", "quantity": 50, "unit_of_measure": "Tons"}
            ]
        }

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            data={
                "tender_data": json.dumps(tender_data),
                "file_names": json.dumps(["doc.pdf"])
            },
            files=[("files", ("doc.pdf", b"pdf content", "application/pdf"))],
            headers=auth_headers
        )

        assert resp.status_code == 400
        assert "SingleItem tender must contain exactly one item/lot" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_packaged_lots_tender_fewer_than_two_lots_edge_case(self, mock_publish, mock_db, client, auth_headers, mock_user_org):
        """PackagedLots tender with only 1 item raises 400 Bad Request."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_publish.side_effect = ValueError("PackagedLots tender must contain at least two items/lots.")

        tender_data = {
            "title": "Invalid Packaged Tender",
            "description": "Only one lot",
            "package_type": "PackagedLots",
            "items": [
                {"lot_number": "LOT-1", "item_name": "Only Item", "quantity": 10, "unit_of_measure": "Units"}
            ]
        }

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            data={
                "tender_data": json.dumps(tender_data),
                "file_names": json.dumps(["doc.pdf"])
            },
            files=[("files", ("doc.pdf", b"pdf content", "application/pdf"))],
            headers=auth_headers
        )

        assert resp.status_code == 400
        assert "PackagedLots tender must contain at least two items/lots" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_scheduled_publish_tender_edge_case(self, mock_publish, mock_db, client, auth_headers, mock_user_org):
        """Tender scheduled for the future is marked Draft and defers token deductions."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        mock_publish.return_value = {
            "tender_id": 25,
            "buyer_id": 10,
            "created_by": 1,
            "title": "Scheduled Release",
            "description": "Held in draft until publish date",
            "status": "Draft",
            "scheduled_publish_at": future_date,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        tender_data = {
            "title": "Scheduled Release",
            "description": "Held in draft until publish date",
            "scheduled_publish_at": future_date
        }

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            data={
                "tender_data": json.dumps(tender_data),
                "file_names": json.dumps(["doc.pdf"])
            },
            files=[("files", ("doc.pdf", b"pdf content", "application/pdf"))],
            headers=auth_headers
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "Draft"
        assert data["scheduled_publish_at"] is not None

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_tender_bid_bond_and_visibility_edge_case(self, mock_publish, mock_db, client, auth_headers, mock_user_org):
        """Tender specifying bid-bond amount sets financial security requirements and exclusive visibility."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_publish.return_value = {
            "tender_id": 30,
            "buyer_id": 10,
            "created_by": 1,
            "title": "Secure Infrastructure Tender",
            "description": "Tender with bond requirement",
            "status": "Published",
            "bid_bond_amount": 50000.0,
            "visibility_type": "Restricted",
            "security_required": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        tender_data = {
            "title": "Secure Infrastructure Tender",
            "description": "Tender with bond requirement",
            "bid_bond_amount": 50000.0,
            "visibility_type": "Restricted",
            "security_required": True
        }

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            data={
                "tender_data": json.dumps(tender_data),
                "file_names": json.dumps(["security.pdf"])
            },
            files=[("files", ("security.pdf", b"pdf content", "application/pdf"))],
            headers=auth_headers
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["bid_bond_amount"] == 50000.0
        assert data["visibility_type"] == "Restricted"


class TestVendorMatchingAndRecommendations:
    """Tests for FR-09: Explainable matching scores and AI recommendations."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_vendor_recommendations_for_tender")
    async def test_tender_recommendations_buyer_success(self, mock_recs, mock_db, client, auth_headers, mock_user_org):
        """Buyer retrieves top-matching vendor recommendations with explainable rationale."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_recs.return_value = {
            "tender_id": 17,
            "tender_title": "Construction Packaged Tender",
            "total_recommendations": 2,
            "recommendations": [
                {
                    "vendor_id": 105,
                    "vendor_name": "Apex Builders Ltd",
                    "match_score": 96.5,
                    "avg_seller_rating": 4.8,
                    "total_reviews_count": 14,
                    "is_enlisted": True,
                    "category_match": True,
                    "certifications": ["ISO 9001", "Govt Certified Class-A"],
                    "reasons": ["High trust score with verified historical fulfillment", "Enlisted Vendor"]
                },
                {
                    "vendor_id": 108,
                    "vendor_name": "Metro Steel Works",
                    "match_score": 88.0,
                    "avg_seller_rating": 4.5,
                    "total_reviews_count": 8,
                    "is_enlisted": False,
                    "category_match": True,
                    "certifications": [],
                    "reasons": ["Strong performance rating (4.5★) across 8 past contracts"]
                }
            ]
        }

        resp = await client.get("/tenders/17/recommendations", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tender_id"] == 17
        assert data["total_recommendations"] == 2
        assert len(data["recommendations"]) == 2

        top = data["recommendations"][0]
        assert top["vendor_name"] == "Apex Builders Ltd"
        assert top["match_score"] == 96.5
        assert top["is_enlisted"] is True
        assert "Enlisted Vendor" in top["reasons"]

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_vendor_recommendations_for_tender")
    async def test_recommendations_non_buyer_forbidden_edge_case(self, mock_recs, mock_db, client, auth_headers, mock_user_org):
        """Vendor or non-owner organization cannot access buyer recommendation engine."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_recs.side_effect = PermissionError("Only the tender buyer organization can view recommendations.")

        resp = await client.get("/tenders/17/recommendations", headers=auth_headers)
        assert resp.status_code == 403
        assert "Only the tender buyer" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.get_vendor_recommendations_for_tender")
    async def test_recommendations_tender_not_found_edge_case(self, mock_recs, mock_db, client, auth_headers, mock_user_org):
        """Returns 404 when querying recommendations for nonexistent tender."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_recs.side_effect = KeyError("Tender not found.")

        resp = await client.get("/tenders/9999/recommendations", headers=auth_headers)
        assert resp.status_code == 404
        assert "Tender not found" in resp.json()["detail"]
