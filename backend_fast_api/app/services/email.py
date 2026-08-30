# ============================================================
# services/email.py - Transactional Email Service
# ============================================================
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("app.services.email")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "procurenext.contact@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", "procurenext.contact@gmail.com")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "ProcureNext")
SMTP_TLS = os.getenv("SMTP_TLS", "True").lower() in ("true", "1", "yes")


def send_smtp_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    """Send an email via SMTP (synchronous, intended for Celery worker or async threadpool)."""
    smtp_user = os.getenv("SMTP_USER", SMTP_USER)
    smtp_password = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD)
    # Remove any spaces if user pasted password with spaces
    if smtp_password:
        smtp_password = smtp_password.replace(" ", "")

    smtp_host = os.getenv("SMTP_HOST", SMTP_HOST)
    smtp_port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))
    mail_from = os.getenv("MAIL_FROM", MAIL_FROM)
    mail_from_name = os.getenv("MAIL_FROM_NAME", MAIL_FROM_NAME)

    if not smtp_password:
        logger.warning(
            f"[EMAIL SERVICE] SMTP_PASSWORD is not set. Email to '{to_email}' with subject '{subject}' "
            "was not sent via SMTP. Please configure SMTP_PASSWORD in .env."
        )
        print(
            f"[EMAIL NOTICE] Email to {to_email} (Subject: {subject}) skipped: SMTP_PASSWORD is empty in .env.",
            flush=True,
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((mail_from_name, mail_from))
        msg["To"] = to_email

        # Attach plain text version
        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))

        # Attach HTML version
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=25)
        if SMTP_TLS:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(mail_from, [to_email], msg.as_string())
        server.quit()

        print(f"[EMAIL SUCCESS] Sent email to '{to_email}' from '{mail_from}' (Subject: {subject})", flush=True)
        return True
    except Exception as exc:
        print(f"[EMAIL ERROR] Failed to send email to '{to_email}': {exc}", flush=True)
        logger.error(f"Failed to send email to {to_email}: {exc}", exc_info=True)
        return False


def build_employee_invitation_html(
    to_email: str,
    org_name: str,
    invite_link: str,
    inviter_name: str | None = None,
) -> str:
    """Build a modern, responsive branded HTML email template for employee invitations."""
    inviter_text = f"by <strong>{inviter_name}</strong> " if inviter_name else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join {org_name} on ProcureNext</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                Procure<span style="color: #38bdf8;">Next</span>
              </h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase;">
                Enterprise Procurement Platform
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                You're invited to join <span style="color: #0284c7;">{org_name}</span>
              </h2>

              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                You have been invited {inviter_text}to join the organization <strong>{org_name}</strong> on ProcureNext as a team member.
              </p>

              <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
                  <strong>Organization:</strong> {org_name}<br>
                  <strong>Invited Email:</strong> {to_email}
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">
                    <a href="{invite_link}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.2px;">
                      Accept Invitation &amp; Join &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px;">
                <a href="{invite_link}" style="color: #0284c7; text-decoration: underline;">{invite_link}</a>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                <p style="margin: 0 0 6px 0;">
                  ⏰ <strong>Note:</strong> This invitation link will expire in <strong>7 days</strong>.
                </p>
                <p style="margin: 0;">
                  If you did not expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                Sent directly by <strong>ProcureNext</strong> &bull; <a href="mailto:procurenext.contact@gmail.com" style="color: #0284c7; text-decoration: none;">procurenext.contact@gmail.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 ProcureNext. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_employee_invitation_text(
    to_email: str,
    org_name: str,
    invite_link: str,
    inviter_name: str | None = None,
) -> str:
    """Build a plain text fallback version for the employee invitation."""
    inviter_text = f" by {inviter_name}" if inviter_name else ""
    return f"""ProcureNext - Team Invitation

Hello,

You have been invited{inviter_text} to join {org_name} on ProcureNext.

To accept this invitation and complete your profile, visit the link below:
{invite_link}

Note: This link will expire in 7 days.
If you did not expect this invitation, you can safely ignore this message.

--
ProcureNext Team
procurenext.contact@gmail.com
"""


