# ============================================================
# tests/test_organizations/test_organizations_router.py
# ============================================================
# TEST CASES TO IMPLEMENT:
# - test_create_organization: Creates org, creator becomes Owner
# - test_create_duplicate_org: Rejects duplicate RJSC/TIN numbers
# - test_add_member: Owner adds a member with role
# - test_join_by_code: User requests to join via org code
# - test_accept_affiliation: User accepts join request
# - test_decline_affiliation: User declines join request
# - test_update_member_role: Owner changes member's role
# - test_remove_member: Owner removes a member
# - test_non_owner_cannot_manage: Non-owner actions are rejected
# - test_upload_org_document: Uploads trade license/TIN/VAT
# ============================================================
import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

from app.main import app
from app.modules.auth.dependencies import get_current_user_org

def _mock_db_ctx(mock_conn):
    """Wrap a mock connection in an async context manager."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx

@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure dependency overrides are cleared after each test."""
    yield
    app.dependency_overrides.clear()

class TestOrganizationEndpoints:
    """Tests for Organization Management endpoints."""

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.create_or_update_invitation")
    async def test_create_invitation(self, mock_create, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10, "user_id": 1, "role_in_org": "Owner"}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_create.return_value = {
            "invitation_id": 1,
            "email": "invitee@test.com",
            "token": "secret_token"
        }

        payload = {
            "email": "invitee@test.com"
        }

        resp = await client.post("/api/org/invitations", json=payload, headers=auth_headers)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "invitee@test.com"
        assert "token" in data
        
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["organization_id"] == 10
        assert call_kwargs["invited_by"] == 1
        assert call_kwargs["email"] == "invitee@test.com"

    @pytest.mark.asyncio
    @patch("app.modules.organizations.router.get_db_connection")
    @patch("app.modules.organizations.router.update_member_role")
    async def test_update_member_role(self, mock_update, mock_db, client, auth_headers):
        app.dependency_overrides[get_current_user_org] = lambda: {"organization_id": 10, "role_in_org": "Owner"}
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)

        mock_update.return_value = {
            "message": "Role updated successfully",
            "org_user_id": 5,
            "new_role": "Finance"
        }

        payload = {
            "role": "Finance"
        }

        resp = await client.patch("/api/org/members/5/role", json=payload, headers=auth_headers)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["new_role"] == "Finance"
        
        mock_update.assert_called_once_with(
            mock_conn,
            organization_id=10,
            target_org_user_id=5,
            new_role="Finance",
            current_user_role="Owner"
        )

    @pytest.mark.asyncio
    @patch("app.tasks.notification_tasks.send_invitation_email_task.delay")
    async def test_create_or_update_invitation_service_logic(self, mock_celery_task):
        from app.modules.organizations.service import create_or_update_invitation
        mock_conn = AsyncMock()

        # 1. Not already a member
        mock_conn.fetchval.return_value = None
        # 2. Existing invitation lookup
        mock_conn.fetchrow.side_effect = [
            None,  # No existing invitation
            {
                "invitation_id": 1,
                "organization_id": 10,
                "invited_by": 1,
                "email": "newbie@test.com",
                "token": "tok123",
                "status": "Pending",
                "created_at": "2026-08-17",
                "expires_at": "2026-08-24",
            },  # Insert result
            {"organization_name": "Test Org", "inviter_name": "Alice"},  # org_info
        ]

        result = await create_or_update_invitation(
            mock_conn,
            organization_id=10,
            invited_by=1,
            email="newbie@test.com",
            token="tok123",
        )

        assert "invitation" in result
        assert result["invitation"]["email"] == "newbie@test.com"
        mock_celery_task.assert_called_once()
        call_kwargs = mock_celery_task.call_args.kwargs
        assert call_kwargs["to_email"] == "newbie@test.com"
        assert call_kwargs["org_name"] == "Test Org"
        assert "tok123" in call_kwargs["invite_link"]

