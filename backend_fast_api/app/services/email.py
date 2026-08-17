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