def send_employee_invitation_email(
    to_email: str,
    org_name: str,
    invite_link: str,
    inviter_name: str | None = None,
) -> bool:
    """Send an employee invitation email to the specified recipient."""
    subject = f"You're invited to join {org_name} on ProcureNext"
    html_content = build_employee_invitation_html(
        to_email=to_email,
        org_name=org_name,
        invite_link=invite_link,
        inviter_name=inviter_name,
    )
    text_content = build_employee_invitation_text(
        to_email=to_email,
        org_name=org_name,
        invite_link=invite_link,
        inviter_name=inviter_name,
    )

    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=html_content,
        text_body=text_content,
    )


# ──────────────────────────────────────────────────────────────
# Password Reset Email
# ──────────────────────────────────────────────────────────────

def build_password_reset_html(
    to_email: str,
    reset_link: str,
    user_name: str | None = None,
    expires_minutes: int = 30,
) -> str:
    """Build a modern, responsive HTML email template for password reset."""
    greeting_name = f" {user_name}" if user_name else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your ProcureNext Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                Procure<span style="color: #38bdf8;">Next</span>
              </h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase;">
                Account Security
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                Password Reset Request
              </h2>

              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hello{greeting_name},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your ProcureNext account associated with <strong>{to_email}</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">
                    <a href="{reset_link}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.2px;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px;">
                <a href="{reset_link}" style="color: #0284c7; text-decoration: underline;">{reset_link}</a>
              </div>

              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                  ⏰ <strong>Notice:</strong> This password reset link is valid for <strong>{expires_minutes} minutes</strong>.
                </p>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                <p style="margin: 0;">
                  If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                Sent by <strong>ProcureNext Security</strong> &bull; <a href="mailto:procurenext.contact@gmail.com" style="color: #0284c7; text-decoration: none;">procurenext.contact@gmail.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 ProcureNext. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_password_reset_text(
    to_email: str,
    reset_link: str,
    user_name: str | None = None,
    expires_minutes: int = 30,
) -> str:
    """Build a plain text fallback version for the password reset email."""
    greeting_name = f" {user_name}" if user_name else ""
    return f"""ProcureNext - Password Reset Request

Hello{greeting_name},

We received a request to reset the password for your ProcureNext account ({to_email}).

Click the link below to set a new password:
{reset_link}

Note: This link will expire in {expires_minutes} minutes.
If you did not request this, you can safely ignore this email. Your password will not change.

--
ProcureNext Security Team
procurenext.contact@gmail.com
"""


def send_password_reset_email(
    to_email: str,
    reset_link: str,
    user_name: str | None = None,
    expires_minutes: int = 30,
) -> bool:
    """Send a password reset email to the specified recipient."""
    subject = "Reset Your ProcureNext Password"
    html_content = build_password_reset_html(
        to_email=to_email,
        reset_link=reset_link,
        user_name=user_name,
        expires_minutes=expires_minutes,
    )
    text_content = build_password_reset_text(
        to_email=to_email,
        reset_link=reset_link,
        user_name=user_name,
        expires_minutes=expires_minutes,
    )

    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=html_content,
        text_body=text_content,
    )


# ──────────────────────────────────────────────────────────────
# Pending Master Account – Admin Alert
# ──────────────────────────────────────────────────────────────

def build_pending_account_admin_html(
    applicant_name: str,
    org_name: str,
    org_type: str,
    admin_panel_url: str,
) -> str:
    """Notify admins that a new master account is pending review."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Account Pending Review</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Procure<span style="color:#38bdf8;">Next</span></h1>
    <p style="margin:6px 0 0 0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Administrator Alert</p>
  </td></tr>
  <tr><td style="padding:36px 32px;">
    <h2 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;">⏳ New Account Pending Review</h2>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">A new master account registration has been submitted and requires your review.</p>
    <div style="background-color:#f8fafc;border-left:4px solid #f59e0b;padding:16px;border-radius:6px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">
        <strong>Applicant:</strong> {applicant_name}<br>
        <strong>Organization:</strong> {org_name}<br>
        <strong>Type:</strong> {org_type}
      </p>
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px auto;">
      <tr><td align="center" style="border-radius:12px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);">
        <a href="{admin_panel_url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Review Account &rarr;</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;">Please log in to the admin panel to approve or reject this registration.</p>
  </td></tr>
  <tr><td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; 2026 ProcureNext. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def build_pending_account_admin_text(
    applicant_name: str, org_name: str, org_type: str, admin_panel_url: str
) -> str:
    return f"""ProcureNext - New Account Pending Review

A new master account registration requires your review.

