import smtplib
import os
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from html import escape
from dotenv import load_dotenv

# Load env from root - Force override to ensure .env updates are picked up without restart
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(root_env, override=True)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email_service")

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Studlyf Notifications")
Verified_Domain_Email = os.getenv("VERIFIED_DOMAIN_EMAIL", "notifications@studlyf.com")

import asyncio

async def send_notification_email(to_email: str, subject: str, body_html: str):
    """
    Sends an email notification. 
    Priority: 1. SMTP SSL (Port 465) - User specified SMTP only
    """
    # Diagnostic logging
    logger.info(f"[EMAIL DEBUG] SMTP_SERVER: {os.getenv('SMTP_SERVER')}")
    logger.info(f"[EMAIL DEBUG] SMTP_PORT: {os.getenv('SMTP_PORT')}")
    logger.info(f"[EMAIL DEBUG] SMTP_USER: {os.getenv('SMTP_USER')[:3] if os.getenv('SMTP_USER') else 'NOT SET'}...")
    
    email_from = os.getenv("EMAIL_FROM_NAME", "Studlyf Notifications")

    verified_from = os.getenv("VERIFIED_DOMAIN_EMAIL", "notifications@studlyf.com")
    email_from_name = os.getenv("EMAIL_FROM_NAME", "Studlyf Notifications")
    provider = os.getenv("SMART_EMAIL_PROVIDER", "smtp").lower()
    if provider != "smtp":
        logger.warning(f"[EMAIL DEBUG] SMART_EMAIL_PROVIDER='{provider}' ignored; SMTP-only mode enforced")
    
    # Reload env inside the function to ensure we always have the absolute latest values from the file
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(root_env, override=True)

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 465))
    smtp_user = os.getenv("SMTP_USER", "").strip().replace('"', '').replace("'", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "").replace('"', '').replace("'", "")
    
    # For Google/Custom SMTP, use the verified domain if available
    final_from_address = verified_from if verified_from else smtp_user

    if not smtp_user or not smtp_pass:
        logger.error("[EMAIL ERROR] No SMTP credentials found.")
        return False

    def categorize_error(e: Exception) -> str:
        err_str = str(e).lower()
        if "network is unreachable" in err_str or "errno 101" in err_str:
            return "NETWORK_UNREACHABLE"
        if "authentication" in err_str or "login" in err_str:
            return "AUTHENTICATION_FAILURE"
        if "timeout" in err_str:
            return "CONNECTION_TIMEOUT"
        if "connection refused" in err_str:
            return "CONNECTION_REFUSED"
        if "hostname" in err_str or "dns" in err_str:
            return "DNS_RESOLUTION_FAILURE"
        if "relay" in err_str or "denied" in err_str:
            return "RELAY_DENIED"
        return "UNKNOWN_SMTP_ERROR"

    def get_domain_category(email: str) -> str:
        public_domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"]
        domain = email.split("@")[-1].lower() if "@" in email else "unknown"
        return "PUBLIC_DOMAIN" if domain in public_domains else "INSTITUTIONAL_DOMAIN"

    def send_sync_email():
        max_retries = 2
        domain_cat = get_domain_category(to_email)
        
        for attempt in range(max_retries):
            start_time = time.time()
            try:
                logger.info(f"[TELEMETRY] Attempting delivery to {domain_cat} ({to_email}) | Attempt {attempt + 1}")
                
                # Force SSL for 465, else use STARTTLS
                if smtp_port == 465:
                    server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15)
                else:
                    server = smtplib.SMTP(smtp_server, smtp_port, timeout=15)
                    server.starttls()
                    
                server.login(smtp_user, smtp_pass)
                logger.info(f"[SMTP] Logged in successfully as {smtp_user}")
                
                msg = MIMEMultipart()
                msg['From'] = f"{email_from_name} <{final_from_address}>"
                msg['To'] = to_email
                msg['Subject'] = subject
                msg.attach(MIMEText(body_html, 'html'))
                
                server.send_message(msg)
                server.quit()
                
                duration = round(time.time() - start_time, 2)
                logger.info(f"[TELEMETRY SUCCESS] Delivered to {to_email} ({domain_cat}) in {duration}s")
                return True
            except Exception as e:
                error_cat = categorize_error(e)
                duration = round(time.time() - start_time, 2)
                logger.error(f"[TELEMETRY FAILURE] {error_cat} | Domain: {domain_cat} | Attempt: {attempt + 1} | Duration: {duration}s | Error: {str(e)}")
                # CRITICAL: Print the full stack trace for SMTP errors to help debug
                import traceback
                traceback.print_exc()

        return False

    return await asyncio.to_thread(send_sync_email)

