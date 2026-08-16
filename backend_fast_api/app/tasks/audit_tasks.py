import os
import json
import logging
import asyncio
from datetime import datetime, timezone
import asyncpg

from app.tasks.celery_app import celery_app
from app.core.database_url import get_database_url
from app.modules.audit.service import (
    process_audit_outbox_batch,
    verify_audit_log_integrity,
    seal_audit_archive_batch,
)
from app.services.supabase_storage import upload_local_file

logger = logging.getLogger(__name__)


@celery_app.task(name="process_audit_outbox_task")
def process_audit_outbox_task(batch_size: int = 100):
    """
    Celery task to drain pending outbox records and cryptographically chain them.
    """
    return asyncio.run(_async_process_outbox(batch_size))


async def _async_process_outbox(batch_size: int = 100) -> int:
    try:
        conn = await asyncpg.connect(get_database_url(), ssl="require", statement_cache_size=0)
    except Exception as e:
        logger.error(f"Audit outbox worker failed to connect to DB: {e}")
        return 0

    try:
        processed = await process_audit_outbox_batch(conn, batch_size=batch_size)
        logger.info(f"Audit outbox task processed {processed} records.")
        return processed
    except Exception as e:
        logger.error(f"Error in process_audit_outbox_batch: {e}")
        return 0
    finally:
        await conn.close()


@celery_app.task(name="audit_tamper_detection_check_task")
def audit_tamper_detection_check_task():
    """
    Periodic active tamper-detection health check (Intrusion Detection System).
    Walks through the entire cryptographic hash chain.
    """
    return asyncio.run(_async_tamper_detection())


async def _async_tamper_detection():
    try:
        conn = await asyncpg.connect(get_database_url(), ssl="require", statement_cache_size=0)
    except Exception as e:
        logger.error(f"Tamper detection task failed to connect to DB: {e}")
        return

    try:
        report = await verify_audit_log_integrity(conn)
        if not report.is_valid:
            logger.critical(
                f"[SECURITY BREACH ALERT] Audit hash chain integrity failed! "
                f"Anomalies detected: {len(report.anomalies)}. "
                f"Details: {[a.model_dump() for a in report.anomalies]}"
            )
            # Record security alert in outbox / logs for high-priority notification
            await conn.execute(
                """
                INSERT INTO audit_outbox (
                    action_type,
                    entity_type,
                    entity_id,
                    new_values
                ) VALUES (
                    'SECURITY_BREACH_DETECTED',
                    'audit_logs',
                    'TAMPER_ALERT',
                    $1::jsonb
                )
                """,
                json.dumps({
                    "alert": "Cryptographic Hash Chain Broken",
                    "anomalies_count": len(report.anomalies),
                    "anomalies": [a.model_dump() for a in report.anomalies],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }),
            )
        else:
            logger.info(f"Audit integrity verification PASSED. Checked {report.total_records_checked} rows in {report.verification_duration_ms}ms.")
    except Exception as e:
        logger.error(f"Error during tamper detection check: {e}")
    finally:
        await conn.close()


@celery_app.task(name="archive_audit_logs_task")
def archive_audit_logs_task(batch_size: int = 1000):
    """
    Air-gapped / immutable batch archiver.
    Exports verified logs, creates Merkle seal, and uploads to storage.
    """
    return asyncio.run(_async_archive_logs(batch_size))


async def _async_archive_logs(batch_size: int = 1000):
    try:
        conn = await asyncpg.connect(get_database_url(), ssl="require", statement_cache_size=0)
    except Exception as e:
        logger.error(f"Audit archiver task failed to connect to DB: {e}")
        return None

    try:
        # Check last archived sequence
        last_archived_seq = await conn.fetchval(
            "SELECT COALESCE(MAX(sequence_end), 0) FROM audit_archives"
        )
        current_max_seq = await conn.fetchval(
            "SELECT COALESCE(MAX(sequence_number), 0) FROM audit_logs"
        )

        unarchived_count = current_max_seq - last_archived_seq
        if unarchived_count < batch_size:
            logger.info(f"Only {unarchived_count} unarchived logs available. Minimum batch size is {batch_size}.")
            return None

        start_seq = last_archived_seq + 1
        end_seq = last_archived_seq + batch_size

        rows = await conn.fetch(
            """
            SELECT *
            FROM audit_logs
            WHERE sequence_number >= $1 AND sequence_number <= $2
            ORDER BY sequence_number ASC
            """,
            start_seq,
            end_seq,
        )

        if not rows:
            return None

        batch_ref = f"ARCHIVE-{datetime.now(timezone.utc).strftime('%Y%m%d')}-SEQ-{start_seq:08d}-{end_seq:08d}"
        local_dir = "/tmp/audit_archives"
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, f"{batch_ref}.jsonl")

        with open(local_path, "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(dict(r), default=str) + "\n")

        file_size = os.path.getsize(local_path)
        storage_prefix = f"audit-archives/{datetime.now(timezone.utc).strftime('%Y/%m')}"

        try:
            public_url = await upload_local_file(
                local_path=local_path,
                filename=f"{batch_ref}.jsonl",
                prefix=storage_prefix,
            )
        finally:
            if os.path.exists(local_path):
                os.remove(local_path)

        archive = await seal_audit_archive_batch(
            connection=conn,
            batch_reference=batch_ref,
            sequence_start=start_seq,
            sequence_end=end_seq,
            storage_path=public_url,
            file_size_bytes=file_size,
        )

        logger.info(f"Successfully sealed audit archive {batch_ref} with Merkle root {archive.merkle_root}.")
        return archive.batch_reference
    except Exception as e:
        logger.error(f"Failed to archive audit logs: {e}")
        return None
    finally:
        await conn.close()
