# ============================================================
# tasks/celery_app.py - Celery Application Configuration
# ============================================================

import os
from celery import Celery

redis_url = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")

celery_app = Celery(
    "procurenext_tasks",
    broker=redis_url,
    backend=redis_url,
    include=[
        "app.tasks.document_tasks",
        "app.tasks.audit_tasks",
        "app.tasks.notification_tasks",
        "app.tasks.ml_tasks",
        "app.tasks.tender_tasks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "auto-close-expired-tenders-hourly": {
            "task": "auto_close_expired_tenders_task",
            "schedule": 3600.0,
        },
    },
)