def get_registration_template(user_name: str, event_name: str, custom_message: str = ""):
    message_html = f"<p style=\"margin:0 0 14px 0;color:#475569;line-height:1.7;\">{escape(custom_message)}</p>" if custom_message else ""
    return _email_shell(
        f"Registration Confirmed: {_safe_text(event_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(user_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Your registration for <strong>{_safe_text(event_name)}</strong> has been successfully confirmed on Studlyf.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0;color:#111827;font-size:15px;font-weight:800;">Event registration complete</p>
            <p style="margin:6px 0 0 0;color:#64748b;font-size:13px;">You’ll receive reminders, round updates, and next-step notifications here.</p>
        </div>
        {message_html}
        <p style="margin:0;color:#475569;line-height:1.7;">Please keep your profile and contact details updated so you don’t miss any important announcements.</p>
        <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">Team Studlyf &middot; On behalf of the organizing institution</p>
        """,
        subtitle="Your place is confirmed",
    )


def get_status_update_template(user_name: str, event_name: str, status: str, status_message: str = "") -> str:
    status_norm = _safe_text(status)
    color = {"approved": "#10B981", "rejected": "#EF4444", "shortlisted": "#6C3BFF"}.get(status_norm.lower(), "#6C3BFF")
    message = escape(status_message) if status_message else (
        "Congratulations! You have been shortlisted for the next stage." if status_norm.lower() in {"shortlisted", "approved"} else "Thank you for participating. Unfortunately, your application was not selected this time."
    )
    return _email_shell(
        f"Status Update: {_safe_text(event_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(user_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Your application for <strong>{_safe_text(event_name)}</strong> has been updated.</p>
        <div style="background:{color}10;border:1px solid {color}30;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;">Current Status</p>
            <p style="margin:8px 0 0 0;color:{color};font-size:28px;font-weight:900;text-transform:uppercase;">{status_norm}</p>
        </div>
        <p style="margin:0;color:#475569;line-height:1.7;">{message}</p>
        """,
        subtitle="Your application has been reviewed",
        accent=color,
    )


def get_round_unlock_template(user_name: str, event_name: str, round_name: str, round_start_time: str, round_deadline: str, round_link: str) -> str:
    return _email_shell(
        f"Round Unlocked: {_safe_text(event_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(user_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">A new round has been unlocked for <strong>{_safe_text(event_name)}</strong>.</p>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0 0 4px 0;color:#6d28d9;font-size:12px;font-weight:800;text-transform:uppercase;">Round Name</p>
            <p style="margin:0;color:#111827;font-size:16px;font-weight:800;">{_safe_text(round_name)}</p>
        </div>
        <table width="100%" style="border-collapse:collapse;margin-bottom:18px;">
            <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;width:50%;"><strong>Start:</strong> {_safe_text(round_start_time)}</td>
                <td style="padding:8px 0;color:#64748b;font-size:13px;width:50%;"><strong>Deadline:</strong> {_safe_text(round_deadline)}</td>
            </tr>
        </table>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(round_link)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Open Round</a>
        </div>
        """,
        subtitle="The next stage is ready",
    )


def get_payment_receipt_template(participant_name: str, event_name: str, organization_name: str, payment_amount: str, transaction_id: str, payment_date: str, payment_method: str, event_link: str, billing_support_email: str) -> str:
    return _email_shell(
        f"Payment Receipt: {_safe_text(event_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Your payment for <strong>{_safe_text(event_name)}</strong> hosted by <strong>{_safe_text(organization_name)}</strong> has been successfully processed.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;">
            <table width="100%" style="border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#64748b;">Amount Paid</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(payment_amount)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Transaction ID</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(transaction_id)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Payment Date</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(payment_date)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Payment Method</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(payment_method)}</td></tr>
            </table>
        </div>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(event_link)}" style="display:inline-block;padding:14px 28px;background:#10B981;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Access Event</a>
        </div>
        <p style="margin:14px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">Billing support: {_safe_text(billing_support_email)}</p>
        """,
        subtitle="Payment has been confirmed",
        accent="#10B981",
    )


