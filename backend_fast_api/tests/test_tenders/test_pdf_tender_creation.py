# ============================================================
# tests/test_tenders/test_pdf_tender_creation.py
# ============================================================

import os
import json
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.services.tender_parser import parse_and_embed_tender_pdf, generate_embedding, ProcurementDocument

SAMPLE_PDF_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "documents", "3.pdf")
)

def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestPdfParsingAndEmbedding:
    """Test unit parsing and 384-d embedding vector generation."""

    def test_parse_sample_pdf(self):
        assert os.path.exists(SAMPLE_PDF_PATH), "3.pdf must exist in documents/"
        
        structured_result = parse_and_embed_tender_pdf(SAMPLE_PDF_PATH)
        assert isinstance(structured_result, ProcurementDocument)
        
        # Verify specific fields
        assert structured_result.procurement_nature == "Goods"
        assert "Open Tendering Method" in structured_result.procurement_method or "OTM" in structured_result.procurement_method
        assert "Engagement of yearly contractor" in structured_result.title
        assert "Engagement of yearly contractor" in structured_result.description
        assert "The required number of similar contracts" in structured_result.eligibility_of_tenderer
        assert structured_result.embedding is not None
        assert len(structured_result.embedding) == 384
        assert all(isinstance(x, (float, int)) for x in structured_result.embedding)

    def test_embedding_vector_dimensions(self):
        text = "Engagement of yearly contractor for supplying Stone ships, Sylhet sand, Bitumen & Labour"
        vec = generate_embedding(text)
        assert isinstance(vec, list)
        assert len(vec) == 384


class TestPdfEndpoints:
    """Test FastAPI endpoints for PDF extraction and 1-click creation."""

    @pytest.mark.asyncio
    async def test_extract_from_pdf_endpoint(self, client):
        assert os.path.exists(SAMPLE_PDF_PATH)
        with open(SAMPLE_PDF_PATH, "rb") as f:
            pdf_bytes = f.read()

        files = [("file", ("3.pdf", pdf_bytes, "application/pdf"))]
        resp = await client.post("/tenders/extract-from-pdf", files=files)
        assert resp.status_code == 200
        data = resp.json()

        assert data["procurement_nature"] == "Goods"
        assert "Engagement of yearly contractor" in data["title"]
        assert "Engagement of yearly contractor" in data["description"]
        assert "The required number of similar contracts" in data["eligibility_of_tenderer"]
        assert len(data["embedding"]) == 384

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.create_tender_from_pdf_file")
    async def test_create_from_pdf_endpoint(self, mock_create, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10, "org_user_id": 2}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_create.return_value = {
            "tender_id": 42,
            "buyer_id": 10,
            "created_by": 2,
            "title": "Engagement of yearly contractor for supplying Stone ships",
            "description": "Engagement of yearly contractor...",
            "eligibility_of_tenderer": "The required number of similar contracts...",
            "status": "Published",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        files = [("file", ("3.pdf", b"%PDF-1.4 dummy", "application/pdf"))]
        resp = await client.post(
            "/tenders/buyer/create-from-pdf",
            headers=auth_headers,
            files=files
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["tender_id"] == 42
        assert "Engagement of yearly contractor" in data["title"]
        mock_create.assert_called_once()
