# ============================================================
# tasks/celery_app.py - Celery Application Configuration
# ============================================================
# PURPOSE:
# Configures the Celery distributed task queue for handling
# background/async operations that would otherwise block the
# main FastAPI web thread.
#
# CONFIGURATION:
# - Broker: Redis (from CELERY_BROKER_URL)
# - Result backend: Redis (from CELERY_RESULT_BACKEND)
# - Task serialization: JSON
# - Autodiscover tasks from: notification_tasks, document_tasks,
#   payment_tasks
# - Task retry policies for transient failures
# - Periodic task scheduling (Celery Beat) for:
#     * Auto-close expired tenders (check deadlines)
#     * Deadline reminder notifications (24h before)
#     * System metrics computation (hourly/daily)
#     * Stale OTP cleanup
#
# USAGE:
# celery -A app.tasks.celery_app worker --loglevel=info
# celery -A app.tasks.celery_app beat --loglevel=info (scheduler)
# ============================================================