def get_certificate_issued_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    certificate_id: str,
    issued_date: str,
    certificate_download_link: str,
    verification_url: str,
) -> str:
    return _email_shell(
        f"Wow, look at your certificate | {_safe_text(event_title)} 🚀",
        f"""
        <div style="background:#1f4f8f;border-radius:18px;padding:28px 24px;color:#fff;overflow:hidden;position:relative;margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-bottom:14px;">{_safe_text(organization_name)}</div>
            <div style="font-size:34px;line-height:1.05;font-weight:900;margin:0 0 14px 0;max-width:300px;">Woohoo!<br/>Time to become a celebrity on social media!</div>
            <div style="font-size:15px;line-height:1.6;max-width:360px;opacity:.95;">Congratulations, here is your certificate for <strong>{_safe_text(event_title)}</strong> 🚀</div>
            <div style="position:absolute;right:20px;bottom:12px;width:130px;height:130px;border-radius:999px;background:rgba(255,255,255,.08);"></div>
        </div>

        <div style="text-align:center;margin:0 0 14px 0;font-size:15px;color:#334155;">Congratulations, here is your certificate for <strong>{_safe_text(event_title)}</strong> 🚀</div>

        <div style="background:#eff6ff;border-radius:18px;padding:22px 18px;margin:0 auto 24px auto;max-width:280px;text-align:center;box-shadow:0 8px 24px rgba(37,99,235,.10);">
            <div style="font-size:18px;font-weight:900;color:#1d4ed8;line-height:1.2;margin-bottom:18px;">Certificate of <br/>Participation</div>
            <a href="{_safe_text(certificate_download_link)}" style="display:inline-block;padding:12px 22px;background:#215b9f;color:#fff;border-radius:999px;text-decoration:none;font-weight:800;font-size:14px;box-shadow:0 6px 14px rgba(33,91,159,.3);">Download</a>
        </div>

        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;text-align:center;">Share them on social media &amp; show the world your spirit of competitiveness that is going to reap you amazing rewards.</p>

        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:12px 0 22px 0;">
            <span style="width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;">WA</span>
            <span style="width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;">IN</span>
            <span style="width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;">FB</span>
            <span style="width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;">X</span>
        </div>

        <div style="background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:22px 16px;text-align:center;margin:0 -40px 0 -40px;">
            <div style="font-size:28px;font-weight:900;color:#1d4ed8;line-height:1;margin-bottom:10px;">{_safe_text(organization_name)}</div>
            <div style="font-size:14px;color:#475569;margin-bottom:12px;">Join our evergrowing unstoppable community</div>
            <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
                <span style="width:34px;height:34px;border-radius:999px;background:#e5e7eb;color:#64748b;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">IG</span>
                <span style="width:34px;height:34px;border-radius:999px;background:#e5e7eb;color:#64748b;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">IN</span>
                <span style="width:34px;height:34px;border-radius:999px;background:#e5e7eb;color:#64748b;display:inline-flex;alignments:center;justify-content:center;font-size:10px;font-weight:800;">TG</span>
                <span style="width:34px;height:34px;border-radius:999px;background:#e5e7eb;color:#64748b;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">YT</span>
            </div>
        </div>

        <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">Queries? We’re just one email away: <a href="mailto:{_safe_text(os.getenv('VITE_SUPPORT_EMAIL', os.getenv('SUPPORT_EMAIL', 'support@studlyf.com')))}" style="color:#1d4ed8;text-decoration:none;font-weight:700;">{_safe_text(os.getenv('VITE_SUPPORT_EMAIL', os.getenv('SUPPORT_EMAIL', 'support@studlyf.com')))}</a> &middot; &copy; 2026 { _safe_text(organization_name) }. All rights reserved.</p>
        """,
        subtitle="Your certificate is ready",
        accent="#6C3BFF",
    )