Applicant: {applicant_name}
Organization: {org_name}
Type: {org_type}

Review at: {admin_panel_url}

-- ProcureNext Admin Team
"""


def send_pending_account_admin_email(
    to_email: str,
    applicant_name: str,
    org_name: str,
    org_type: str,
    admin_panel_url: str,
) -> bool:
    subject = f"[Action Required] New Account Pending: {org_name}"
    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=build_pending_account_admin_html(applicant_name, org_name, org_type, admin_panel_url),
        text_body=build_pending_account_admin_text(applicant_name, org_name, org_type, admin_panel_url),
    )


# ──────────────────────────────────────────────────────────────
# Account Approved / Rejected
# ──────────────────────────────────────────────────────────────

def build_account_status_html(
    full_name: str,
    org_name: str,
    status: str,
    login_url: str,
    review_notes: str | None = None,
) -> str:
    """Email sent to the user when their master account is approved or rejected."""
    is_approved = status.lower() == "verified"
    banner_color = "#10b981" if is_approved else "#ef4444"
    status_text = "Approved" if is_approved else "Rejected"
    emoji = "✅" if is_approved else "❌"

    notes_block = ""
    if review_notes:
        notes_block = f"""
    <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:6px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">
        <strong>Review Notes:</strong> {review_notes}
      </p>
    </div>"""

    cta = ""
    if is_approved:
        cta = f"""
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px auto;">
      <tr><td align="center" style="border-radius:12px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);">
        <a href="{login_url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Log In Now &rarr;</a>
      </td></tr>
    </table>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account {status_text}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">Procure<span style="color:#38bdf8;">Next</span></h1>
    <p style="margin:6px 0 0 0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Account Notification</p>
  </td></tr>
  <tr><td style="padding:36px 32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;width:56px;height:56px;border-radius:50%;background:{banner_color};line-height:56px;font-size:28px;text-align:center;">{emoji}</span>
    </div>
    <h2 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;text-align:center;">Account {status_text}</h2>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hello <strong>{full_name}</strong>,</p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
      Your master account registration for <strong>{org_name}</strong> on ProcureNext has been <strong style="color:{banner_color};">{status_text.lower()}</strong>.
    </p>
    {notes_block}
    {cta}
  </td></tr>
  <tr><td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; 2026 ProcureNext. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def build_account_status_text(
    full_name: str, org_name: str, status: str, login_url: str, review_notes: str | None = None
) -> str:
    status_text = "Approved" if status.lower() == "verified" else "Rejected"
    notes = f"\nReview Notes: {review_notes}\n" if review_notes else ""
    login = f"\nLog in at: {login_url}\n" if status.lower() == "verified" else ""
    return f"""ProcureNext - Account {status_text}

Hello {full_name},

Your master account for {org_name} has been {status_text.lower()}.
{notes}{login}
-- ProcureNext Team
"""


def send_account_status_email(
    to_email: str,
    full_name: str,
    org_name: str,
    status: str,
    login_url: str,
    review_notes: str | None = None,
) -> bool:
    status_text = "Approved" if status.lower() == "verified" else "Rejected"
    subject = f"ProcureNext: Your Account Has Been {status_text}"
    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=build_account_status_html(full_name, org_name, status, login_url, review_notes),
        text_body=build_account_status_text(full_name, org_name, status, login_url, review_notes),
    )


# ──────────────────────────────────────────────────────────────
# Bid Received – Buyer Notification
# ──────────────────────────────────────────────────────────────

def build_bid_received_html(
    buyer_name: str,
    tender_title: str,
    vendor_name: str,
    tender_url: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Bid Received</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">Procure<span style="color:#38bdf8;">Next</span></h1>
    <p style="margin:6px 0 0 0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Tender Notification</p>
  </td></tr>
  <tr><td style="padding:36px 32px;">
    <h2 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;">📩 New Bid Received</h2>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hello <strong>{buyer_name}</strong>,</p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
      <strong>{vendor_name}</strong> has submitted a bid on your tender <strong>"{tender_title}"</strong>.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px auto;">
      <tr><td align="center" style="border-radius:12px;background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);">
        <a href="{tender_url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">View Bids &rarr;</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; 2026 ProcureNext. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def build_bid_received_text(
    buyer_name: str, tender_title: str, vendor_name: str, tender_url: str
) -> str:
    return f"""ProcureNext - New Bid Received

Hello {buyer_name},

{vendor_name} has submitted a bid on your tender "{tender_title}".

View bids at: {tender_url}

-- ProcureNext Team
"""


def send_bid_received_email(
    to_email: str,
    buyer_name: str,
    tender_title: str,
    vendor_name: str,
    tender_url: str,
) -> bool:
    subject = f"New bid on \"{tender_title}\" from {vendor_name}"
    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=build_bid_received_html(buyer_name, tender_title, vendor_name, tender_url),
        text_body=build_bid_received_text(buyer_name, tender_title, vendor_name, tender_url),
    )


