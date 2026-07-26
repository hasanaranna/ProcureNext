# ============================================================
# tests/conftest.py - Pytest Configuration & Fixtures
# ============================================================
import pytest
import pytest_asyncio
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from httpx import AsyncClient, ASGITransport
from jose import jwt

from app.main import app
from app.core.security import SECRET_KEY, ALGORITHM


def _make_token(user_id: int = 1) -> str:
    """Create a valid JWT token for testing."""
    payload = {"sub": str(user_id), "exp": datetime(2099, 1, 1, tzinfo=timezone.utc)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@pytest.fixture
def auth_token():
    """A valid JWT token for user_id=1."""
    return _make_token(user_id=1)


@pytest.fixture
def auth_headers(auth_token):
    """Authorization headers with a valid Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def mock_user_org():
    """Mock return value for get_current_user_org dependency."""
    return {
        "user_id": 1,
        "email": "buyer@test.com",
        "organization_id": 10,
        "role_in_org": "Owner",
        "org_user_id": 1,
    }


@pytest.fixture
def mock_db_connection():
    """A mock asyncpg connection with async fetch/fetchrow/execute methods."""
    conn = AsyncMock()
    return conn


@pytest.fixture
def sample_tender_row():
    """A sample tender row as returned from the database."""
    return {
        "tender_id": 1,
        "title": "Office Supplies Tender",
        "description": "Procurement of office stationery",
        "status": "Published",
        "buyer_org_name": "Acme Corp",
        "submission_deadline": datetime(2026, 6, 30, tzinfo=timezone.utc),
        "tender_public_date": datetime(2026, 4, 1, tzinfo=timezone.utc),
        "pre_bid_meeting": datetime(2026, 4, 15, tzinfo=timezone.utc),
        "tender_opening_date": datetime(2026, 7, 5, tzinfo=timezone.utc),
        "budget_min": 10000.00,
        "budget_max": 50000.00,
        "security_required": False,
        "created_at": datetime(2026, 3, 15, tzinfo=timezone.utc),
    }


@pytest.fixture
def sample_tender_list():
    """A list of sample tender rows for list endpoints."""
    return [
        {
            "tender_id": 1,
            "title": "Office Supplies Tender",
            "description": "Procurement of office stationery",
            "status": "Published",
            "buyer_org_name": "Acme Corp",
            "submission_deadline": datetime(2026, 6, 30, tzinfo=timezone.utc),
            "created_at": datetime(2026, 3, 15, tzinfo=timezone.utc),
        },
        {
            "tender_id": 2,
            "title": "IT Equipment Procurement",
            "description": "Request for computers and peripherals",
            "status": "Published",
            "buyer_org_name": "TechStart Inc.",
            "submission_deadline": datetime(2026, 7, 15, tzinfo=timezone.utc),
            "created_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
        },
    ]


@pytest.fixture
def sample_document_rows():
    """Sample tender document rows."""
    return [
        {
            "tender_doc_id": 1,
            "file_name": "requirements.pdf",
            "file_path": "tenders/1/abc123_requirements.pdf",
            "uploaded_at": datetime(2026, 3, 15, tzinfo=timezone.utc),
        },
        {
            "tender_doc_id": 2,
            "file_name": "item_list.pdf",
            "file_path": "tenders/1/def456_item_list.pdf",
            "uploaded_at": datetime(2026, 3, 15, tzinfo=timezone.utc),
        },
    ]


@pytest_asyncio.fixture
async def client():
    """httpx AsyncClient bound to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