def get_team_invite_template(
    leader_name: str,
    team_name: str,
    event_name: str,
    invite_code: str,
    current_team_size: int | None = None,
    max_team_size: int | None = None,
    organization_name: str = "Studlyf",
):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    join_url = f"{frontend_url}/events/join-team?code={invite_code}"
    return _email_shell(
        f"Team Invitation: {_safe_text(event_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi there,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;"><strong>{_safe_text(leader_name)}</strong> has invited you to join the team <strong>"{_safe_text(team_name)}"</strong> for <strong>{_safe_text(event_name)}</strong>.</p>

        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0 0 6px 0;color:#6d28d9;font-size:12px;font-weight:800;text-transform:uppercase;">Invitation</p>
            <p style="margin:0;color:#111827;font-size:16px;font-weight:800;">Join the team and start collaborating.</p>
        </div>

        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(join_url)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Accept Invitation</a>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;">
            <table width="100%" style="border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#64748b;">Current Team Size</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(current_team_size if current_team_size is not None else '—')}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Max Team Size</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(max_team_size if max_team_size is not None else '—')}</td></tr>
            </table>
        </div>

        <p style="margin:0 0 8px 0;color:#475569;line-height:1.7;text-align:center;">Invite Code: <strong>{_safe_text(invite_code)}</strong></p>
        <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">{_safe_text(organization_name)} &middot; If you were not expecting this invitation, you can safely ignore this email.</p>
        """,
        subtitle="A team is waiting for you",
    )


def get_team_join_request_approved_template(
    participant_name: str,
    team_name: str,
    event_name: str,
    organization_name: str,
    team_link: str,
) -> str:
    return _email_shell(
        f"Join Request Approved: {_safe_text(event_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Your request to join team <strong>"{_safe_text(team_name)}"</strong> for <strong>{_safe_text(event_name)}</strong> has been approved.</p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0;color:#166534;font-size:15px;font-weight:800;">You can now participate as part of the team.</p>
        </div>

        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(team_link)}" style="display:inline-block;padding:14px 28px;background:#10B981;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">View Team</a>
        </div>

        <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">Team Studlyf &middot; On behalf of {_safe_text(organization_name)}</p>
        """,
        subtitle="Your request was approved",
        accent="#10B981",
    )

def get_team_join_template(new_member_name: str, team_name: str, event_name: str):
    return f"""
    <html>
        <body style="font-family: 'Poppins', sans-serifSegoe UI', sans-serif; color: #1f2937; line-height: 1.6;">
            <div style="max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f3f4f6; border-radius: 24px;">
                <div style="text-align: center; color: #10b981; font-size: 40px; margin-bottom: 20px;">🤝</div>
                <h1 style="color: #111827; font-size: 22px; font-weight: 800; text-align: center;">NEW SQUAD MEMBER!</h1>
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 25px; margin: 30px 0;">
                    <p style="margin: 0; font-size: 15px; color: #166534; text-align: center;">
                        <strong>{new_member_name}</strong> has just joined your team <strong>"{team_name}"</strong> for <strong>{event_name}</strong>.
                    </p>
                </div>
                <p style="text-align: center; color: #4b5563; font-size: 14px;">Your team is getting stronger. Head over to the Event Hub to coordinate your next moves.</p>
            </div>
        </body>
    </html>
    """

def get_shortlist_template(team_name: str, event_name: str, stage_name: str = "next stage"):
    return f"""
    <html>
        <body style="font-family: 'Poppins', sans-serifSegoe UI', sans-serif; color: #1f2937; line-height: 1.6;">
            <div style="max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f3f4f6; border-radius: 24px; background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%);">
                <div style="text-align: center; margin-bottom: 20px;">🎉</div>
                <h1 style="color: #7C3AED; font-size: 28px; font-weight: 900; text-align: center; margin: 0;">CONGRATULATIONS!</h1>
                <p style="text-align: center; color: #6b7280; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-top: 5px;">You've been shortlisted</p>
                
                <div style="margin: 40px 0; padding: 30px; background: white; border: 1px solid #ddd6fe; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <p style="margin: 0; font-size: 16px; color: #111827; text-align: center;">
                        Team <strong>"{team_name}"</strong> has qualified for <strong>{stage_name}</strong> in <strong>{event_name}</strong>.
                    </p>
                </div>
                
                <p style="text-align: center; color: #4b5563; font-size: 14px;">This is a significant milestone. Please check your Event Hub for updated deadlines and submission requirements for this new stage.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard/learner" style="background-color: #111827; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">GO TO EVENT HUB</a>
                </div>
            </div>
        </body>
    </html>
    """

