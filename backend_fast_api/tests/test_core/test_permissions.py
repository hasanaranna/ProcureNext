# ============================================================
# tests/test_core/test_permissions.py
# Tests for Role-Based Access Control (RBAC) and Permissions
# ============================================================
# PURPOSE:
# Verifies granular access control for platform and organization roles:
#   - Intra-org roles: Owner, ProcurementOfficer, Finance, Viewer
#   - Capability helpers: require_org_owner, require_procurement_access, require_finance_access
#   - Resource ownership guards: validate_resource_ownership
#   - Contract party guards: validate_contract_party
#   - FastAPI dependency integration on protected routes
# ============================================================

import pytest
from fastapi import Depends, FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.core.permissions import (
    require_finance_access,
    require_org_owner,
    require_procurement_access,
    require_role,
    validate_contract_party,
    validate_resource_ownership,
)
from app.modules.auth.dependencies import get_current_user_org


# ---------------------------------------------------------------------------
# Test FastAPI sub-app for route integration
# ---------------------------------------------------------------------------
rbac_app = FastAPI()


@rbac_app.get("/test/owner-only")
async def owner_only_route(user: dict = Depends(require_org_owner())):
    return {"message": "Welcome Owner", "role": user.get("role_in_org")}


@rbac_app.post("/test/procurement-action")
async def procurement_route(user: dict = Depends(require_procurement_access())):
    return {"message": "Procurement authorized", "role": user.get("role_in_org")}


@rbac_app.post("/test/finance-action")
async def finance_route(user: dict = Depends(require_finance_access())):
    return {"message": "Finance authorized", "role": user.get("role_in_org")}


