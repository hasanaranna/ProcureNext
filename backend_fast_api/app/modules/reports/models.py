# ============================================================
# reports/models.py - Reporting SQLAlchemy Models
# ============================================================
# Maps to ERD Module 14 (Reporting).
#
# TABLES:
#
# SYSTEM_METRICS (pre-computed analytics cache)
#   - metric_id (PK, SERIAL)
#   - metric_type (VARCHAR) - e.g., "total_tenders", "monthly_revenue",
#     "active_users", "avg_bids_per_tender"
#   - value (NUMERIC)
#   - metadata (JSONB, NULLABLE) - additional context
#   - calculated_at (TIMESTAMP)
#
# This table stores periodically computed metrics to avoid
# expensive real-time aggregation queries on every dashboard load.
# A Celery periodic task refreshes these metrics.
# ============================================================