def get_certificate_template(user_name: str, event_name: str, rank: str = None, category: str = "Participant"):
    """Email template sent to participants when their certificate is issued after event finalization."""
    rank_html = f"""
        <div style="margin: 20px 0; text-align: center;">
            <span style="background: linear-gradient(135deg, #7C3AED, #9D7CFF); color: white; padding: 8px 24px; border-radius: 999px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">
                🏆 Rank #{rank}
            </span>
        </div>
    """ if rank else ""

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;800&display=swap');
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serifOutfit', sans-serif; background-color: #F8FAFC;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background: linear-gradient(135deg, #7C3AED 0%, #1E293B 100%); padding: 40px 30px;">
                                <div style="font-size: 40px; margin-bottom: 10px;">🎓</div>
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">Certificate Issued!</h1>
                                <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em;">{category}</p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="font-size: 17px; color: #1E293B; margin: 0 0 10px 0;">Hello <strong>{user_name}</strong>,</p>
                                <p style="font-size: 15px; color: #475569; line-height: 1.8; margin: 0 0 20px 0;">
                                    Congratulations! Your official certificate for <strong>{event_name}</strong> has been issued and is now available in your Studlyf dashboard.
                                </p>

                                {rank_html}

                                <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 16px; padding: 20px; margin: 25px 0; text-align: center;">
                                    <p style="margin: 0; font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Event</p>
                                    <p style="margin: 6px 0 0 0; font-size: 18px; color: #111827; font-weight: 800;">{event_name}</p>
                                </div>

                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard/learner" style="background-color: #7C3AED; color: white; padding: 16px 36px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 13px; display: inline-block; text-transform: uppercase; letter-spacing: 0.12em; box-shadow: 0 4px 15px rgba(124,58,237,0.4);">
                                        View My Certificate
                                    </a>
                                </div>

                                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #94A3B8; text-align: center;">
                                    This certificate was issued by the organizing institution via the Studlyf platform.
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F8FAFC; padding: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #94A3B8;">Studlyf Communication Portal • 2026</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_announcement_template(user_name: str, event_name: str, message: str, next_stage: str = "next stage"):
    """Flexible template for custom admin messages with placeholder support."""
    # Support dynamic placeholders in the message
    final_message = str(message)\
        .replace("{team_name}", user_name)\
        .replace("{event_name}", event_name)\
        .replace("{name}", user_name)\
        .replace("{next_stage}", next_stage)
    
    # Convert newlines to <br> for HTML
    formatted_message = final_message.replace("\n", "<br>")
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;800&display=swap');
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serifOutfit', sans-serif; background-color: #F8FAFC;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <!-- Minimal Professional Header -->
                        <tr>
                            <td align="center" style="background: #1E293B; padding: 30px;">
                                <h2 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">{event_name.upper()}</h2>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 40px;">
                                <p style="font-size: 18px; color: #1E293B; margin: 0;">Hello <strong>{user_name}</strong>,</p>
                                <div style="font-size: 16px; color: #475569; line-height: 1.8; margin: 25px 0; border-left: 4px solid #6C3BFF; padding-left: 20px;">
                                    {formatted_message}
                                </div>
                                
                                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 14px; color: #94A3B8;">
                                    This message was composed by the organizing team of {event_name}.
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F8FAFC; padding: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #94A3B8;">Studlyf Communication Portal • 2026</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def _safe_text(value: object) -> str:
    return escape(str(value or "").strip())


