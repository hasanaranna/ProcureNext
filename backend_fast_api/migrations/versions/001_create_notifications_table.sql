-- ============================================================
-- Migration: Replace legacy NOTIFICATIONS table with new schema
-- ============================================================
-- The old schema had columns: created_by, reference_type, reference_id, type_id
-- The new schema uses: user_id FK, title, message, type (varchar), action_url, is_read
--
-- Applied automatically on backend startup via create_notifications_table() in db.py
-- For manual application against the remote DB, run these statements in order:
-- ============================================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'System',
    action_url      VARCHAR(512),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, is_read);

CREATE INDEX idx_notifications_user_created
    ON notifications(user_id, created_at DESC);
