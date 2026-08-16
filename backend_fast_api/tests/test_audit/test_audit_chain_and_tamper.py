# ============================================================
# tests/test_audit/test_audit_chain_and_tamper.py
# Comprehensive Test Suite for Cryptographic Hash Chaining,
# WORM Immutability, Tamper Detection (IDS), and Admin Audit API
# ============================================================

import pytest
import json
import hashlib
from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.modules.auth.dependencies import get_current_admin_user
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import (
    canonical_json_dumps,
    compute_payload_hash,
    compute_hash_signature,
    compute_merkle_root,
    create_audit_log_entry,
    write_to_audit_outbox,
    process_audit_outbox_batch,
    verify_audit_log_integrity,
    get_audit_logs,
    get_audit_log_by_id,
    get_entity_audit_trail,
    get_audit_stats,
    seal_audit_archive_batch,
    GENESIS_PREVIOUS_HASH,
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


# ============================================================
# 1. Cryptographic Math & Canonicalization Tests
# ============================================================
class TestAuditCryptoMath:
    def test_canonical_json_ordering_consistency(self):
        dict1 = {"b": 2, "a": 1, "nested": {"z": 9, "y": 8}}
        dict2 = {"nested": {"y": 8, "z": 9}, "a": 1, "b": 2}
        assert canonical_json_dumps(dict1) == canonical_json_dumps(dict2)
        assert canonical_json_dumps(dict1) == '{"a":1,"b":2,"nested":{"y":8,"z":9}}'

    def test_payload_hash_deterministic(self):
        h1 = compute_payload_hash(
            user_id=1,
            user_email="admin@procurenext.com",
            action_type="SUBMIT_BID",
            entity_type="bid",
            entity_id="101",
            old_values=None,
            new_values={"amount": 50000.0},
            change_diff={"amount": "+50000"},
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )
        h2 = compute_payload_hash(
            user_id=1,
            user_email="admin@procurenext.com",
            action_type="SUBMIT_BID",
            entity_type="bid",
            entity_id="101",
            old_values=None,
            new_values={"amount": 50000.0},
            change_diff={"amount": "+50000"},
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex string

    def test_merkle_root_computation(self):
        sig1 = hashlib.sha256(b"sig1").hexdigest()
        sig2 = hashlib.sha256(b"sig2").hexdigest()
        sig3 = hashlib.sha256(b"sig3").hexdigest()

        root = compute_merkle_root([sig1, sig2, sig3])
        assert len(root) == 64
        # Empty list should return genesis hash
        assert compute_merkle_root([]) == GENESIS_PREVIOUS_HASH


# ============================================================
# 2. Hash Chaining & Genesis Block Tests
# ============================================================
class TestAuditHashChaining:
    @pytest.mark.asyncio
    async def test_genesis_block_creation(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.side_effect = [
            None,  # No previous tail row (Genesis block)
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 10,
                "user_email": "owner@company.com",
                "action_type": "CREATE",
                "entity_type": "tender",
                "entity_id": "1",
                "old_values": None,
                "new_values": json.dumps({"title": "Genesis Tender"}),
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "Agent/1.0",
                "timestamp": datetime.now(timezone.utc),
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": "a" * 64,
                "hash_signature": "b" * 64,
            },
        ]

        log_create = AuditLogCreate(
            action_type="CREATE",
            entity_type="tender",
            entity_id="1",
            user_id=10,
            user_email="owner@company.com",
            new_values={"title": "Genesis Tender"},
        )

        res = await create_audit_log_entry(mock_conn, log_create)
        assert res.sequence_number == 1
        assert res.previous_hash == GENESIS_PREVIOUS_HASH

    @pytest.mark.asyncio
    async def test_subsequent_block_chains_to_previous_signature(self):
        mock_conn = AsyncMock()
        prev_sig = "prev_signature_hex_1234567890abcdef1234567890abcdef1234567890abcdef"
        
        mock_conn.fetchrow.side_effect = [
            {"sequence_number": 5, "hash_signature": prev_sig},  # Existing tail
            {
                "log_id": 6,
                "sequence_number": 6,
                "event_uuid": uuid4(),
                "user_id": 10,
                "user_email": "owner@company.com",
                "action_type": "AWARD_TENDER",
                "entity_type": "tender",
                "entity_id": "1",
                "old_values": None,
                "new_values": json.dumps({"status": "Awarded"}),
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "Agent/1.0",
                "timestamp": datetime.now(timezone.utc),
                "previous_hash": prev_sig,
                "payload_hash": "c" * 64,
                "hash_signature": "d" * 64,
            },
        ]

        log_create = AuditLogCreate(
            action_type="AWARD_TENDER",
            entity_type="tender",
            entity_id="1",
            user_id=10,
            user_email="owner@company.com",
            new_values={"status": "Awarded"},
        )

        res = await create_audit_log_entry(mock_conn, log_create)
        assert res.sequence_number == 6
        assert res.previous_hash == prev_sig


# ============================================================
# 3. Outbox Processing Tests
# ============================================================
class TestAuditOutbox:
    @pytest.mark.asyncio
    async def test_write_to_audit_outbox(self):
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {"outbox_id": 42}

        outbox_id = await write_to_audit_outbox(
            connection=mock_conn,
            action_type="SUBMIT_BID",
            entity_type="bid",
            entity_id="101",
            user_id=5,
            user_email="vendor@supplier.com",
            new_values={"financial_amount": 75000},
        )
        assert outbox_id == 42
        mock_conn.fetchrow.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_audit_outbox_batch(self):
        mock_conn = AsyncMock()
        ts = datetime.now(timezone.utc)
        mock_conn.fetch.return_value = [
            {
                "outbox_id": 1,
                "event_uuid": uuid4(),
                "action_type": "CREATE",
                "entity_type": "tender",
                "entity_id": "10",
                "user_id": 2,
                "user_email": "buyer@org.com",
                "ip_address": "1.2.3.4",
                "user_agent": "Test",
                "old_values": None,
                "new_values": json.dumps({"title": "Outbox Tender"}),
                "change_diff": None,
                "created_at": ts,
            }
        ]

        # create_audit_log_entry mocks
        mock_conn.fetchrow.side_effect = [
            None,  # tail row
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 2,
                "user_email": "buyer@org.com",
                "action_type": "CREATE",
                "entity_type": "tender",
                "entity_id": "10",
                "old_values": None,
                "new_values": json.dumps({"title": "Outbox Tender"}),
                "change_diff": None,
                "ip_address": "1.2.3.4",
                "user_agent": "Test",
                "timestamp": ts,
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": "e" * 64,
                "hash_signature": "f" * 64,
            }
        ]

        processed = await process_audit_outbox_batch(mock_conn, batch_size=10)
        assert processed == 1
        mock_conn.execute.assert_called_once()


# ============================================================
# 4. Tamper Detection & Intrusion Detection System (IDS) Tests
# ============================================================
class TestAuditTamperDetection:
    @pytest.mark.asyncio
    async def test_clean_chain_verification_passes(self):
        mock_conn = AsyncMock()
        ts1 = datetime(2026, 8, 16, 10, 0, 0, tzinfo=timezone.utc)
        ts2 = datetime(2026, 8, 16, 10, 5, 0, tzinfo=timezone.utc)

        # Build valid row 1
        p_hash1 = compute_payload_hash(1, "admin@procure.com", "CREATE", "user", "1", None, {"name": "Admin"}, None, "127.0.0.1", "CLI")
        sig1 = compute_hash_signature(GENESIS_PREVIOUS_HASH, p_hash1, ts1, 1)

        # Build valid row 2
        p_hash2 = compute_payload_hash(1, "admin@procure.com", "UPDATE", "user", "1", {"name": "Admin"}, {"name": "Super Admin"}, None, "127.0.0.1", "CLI")
        sig2 = compute_hash_signature(sig1, p_hash2, ts2, 2)

        mock_conn.fetch.return_value = [
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procure.com",
                "action_type": "CREATE",
                "entity_type": "user",
                "entity_id": "1",
                "old_values": None,
                "new_values": {"name": "Admin"},
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "CLI",
                "timestamp": ts1,
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": p_hash1,
                "hash_signature": sig1,
            },
            {
                "log_id": 2,
                "sequence_number": 2,
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procure.com",
                "action_type": "UPDATE",
                "entity_type": "user",
                "entity_id": "1",
                "old_values": {"name": "Admin"},
                "new_values": {"name": "Super Admin"},
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "CLI",
                "timestamp": ts2,
                "previous_hash": sig1,
                "payload_hash": p_hash2,
                "hash_signature": sig2,
            },
        ]

        report = await verify_audit_log_integrity(mock_conn)
        assert report.is_valid is True
        assert report.total_records_checked == 2
        assert len(report.anomalies) == 0

    @pytest.mark.asyncio
    async def test_tampered_payload_detected(self):
        mock_conn = AsyncMock()
        ts = datetime(2026, 8, 16, 10, 0, 0, tzinfo=timezone.utc)
        p_hash = compute_payload_hash(1, "admin@procure.com", "CREATE", "user", "1", None, {"name": "Admin"}, None, "127.0.0.1", "CLI")
        sig = compute_hash_signature(GENESIS_PREVIOUS_HASH, p_hash, ts, 1)

        # Attacker altered new_values in database directly to {"name": "Hacked Admin"} without updating signature
        mock_conn.fetch.return_value = [
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procure.com",
                "action_type": "CREATE",
                "entity_type": "user",
                "entity_id": "1",
                "old_values": None,
                "new_values": {"name": "Hacked Admin"},  # Tampered!
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "CLI",
                "timestamp": ts,
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": p_hash,  # Stale hash
                "hash_signature": sig,
            }
        ]

        report = await verify_audit_log_integrity(mock_conn)
        assert report.is_valid is False
        assert len(report.anomalies) > 0
        assert any(a.anomaly_type == "PAYLOAD_TAMPERED" for a in report.anomalies)

    @pytest.mark.asyncio
    async def test_broken_sequence_gap_detected(self):
        mock_conn = AsyncMock()
        ts1 = datetime(2026, 8, 16, 10, 0, 0, tzinfo=timezone.utc)
        ts3 = datetime(2026, 8, 16, 10, 10, 0, tzinfo=timezone.utc)

        p_hash1 = compute_payload_hash(1, "admin@procure.com", "CREATE", "user", "1", None, {"name": "Admin"}, None, "127.0.0.1", "CLI")
        sig1 = compute_hash_signature(GENESIS_PREVIOUS_HASH, p_hash1, ts1, 1)

        p_hash3 = compute_payload_hash(1, "admin@procure.com", "DELETE", "user", "1", {"name": "Admin"}, None, None, "127.0.0.1", "CLI")
        sig3 = compute_hash_signature(sig1, p_hash3, ts3, 3)

        # Attacker deleted sequence 2 entirely from the database!
        mock_conn.fetch.return_value = [
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procure.com",
                "action_type": "CREATE",
                "entity_type": "user",
                "entity_id": "1",
                "old_values": None,
                "new_values": {"name": "Admin"},
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "CLI",
                "timestamp": ts1,
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": p_hash1,
                "hash_signature": sig1,
            },
            {
                "log_id": 3,
                "sequence_number": 3,  # Gap: expected 2!
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procure.com",
                "action_type": "DELETE",
                "entity_type": "user",
                "entity_id": "1",
                "old_values": {"name": "Admin"},
                "new_values": None,
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "CLI",
                "timestamp": ts3,
                "previous_hash": sig1,
                "payload_hash": p_hash3,
                "hash_signature": sig3,
            }
        ]

        report = await verify_audit_log_integrity(mock_conn)
        assert report.is_valid is False
        assert any(a.anomaly_type == "MISSING_SEQUENCE_GAP" for a in report.anomalies)