def _email_shell(title: str, body_html: str, subtitle: str = "", accent: str = "#6C3BFF") -> str:
    title = _safe_text(title)
    subtitle_html = f'<p style="margin:8px 0 0 0;color:#c7d2fe;font-size:14px;font-weight:500">{_safe_text(subtitle)}</p>' if subtitle else ""
    return f"""
    <html>
    <body style="font-family: 'Poppins', sans-serifSegoe UI', Roboto, 'Helvetica Neue', Arial; margin:0;padding:0;background:#f8fafc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8fafc; padding:24px 12px;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
                        <tr>
                            <td align="center" style="background:linear-gradient(135deg,{accent},#4f46e5);padding:28px 24px;">
                                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px">{title}</h1>
                                {subtitle_html}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:24px;">
                                {body_html}
                            </td>
                        </tr>
                        <tr>
                            <td style="background:#f8fafc;padding:18px;text-align:center;border-top:1px solid #e2e8f0;">
                                <p style="margin:0;font-size:12px;color:#94a3b8;">Studlyf Communication Portal • 2026</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_opportunity_announcement_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    event_type: str,
    event_mode: str,
    registration_deadline: str,
    prize_pool: str,
    eligibility: str,
    short_description: str,
    event_link: str,
) -> str:
    body_html = f"""
    <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">A new opportunity matching your interests has been posted on Studlyf.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;">
        <p style="margin:0 0 4px 0;color:#0f172a;font-size:18px;font-weight:800;">{_safe_text(event_title)}</p>
        <p style="margin:0;color:#64748b;font-size:13px;">Hosted by {_safe_text(organization_name)}</p>
    </div>

    <table width="100%" style="border-collapse:collapse;margin-bottom:18px;">
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:34%;"><strong>Type:</strong> {_safe_text(event_type)}</td>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:33%;"><strong>Mode:</strong> {_safe_text(event_mode)}</td>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:33%;"><strong>Deadline:</strong> {_safe_text(registration_deadline)}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;"><strong>Prize Pool:</strong> {_safe_text(prize_pool)}</td>
            <td colspan="2" style="padding:8px 0;color:#64748b;font-size:13px;"><strong>Eligibility:</strong> {_safe_text(eligibility)}</td>
        </tr>
    </table>

    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">{_safe_text(short_description)}</p>

    <div style="text-align:center;margin:24px 0;">
        <a href="{_safe_text(event_link)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Register Now</a>
    </div>

    <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
        You are receiving this because your profile matches the event audience on Studlyf.<br/>
        Team Studlyf &middot; On behalf of {_safe_text(organization_name)}
    </p>
    """
    return _email_shell(_safe_text(event_title), body_html, f"Hosted by {_safe_text(organization_name)}")


def get_opportunity_reminder_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    event_date: str,
    event_time: str,
    event_mode: str,
    event_link: str,
    days_left: int,
) -> str:
    body_html = f"""
    <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">This is a reminder that <strong>{_safe_text(event_title)}</strong> is coming up soon.</p>

    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:16px;padding:16px;margin-bottom:18px;">
        <p style="margin:0 0 6px 0;color:#92400e;font-size:12px;font-weight:800;text-transform:uppercase;">Reminder</p>
        <p style="margin:0;color:#111827;font-size:15px;line-height:1.7;">{_safe_text(days_left)} day{'s' if days_left != 1 else ''} left to participate.</p>
    </div>

    <table width="100%" style="border-collapse:collapse;margin-bottom:18px;">
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:50%;"><strong>Date:</strong> {_safe_text(event_date)}</td>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:50%;"><strong>Time:</strong> {_safe_text(event_time)}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;"><strong>Mode:</strong> {_safe_text(event_mode)}</td>
            <td style="padding:8px 0;color:#64748b;font-size:13px;"><strong>Organizer:</strong> {_safe_text(organization_name)}</td>
        </tr>
    </table>

    <div style="text-align:center;margin:24px 0;">
        <a href="{_safe_text(event_link)}" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Open Event</a>
    </div>

    <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
        Team Studlyf &middot; On behalf of {_safe_text(organization_name)}
    </p>
    """
    return _email_shell(f"Reminder: {_safe_text(event_title)}", body_html, f"{_safe_text(days_left)} day{'s' if days_left != 1 else ''} left", accent="#f59e0b")


def get_shortlisted_round_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    round_name: str,
    round_date: str,
    round_time: str,
) -> str:
    body_html = f"""
    <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Congratulations! You have been shortlisted for the next round of <strong>{_safe_text(event_title)}</strong>.</p>

    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:16px;padding:16px;margin-bottom:18px;">
        <p style="margin:0 0 6px 0;color:#6d28d9;font-size:12px;font-weight:800;text-transform:uppercase;">Next Round</p>
        <p style="margin:0;color:#111827;font-size:16px;font-weight:800;">{_safe_text(round_name)}</p>
    </div>

    <table width="100%" style="border-collapse:collapse;margin-bottom:18px;">
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:50%;"><strong>Date:</strong> {_safe_text(round_date)}</td>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:50%;"><strong>Time:</strong> {_safe_text(round_time)}</td>
        </tr>
        <tr>
            <td colspan="2" style="padding:8px 0;color:#64748b;font-size:13px;"><strong>Organizer:</strong> {_safe_text(organization_name)}</td>
        </tr>
    </table>

    <p style="margin:0;color:#475569;line-height:1.7;">Further instructions and access details will be shared soon.</p>
    """
    return _email_shell(f"Shortlisted: {_safe_text(event_title)}", body_html, f"On behalf of {_safe_text(organization_name)}")


def get_winner_announcement_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    rank: str,
    prize_details: str,
    results_link: str,
) -> str:
    body_html = f"""
    <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Congratulations! You have been selected as one of the winners of <strong>{_safe_text(event_title)}</strong>.</p>

    <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:16px;padding:16px;margin-bottom:18px;">
        <p style="margin:0 0 4px 0;color:#0e7490;font-size:12px;font-weight:800;text-transform:uppercase;">Rank</p>
        <p style="margin:0;color:#111827;font-size:18px;font-weight:900;">{_safe_text(rank)}</p>
        <p style="margin:10px 0 0 0;color:#475569;font-size:14px;">{_safe_text(prize_details)}</p>
    </div>

    <div style="text-align:center;margin:24px 0;">
        <a href="{_safe_text(results_link)}" style="display:inline-block;padding:14px 28px;background:#0f766e;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">View Results</a>
    </div>
    """
    return _email_shell(f"Winner: {_safe_text(event_title)}", body_html, f"On behalf of {_safe_text(organization_name)}", accent="#0f766e")


def get_feedback_request_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    feedback_link: str,
) -> str:
    body_html = f"""
    <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Thank you for participating in <strong>{_safe_text(event_title)}</strong>.</p>

    <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">We would appreciate a few minutes of your feedback to help us improve future events on Studlyf.</p>

    <div style="text-align:center;margin:24px 0;">
        <a href="{_safe_text(feedback_link)}" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Submit Feedback</a>
    </div>
    """
    return _email_shell(f"Feedback Request: {_safe_text(event_title)}", body_html, f"On behalf of {_safe_text(organization_name)}")


def get_registration_deadline_reminder_template(
    participant_name: str,
    event_title: str,
    organization_name: str,
    registration_deadline: str,
    event_link: str,
) -> str:
    return _email_shell(
        f"Registration Closing Soon: {_safe_text(event_title)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Registration for <strong>{_safe_text(event_title)}</strong> hosted by <strong>{_safe_text(organization_name)}</strong> closes soon.</p>

        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0 0 4px 0;color:#92400e;font-size:12px;font-weight:800;text-transform:uppercase;">Deadline</p>
            <p style="margin:0;color:#111827;font-size:16px;font-weight:800;">{_safe_text(registration_deadline)}</p>
        </div>

        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(event_link)}" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Register Here</a>
        </div>
        """,
        subtitle="Complete your registration",
        accent="#f59e0b",
    )


