# ============================================================
# tests/test_storage/test_upload_failure_cleanup.py
# Tests verifying that when POST APIs or tasks fail, files
# in object storage / local disk are cleaned up properly.
# ============================================================

import os
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org
from app.modules.auth.service import register_employee_user
from app.tasks.document_tasks import _async_upload, _async_bid_upload


def _mock_db_ctx(mock_conn):
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


# ============================================================
# 1. Organization Registration Failure -> Storage Cleanup
# ============================================================

class TestOrgRegistrationFailureCleanup:
    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.create_master_organization")
    @patch("app.modules.organizations.router.upload_optional_file")
    @patch("app.modules.organizations.router.upload_optional_files")
    @patch("app.modules.organizations.router.delete_files")
    async def test_org_creation_failure_cleans_uploaded_storage_files(
        self, mock_delete_files, mock_upload_files, mock_upload_file, mock_create_org, mock_db, client
    ):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = None  # user doesn't exist yet
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_upload_file.side_effect = [
            "registrations/test/nid/front.jpg",
            "registrations/test/nid/back.jpg",
            "registrations/test/org/license.pdf",
            "registrations/test/org/tin.pdf",
            "registrations/test/org/vat.pdf",
        ]
        mock_upload_files.return_value = ["registrations/test/org/additional/extra.pdf"]

        # DB creation fails!
        mock_create_org.side_effect = RuntimeError("Database connection lost during insert")

        data = {
            "name": "Test User",
            "organizationName": "Test Org",
            "email": "test@example.com",
            "phone": "01700000000",
            "nid": "1234567890",
            "date_of_birth": "1995-01-01",
            "password": "Password123!",
            "organization_type": "Buyer",
        }

        files = [
            ("nidFront", ("front.jpg", b"dummy front", "image/jpeg")),
            ("nidBack", ("back.jpg", b"dummy back", "image/jpeg")),
        ]

        resp = await client.post("/api/org/orgs", data=data, files=files)
        assert resp.status_code == 500

        # Verify that delete_files was called to clean up all uploaded storage paths
        mock_delete_files.assert_called_once()
        deleted_paths = mock_delete_files.call_args[0][0]
        assert "registrations/test/nid/front.jpg" in deleted_paths
        assert "registrations/test/nid/back.jpg" in deleted_paths
        assert "registrations/test/org/license.pdf" in deleted_paths


# ============================================================
# 2. Employee Registration Failure -> Storage Cleanup
# ============================================================

class TestEmployeeRegistrationFailureCleanup:
    @pytest.mark.asyncio
    @patch("app.modules.auth.service.upload_optional_file")
    @patch("app.modules.auth.service.delete_files")
    async def test_employee_registration_db_failure_cleans_storage(
        self, mock_delete_files, mock_upload_file
    ):
        mock_conn = AsyncMock()
        # Invitation is valid
        mock_conn.fetchrow.side_effect = [
            {"invitation_id": 1, "organization_id": 10, "status": "Pending", "organization_name": "Acme"},
            None,  # User doesn't exist
            # Transaction throws error on INSERT users
            RuntimeError("DB constraint violation")
        ]

        @asynccontextmanager
        async def _mock_tx():
            yield

        mock_conn.transaction = MagicMock(side_effect=_mock_tx)

        mock_upload_file.side_effect = [
            "registrations/emp/nid/front.jpg",
            "registrations/emp/nid/back.jpg"
        ]

        from datetime import date
        with pytest.raises(RuntimeError):
            await register_employee_user(
                connection=mock_conn,
                name="Emp Name",
                email="emp@example.com",
                phone="01800000000",
                nid=9876543210,
                date_of_birth=date(1996, 5, 20),
                password="Password123!",
                token="valid_token",
                nid_front=MagicMock(),
                nid_back=MagicMock(),
            )

        # Verify storage cleanup was called with the uploaded files
        mock_delete_files.assert_called_once()
        cleaned = mock_delete_files.call_args[0][0]
        assert "registrations/emp/nid/front.jpg" in cleaned
        assert "registrations/emp/nid/back.jpg" in cleaned


# ============================================================
# 3. Tender Publish Failure -> Local Temp File Cleanup
# ============================================================