@pytest.fixture
def permissions_client():
    transport = ASGITransport(app=rbac_app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    rbac_app.dependency_overrides.clear()


# ============================================================
# 1. Direct Dependency Function Tests
# ============================================================

class TestIntraOrgRoleRequirements:
    """Unit tests for require_role dependency factory."""

    @pytest.mark.asyncio
    async def test_require_role_allowed_success(self):
        """User with an allowed role succeeds and returns user dict."""
        checker = require_role("Owner", "ProcurementOfficer")
        user = {"user_id": 1, "organization_id": 10, "role_in_org": "Owner"}

        result = await checker(current_user=user)
        assert result["role_in_org"] == "Owner"

    @pytest.mark.asyncio
    async def test_require_role_secondary_allowed_success(self):
        """ProcurementOfficer succeeds when listed in allowed roles."""
        checker = require_role("Owner", "ProcurementOfficer")
        user = {"user_id": 2, "organization_id": 10, "role_in_org": "ProcurementOfficer"}

        result = await checker(current_user=user)
        assert result["role_in_org"] == "ProcurementOfficer"

    @pytest.mark.asyncio
    async def test_require_role_viewer_forbidden(self):
        """Viewer role is rejected with 403 Forbidden when action requires higher privilege."""
        checker = require_role("Owner", "ProcurementOfficer")
        user = {"user_id": 3, "organization_id": 10, "role_in_org": "Viewer"}

        with pytest.raises(HTTPException) as exc_info:
            await checker(current_user=user)

        assert exc_info.value.status_code == 403
        assert "Required role: Owner, ProcurementOfficer" in exc_info.value.detail
        assert "current role: Viewer" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_require_role_missing_role_forbidden(self):
        """User without role_in_org field is rejected with 403 Forbidden."""
        checker = require_role("Owner")
        user = {"user_id": 4, "organization_id": 10}

        with pytest.raises(HTTPException) as exc_info:
            await checker(current_user=user)

        assert exc_info.value.status_code == 403
        assert "Operation not permitted" in exc_info.value.detail


# ============================================================
# 2. Capability Helper Tests
# ============================================================

class TestCapabilityHelpers:
    """Tests for role capability helpers: Owner, Procurement, Finance."""

    @pytest.mark.asyncio
    async def test_require_org_owner_helper(self):
        """Owner helper permits Owner, rejects ProcurementOfficer."""
        checker = require_org_owner()

        owner_user = {"user_id": 1, "role_in_org": "Owner"}
        po_user = {"user_id": 2, "role_in_org": "ProcurementOfficer"}

        res = await checker(current_user=owner_user)
        assert res["role_in_org"] == "Owner"

        with pytest.raises(HTTPException) as exc_info:
            await checker(current_user=po_user)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_require_finance_access_helper(self):
        """Finance helper permits Owner and Finance, rejects Viewer."""
        checker = require_finance_access()

        finance_user = {"user_id": 3, "role_in_org": "Finance"}
        viewer_user = {"user_id": 4, "role_in_org": "Viewer"}

        res = await checker(current_user=finance_user)
        assert res["role_in_org"] == "Finance"

        with pytest.raises(HTTPException) as exc_info:
            await checker(current_user=viewer_user)
        assert exc_info.value.status_code == 403


# ============================================================
# 3. Resource Boundary & Ownership Guards
# ============================================================

class TestResourceBoundaryGuards:
    """Tests for row-level security: resource ownership and contract parties."""

    def test_validate_resource_ownership_success(self):
        """Same organization ID passes resource ownership check."""
        # Should not raise exception
        validate_resource_ownership(user_org_id=10, resource_org_id=10, resource_name="tender")

    def test_validate_resource_ownership_forbidden(self):
        """Mismatched organization ID raises 403 Forbidden."""
        with pytest.raises(HTTPException) as exc_info:
            validate_resource_ownership(user_org_id=10, resource_org_id=99, resource_name="tender")
        assert exc_info.value.status_code == 403
        assert "do not have permission to access or modify this tender" in exc_info.value.detail

    def test_validate_contract_party_buyer_success(self):
        """Buyer organization ID passes contract party validation."""
        validate_contract_party(user_org_id=10, buyer_org_id=10, seller_org_id=20)

    def test_validate_contract_party_seller_success(self):
        """Seller organization ID passes contract party validation."""
        validate_contract_party(user_org_id=20, buyer_org_id=10, seller_org_id=20)

    def test_validate_contract_party_outsider_forbidden(self):
        """Third-party organization ID raises 403 Forbidden."""
        with pytest.raises(HTTPException) as exc_info:
            validate_contract_party(user_org_id=99, buyer_org_id=10, seller_org_id=20)
        assert exc_info.value.status_code == 403
        assert "not a party to this contract" in exc_info.value.detail


# ============================================================
# 4. FastAPI Route Integration Tests
# ============================================================

class TestRouteRBACIntegration:
    """End-to-end integration tests on FastAPI dependency-guarded routes."""

    @pytest.mark.asyncio
    async def test_owner_route_success(self, permissions_client):
        """Owner receives 200 OK on Owner-guarded route."""
        rbac_app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 1,
            "organization_id": 10,
            "role_in_org": "Owner"
        }
        resp = await permissions_client.get("/test/owner-only")
        assert resp.status_code == 200
        assert resp.json()["role"] == "Owner"

    @pytest.mark.asyncio
    async def test_owner_route_rejected_for_procurement_officer(self, permissions_client):
        """ProcurementOfficer receives 403 Forbidden on Owner-guarded route."""
        rbac_app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 2,
            "organization_id": 10,
            "role_in_org": "ProcurementOfficer"
        }
        resp = await permissions_client.get("/test/owner-only")
        assert resp.status_code == 403
        assert "Required role: Owner" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_procurement_route_success_for_procurement_officer(self, permissions_client):
        """ProcurementOfficer receives 200 OK on procurement route."""
        rbac_app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 2,
            "organization_id": 10,
            "role_in_org": "ProcurementOfficer"
        }
        resp = await permissions_client.post("/test/procurement-action")
        assert resp.status_code == 200
        assert resp.json()["role"] == "ProcurementOfficer"

    @pytest.mark.asyncio
    async def test_procurement_route_rejected_for_viewer(self, permissions_client):
        """Viewer receives 403 Forbidden on procurement route."""
        rbac_app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 3,
            "organization_id": 10,
            "role_in_org": "Viewer"
        }
        resp = await permissions_client.post("/test/procurement-action")
        assert resp.status_code == 403
        assert "Required role: Owner, ProcurementOfficer" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_finance_route_success_for_finance_role(self, permissions_client):
        """Finance role receives 200 OK on finance route."""
        rbac_app.dependency_overrides[get_current_user_org] = lambda: {
            "user_id": 4,
            "organization_id": 10,
            "role_in_org": "Finance"
        }
        resp = await permissions_client.post("/test/finance-action")
        assert resp.status_code == 200
        assert resp.json()["role"] == "Finance"
