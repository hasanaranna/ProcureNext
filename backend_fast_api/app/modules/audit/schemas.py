from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class AuditLogCreate(BaseModel):
    action_type: str
    entity_type: str
    entity_id: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    old_values: Optional[dict[str, Any]] = None
    new_values: Optional[dict[str, Any]] = None
    change_diff: Optional[dict[str, Any]] = None

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: int
    sequence_number: int
    event_uuid: UUID
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action_type: str
    entity_type: str
    entity_id: str
    old_values: Optional[dict[str, Any]] = None
    new_values: Optional[dict[str, Any]] = None
    change_diff: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    previous_hash: str
    payload_hash: str
    hash_signature: str

class AuditLogListResponse(BaseModel):
    total: int
    page: int
    limit: int
    logs: list[AuditLogResponse]

class AuditTamperAnomaly(BaseModel):
    sequence_number: int
    log_id: Optional[int] = None
    anomaly_type: str  # MISSING_SEQUENCE, PREV_HASH_MISMATCH, PAYLOAD_HASH_MISMATCH, SIGNATURE_MISMATCH
    expected_value: str
    actual_value: str
    timestamp: Optional[datetime] = None
    details: str

class AuditIntegrityCheckReport(BaseModel):
    is_valid: bool
    total_records_checked: int
    genesis_sequence: Optional[int] = None
    terminal_sequence: Optional[int] = None
    anomalies: list[AuditTamperAnomaly]
    verification_duration_ms: float
    verified_at: datetime
    message: str

class AuditArchiveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    archive_id: int
    batch_reference: str
    sequence_start: int
    sequence_end: int
    record_count: int
    genesis_hash: str
    terminal_hash: str
    merkle_root: str
    storage_path: str
    file_size_bytes: int
    sealed_at: datetime
    verified_at: Optional[datetime] = None

class AuditArchiveListResponse(BaseModel):
    total: int
    archives: list[AuditArchiveResponse]

class AuditStatsResponse(BaseModel):
    total_logs: int
    total_outbox_pending: int
    last_sequence_number: Optional[int] = None
    last_log_timestamp: Optional[datetime] = None
    is_chain_healthy: bool
    archives_count: int
