from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
import asyncpg

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_admin_user
from app.modules.audit.schemas import (
    AuditLogResponse,
    AuditLogListResponse,
    AuditIntegrityCheckReport,
    AuditStatsResponse,
    AuditArchiveListResponse,
)
from app.modules.audit.service import (
    get_audit_logs,
    get_audit_log_by_id,
    get_entity_audit_trail,
    verify_audit_log_integrity,
    get_audit_stats,
    list_audit_archives,
    process_audit_outbox_batch,
)

router = APIRouter(prefix="/admin/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = Query(None),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin_user),
):
    """
    Search and retrieve paginated audit logs with multi-dimensional filtering.
    Restricted to Platform Administrators.
    """
    try:
        async with get_db_connection() as connection:
            return await get_audit_logs(
                connection=connection,
                page=page,
                limit=limit,
                user_id=user_id,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                date_from=date_from,
                date_to=date_to,
                search=search,
            )
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log_endpoint(
    log_id: int,
    admin: dict = Depends(get_current_admin_user),
):
    """
    Retrieve single audit log entry by ID.
    """
    try:
        async with get_db_connection() as connection:
            log = await get_audit_log_by_id(connection, log_id)
            if not log:
                raise HTTPException(status_code=404, detail="Audit log entry not found")
            return log
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[AuditLogResponse])
async def get_entity_audit_trail_endpoint(
    entity_type: str,
    entity_id: str,
    admin: dict = Depends(get_current_admin_user),
):
    """
    Retrieve chronological audit lifecycle for a specific entity (tender, bid, user, org, payment).
    """
    try:
        async with get_db_connection() as connection:
            return await get_entity_audit_trail(connection, entity_type, entity_id)
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc


@router.get("/verify", response_model=AuditIntegrityCheckReport)
async def verify_audit_integrity_endpoint(
    from_sequence: int = Query(1, ge=1),
    to_sequence: Optional[int] = Query(None),
    admin: dict = Depends(get_current_admin_user),
):
    """
    On-demand Intrusion Detection System (IDS) verification.
    Recalculates cryptographic hash chain from genesis to detect tampering.
    """
    try:
        async with get_db_connection() as connection:
            return await verify_audit_log_integrity(
                connection=connection,
                from_sequence=from_sequence,
                to_sequence=to_sequence,
            )
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats_endpoint(
    admin: dict = Depends(get_current_admin_user),
):
    """
    Retrieve overall audit metrics, pending outbox size, and chain status.
    """
    try:
        async with get_db_connection() as connection:
            return await get_audit_stats(connection)
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc


@router.get("/archives", response_model=AuditArchiveListResponse)
async def list_audit_archives_endpoint(
    limit: int = Query(50, ge=1, le=100),
    admin: dict = Depends(get_current_admin_user),
):
    """
    List air-gapped sealed audit log archive batches with Merkle Root signatures.
    """
    try:
        async with get_db_connection() as connection:
            return await list_audit_archives(connection, limit=limit)
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc


@router.post("/process-outbox")
async def trigger_outbox_processing_endpoint(
    batch_size: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_current_admin_user),
):
    """
    Manually trigger draining of the transactional audit outbox.
    """
    try:
        async with get_db_connection() as connection:
            processed = await process_audit_outbox_batch(connection, batch_size=batch_size)
            return {"status": "success", "processed_records": processed}
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