# ============================================================
# 5. Admin Audit Endpoints API Tests
# ============================================================
class TestAdminAuditAPI:
    @pytest.mark.asyncio
    async def test_admin_logs_endpoint_success(self):
        app.dependency_overrides[get_current_admin_user] = lambda: {
            "user_id": 1,
            "admin_role": "SuperAdmin",
            "email": "admin@procurenext.com",
        }

        mock_conn = AsyncMock()
        mock_conn.fetchval.return_value = 1
        mock_conn.fetch.return_value = [
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procurenext.com",
                "action_type": "LOGIN",
                "entity_type": "auth",
                "entity_id": "1",
                "old_values": None,
                "new_values": {"status": "success"},
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "Chrome",
                "timestamp": datetime.now(timezone.utc),
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": "1" * 64,
                "hash_signature": "2" * 64,
            }
        ]

        with patch("app.modules.audit.router.get_db_connection", return_value=_mock_db_ctx(mock_conn)()):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/admin/audit/logs?page=1&limit=10")
                assert res.status_code == 200
                data = res.json()
                assert data["total"] == 1
                assert len(data["logs"]) == 1
                assert data["logs"][0]["action_type"] == "LOGIN"

    @pytest.mark.asyncio
    async def test_admin_audit_verify_endpoint(self):
        app.dependency_overrides[get_current_admin_user] = lambda: {
            "user_id": 1,
            "admin_role": "SuperAdmin",
            "email": "admin@procurenext.com",
        }

        mock_conn = AsyncMock()
        ts = datetime(2026, 8, 16, 10, 0, 0, tzinfo=timezone.utc)
        p_hash = compute_payload_hash(1, "admin@procure.com", "CREATE", "tender", "1", None, {"title": "Test"}, None, "127.0.0.1", "CLI")
        sig = compute_hash_signature(GENESIS_PREVIOUS_HASH, p_hash, ts, 1)

        mock_conn.fetch.return_value = [
            {
                "log_id": 1,
                "sequence_number": 1,
                "event_uuid": uuid4(),
                "user_id": 1,
                "user_email": "admin@procure.com",
                "action_type": "CREATE",
                "entity_type": "tender",
                "entity_id": "1",
                "old_values": None,
                "new_values": {"title": "Test"},
                "change_diff": None,
                "ip_address": "127.0.0.1",
                "user_agent": "CLI",
                "timestamp": ts,
                "previous_hash": GENESIS_PREVIOUS_HASH,
                "payload_hash": p_hash,
                "hash_signature": sig,
            }
        ]

        with patch("app.modules.audit.router.get_db_connection", return_value=_mock_db_ctx(mock_conn)()):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/admin/audit/verify")
                assert res.status_code == 200
                data = res.json()
                assert data["is_valid"] is True
                assert data["total_records_checked"] == 1

    @pytest.mark.asyncio
    async def test_admin_audit_stats_endpoint(self):
        app.dependency_overrides[get_current_admin_user] = lambda: {
            "user_id": 1,
            "admin_role": "SuperAdmin",
            "email": "admin@procurenext.com",
        }

        mock_conn = AsyncMock()
        mock_conn.fetchval.side_effect = [150, 2, 5]  # total_logs, pending outbox, archives
        mock_conn.fetchrow.return_value = {
            "sequence_number": 150,
            "timestamp": datetime.now(timezone.utc),
        }

        with patch("app.modules.audit.router.get_db_connection", return_value=_mock_db_ctx(mock_conn)()):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/admin/audit/stats")
                assert res.status_code == 200
                data = res.json()
                assert data["total_logs"] == 150
                assert data["total_outbox_pending"] == 2
                assert data["is_chain_healthy"] is True

    @pytest.mark.asyncio
    async def test_unauthenticated_audit_access_forbidden(self):
        # When no admin override or invalid token
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/admin/audit/logs")
            assert res.status_code in (401, 403)