class TestTenderPublishFailureCleanup:
    @pytest.mark.asyncio
    @patch("app.modules.tenders.router.get_db_connection")
    @patch("app.modules.tenders.router.publish_tender_with_documents")
    async def test_publish_tender_db_failure_removes_temp_files(
        self, mock_publish, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 1, "org_user_id": 1}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        # DB publish fails
        mock_publish.side_effect = RuntimeError("DB insert failed")

        tender_data = {
            "title": "Failing Tender",
            "description": "Desc",
            "visibility_type": "Public",
        }
        form_data = {
            "tender_data": json.dumps(tender_data),
            "file_names": json.dumps(["file1.pdf"]),
        }
        files = [
            ("files", ("file1.pdf", b"dummy content", "application/pdf")),
        ]

        resp = await client.post(
            "/tenders/buyer/publish-with-documents",
            headers=auth_headers,
            data=form_data,
            files=files
        )
        assert resp.status_code == 500


# ============================================================
# 4. Bid Submit Failure -> Local Temp File Cleanup
# ============================================================

class TestBidSubmitFailureCleanup:
    @pytest.mark.asyncio
    @patch("app.modules.bids.router.get_db_connection")
    @patch("app.modules.bids.router.submit_bid_with_documents")
    async def test_submit_bid_db_failure_removes_temp_files(
        self, mock_submit, mock_db, client, auth_headers
    ):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 2, "org_user_id": 5}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_submit.side_effect = RuntimeError("DB insert failed")

        bid_data = {"tender_id": 1, "financial_amount": 5000.0}
        form_data = {
            "bid_data": json.dumps(bid_data),
            "doc_type_names": json.dumps(["TIN"]),
        }
        files = [
            ("files", ("tin.pdf", b"dummy tin", "application/pdf")),
        ]

        resp = await client.post(
            "/bids/vendor/submit-with-documents",
            headers=auth_headers,
            data=form_data,
            files=files
        )
        assert resp.status_code == 500


# ============================================================
# 5. Celery Background Task DB Failure -> Storage Cleanup
# ============================================================

class TestCeleryTaskFailureCleanup:
    @pytest.mark.asyncio
    @patch("asyncpg.connect")
    @patch("app.tasks.document_tasks.upload_local_file")
    @patch("app.tasks.document_tasks.delete_files")
    async def test_celery_tender_upload_db_failure_cleans_storage(
        self, mock_delete_files, mock_upload_file, mock_connect, tmp_path
    ):
        # Create a temp local file
        test_file = tmp_path / "test_doc.pdf"
        test_file.write_bytes(b"pdf contents")

        mock_conn = AsyncMock()
        mock_connect.return_value = mock_conn

        # Upload to Supabase succeeds
        mock_upload_file.return_value = "tenders/10/test_doc.pdf"

        # DB execute fails
        mock_conn.execute.side_effect = RuntimeError("DB connection dropped")

        files_data = [{"local_path": str(test_file), "custom_name": "Tender Document"}]

        await _async_upload(tender_id=10, files_data=files_data)

        # Storage cleanup should have been called for the uploaded object
        mock_delete_files.assert_called_once_with(["tenders/10/test_doc.pdf"])
        # Local file should have been deleted
        assert not os.path.exists(str(test_file))

    @pytest.mark.asyncio
    @patch("asyncpg.connect")
    @patch("app.tasks.document_tasks.upload_local_file")
    @patch("app.tasks.document_tasks.delete_files")
    async def test_celery_bid_upload_db_failure_cleans_storage(
        self, mock_delete_files, mock_upload_file, mock_connect, tmp_path
    ):
        test_file = tmp_path / "bid_doc.pdf"
        test_file.write_bytes(b"bid pdf contents")

        mock_conn = AsyncMock()
        mock_connect.return_value = mock_conn

        mock_conn.fetchrow.side_effect = [
            {"tender_id": 5},  # bid_row
            {"req_doc_id": 1}, # req_row
        ]

        mock_upload_file.return_value = "bids/20/bid_doc.pdf"
        mock_conn.execute.side_effect = RuntimeError("DB insert failed")

        files_data = [{"local_path": str(test_file), "doc_type_name": "TIN"}]

        await _async_bid_upload(bid_id=20, files_data=files_data)

        mock_delete_files.assert_called_once_with(["bids/20/bid_doc.pdf"])
        assert not os.path.exists(str(test_file))

