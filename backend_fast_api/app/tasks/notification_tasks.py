# ============================================================
# tasks/notification_tasks.py - Async Notification Tasks
# ============================================================
import os
import logging
from app.tasks.celery_app import celery_app
from app.services.email import (
    send_employee_invitation_email,
    send_smtp_email,
    send_pending_account_admin_email,
    send_account_status_email,
    send_bid_received_email,
    send_bid_accepted_email,
    send_bid_rejected_email,
    send_password_reset_email,
)

logger = logging.getLogger("app.tasks.notifications")


@celery_app.task(
    name="send_password_reset_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_password_reset_email_task(
    self,
    to_email: str,
    reset_link: str,
    user_name: str | None = None,
    expires_minutes: int = 30,
) -> bool:
    """Asynchronously send a password reset email using Celery."""
    try:
        print(f"[CELERY TASK] Sending password reset email to {to_email}...", flush=True)
        success = send_password_reset_email(
            to_email=to_email,
            reset_link=reset_link,
            user_name=user_name,
            expires_minutes=expires_minutes,
        )
        return success
    except Exception as exc:
        logger.error(f"Error in send_password_reset_email_task for {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False


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


@celery_app.task(
    name="send_pending_account_admin_alert_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_pending_account_admin_alert_task(
    self,
    admin_emails: list[str],
    applicant_name: str,
    org_name: str,
    org_type: str,
) -> bool:
    """Notify all platform admins about a new pending master account."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    admin_panel_url = f"{frontend_url}/admin-home"
    success = True
    for email in admin_emails:
        try:
            result = send_pending_account_admin_email(
                to_email=email,
                applicant_name=applicant_name,
                org_name=org_name,
                org_type=org_type,
                admin_panel_url=admin_panel_url,
            )
            if not result:
                success = False
        except Exception as exc:
            logger.error(f"Failed to send admin alert to {email}: {exc}", exc_info=True)
            success = False
    return success


@celery_app.task(
    name="send_account_status_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_account_status_email_task(
    self,
    to_email: str,
    full_name: str,
    org_name: str,
    status: str,
    review_notes: str | None = None,
) -> bool:
    """Send account approved/rejected email to the user."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    login_url = f"{frontend_url}/login"
    try:
        return send_account_status_email(
            to_email=to_email,
            full_name=full_name,
            org_name=org_name,
            status=status,
            login_url=login_url,
            review_notes=review_notes,
        )
    except Exception as exc:
        logger.error(f"Error sending account status email to {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False


@celery_app.task(
    name="send_bid_received_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_bid_received_email_task(
    self,
    to_email: str,
    buyer_name: str,
    tender_title: str,
    vendor_name: str,
    tender_id: int,
) -> bool:
    """Send 'bid received' email to the buyer."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    tender_url = f"{frontend_url}/view-my-tender/{tender_id}"
    try:
        return send_bid_received_email(
            to_email=to_email,
            buyer_name=buyer_name,
            tender_title=tender_title,
            vendor_name=vendor_name,
            tender_url=tender_url,
        )
    except Exception as exc:
        logger.error(f"Error sending bid received email to {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False


@celery_app.task(
    name="send_bid_accepted_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_bid_accepted_email_task(
    self,
    to_email: str,
    vendor_name: str,
    tender_title: str,
    buyer_org_name: str,
    tender_id: int,
) -> bool:
    """Send 'bid accepted' email to the winning vendor."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    tender_url = f"{frontend_url}/ongoing-tenders"
    try:
        return send_bid_accepted_email(
            to_email=to_email,
            vendor_name=vendor_name,
            tender_title=tender_title,
            buyer_org_name=buyer_org_name,
            tender_url=tender_url,
        )
    except Exception as exc:
        logger.error(f"Error sending bid accepted email to {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False


@celery_app.task(
    name="send_bid_rejected_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_bid_rejected_email_task(
    self,
    to_email: str,
    vendor_name: str,
    tender_title: str,
    buyer_org_name: str,
) -> bool:
    """Send 'bid not selected' email to a losing vendor."""
    try:
        return send_bid_rejected_email(
            to_email=to_email,
            vendor_name=vendor_name,
            tender_title=tender_title,
            buyer_org_name=buyer_org_name,
        )
    except Exception as exc:
        logger.error(f"Error sending bid rejected email to {to_email}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except Exception:
            return False