def get_email_verification_template(participant_name: str, verification_link: str) -> str:
    return _email_shell(
        "Verify Your Email",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Welcome to Studlyf. Please verify your email address to activate your account.</p>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(verification_link)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Verify Email</a>
        </div>
        <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">If you did not create this account, you can safely ignore this email.</p>
        """,
        subtitle="Please verify your account",
    )


def get_password_reset_template(participant_name: str, reset_link: str, expiry_duration: str) -> str:
    return _email_shell(
        "Password Reset",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">We received a request to reset your Studlyf account password.</p>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(reset_link)}" style="display:inline-block;padding:14px 28px;background:#EF4444;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Reset Password</a>
        </div>
        <p style="margin:0 0 8px 0;color:#475569;line-height:1.7;text-align:center;">This link will expire in <strong>{_safe_text(expiry_duration)}</strong>.</p>
        <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">If you did not request this, please ignore this email.</p>
        """,
        subtitle="Security request received",
        accent="#EF4444",
    )


def get_event_published_template(organizer_name: str, event_title: str, event_link: str) -> str:
    return _email_shell(
        f"Event Published: {_safe_text(event_title)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(organizer_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Your event <strong>{_safe_text(event_title)}</strong> has been successfully published on Studlyf.</p>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(event_link)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">View Event</a>
        </div>
        <p style="margin:0;color:#475569;line-height:1.7;text-align:center;">Participants can now discover and register for your opportunity.</p>
        """,
        subtitle="Your event is live",
    )


def get_new_registration_notification_template(organizer_name: str, event_title: str, participant_name: str, registration_count: int, dashboard_link: str) -> str:
    return _email_shell(
        f"New Registration: {_safe_text(event_title)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(organizer_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">A new participant has registered for <strong>{_safe_text(event_title)}</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;">
            <p style="margin:0 0 4px 0;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;">Participant</p>
            <p style="margin:0;color:#111827;font-size:16px;font-weight:800;">{_safe_text(participant_name)}</p>
            <p style="margin:12px 0 0 0;color:#64748b;font-size:13px;">Total registrations: <strong>{int(registration_count)}</strong></p>
        </div>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(dashboard_link)}" style="display:inline-block;padding:14px 28px;background:#111827;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">View Participants</a>
        </div>
        """,
        subtitle="A new participant joined",
    )


