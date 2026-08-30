# ============================================================
# tests/test_tenders/test_pdf_tender_creation.py
# ============================================================

import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from celery.result import AsyncResult

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.services.ml_schemas import ProcurementDocument


SAMPLE_PDF_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "documents", "3.pdf")
)


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


class TestPdfEndpoints:
    """Test FastAPI endpoints for PDF extraction and async creation."""

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.parse_and_embed_tender_pdf", new_callable=AsyncMock)
    async def test_extract_from_pdf_endpoint(self, mock_parse, client):
        mock_parse.return_value = ProcurementDocument(
            procurement_nature="Goods",
            procurement_method="Open Tendering Method (OTM)",
            title="Engagement of yearly contractor for supplying Stone ships",
            description="Engagement of yearly contractor for supplying Stone ships",
            eligibility_of_tenderer="The required number of similar contracts",
            embedding=[0.1] * 384,
        )

        files = [("file", ("3.pdf", b"%PDF-1.4 dummy", "application/pdf"))]
        resp = await client.post("/tenders/extract-from-pdf", files=files)
        assert resp.status_code == 200
        data = resp.json()

        assert data["procurement_nature"] == "Goods"
        assert "Engagement of yearly contractor" in data["title"]
        assert len(data["embedding"]) == 384
        mock_parse.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.create_tender_from_pdf_task")
    async def test_create_from_pdf_endpoint_queues_job(self, mock_task, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {
            "organization_id": 10,
            "org_user_id": 2,
            "user_id": 2,
        }

        mock_result = AsyncMock()
        mock_result.id = "task-123"
        mock_task.delay.return_value = mock_result

        files = [("file", ("3.pdf", b"%PDF-1.4 dummy", "application/pdf"))]
        resp = await client.post(
            "/tenders/buyer/create-from-pdf",
            headers=auth_headers,
            files=files,
        )

        assert resp.status_code == 202
        data = resp.json()
        assert data["task_id"] == "task-123"
        assert data["status"] == "processing"
        mock_task.delay.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.AsyncResult")
    async def test_create_from_pdf_job_status_completed(self, mock_async_result, client):
        mock_result = AsyncMock()
        mock_result.state = "SUCCESS"
        mock_result.result = {
            "tender_id": 42,
            "buyer_id": 10,
            "created_by": 2,
            "title": "Engagement of yearly contractor for supplying Stone ships",
            "description": "Engagement of yearly contractor...",
            "eligibility_of_tenderer": "The required number of similar contracts...",
            "status": "Published",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        mock_async_result.return_value = mock_result

        resp = await client.get("/tenders/buyer/create-from-pdf/jobs/task-123")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["result"]["tender_id"] == 42
