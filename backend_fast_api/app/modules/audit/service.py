import json
import hashlib
import time
from datetime import datetime, timezone
from typing import Optional, Any
from uuid import uuid4, UUID
import asyncpg

from app.modules.audit.schemas import (
    AuditLogCreate,
    AuditLogResponse,
    AuditLogListResponse,
    AuditIntegrityCheckReport,
    AuditTamperAnomaly,
    AuditStatsResponse,
    AuditArchiveResponse,
    AuditArchiveListResponse,
)

GENESIS_PREVIOUS_HASH = "0" * 64


def canonical_json_dumps(obj: Any) -> str:
    """
    Serialize data to a deterministic, sorted-key JSON string
    for cryptographic hash consistency across platforms.
    """
    def _default(val: Any):
        if isinstance(val, (datetime,)):
            return val.isoformat()
        if isinstance(val, UUID):
            return str(val)
        return str(val)

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), default=_default)


def compute_payload_hash(
    user_id: Optional[int],
    user_email: Optional[str],
    action_type: str,
    entity_type: str,
    entity_id: str,
    old_values: Optional[dict[str, Any]],
    new_values: Optional[dict[str, Any]],
    change_diff: Optional[dict[str, Any]],
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> str:
    payload_dict = {
        "user_id": user_id,
        "user_email": user_email,
        "action_type": action_type,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "old_values": old_values,
        "new_values": new_values,
        "change_diff": change_diff,
        "ip_address": ip_address,
        "user_agent": user_agent,
    }
    canonical_str = canonical_json_dumps(payload_dict)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def compute_hash_signature(
    previous_hash: str,
    payload_hash: str,
    timestamp: datetime,
    sequence_number: int,
) -> str:
    ts_str = timestamp.isoformat()
    raw = f"{previous_hash}:{payload_hash}:{ts_str}:{sequence_number}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def compute_merkle_root(signatures: list[str]) -> str:
    """
    Compute a Merkle Tree Root for a list of hash signatures.
    """
    if not signatures:
        return GENESIS_PREVIOUS_HASH
    
    current_level = [s for s in signatures]
    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            left = current_level[i]
            right = current_level[i + 1] if i + 1 < len(current_level) else left
            combined = hashlib.sha256(f"{left}:{right}".encode("utf-8")).hexdigest()
            next_level.append(combined)
        current_level = next_level
    return current_level[0]


async def write_to_audit_outbox(
    connection: asyncpg.Connection,
    action_type: str,
    entity_type: str,
    entity_id: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    old_values: Optional[dict[str, Any]] = None,
    new_values: Optional[dict[str, Any]] = None,
    change_diff: Optional[dict[str, Any]] = None,
) -> int:
    """
    Transactional outbox writer. Called within business transactions
    to buffer events before sequential cryptographic chaining.
    """
    old_json = json.dumps(old_values) if old_values is not None else None
    new_json = json.dumps(new_values) if new_values is not None else None
    diff_json = json.dumps(change_diff) if change_diff is not None else None

    row = await connection.fetchrow(
        """
        INSERT INTO audit_outbox (
            action_type,
            entity_type,
            entity_id,
            user_id,
            user_email,
            ip_address,
            user_agent,
            old_values,
            new_values,
            change_diff,
            status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, 'PENDING')
        RETURNING outbox_id
        """,
        action_type,
        entity_type,
        str(entity_id),
        user_id,
        user_email,
        ip_address,
        user_agent,
        old_json,
        new_json,
        diff_json,
    )
    return row["outbox_id"]


async def create_audit_log_entry(
    connection: asyncpg.Connection,
    log_create: AuditLogCreate,
    event_uuid: Optional[UUID] = None,
    timestamp: Optional[datetime] = None,
) -> dict:
    """
    Append-only WORM Cryptographic Hash Chaining creator.
    Acquires exclusive tail lock to guarantee sequential integrity.
    """
    if event_uuid is None:
        event_uuid = uuid4()
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    # 1. Lock the tail of audit_logs to prevent concurrent chain divergence
    tail_row = await connection.fetchrow(
        """
        SELECT sequence_number, hash_signature
        FROM audit_logs
        ORDER BY sequence_number DESC
        LIMIT 1
        FOR UPDATE
        """
    )

    if tail_row is None:
        sequence_number = 1
        previous_hash = GENESIS_PREVIOUS_HASH
    else:
        sequence_number = tail_row["sequence_number"] + 1
        previous_hash = tail_row["hash_signature"]

    # 2. Compute payload hash and signature
    payload_hash = compute_payload_hash(
        user_id=log_create.user_id,
        user_email=log_create.user_email,
        action_type=log_create.action_type,
        entity_type=log_create.entity_type,
        entity_id=log_create.entity_id,
        old_values=log_create.old_values,
        new_values=log_create.new_values,
        change_diff=log_create.change_diff,
        ip_address=log_create.ip_address,
        user_agent=log_create.user_agent,
    )

    hash_signature = compute_hash_signature(
        previous_hash=previous_hash,
        payload_hash=payload_hash,
        timestamp=timestamp,
        sequence_number=sequence_number,
    )

    old_json = json.dumps(log_create.old_values) if log_create.old_values is not None else None
    new_json = json.dumps(log_create.new_values) if log_create.new_values is not None else None
    diff_json = json.dumps(log_create.change_diff) if log_create.change_diff is not None else None

    # 3. Insert into append-only WORM table
    inserted_row = await connection.fetchrow(
        """
        INSERT INTO audit_logs (
            sequence_number,
            event_uuid,
            user_id,
            user_email,
            action_type,
            entity_type,
            entity_id,
            old_values,
            new_values,
            change_diff,
            ip_address,
            user_agent,
            timestamp,
            previous_hash,
            payload_hash,
            hash_signature
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8::jsonb, $9::jsonb, $10::jsonb,
            $11, $12, $13, $14, $15, $16
        )
        RETURNING *
        """,
        sequence_number,
        event_uuid,
        log_create.user_id,
        log_create.user_email,
        log_create.action_type,
        log_create.entity_type,
        str(log_create.entity_id),
        old_json,
        new_json,
        diff_json,
        log_create.ip_address,
        log_create.user_agent,
        timestamp,
        previous_hash,
        payload_hash,
        hash_signature,
    )

    return _format_audit_row(inserted_row)


async def process_audit_outbox_batch(
    connection: asyncpg.Connection,
    batch_size: int = 100,
) -> int:
    """
    Pulls pending events from audit_outbox and processes them sequentially
    into the cryptographic audit_logs chain.
    """
    rows = await connection.fetch(
        """
        SELECT *
        FROM audit_outbox
        WHERE status = 'PENDING'
        ORDER BY outbox_id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        """,
        batch_size,
    )

    if not rows:
        return 0

    processed_count = 0
    for r in rows:
        old_val = json.loads(r["old_values"]) if isinstance(r["old_values"], str) else r["old_values"]
        new_val = json.loads(r["new_values"]) if isinstance(r["new_values"], str) else r["new_values"]
        diff_val = json.loads(r["change_diff"]) if isinstance(r["change_diff"], str) else r["change_diff"]

        log_create = AuditLogCreate(
            action_type=r["action_type"],
            entity_type=r["entity_type"],
            entity_id=r["entity_id"],
            user_id=r["user_id"],
            user_email=r["user_email"],
            ip_address=r["ip_address"],
            user_agent=r["user_agent"],
            old_values=old_val,
            new_values=new_val,
            change_diff=diff_val,
        )

        try:
            await create_audit_log_entry(
                connection,
                log_create,
                event_uuid=r["event_uuid"],
                timestamp=r["created_at"],
            )

            await connection.execute(
                """
                UPDATE audit_outbox
                SET status = 'PROCESSED', processed_at = NOW()
                WHERE outbox_id = $1
                """,
                r["outbox_id"],
            )
            processed_count += 1
        except Exception as e:
            await connection.execute(
                """
                UPDATE audit_outbox
                SET status = 'FAILED', error_message = $2
                WHERE outbox_id = $1
                """,
                r["outbox_id"],
                str(e),
            )

    return processed_count


async def verify_audit_log_integrity(
    connection: asyncpg.Connection,
    from_sequence: int = 1,
    to_sequence: Optional[int] = None,
) -> AuditIntegrityCheckReport:
    """
    Intrusion Detection System (IDS): Sequentially recalculates and verifies
    the entire cryptographic hash chain.
    """
    start_time = time.perf_counter()
    now = datetime.now(timezone.utc)

    if to_sequence is not None:
        rows = await connection.fetch(
            """
            SELECT *
            FROM audit_logs
            WHERE sequence_number >= $1 AND sequence_number <= $2
            ORDER BY sequence_number ASC
            """,
            from_sequence,
            to_sequence,
        )
    else:
        rows = await connection.fetch(
            """
            SELECT *
            FROM audit_logs
            WHERE sequence_number >= $1
            ORDER BY sequence_number ASC
            """,
            from_sequence,
        )

    anomalies: list[AuditTamperAnomaly] = []

    if not rows:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        return AuditIntegrityCheckReport(
            is_valid=True,
            total_records_checked=0,
            genesis_sequence=None,
            terminal_sequence=None,
            anomalies=[],
            verification_duration_ms=round(duration_ms, 2),
            verified_at=now,
            message="No audit log records found to verify.",
        )

    genesis_seq = rows[0]["sequence_number"]
    terminal_seq = rows[-1]["sequence_number"]

    # Determine previous hash before the first checked row
    if genesis_seq == 1:
        expected_prev_hash = GENESIS_PREVIOUS_HASH
    else:
        prev_row = await connection.fetchrow(
            "SELECT hash_signature FROM audit_logs WHERE sequence_number = $1",
            genesis_seq - 1,
        )
        expected_prev_hash = prev_row["hash_signature"] if prev_row else GENESIS_PREVIOUS_HASH

    expected_seq = genesis_seq

    for row in rows:
        seq = row["sequence_number"]
        log_id = row["log_id"]
        ts = row["timestamp"]

        # 1. Check sequence number continuity
        if seq != expected_seq:
            anomalies.append(
                AuditTamperAnomaly(
                    sequence_number=seq,
                    log_id=log_id,
                    anomaly_type="MISSING_SEQUENCE_GAP",
                    expected_value=str(expected_seq),
                    actual_value=str(seq),
                    timestamp=ts,
                    details=f"Sequence number gap detected! Expected {expected_seq}, found {seq}.",
                )
            )

        # 2. Check previous_hash link
        actual_prev_hash = row["previous_hash"]
        if actual_prev_hash != expected_prev_hash:
            anomalies.append(
                AuditTamperAnomaly(
                    sequence_number=seq,
                    log_id=log_id,
                    anomaly_type="PREVIOUS_HASH_MISMATCH",
                    expected_value=expected_prev_hash,
                    actual_value=actual_prev_hash,
                    timestamp=ts,
                    details="Broken chain pointer! Current row previous_hash does not match preceding hash signature.",
                )
            )

        # 3. Recalculate payload hash
        old_val = json.loads(row["old_values"]) if isinstance(row["old_values"], str) else row["old_values"]
        new_val = json.loads(row["new_values"]) if isinstance(row["new_values"], str) else row["new_values"]
        diff_val = json.loads(row["change_diff"]) if isinstance(row["change_diff"], str) else row["change_diff"]

        recalculated_payload_hash = compute_payload_hash(
            user_id=row["user_id"],
            user_email=row["user_email"],
            action_type=row["action_type"],
            entity_type=row["entity_type"],
            entity_id=row["entity_id"],
            old_values=old_val,
            new_values=new_val,
            change_diff=diff_val,
            ip_address=row["ip_address"],
            user_agent=row["user_agent"],
        )

        if recalculated_payload_hash != row["payload_hash"]:
            anomalies.append(
                AuditTamperAnomaly(
                    sequence_number=seq,
                    log_id=log_id,
                    anomaly_type="PAYLOAD_TAMPERED",
                    expected_value=recalculated_payload_hash,
                    actual_value=row["payload_hash"],
                    timestamp=ts,
                    details="Payload content tampered! Recalculated payload hash does not match recorded payload_hash.",
                )
            )

        # 4. Recalculate full hash signature
        recalculated_sig = compute_hash_signature(
            previous_hash=actual_prev_hash,
            payload_hash=row["payload_hash"],
            timestamp=ts,
            sequence_number=seq,
        )

        if recalculated_sig != row["hash_signature"]:
            anomalies.append(
                AuditTamperAnomaly(
                    sequence_number=seq,
                    log_id=log_id,
                    anomaly_type="SIGNATURE_TAMPERED",
                    expected_value=recalculated_sig,
                    actual_value=row["hash_signature"],
                    timestamp=ts,
                    details="Cryptographic signature invalid! Row signature failed verification.",
                )
            )

        # Advance expectation
        expected_prev_hash = row["hash_signature"]
        expected_seq = seq + 1

    duration_ms = (time.perf_counter() - start_time) * 1000.0
    is_valid = len(anomalies) == 0

    message = (
        f"Chain validation verified {len(rows)} records successfully. 0 tampering detected."
        if is_valid
        else f"SECURITY ALERT: {len(anomalies)} integrity violations detected in audit chain!"
    )

    return AuditIntegrityCheckReport(
        is_valid=is_valid,
        total_records_checked=len(rows),
        genesis_sequence=genesis_seq,
        terminal_sequence=terminal_seq,
        anomalies=anomalies,
        verification_duration_ms=round(duration_ms, 2),
        verified_at=now,
        message=message,
    )


async def get_audit_logs(
    connection: asyncpg.Connection,
    page: int = 1,
    limit: int = 50,
    user_id: Optional[int] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
) -> AuditLogListResponse:
    """
    Paginated and filtered retrieval of audit logs for Admin compliance inspection.
    """
    conditions = []
    params = []
    p_idx = 1

    if user_id is not None:
        conditions.append(f"user_id = ${p_idx}")
        params.append(user_id)
        p_idx += 1

    if action_type:
        conditions.append(f"action_type = ${p_idx}")
        params.append(action_type)
        p_idx += 1

    if entity_type:
        conditions.append(f"entity_type = ${p_idx}")
        params.append(entity_type)
        p_idx += 1

    if entity_id:
        conditions.append(f"entity_id = ${p_idx}")
        params.append(str(entity_id))
        p_idx += 1

    if date_from:
        conditions.append(f"timestamp >= ${p_idx}")
        params.append(date_from)
        p_idx += 1

    if date_to:
        conditions.append(f"timestamp <= ${p_idx}")
        params.append(date_to)
        p_idx += 1

    if search:
        conditions.append(f"(user_email ILIKE ${p_idx} OR action_type ILIKE ${p_idx} OR entity_id ILIKE ${p_idx})")
        params.append(f"%{search}%")
        p_idx += 1

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    count_query = f"SELECT COUNT(*) FROM audit_logs {where_clause}"
    total = await connection.fetchval(count_query, *params)

    offset = (page - 1) * limit
    params.extend([limit, offset])

    data_query = f"""
        SELECT *
        FROM audit_logs
        {where_clause}
        ORDER BY sequence_number DESC
        LIMIT ${p_idx} OFFSET ${p_idx + 1}
    """
    rows = await connection.fetch(data_query, *params)
    logs = [_format_audit_row(r) for r in rows]

    return AuditLogListResponse(
        total=total or 0,
        page=page,
        limit=limit,
        logs=logs,
    )


async def get_audit_log_by_id(
    connection: asyncpg.Connection,
    log_id: int,
) -> Optional[AuditLogResponse]:
    row = await connection.fetchrow(
        "SELECT * FROM audit_logs WHERE log_id = $1",
        log_id,
    )
    if not row:
        return None
    return _format_audit_row(row)


async def get_entity_audit_trail(
    connection: asyncpg.Connection,
    entity_type: str,
    entity_id: str,
) -> list[AuditLogResponse]:
    rows = await connection.fetch(
        """
        SELECT *
        FROM audit_logs
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY sequence_number ASC
        """,
        entity_type,
        str(entity_id),
    )
    return [_format_audit_row(r) for r in rows]


async def get_audit_stats(
    connection: asyncpg.Connection,
) -> AuditStatsResponse:
    total_logs = await connection.fetchval("SELECT COUNT(*) FROM audit_logs") or 0
    total_pending = await connection.fetchval("SELECT COUNT(*) FROM audit_outbox WHERE status = 'PENDING'") or 0
    
    last_row = await connection.fetchrow(
        "SELECT sequence_number, timestamp FROM audit_logs ORDER BY sequence_number DESC LIMIT 1"
    )
    archives_count = await connection.fetchval("SELECT COUNT(*) FROM audit_archives") or 0

    return AuditStatsResponse(
        total_logs=total_logs,
        total_outbox_pending=total_pending,
        last_sequence_number=last_row["sequence_number"] if last_row else None,
        last_log_timestamp=last_row["timestamp"] if last_row else None,
        is_chain_healthy=True,
        archives_count=archives_count,
    )


async def seal_audit_archive_batch(
    connection: asyncpg.Connection,
    batch_reference: str,
    sequence_start: int,
    sequence_end: int,
    storage_path: str,
    file_size_bytes: int,
) -> AuditArchiveResponse:
    """
    Computes Merkle Root and seals a batch archive.
    """
    rows = await connection.fetch(
        """
        SELECT hash_signature
        FROM audit_logs
        WHERE sequence_number >= $1 AND sequence_number <= $2
        ORDER BY sequence_number ASC
        """,
        sequence_start,
        sequence_end,
    )

    if not rows:
        raise ValueError(f"No audit logs found in range {sequence_start}..{sequence_end}")

    signatures = [r["hash_signature"] for r in rows]
    genesis_hash = signatures[0]
    terminal_hash = signatures[-1]
    merkle_root = compute_merkle_root(signatures)

    inserted = await connection.fetchrow(
        """
        INSERT INTO audit_archives (
            batch_reference,
            sequence_start,
            sequence_end,
            record_count,
            genesis_hash,
            terminal_hash,
            merkle_root,
            storage_path,
            file_size_bytes,
            sealed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
        """,
        batch_reference,
        sequence_start,
        sequence_end,
        len(signatures),
        genesis_hash,
        terminal_hash,
        merkle_root,
        storage_path,
        file_size_bytes,
    )

    return AuditArchiveResponse.model_validate(dict(inserted))


async def list_audit_archives(
    connection: asyncpg.Connection,
    limit: int = 50,
) -> AuditArchiveListResponse:
    rows = await connection.fetch(
        "SELECT * FROM audit_archives ORDER BY sequence_end DESC LIMIT $1",
        limit,
    )
    total = await connection.fetchval("SELECT COUNT(*) FROM audit_archives") or 0
    archives = [AuditArchiveResponse.model_validate(dict(r)) for r in rows]
    return AuditArchiveListResponse(total=total, archives=archives)


def _format_audit_row(row: asyncpg.Record) -> AuditLogResponse:
    d = dict(row)
    if isinstance(d.get("old_values"), str):
        d["old_values"] = json.loads(d["old_values"])
    if isinstance(d.get("new_values"), str):
        d["new_values"] = json.loads(d["new_values"])
    if isinstance(d.get("change_diff"), str):
        d["change_diff"] = json.loads(d["change_diff"])

    return AuditLogResponse(
        log_id=d["log_id"],
        sequence_number=d["sequence_number"],
        event_uuid=d["event_uuid"],
        user_id=d["user_id"],
        user_email=d["user_email"],
        action_type=d["action_type"],
        entity_type=d["entity_type"],
        entity_id=str(d["entity_id"]),
        old_values=d["old_values"],
        new_values=d["new_values"],
        change_diff=d["change_diff"],
        ip_address=d["ip_address"],
        user_agent=d["user_agent"],
        timestamp=d["timestamp"],
        previous_hash=d["previous_hash"],
        payload_hash=d["payload_hash"],
        hash_signature=d["hash_signature"],
    )
