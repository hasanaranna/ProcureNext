# ============================================================
# tasks/notification_tasks.py - Async Notification Tasks
# ============================================================
import logging
from app.tasks.celery_app import celery_app
from app.services.email import send_employee_invitation_email, send_smtp_email

logger = logging.getLogger("app.tasks.notifications")


@celery_app.task(
    name="send_invitation_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_invitation_email_task(
    self,
    to_email: str,
    org_name: str,
    invite_link: str,
    inviter_name: str | None = None,
) -> bool:
    """Asynchronously send an employee invitation email using Celery."""
    try:
        print(f"[CELERY TASK] Sending invitation email to {to_email} for org '{org_name}'...", flush=True)
        success = send_employee_invitation_email(
            to_email=to_email,
            org_name=org_name,
            invite_link=invite_link,
            inviter_name=inviter_name,
        )
        return success
    except Exception as exc:
        logger.error(f"Error in send_invitation_email_task for {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False


@celery_app.task(
    name="send_smtp_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_smtp_email_task(
    self,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    """Generic async SMTP email sending task."""
    try:
        return send_smtp_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )
    except Exception as exc:
        logger.error(f"Error in send_smtp_email_task for {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False
