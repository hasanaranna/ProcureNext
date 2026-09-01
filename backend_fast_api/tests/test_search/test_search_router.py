# ============================================================
# tests/test_search/test_search_router.py - Search Endpoint Tests
# ============================================================
# Tests for GET /search/tenders (hybrid keyword + semantic tender search).
#
# The DB is mocked, so the access-control tests assert on the SQL that gets
# built and the parameters bound to it, rather than on returned rows.
# ============================================================
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import pytest

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


def _mock_db_ctx(mock_conn):
    """Wrap a mock connection in an async context manager compatible with `async with`."""

    @asynccontextmanager
    async def _ctx():
        yield mock_conn

    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure dependency overrides are cleared after each test."""
    yield
    app.dependency_overrides.clear()


def _executed_sql(mock_conn) -> str:
    """The SQL string passed to the last connection.fetch() call."""
    return mock_conn.fetch.call_args[0][0]


def _bound_params(mock_conn) -> tuple:
    """The positional parameters bound to the last connection.fetch() call."""
    return mock_conn.fetch.call_args[0][1:]


class TestEmptyQuery:
    """An empty query should behave like the plain recency-ordered listing."""

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_empty_query_skips_ml_service(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        resp = await client.get("/search/tenders", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["title"] == "Office Supplies Tender"
        # No search text means no reason to pay for an embedding round-trip.
        mock_vectorize.assert_not_called()
        assert "ORDER BY t.created_at DESC" in _executed_sql(mock_conn)


class TestHybridSearch:
    """A non-empty query fuses full-text and semantic ranking."""

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_query_uses_both_ranking_arms(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.return_value = [0.1] * 384

        resp = await client.get("/search/tenders?q=office+supplies", headers=auth_headers)

        assert resp.status_code == 200
        assert len(resp.json()) == 2
        mock_vectorize.assert_awaited_once_with("office supplies")

        sql = _executed_sql(mock_conn)
        assert "plainto_tsquery" in sql
        assert "<=>" in sql
        assert "::vector" in sql

        params = _bound_params(mock_conn)
        assert "office supplies" in params
        # The embedding is bound as a pgvector string literal, not a raw list.
        assert any(isinstance(p, str) and p.startswith("[0.1,") for p in params)

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_falls_back_to_full_text_when_ml_service_down(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.side_effect = RuntimeError("ML service unreachable")

        resp = await client.get("/search/tenders?q=laptops", headers=auth_headers)

        # Search must still work, just without the semantic arm.
        assert resp.status_code == 200
        assert len(resp.json()) == 2

        sql = _executed_sql(mock_conn)
        assert "plainto_tsquery" in sql
        assert "<=>" not in sql

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_returns_empty_list_when_nothing_matches(
        self, mock_vectorize, mock_db, client, mock_user_org, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = []
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.return_value = [0.1] * 384

        resp = await client.get("/search/tenders?q=nonexistent", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json() == []


class TestVisibilityRules:
    """Restricted tenders must only reach vendors invited to them."""

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_restricted_tenders_gated_by_invitation(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.return_value = [0.1] * 384

        resp = await client.get("/search/tenders?q=supplies", headers=auth_headers)

        assert resp.status_code == 200
        sql = _executed_sql(mock_conn)
        # Public tenders pass; Restricted ones require a matching invitation row.
        assert "t.visibility_type = 'Public'" in sql
        assert "tender_invitations" in sql
        assert "ti.vendor_org_id" in sql
        assert mock_user_org["organization_id"] in _bound_params(mock_conn)

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_excludes_own_organizations_tenders(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.return_value = [0.1] * 384

        resp = await client.get("/search/tenders?q=supplies", headers=auth_headers)

        assert resp.status_code == 200
        assert "t.buyer_id !=" in _executed_sql(mock_conn)


class TestEnlistedFilter:
    """enlisted_only restricts results to buyers the vendor has enlisted."""

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_enlisted_only_joins_enlisted_vendors(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.return_value = [0.1] * 384

        resp = await client.get(
            "/search/tenders?q=supplies&enlisted_only=true", headers=auth_headers
        )

        assert resp.status_code == 200
        sql = _executed_sql(mock_conn)
        assert "enlisted_vendors" in sql
        assert "ev.enlisted_org_id = t.buyer_id" in sql

    @pytest.mark.asyncio
    @patch("app.modules.search.router.get_db_connection")
    @patch("app.modules.search.service.vectorize_text")
    async def test_default_does_not_filter_by_enlistment(
        self, mock_vectorize, mock_db, client, mock_user_org, sample_tender_list, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: mock_user_org
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = sample_tender_list
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_vectorize.return_value = [0.1] * 384

        resp = await client.get("/search/tenders?q=supplies", headers=auth_headers)

        assert resp.status_code == 200
        assert "enlisted_vendors" not in _executed_sql(mock_conn)
