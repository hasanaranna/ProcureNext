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
    include=["app.tasks.document_tasks", "app.tasks.audit_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
