# ============================================================
# tests/test_contracts/test_contracts_router.py
# Tests for Contract Lifecycle, Completion, and Mutual Reviews API
# ============================================================

import pytest
from datetime import datetime, timezone
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


class TestContractCompletion:
    """Tests for marking contracts as completed."""

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.complete_contract")
    async def test_complete_contract_success(self, mock_complete, mock_db, client, auth_headers, mock_user_org):
        """Buyer successfully completes an active contract."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_complete.return_value = {
            "contract_id": 1,
            "status": "Completed",
            "message": "Contract has been successfully marked as completed."
        }

        resp = await client.post("/contracts/1/complete", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["contract_id"] == 1
        assert data["status"] == "Completed"

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.complete_contract")
    async def test_complete_contract_not_found_edge_case(self, mock_complete, mock_db, client, auth_headers, mock_user_org):
        """Returns 404 when completing a nonexistent contract."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_complete.side_effect = KeyError("Contract not found.")

        resp = await client.post("/contracts/999/complete", headers=auth_headers)
        assert resp.status_code == 404
        assert "Contract not found" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.complete_contract")
    async def test_complete_contract_unauthorized_party_edge_case(self, mock_complete, mock_db, client, auth_headers, mock_user_org):
        """Returns 403 when caller is not a party to the contract."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_complete.side_effect = PermissionError("Your organization is not a party to this contract.")

        resp = await client.post("/contracts/1/complete", headers=auth_headers)
        assert resp.status_code == 403
        assert "not a party" in resp.json()["detail"]


class TestContractMutualReviews:
    """Tests for mutual reviews (1-5 stars) and anti-tamper rating rules."""

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.submit_mutual_review")
    async def test_submit_mutual_review_success(self, mock_submit, mock_db, client, auth_headers, mock_user_org):
        """Successfully submits a mutual 1-5 star review for a completed contract."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_submit.return_value = {
            "review_id": 101,
            "contract_id": 1,
            "tender_id": 5,
            "reviewer_org_id": 10,
            "reviewee_org_id": 20,
            "reviewer_user_id": 1,
            "party_role": "BuyerToSeller",
            "overall_rating": 5,
            "quality_score": 5,
            "timeliness_score": 4,
            "communication_score": 5,
            "review_text": "Excellent delivery on schedule with top grade material.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        payload = {
            "overall_rating": 5,
            "quality_score": 5,
            "timeliness_score": 4,
            "communication_score": 5,
            "review_text": "Excellent delivery on schedule with top grade material."
        }

        resp = await client.post("/contracts/1/reviews", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["review_id"] == 101
        assert data["overall_rating"] == 5
        assert data["party_role"] == "BuyerToSeller"

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.submit_mutual_review")
    async def test_prevent_duplicate_ratings_edge_case(self, mock_submit, mock_db, client, auth_headers, mock_user_org):
        """Rejects second review attempt by the same organization (409 Conflict)."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_submit.side_effect = ValueError("Duplicate review: your organization has already submitted a review for this contract.")

        payload = {
            "overall_rating": 4,
            "quality_score": 4,
            "timeliness_score": 4,
            "communication_score": 4,
            "review_text": "Submitting a second time should fail."
        }

        resp = await client.post("/contracts/1/reviews", json=payload, headers=auth_headers)
        assert resp.status_code == 409
        assert "Duplicate review" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.submit_mutual_review")
    async def test_review_contract_not_completed_edge_case(self, mock_submit, mock_db, client, auth_headers, mock_user_org):
        """Cannot submit performance review before contract status is 'Completed'."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_submit.side_effect = ValueError("Contract must be in 'Completed' status before reviews can be submitted.")

        payload = {
            "overall_rating": 5,
            "quality_score": 5,
            "timeliness_score": 5,
            "communication_score": 5,
            "review_text": "Too early review."
        }

        resp = await client.post("/contracts/1/reviews", json=payload, headers=auth_headers)
        assert resp.status_code == 400
        assert "Completed" in resp.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.submit_mutual_review")
    async def test_review_non_party_forbidden_edge_case(self, mock_submit, mock_db, client, auth_headers, mock_user_org):
        """Returns 403 when a third-party organization attempts to review."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_submit.side_effect = PermissionError("Your organization is not a party to this contract.")

        payload = {
            "overall_rating": 3,
            "quality_score": 3,
            "timeliness_score": 3,
            "communication_score": 3,
            "review_text": "Intruder review."
        }

        resp = await client.post("/contracts/1/reviews", json=payload, headers=auth_headers)
        assert resp.status_code == 403
        assert "not a party" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_review_rating_out_of_bounds_edge_case(self, client, auth_headers, mock_user_org):
        """Pydantic rejects ratings outside the 1 to 5 stars range (422 Unprocessable)."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org

        # Test rating too high (6 stars)
        payload_high = {
            "overall_rating": 6,
            "quality_score": 5,
            "timeliness_score": 5,
            "communication_score": 5
        }
        resp = await client.post("/contracts/1/reviews", json=payload_high, headers=auth_headers)
        assert resp.status_code == 422

        # Test rating too low (0 stars)
        payload_low = {
            "overall_rating": 0,
            "quality_score": 5,
            "timeliness_score": 5,
            "communication_score": 5
        }
        resp_low = await client.post("/contracts/1/reviews", json=payload_low, headers=auth_headers)
        assert resp_low.status_code == 422

    @pytest.mark.asyncio
    @patch("app.modules.contracts.router.get_db_connection")
    @patch("app.modules.contracts.router.get_contract_mutual_reviews")
    async def test_get_contract_reviews_success(self, mock_get_reviews, mock_db, client, auth_headers, mock_user_org):
        """Retrieves list of reviews for a contract."""
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_get_reviews.return_value = [
            {
                "review_id": 1,
                "contract_id": 1,
                "tender_id": 5,
                "reviewer_org_id": 10,
                "reviewee_org_id": 20,
                "reviewer_user_id": 1,
                "party_role": "BuyerToSeller",
                "overall_rating": 5,
                "quality_score": 5,
                "timeliness_score": 4,
                "communication_score": 5,
                "review_text": "Good work",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        resp = await client.get("/contracts/1/reviews", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["contract_id"] == 1
        assert data["total_reviews"] == 1
        assert len(data["reviews"]) == 1