# ──────────────────────────────────────────────────────────────
# Bid Accepted – Vendor Notification
# ──────────────────────────────────────────────────────────────

def build_bid_accepted_html(
    vendor_name: str,
    tender_title: str,
    buyer_org_name: str,
    tender_url: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bid Accepted</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">Procure<span style="color:#38bdf8;">Next</span></h1>
    <p style="margin:6px 0 0 0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Congratulations!</p>
  </td></tr>
  <tr><td style="padding:36px 32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#10b981;line-height:56px;font-size:28px;text-align:center;">🏆</span>
    </div>
    <h2 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;text-align:center;">Your Bid Has Been Accepted!</h2>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hello <strong>{vendor_name}</strong>,</p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
      Great news! Your bid on <strong>"{tender_title}"</strong> has been accepted by <strong>{buyer_org_name}</strong>.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px auto;">
      <tr><td align="center" style="border-radius:12px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);">
        <a href="{tender_url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">View Details &rarr;</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; 2026 ProcureNext. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def build_bid_accepted_text(
    vendor_name: str, tender_title: str, buyer_org_name: str, tender_url: str
) -> str:
    return f"""ProcureNext - Bid Accepted!

Hello {vendor_name},

Great news! Your bid on "{tender_title}" has been accepted by {buyer_org_name}.

View details at: {tender_url}

-- ProcureNext Team
"""


def send_bid_accepted_email(
    to_email: str,
    vendor_name: str,
    tender_title: str,
    buyer_org_name: str,
    tender_url: str,
) -> bool:
    subject = f"🏆 Your bid on \"{tender_title}\" has been accepted!"
    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=build_bid_accepted_html(vendor_name, tender_title, buyer_org_name, tender_url),
        text_body=build_bid_accepted_text(vendor_name, tender_title, buyer_org_name, tender_url),
    )


# ──────────────────────────────────────────────────────────────
# Bid Rejected – Losing Vendor Notification
# ──────────────────────────────────────────────────────────────

def build_bid_rejected_html(vendor_name: str, tender_title: str, buyer_org_name: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bid Not Selected</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">Procure<span style="color:#38bdf8;">Next</span></h1>
    <p style="margin:6px 0 0 0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Bid Update</p>
  </td></tr>
  <tr><td style="padding:36px 32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#64748b;line-height:56px;font-size:28px;text-align:center;">📋</span>
    </div>
    <h2 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;text-align:center;">Bid Not Selected</h2>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hello <strong>{vendor_name}</strong>,</p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
      Thank you for submitting a bid on <strong>"{tender_title}"</strong>. After careful consideration,
      <strong>{buyer_org_name}</strong> has selected another vendor for this tender.
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#64748b;">
      We appreciate your participation and encourage you to continue exploring new opportunities on ProcureNext.
    </p>
  </td></tr>
  <tr><td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; 2026 ProcureNext. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def build_bid_rejected_text(vendor_name: str, tender_title: str, buyer_org_name: str) -> str:
    return f"""ProcureNext - Bid Not Selected

Hello {vendor_name},

Thank you for submitting a bid on "{tender_title}".
After careful consideration, {buyer_org_name} has selected another vendor for this tender.

We encourage you to continue exploring new opportunities on ProcureNext.

-- ProcureNext Team
"""


def send_bid_rejected_email(
    to_email: str,
    vendor_name: str,
    tender_title: str,
    buyer_org_name: str,
) -> bool:
    subject = f"Update on your bid for \"{tender_title}\""
    return send_smtp_email(
        to_email=to_email,
        subject=subject,
        html_body=build_bid_rejected_html(vendor_name, tender_title, buyer_org_name),
        text_body=build_bid_rejected_text(vendor_name, tender_title, buyer_org_name),
    )
