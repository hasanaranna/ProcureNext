import pytest
import os
import ssl
import json
from uuid import uuid4
from datetime import datetime, timezone
import asyncpg
from app.core.database_url import get_database_url
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import (
    create_audit_log_entry,
    verify_audit_log_integrity,
    process_audit_outbox_batch,
    write_to_audit_outbox,
)

@pytest.mark.asyncio
async def test_live_supabase_schema_and_worm_integrity():
    db_url = get_database_url()
    if not db_url:
        pytest.skip("No DATABASE_URL configured in environment.")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    conn = await asyncpg.connect(db_url, ssl=ssl_ctx, statement_cache_size=0, timeout=15)

    try:
        # 1. Inspect tables & columns
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        table_names = [t["table_name"] for t in tables]
        assert "audit_logs" in table_names
        assert "audit_outbox" in table_names
        assert "audit_archives" in table_names
        assert "bid_documents" in table_names

        # 2. Check bid_documents has req_doc_id
        bid_doc_cols = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bid_documents';
        """)
        col_names = [c["column_name"] for c in bid_doc_cols]
        assert "req_doc_id" in col_names

        # 3. Test Outbox & Cryptographic Chaining
        test_entity_id = f"SANITY-TEST-{uuid4()}"
        outbox_id = await write_to_audit_outbox(
            connection=conn,
            action_type="SANITY_CHECK",
            entity_type="system_test",
            entity_id=test_entity_id,
            user_id=None,
            user_email="system@procurenext.com",
            new_values={"test": "ok", "timestamp": datetime.now(timezone.utc).isoformat()},
        )
        assert outbox_id > 0

        # Process the outbox record
        processed = await process_audit_outbox_batch(conn, batch_size=10)
        assert processed >= 1

        # Retrieve the inserted audit log
        created_log = await conn.fetchrow(
            "SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY log_id DESC LIMIT 1",
            test_entity_id,
        )
        assert created_log is not None
        assert created_log["sequence_number"] >= 1
        assert len(created_log["hash_signature"]) == 64
        assert len(created_log["previous_hash"]) == 64

        # 4. Test WORM Enforcement: Attempt to UPDATE audit_logs (MUST FAIL with trigger exception)
        with pytest.raises(asyncpg.PostgresError) as exc_info:
            await conn.execute(
                "UPDATE audit_logs SET user_email = 'hacker@compromised.com' WHERE log_id = $1",
                created_log["log_id"],
            )
        print(f"\n[WORM TEST PASSED] PostgreSQL blocked UPDATE as expected: {exc_info.value}")

        # 5. Test IDS Integrity Verification on live chain
        report = await verify_audit_log_integrity(conn)
        print(f"[IDS TEST PASSED] Checked {report.total_records_checked} rows in {report.verification_duration_ms}ms. Valid: {report.is_valid}")
        assert report.is_valid is True
        assert len(report.anomalies) == 0

    finally:
        await conn.close()