def get_subscription_activated_template(user_name: str, plan_name: str, billing_cycle: str, start_date: str, expiry_date: str, subscription_link: str) -> str:
    return _email_shell(
        f"Subscription Activated: {_safe_text(plan_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(user_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Your subscription plan <strong>"{_safe_text(plan_name)}"</strong> has been activated successfully.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;">
            <table width="100%" style="border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#64748b;">Plan</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(plan_name)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Billing Cycle</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(billing_cycle)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Start Date</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(start_date)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Expiry Date</td><td align="right" style="padding:6px 0;color:#111827;font-weight:800;">{_safe_text(expiry_date)}</td></tr>
            </table>
        </div>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(subscription_link)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Manage Subscription</a>
        </div>
        """,
        subtitle="Subscription active",
    )


def get_payment_failed_template(user_name: str, plan_name: str, payment_link: str) -> str:
    return _email_shell(
        f"Payment Failed: {_safe_text(plan_name)}",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(user_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">We were unable to process your recent payment for <strong>"{_safe_text(plan_name)}"</strong>.</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Please update your payment method or retry payment to avoid interruption of services.</p>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(payment_link)}" style="display:inline-block;padding:14px 28px;background:#EF4444;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Retry Payment</a>
        </div>
        """,
        subtitle="Action required",
        accent="#EF4444",
    )


def get_recommended_opportunities_template(participant_name: str, recommended_opportunities: str, recommendation_link: str) -> str:
    return _email_shell(
        "Recommended Opportunities",
        f"""
        <p style="margin:0 0 12px 0;font-size:16px;color:#0f172a;">Hi <strong>{_safe_text(participant_name)}</strong>,</p>
        <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">Based on your interests and activity, we found new opportunities you may like.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:18px;white-space:pre-line;">
            {_safe_text(recommended_opportunities)}
        </div>
        <div style="text-align:center;margin:24px 0;">
            <a href="{_safe_text(recommendation_link)}" style="display:inline-block;padding:14px 28px;background:#6C3BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">Explore More</a>
        </div>
        """,
        subtitle="Personalized for you",
    )

async def send_course_purchase_email(to_email: str, student_name: str, course_name: str, amount: str, order_id: str):
    """
    Sends a high-fidelity confirmation email when a student successfully purchases a course.
    """
    subject = f"Payment Successful! Welcome to {course_name} 🚀"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&display=swap');
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serifOutfit', sans-serif; background-color: #F8FAFC;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <tr>
                            <td align="center" style="background: linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%); padding: 40px 30px;">
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Studlyf</h1>
                                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 16px;">Your learning journey begins now.</p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 40px;">
                                <p style="font-size: 18px; color: #1E293B; margin: 0 0 20px 0;">Hi <strong>{student_name}</strong>,</p>
                                <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0;">
                                    Your payment was highly successful! You now have full lifetime access to <strong>{course_name}</strong>.
                                </p>
                                
                                <div style="background-color: #F1F5F9; border-radius: 12px; padding: 24px; margin: 30px 0;">
                                    <h3 style="margin: 0 0 16px 0; color: #0F172A; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Transaction Details</h3>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748B; font-size: 15px;">Order ID</td>
                                            <td align="right" style="padding: 8px 0; color: #0F172A; font-weight: 700; font-size: 15px;">{order_id}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748B; font-size: 15px;">Amount Paid</td>
                                            <td align="right" style="padding: 8px 0; color: #10B981; font-weight: 800; font-size: 15px;">{amount}</td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard/learner" style="display: inline-block; background: #7C3AED; color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 800; font-size: 16px; letter-spacing: 0.5px;">Start Learning Now</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="background-color: #F8FAFC; padding: 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                                <p style="margin: 0; font-size: 13px; color: #64748B;">Happy Learning! The Studlyf Team</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    await send_notification_email(to_email, subject, html_content)


