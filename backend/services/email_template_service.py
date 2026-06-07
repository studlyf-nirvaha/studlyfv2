import logging
from datetime import datetime
from typing import Optional, List, Dict
from bson import ObjectId

logger = logging.getLogger("email_template_service")

# ─── Default templates (seeded on event creation) ──────────────────────

def _wrap_premium_html_shell(content_html: str, title: str, accent_color: str = "#7C3AED", emoji: str = "🎉") -> str:
    """
    Wraps standard template content blocks into a gorgeous premium email layout shell.
    Features:
    - Segoe UI sans-serif modern typography.
    - Centered card max-width 600px, border-radius 24px, subtle card drop-shadow.
    - Accent-gradient top header banner using premium HSL congratulations purple (#7C3AED).
    - Fully responsive container with generous whitespace/padding.
    - Premium footer with professional institutional credits and help links.
    """
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="font-family: 'Poppins', sans-serif', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; width: 100% !important;">
    <div style="background-color: #f8fafc; padding: 40px 20px; text-align: center;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; border-collapse: separate; box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.05), 0 8px 10px -6px rgba(124, 58, 237, 0.05); text-align: left;">
            <tr>
                <td style="background: linear-gradient(135deg, {accent_color} 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; color: #ffffff;">
                    <div style="font-size: 32px; margin-bottom: 8px; line-height: 1;">{emoji}</div>
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2.5px; color: rgba(255, 255, 255, 0.8); margin-bottom: 4px; font-family: 'Poppins', sans-serif', sans-serif;">STUDLYF</div>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; font-family: 'Poppins', sans-serif', sans-serif; color: #ffffff;">{title}</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px; background-color: #ffffff;">
                    {content_html}
                </td>
            </tr>
            <tr>
                <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500; font-family: 'Poppins', sans-serif', sans-serif;">
                        Empowering builders, learning, and hackathons worldwide.
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #cbd5e1; font-family: 'Poppins', sans-serif', sans-serif;">
                        &copy; 2026 Studlyf Platform. All rights reserved. &bull; <a href="{{{{frontend_url}}}}" style="color: {accent_color}; text-decoration: none; font-weight: 600;">Visit Platform</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>"""


DEFAULT_TEMPLATES = {
    "stage_advancement": {
        "name": "Stage Advancement",
        "type": "stage_advancement",
        "subject": "Congratulations {{team_name}}! You've advanced to {{stage_name}}",
        "placeholders": ["team_name", "event_name", "stage_name", "participant_name"],
        "is_default": True,
        "emoji": "🎉",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Great news! Your team <strong>"{{team_name}}"</strong> has successfully advanced in the event.</p>
<div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #7C3AED;">Advanced Stage</p>
    <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800; color: #1e293b;">{{stage_name}}</p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 600;">Event: {{event_name}}</p>
</div>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">Your updated deadlines and requirements are now visible in the Event Hub. Prepare early to make your mark!</p>
<div style="text-align: center;">
    <a href="{{frontend_url}}/dashboard/learner" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Go to Event Hub</a>
</div>"""
    },
    "registration_confirmation": {
        "name": "Registration Confirmation",
        "type": "registration_confirmation",
        "subject": "Registration Confirmed: {{event_title}}",
        "placeholders": ["participant_name", "event_title", "organization_name", "event_date", "event_time", "event_link"],
        "is_default": True,
        "emoji": "✅",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Your registration for <strong>{{event_title}}</strong> hosted by <strong>{{organization_name}}</strong> has been successfully confirmed!</p>
<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #166534; text-transform: uppercase;">Event Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 100px;">Date:</td><td style="padding: 4px 0; font-weight: 600;">{{event_date}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Time:</td><td style="padding: 4px 0; font-weight: 600;">{{event_time}}</td></tr>
    </table>
</div>
<div style="text-align: center;">
    <a href="{{event_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">View Opportunity</a>
</div>"""
    },
    "waitlist_notification": {
        "name": "Waitlist Notification",
        "type": "waitlist_notification",
        "subject": "Waitlist Update: {{event_title}}",
        "placeholders": ["participant_name", "event_title", "organization_name", "waitlist_position"],
        "is_default": True,
        "emoji": "⏳",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">You have been placed on the waitlist for <strong>{{event_title}}</strong> hosted by <strong>{{organization_name}}</strong>.</p>
<div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #d97706;">Your Waitlist Position</p>
    <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: #b45309;">#{{waitlist_position}}</p>
</div>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">We will notify you immediately if a spot becomes available and you are moved off the waitlist.</p>"""
    },
    "approval_rejection_update": {
        "name": "Application Status Update",
        "type": "approval_rejection_update",
        "subject": "{{application_status}} — {{event_title}}",
        "placeholders": ["participant_name", "event_title", "application_status", "status_message", "organization_name"],
        "is_default": True,
        "emoji": "🔔",
        "body_html": """<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<div style="background: #f8f7ff; border-radius: 16px; padding: 28px; border: 1px solid #e8e5ff; margin-bottom: 24px;">
    <p style="font-size: 12px; color: #6C3BFF; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">{{application_status}}</p>
    <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 20px 0;">{{status_message}}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
        <tr>
            <td style="padding: 12px 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Event</p>
                <p style="font-size: 15px; color: #0f172a; font-weight: 600; margin: 0;">{{event_title}}</p>
            </td>
        </tr>
    </table>
    <a href="{{frontend_url}}/events/{{event_id}}" style="display: block; text-align: center; padding: 14px 28px; background-color: #6C3BFF; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; margin-top: 20px;">Go to Event</a>
</div>
<p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">Sent by <strong style="color: #64748b;">Studlyf</strong> on behalf of {{organization_name}}</p>"""
    },
    "event_reminder": {
        "name": "Event Reminder",
        "type": "event_reminder",
        "subject": "Upcoming Event Reminder: {{event_title}}",
        "placeholders": ["participant_name", "event_title", "time_remaining", "event_date", "event_link"],
        "is_default": True,
        "emoji": "⏰",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">This is a friendly reminder that <strong>{{event_title}}</strong> is starting soon!</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Starts On:</td><td style="padding: 4px 0; font-weight: 600;">{{event_date}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Time Remaining:</td><td style="padding: 4px 0; font-weight: 600; color: #7C3AED;">{{time_remaining}}</td></tr>
    </table>
</div>
<div style="text-align: center;">
    <a href="{{event_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Go to Event Hub</a>
</div>"""
    },
    "round_unlock": {
        "name": "Round Unlocked",
        "type": "round_unlock",
        "subject": "New Round Unlocked: {{round_name}} - {{event_title}}",
        "placeholders": ["participant_name", "event_title", "round_name", "round_deadline", "round_link"],
        "is_default": True,
        "emoji": "🔓",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">The next round has been unlocked for you in <strong>{{event_title}}</strong>.</p>
<div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 14px; color: #475569;">Unlocked Round: <strong style="color: #7C3AED;">{{round_name}}</strong></p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Deadline: <strong>{{round_deadline}}</strong></p>
</div>
<div style="text-align: center;">
    <a href="{{round_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Start Round</a>
</div>"""
    },
    "submission_confirmation": {
        "name": "Submission Confirmation",
        "type": "submission_confirmation",
        "subject": "Submission Confirmed: {{round_name}} - {{event_title}}",
        "placeholders": ["participant_name", "team_name", "event_title", "round_name", "submission_time"],
        "is_default": True,
        "emoji": "🚀",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Your submission has been successfully received for team <strong>"{{team_name}}"</strong>.</p>
<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Event:</td><td style="padding: 4px 0; font-weight: 600;">{{event_title}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Round:</td><td style="padding: 4px 0; font-weight: 600;">{{round_name}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Submitted At:</td><td style="padding: 4px 0; font-weight: 600;">{{submission_time}}</td></tr>
    </table>
</div>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">You can review or update your submission details directly inside the Event Hub dashboard before the round closing window.</p>"""
    },
    "winner_announcement": {
        "name": "Winner Announcement",
        "type": "winner_announcement",
        "subject": "Winner Announcement: {{event_title}} 🏆",
        "placeholders": ["participant_name", "event_title", "winning_team", "prize_details"],
        "is_default": True,
        "emoji": "🏆",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">The results are in for <strong>{{event_title}}</strong>! Please join us in celebrating the winners.</p>
<div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #d97706; letter-spacing: 1px;">🥇 Winning Team</p>
    <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800; color: #92400e;">{{winning_team}}</p>
    <p style="margin: 12px 0 0 0; font-size: 14px; color: #b45309; line-height: 1.5;">{{prize_details}}</p>
</div>
<p style="margin: 0; font-size: 14px; color: #475569;">Thank you to all teams and participants for making this opportunity a massive success!</p>"""
    },
    "certificate_issued": {
        "name": "Certificate Issued",
        "type": "certificate_issued",
        "subject": "Wow, look at your certificate | {{event_title}} 🚀",
        "placeholders": ["participant_name", "event_title", "organization_name", "certificate_id", "issued_date", "certificate_download_link", "verification_url"],
        "is_default": True,
        "emoji": "🎓",
        "body_html": """<div style=\"background:#1f4f8f;border-radius:18px;padding:28px 24px;color:#fff;overflow:hidden;position:relative;margin-bottom:24px;\">
    <div style=\"font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-bottom:14px;\">{{organization_name}}</div>
    <div style=\"font-size:34px;line-height:1.05;font-weight:900;margin:0 0 14px 0;max-width:300px;\">Woohoo!<br/>Time to become a celebrity on social media!</div>
    <div style=\"font-size:15px;line-height:1.6;max-width:360px;opacity:.95;\">Congratulations, here is your certificate for <strong>{{event_title}}</strong> 🚀</div>
</div>
<div style=\"text-align:center;margin:0 0 14px 0;font-size:15px;color:#334155;\">Congratulations, here is your certificate for <strong>{{event_title}}</strong> 🚀</div>
<div style=\"background:#eff6ff;border-radius:18px;padding:22px 18px;margin:0 auto 24px auto;max-width:280px;text-align:center;box-shadow:0 8px 24px rgba(37,99,235,.10);\">
    <div style=\"font-size:18px;font-weight:900;color:#1d4ed8;line-height:1.2;margin-bottom:18px;\">Certificate of <br/>Participation</div>
    <a href=\"{{certificate_download_link}}\" style=\"display:inline-block;padding:12px 22px;background:#215b9f;color:#fff;border-radius:999px;text-decoration:none;font-weight:800;font-size:14px;box-shadow:0 6px 14px rgba(33,91,159,.3);\">Download</a>
</div>
<p style=\"margin:0 0 18px 0;color:#475569;line-height:1.7;text-align:center;\">Share them on social media &amp; show the world your spirit of competitiveness that is going to reap you amazing rewards.</p>
<div style=\"display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:12px 0 22px 0;\">
    <span style=\"width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;\">WA</span>
    <span style=\"width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;\">IN</span>
    <span style=\"width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;\">FB</span>
    <span style=\"width:38px;height:38px;border-radius:999px;background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;\">X</span>
</div>
<div style=\"background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:22px 16px;text-align:center;margin:0 -40px 0 -40px;\">
    <div style=\"font-size:28px;font-weight:900;color:#1d4ed8;line-height:1;margin-bottom:10px;\">{{organization_name}}</div>
    <div style=\"font-size:14px;color:#475569;margin-bottom:12px;\">Join our evergrowing unstoppable community</div>
</div>
<p style=\"margin:18px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;\">Queries? We’re just one email away: <a href=\"mailto:{{support_email}}\" style=\"color:#1d4ed8;text-decoration:none;font-weight:700;\">{{support_email}}</a> &middot; &copy; 2026 {{organization_name}}. All rights reserved.</p>"""
    },
    "certificate_content": {
        "name": "Certificate Details",
        "type": "certificate_content",
        "subject": "Certificate Details - {{event_title}}",
        "placeholders": ["participant_name", "event_title", "certificate_id", "achievement_level"],
        "is_default": True,
        "emoji": "📜",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Here are the technical details and credentials for your certificate of achievement in <strong>{{event_title}}</strong>.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 150px;">Credential ID:</td><td style="padding: 4px 0; font-weight: 600; font-family: 'Poppins', sans-serif;">{{certificate_id}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Achievement Level:</td><td style="padding: 4px 0; font-weight: 600; color: #7C3AED;">{{achievement_level}}</td></tr>
    </table>
</div>"""
    },
    "feedback_request": {
        "name": "Feedback Request",
        "type": "feedback_request",
        "subject": "Share Your Feedback: {{event_title}}",
        "placeholders": ["participant_name", "event_title", "feedback_url"],
        "is_default": True,
        "emoji": "💬",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">We hope you enjoyed participating in <strong>{{event_title}}</strong>! Your insights help us make Studlyf opportunities even better.</p>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">Please take two minutes to share your honest thoughts and experience with the organizing team.</p>
<div style="text-align: center;">
    <a href="{{feedback_url}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Give Feedback</a>
</div>"""
    },
    "event_published": {
        "name": "Event Published",
        "type": "event_published",
        "subject": "Event Published: {{event_title}}",
        "placeholders": ["organizer_name", "event_title", "event_link"],
        "is_default": True,
        "emoji": "📢",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{organizer_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Congratulations! Your event <strong>{{event_title}}</strong> is now published and active on Studlyf.</p>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">Participants can now discover, share, and register for this opportunity.</p>
<div style="text-align: center;">
    <a href="{{event_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">View Live Opportunity</a>
</div>"""
    },
    "new_registration": {
        "name": "New Registration Alert",
        "type": "new_registration",
        "subject": "New Registration for {{event_title}}",
        "placeholders": ["organizer_name", "event_title", "participant_name", "registration_count", "dashboard_link"],
        "is_default": True,
        "emoji": "👤",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{organizer_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">You have a new participant registration for <strong>{{event_title}}</strong>!</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 150px;">Registered Builder:</td><td style="padding: 4px 0; font-weight: 600;">{{participant_name}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Total Signups:</td><td style="padding: 4px 0; font-weight: 600; color: #7C3AED;">{{registration_count}}</td></tr>
    </table>
</div>
<div style="text-align: center;">
    <a href="{{dashboard_link}}" style="background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Go to Dashboard</a>
</div>"""
    },
    "plan_activation": {
        "name": "Plan Activation",
        "type": "plan_activation",
        "subject": "Your {{plan_name}} Subscription is Now Active",
        "placeholders": ["user_name", "plan_name", "start_date", "expiry_date", "billing_cycle", "manage_subscription_url"],
        "is_default": True,
        "emoji": "⚡",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{user_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Your subscription to <strong style="color: #7C3AED;">{{plan_name}}</strong> has been successfully activated.</p>
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Start Date:</td><td style="padding: 4px 0; font-weight: 600;">{{start_date}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Renewal Date:</td><td style="padding: 4px 0; font-weight: 600;">{{expiry_date}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Billing Cycle:</td><td style="padding: 4px 0; font-weight: 600;">{{billing_cycle}}</td></tr>
    </table>
</div>
<div style="text-align: center;">
    <a href="{{manage_subscription_url}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Manage Billing</a>
</div>"""
    },
    "plan_expiry": {
        "name": "Plan Expiry Notice",
        "type": "plan_expiry",
        "subject": "Action Required: Your {{plan_name}} Has {{expiry_label}}",
        "placeholders": ["user_name", "plan_name", "expiry_date", "expiry_label", "renew_url", "message", "renew_section"],
        "is_default": True,
        "emoji": "⚠️",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{user_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #ef4444; font-weight: 600;">{{message}}</p>
<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Plan:</td><td style="padding: 4px 0; font-weight: 600;">{{plan_name}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Status:</td><td style="padding: 4px 0; font-weight: 600; color: #dc2626;">{{expiry_label}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Date:</td><td style="padding: 4px 0; font-weight: 600;">{{expiry_date}}</td></tr>
    </table>
</div>
<div style="margin-bottom: 16px;">
    {{renew_section}}
</div>
<p style="margin: 0; font-size: 13px; color: #64748b;">Renew now to avoid service interruptions or losing administrator access to your active event analytics.</p>"""
    },
    "payment_failed": {
        "name": "Payment Failed",
        "type": "payment_failed",
        "subject": "Payment Failed: {{plan_name}}",
        "placeholders": ["user_name", "plan_name", "payment_link"],
        "is_default": True,
        "emoji": "❌",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{user_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">We were unable to process your subscription payment for <strong>{{plan_name}}</strong>.</p>
<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991b1b;">Transaction Failed</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #7f1d1d;">Please update your payment method details to keep your subscription active.</p>
</div>
<div style="text-align: center;">
    <a href="{{payment_link}}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Update Payment Details</a>
</div>"""
    },
    "password_reset": {
        "name": "Password Reset",
        "type": "password_reset",
        "subject": "Reset Your Studlyf Password",
        "placeholders": ["participant_name", "reset_link", "expiry_duration"],
        "is_default": True,
        "emoji": "🔑",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">We received a request to reset your Studlyf account password. Click the button below to secure your account:</p>
<div style="text-align: center; margin: 30px 0;">
    <a href="{{reset_link}}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Reset Password</a>
</div>
<p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">This reset link will expire in {{expiry_duration}}. If you did not request this change, please ignore this email.</p>"""
    },
    "email_verification": {
        "name": "Email Verification",
        "type": "email_verification",
        "subject": "Verify Your Email - Studlyf",
        "placeholders": ["participant_name", "verification_link"],
        "is_default": True,
        "emoji": "✉️",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Welcome to Studlyf! Please verify your email address to unlock your account and begin discovering opportunities.</p>
<div style="text-align: center; margin: 30px 0;">
    <a href="{{verification_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Verify Email Address</a>
</div>
<p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">If you didn't create a Studlyf account, you can safely delete this email.</p>"""
    },
    "team_invitation": {
        "name": "Team Invitation",
        "type": "team_invitation",
        "subject": "Team Invitation: {{event_title}}",
        "placeholders": ["participant_name", "team_leader_name", "team_name", "event_title", "organization_name", "invite_link", "current_team_size", "max_team_size"],
        "is_default": True,
        "emoji": "🤝",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;"><strong>{{team_leader_name}}</strong> has invited you to join the team <strong>"{{team_name}}"</strong> for the opportunity <strong>{{event_title}}</strong> hosted by <strong>{{organization_name}}</strong>.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 14px; color: #475569;">Team Name: <strong>{{team_name}}</strong></p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Members: {{current_team_size}} / {{max_team_size}}</p>
</div>
<div style="text-align: center;">
    <a href="{{invite_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Accept Invitation</a>
</div>"""
    },
    "team_join_approved": {
        "name": "Team Join Request Approved",
        "type": "team_join_approved",
        "subject": "Join Request Approved: {{event_title}}",
        "placeholders": ["participant_name", "team_name", "event_title", "organization_name", "team_link"],
        "is_default": True,
        "emoji": "🙌",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Excellent! Your request to join team <strong>"{{team_name}}"</strong> for <strong>{{event_title}}</strong> has been approved.</p>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">You are now an active team member and can start contributing to the submission.</p>
<div style="text-align: center;">
    <a href="{{team_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Go to Team Dashboard</a>
</div>"""
    },
    "opportunity_reminder": {
        "name": "Opportunity Deadline Reminder",
        "type": "opportunity_reminder",
        "subject": "Reminder: {{event_title}} registration closes soon",
        "placeholders": ["participant_name", "event_title", "organization_name", "registration_deadline", "event_link"],
        "is_default": True,
        "emoji": "⏳",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Don't miss out! Registrations are closing soon for <strong>{{event_title}}</strong> hosted by <strong>{{organization_name}}</strong>.</p>
<div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #b45309;">Deadline approaching: {{registration_deadline}}</p>
</div>
<div style="text-align: center;">
    <a href="{{event_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Complete Registration</a>
</div>"""
    },
    "announcement": {
        "name": "Custom Announcement",
        "type": "announcement",
        "subject": "Important Update: {{event_name}}",
        "placeholders": ["team_name", "event_name", "participant_name", "custom_message", "stage_name"],
        "is_default": True,
        "emoji": "📢",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 18px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Announcement for {{event_name}}</p>
<div style="font-size: 15px; color: #374151; line-height: 1.7; border-left: 4px solid #7C3AED; padding-left: 20px; margin: 20px 0;">
    {{custom_message}}
</div>"""
    },
    "deadline_reminder": {
        "name": "Deadline Reminder",
        "type": "deadline_reminder",
        "subject": "Reminder: {{stage_name}} deadline approaching for {{event_name}}",
        "placeholders": ["team_name", "event_name", "stage_name", "participant_name", "deadline"],
        "is_default": True,
        "emoji": "⏰",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Team <strong>"{{team_name}}"</strong>, please take note that the deadline for <strong>{{stage_name}}</strong> is approaching quickly.</p>
<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #b91c1c;">Submission Deadline: {{deadline}}</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #ef4444;">Make sure to upload and lock your submission before the timer runs out!</p>
</div>
<div style="text-align: center;">
    <a href="{{frontend_url}}/dashboard/learner" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Submit Now</a>
</div>"""
    },
    "deadline_extension": {
        "name": "Deadline Extension",
        "type": "deadline_extension",
        "subject": "Deadline Extended: {{event_name}} - {{stage_name}}",
        "placeholders": ["team_name", "event_name", "stage_name", "participant_name", "new_deadline"],
        "is_default": True,
        "emoji": "📅",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Great news! The organizers of <strong>{{event_name}}</strong> have granted additional time to refine your submission for <strong>{{stage_name}}</strong>.</p>
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #065f46;">New Extended Deadline</p>
    <p style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800; color: #047857;">{{new_deadline}}</p>
</div>
<p style="margin: 0; font-size: 14px; color: #475569;">Make the most of this extension to perfect your team's solution.</p>"""
    },
    "new_opportunity": {
        "name": "New Opportunity Announcement",
        "type": "new_opportunity",
        "subject": "New Opportunity: {{event_title}} by {{organization_name}}",
        "placeholders": ["participant_name", "event_title", "organization_name", "event_type", "event_mode", "registration_deadline", "prize_pool", "eligibility", "short_description", "event_link"],
        "is_default": True,
        "emoji": "🚀",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">A new opportunity matching your profile has been posted on Studlyf. Here are the details:</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #7C3AED;">{{event_title}}</h3>
    <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b; font-weight: 600;">Hosted by {{organization_name}}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #374151;">
        <tr><td style="padding: 5px 0; color: #6b7280; width: 90px;">Type</td><td style="padding: 5px 0; font-weight: 600;">{{event_type}}</td></tr>
        <tr><td style="padding: 5px 0; color: #6b7280;">Mode</td><td style="padding: 5px 0; font-weight: 600;">{{event_mode}}</td></tr>
        <tr><td style="padding: 5px 0; color: #6b7280;">Prize Pool</td><td style="padding: 5px 0; font-weight: 700; color: #166534;">{{prize_pool}}</td></tr>
        <tr><td style="padding: 5px 0; color: #6b7280;">Deadline</td><td style="padding: 5px 0; font-weight: 600;">{{registration_deadline}}</td></tr>
        <tr><td style="padding: 5px 0; color: #6b7280;">Eligibility</td><td style="padding: 5px 0; font-weight: 600;">{{eligibility}}</td></tr>
    </table>
</div>
<p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">{{short_description}}</p>
<div style="text-align: center; margin-bottom: 24px;">
    <a href="{{event_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Register Now</a>
</div>
<p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">If the button doesn't work, copy and paste this link in your browser:<br><span style="color: #7C3AED;">{{event_link}}</span></p>"""
    },
    "payment_confirmation": {
        "name": "Payment Confirmed",
        "type": "payment_confirmation",
        "subject": "Payment Confirmed: {{plan_name}}",
        "placeholders": ["user_name", "plan_name", "amount", "transaction_id", "billing_date"],
        "is_default": True,
        "emoji": "💳",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{user_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Thank you for your payment! This email confirms your subscription purchase details:</p>
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 140px;">Purchased Plan:</td><td style="padding: 4px 0; font-weight: 600; color: #7C3AED;">{{plan_name}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Amount Paid:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">{{amount}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Transaction ID:</td><td style="padding: 4px 0; font-weight: 600; font-family: 'Poppins', sans-serif;">{{transaction_id}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Billing Date:</td><td style="padding: 4px 0; font-weight: 600;">{{billing_date}}</td></tr>
    </table>
</div>"""
    },
    "recommended_opportunities": {
        "name": "Recommended Opportunities",
        "type": "recommended_opportunities",
        "subject": "Recommended Opportunities for You",
        "placeholders": ["participant_name", "recommended_opportunities", "recommendation_link"],
        "is_default": True,
        "emoji": "🎯",
        "body_html": """<p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hi <strong>{{participant_name}}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Based on your activity, skills, and profile, we curated these personalized weekly recommendations for you:</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 14px; color: #374151; line-height: 1.8;">
        {{recommended_opportunities}}
    </div>
</div>
<div style="text-align: center;">
    <a href="{{recommendation_link}}" style="background-color: #7C3AED; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Discover All Opportunities</a>
</div>"""
    }
}


def render_template(template: dict, context: dict) -> (str, str):
    """
    Renders subject and body_html by replacing placeholders with context values.
    Supports both {{placeholder}} and {placeholder} styles.
    Wraps the body in our beautiful HSL congratulations purple shell.
    """
    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    full_context = {
        "frontend_url": frontend_url,
    }
    full_context.update(context)

    subject = template.get("subject", "")
    inner_body = template.get("body_html", "")

    # 1. Resolve placeholders in the inner template body first
    for key, value in full_context.items():
        str_value = str(value) if value is not None else ""
        inner_body = inner_body.replace("{{" + key + "}}", str_value).replace("{" + key + "}", str_value)

    # 2. Wrap inside the premium shell
    emoji = template.get("emoji", "🎉")
    title = template.get("name", "Notification")
    full_html = _wrap_premium_html_shell(inner_body, title, accent_color="#7C3AED", emoji=emoji)

    # 3. Resolve placeholders in subject and full_html (for global placeholders like frontend_url inside the shell)
    for key, value in full_context.items():
        str_value = str(value) if value is not None else ""
        subject = subject.replace("{{" + key + "}}", str_value).replace("{" + key + "}", str_value)
        full_html = full_html.replace("{{" + key + "}}", str_value).replace("{" + key + "}", str_value)

    return subject, full_html


async def get_templates_for_event(
    event_id: str,
    institution_id: str,
    template_type: Optional[str] = None
) -> List[Dict]:
    """
    Get templates for event (fallback to institution-level then defaults).
    """
    from db import email_templates_col

    query = {
        "$or": [
            {"event_id": event_id},
            {"institution_id": institution_id, "event_id": None},
            {"is_default": True, "event_id": None, "institution_id": None}
        ]
    }
    if template_type:
        query["type"] = template_type

    cursor = email_templates_col.find(query).sort([("event_id", -1), ("institution_id", -1)])
    templates = await cursor.to_list(length=100)

    for t in templates:
        t["_id"] = str(t["_id"])

    return templates


async def get_active_template(event_id: str, institution_id: str, template_type: str) -> Optional[Dict]:
    """
    Get the active template for a specific type, with priority:
    1. Event-level active template
    2. Institution-level active template
    3. Default template
    """
    from db import email_templates_col

    template = await email_templates_col.find_one({
        "event_id": event_id, "type": template_type, "is_active": True
    })
    if template:
        template["_id"] = str(template["_id"])
        return template

    template = await email_templates_col.find_one({
        "institution_id": institution_id, "event_id": None, "type": template_type, "is_active": True
    })
    if template:
        template["_id"] = str(template["_id"])
        return template

    if template_type in DEFAULT_TEMPLATES:
        return {**DEFAULT_TEMPLATES[template_type], "_id": f"default_{template_type}"}

    return None


async def upsert_template(template_data: dict) -> dict:
    """
    Create or update an email template.
    """
    from db import email_templates_col

    template_id = template_data.pop("_id", None)

    template_data["updated_at"] = datetime.utcnow()

    if template_id and template_id != "new":
        try:
            await email_templates_col.update_one(
                {"_id": ObjectId(template_id)},
                {"$set": template_data}
            )
            template_data["_id"] = template_id
        except Exception:
            template_data.pop("_id", None)
            result = await email_templates_col.insert_one(template_data)
            template_data["_id"] = str(result.inserted_id)
    else:
        template_data["created_at"] = datetime.utcnow()
        template_data.pop("_id", None)
        result = await email_templates_col.insert_one(template_data)
        template_data["_id"] = str(result.inserted_id)

    return template_data


async def delete_template(template_id: str) -> bool:
    """Delete a template by ID."""
    from db import email_templates_col
    result = await email_templates_col.delete_one({"_id": ObjectId(template_id)})
    return result.deleted_count > 0


async def seed_default_templates(event_id: str, institution_id: str):
    """
    Seed default templates for a newly created event.
    Skips if already seeded.
    """
    from db import email_templates_col

    existing = await email_templates_col.find_one({"event_id": event_id, "type": "stage_advancement"})
    if existing:
        return

    for ttype, tdata in DEFAULT_TEMPLATES.items():
        doc = {
            **tdata,
            "event_id": event_id,
            "institution_id": institution_id,
            "is_active": True,
            "is_default": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        doc.pop("type", None)
        doc["type"] = ttype
        await email_templates_col.insert_one(doc)

    logger.info(f"Seeded {len(DEFAULT_TEMPLATES)} email templates for event {event_id}")


async def send_template_email(
    template_type: str,
    recipient: str,
    context: dict,
    subject_override: str = None,
    event_id: str = "",
    institution_id: str = "",
):
    """
    Send an email using the DB-based template system.
    Resolves event-level → institution-level → default template.
    Falls back gracefully if template not found.
    """
    from services.email_service import send_notification_email

    template = await get_active_template(event_id, institution_id, template_type)
    if not template:
        logger.warning(f"No template found for type '{template_type}' — skipping email to {recipient}")
        return False

    subj, body = render_template(template, context)
    result = await send_notification_email(recipient, subject_override or subj, body)
    return bool(result)


def markdown_to_html(md: str) -> str:
    """
    Safely converts markdown elements to styled inline and block HTML.
    Tries standard libraries (markdown2, mistune, markdown) first, falls back to custom regex parser.
    Parses with BeautifulSoup to strip unsafe tags, clean unsafe element attributes, and inject elegant congratulations purple styling.
    """
    import html
    import re

    if not md:
        return ""

    # Try standard markdown engines first
    compiled_html = None
    try:
        import markdown2
        compiled_html = markdown2.markdown(md)
        logger.info("Using markdown2 for conversion")
    except ImportError:
        try:
            import mistune
            compiled_html = mistune.html(md)
            logger.info("Using mistune for conversion")
        except ImportError:
            try:
                import markdown
                compiled_html = markdown.markdown(md)
                logger.info("Using markdown for conversion")
            except ImportError:
                logger.warning("Standard markdown libraries (markdown2, mistune, markdown) not found. Using custom regex parser fallback.")

    if compiled_html is None:
        # Fallback to our robust custom parser
        escaped = html.escape(md)
        escaped = escaped.replace("\r\n", "\n").replace("\r", "\n")
        lines = escaped.split("\n")
        html_elements = []
        in_list = False

        def render_inline(text: str) -> str:
            text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
            text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
            return text

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if in_list:
                    html_elements.append("</ul>")
                    in_list = False
                continue

            if stripped.startswith("- "):
                if not in_list:
                    html_elements.append('<ul style="list-style-type: disc; padding-left: 20px; margin: 0 0 15px 0; text-align: left;">')
                    in_list = True
                content = render_inline(stripped[2:])
                html_elements.append(f'<li style="font-size: 14px; color: #4B5563; margin-bottom: 5px; line-height: 1.6;">{content}</li>')
            else:
                if in_list:
                    html_elements.append("</ul>")
                    in_list = False

                if stripped.startswith("### "):
                    content = render_inline(stripped[4:])
                    html_elements.append(f'<h3 style="font-size: 15px; font-weight: 800; color: #1F2937; margin-top: 15px; margin-bottom: 5px; text-align: left;">{content}</h3>')
                elif stripped.startswith("## "):
                    content = render_inline(stripped[3:])
                    html_elements.append(f'<h2 style="font-size: 18px; font-weight: 800; color: #7C3AED; margin-top: 20px; margin-bottom: 10px; text-align: left;">{content}</h2>')
                elif stripped.startswith("# "):
                    content = render_inline(stripped[2:])
                    html_elements.append(f'<h1 style="font-size: 22px; font-weight: 800; color: #111827; text-align: center; margin-bottom: 15px;">{content}</h1>')
                else:
                    content = render_inline(stripped)
                    html_elements.append(f'<p style="margin: 0 0 10px 0; font-size: 14px; color: #4B5563; line-height: 1.6; text-align: left;">{content}</p>')

        if in_list:
            html_elements.append("</ul>")
        compiled_html = "\n".join(html_elements)

    # Now, parse using BeautifulSoup to sanitize and apply gorgeous congratulate-purple inline styling
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(compiled_html, "html.parser")

        # Strip unsafe elements: script, iframe, style, link, object, embed, applet, meta, form, input, button
        for tag in soup(["script", "iframe", "style", "link", "object", "embed", "applet", "meta", "form", "input", "button"]):
            tag.decompose()

        # Clean attributes to prevent javascript execution (XSS hardening)
        for tag in soup.find_all(True):
            # Clean href links
            if tag.name == "a":
                href = tag.get("href", "").strip().lower()
                if href.startswith("javascript:") or href.startswith("data:") or href.startswith("vbscript:"):
                    tag["href"] = "#"
            
            # Clean standard JS attributes
            attrs = list(tag.attrs.keys())
            for attr in attrs:
                if attr.startswith("on") or attr in ["onclick", "onload", "onerror", "onmouseover", "action", "formaction"]:
                    del tag[attr]

        # Premium congratulations-purple theme inline styles
        styles = {
            "h1": "font-size: 24px; font-weight: 800; color: #7C3AED; text-align: center; margin-top: 0; margin-bottom: 16px; font-family: 'Poppins', sans-serif', sans-serif;",
            "h2": "font-size: 20px; font-weight: 800; color: #7C3AED; margin-top: 24px; margin-bottom: 12px; font-family: 'Poppins', sans-serif', sans-serif; text-align: left;",
            "h3": "font-size: 16px; font-weight: 700; color: #1F2937; margin-top: 20px; margin-bottom: 8px; font-family: 'Poppins', sans-serif', sans-serif; text-align: left;",
            "p": "font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 12px 0; font-family: 'Poppins', sans-serif', sans-serif; text-align: left;",
            "ul": "list-style-type: disc; padding-left: 20px; margin: 0 0 16px 0; text-align: left;",
            "li": "font-size: 14px; color: #4B5563; margin-bottom: 6px; line-height: 1.6; font-family: 'Poppins', sans-serif', sans-serif;",
            "strong": "font-weight: 700; color: #111827;",
            "a": "color: #7C3AED; font-weight: 600; text-decoration: underline;"
        }

        # Apply inline styles
        for tag_name, style_str in styles.items():
            for el in soup.find_all(tag_name):
                existing = el.get("style", "")
                if existing:
                    if not existing.endswith(";"):
                        existing += ";"
                    el["style"] = existing + " " + style_str
                else:
                    el["style"] = style_str

        sanitized_html = str(soup)
    except Exception as e:
        logger.warning(f"BeautifulSoup parsing/sanitization failed: {e}. Returning raw compiled HTML.")
        sanitized_html = compiled_html

    return sanitized_html


def render_stage_custom_email(subject_override: str, body_markdown: str, context: dict) -> (str, str):
    """
    Renders the custom markdown stage email inside the standardized congratulations branded container
    and replaces placeholders with context variables.
    """
    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Render the subject override or standard subject
    subject = subject_override or "Congratulations {{team_name}}! You've advanced to {{stage_name}}"
    
    # Safe convert body markdown to html
    custom_html = markdown_to_html(body_markdown)
    
    # Build standardized congratulations container
    full_html = _wrap_premium_html_shell(custom_html, "Stage Unlocked", accent_color="#7C3AED", emoji="🎉")
    
    # Resolve context placeholders in both subject and full HTML
    full_context = {
        "frontend_url": frontend_url,
    }
    full_context.update(context)

    for key, value in full_context.items():
        str_value = str(value) if value is not None else ""
        subject = subject.replace("{{" + key + "}}", str_value).replace("{" + key + "}", str_value)
        full_html = full_html.replace("{{" + key + "}}", str_value).replace("{" + key + "}", str_value)

    return subject, full_html


# --- Central Variable Registry ---
AVAILABLE_STAGE_VARIABLES = {
    # Participant & Team details
    "participant_name": {"description": "Full name of the participant/student", "example": "Alex Mercer", "scopes": ["all"]},
    "team_name": {"description": "Name of the student's team", "example": "Apex Coders", "scopes": ["all"]},
    "team_leader_name": {"description": "Name of the team leader initiating actions", "example": "John Doe", "scopes": ["all"]},
    "current_team_size": {"description": "Current number of members in the team", "example": "3", "scopes": ["all"]},
    "max_team_size": {"description": "Maximum allowed members in the team", "example": "configured value", "scopes": ["all"]},
    "team_link": {"description": "Direct URL link to the Team page", "example": "http://localhost:3000/dashboard/team/123", "scopes": ["all"]},
    
    # Event & Round details
    "event_name": {"description": "Title of the hackathon or event", "example": "Studlyf Winter Hackathon", "scopes": ["all"]},
    "event_title": {"description": "Alternative title field of the event", "example": "Studlyf Winter Hackathon", "scopes": ["all"]},
    "event_type": {"description": "Format/Type of the opportunity", "example": "Hackathon", "scopes": ["all"]},
    "event_mode": {"description": "Participation mode", "example": "Online", "scopes": ["all"]},
    "event_link": {"description": "Direct URL link to the Event Hub page", "example": "http://localhost:3000/opportunity/event-123", "scopes": ["all"]},
    "organization_name": {"description": "Name of the host organization", "example": "Google DeepMind", "scopes": ["all"]},
    "registration_deadline": {"description": "Deadline date for registering", "example": "2026-06-01", "scopes": ["all"]},
    "prize_pool": {"description": "Total prize pool details", "example": "$10,000 USD", "scopes": ["all"]},
    "eligibility": {"description": "Eligibility criteria description", "example": "Undergraduate Students", "scopes": ["all"]},
    "short_description": {"description": "Brief description of the opportunity", "example": "A coding competition for students...", "scopes": ["all"]},
    "time_remaining": {"description": "Time remaining until event starts", "example": "2 days", "scopes": ["all"]},
    
    # Stages & Rounds
    "stage_name": {"description": "Name of the current or unlocked stage", "example": "Screening Assessment", "scopes": ["all"]},
    "deadline": {"description": "Deadline date/time for the current stage", "example": "2026-05-29 23:59 UTC", "scopes": ["all"]},
    "new_deadline": {"description": "Extended deadline date/time for the stage", "example": "2026-06-05 23:59 UTC", "scopes": ["all"]},
    "round_name": {"description": "Name of the unlocked round", "example": "Round 1: Idea Submission", "scopes": ["all"]},
    "round_deadline": {"description": "Deadline for the unlocked round", "example": "2026-06-10", "scopes": ["all"]},
    "round_link": {"description": "Direct URL link to the active round page", "example": "http://localhost:3000/dashboard/round/456", "scopes": ["all"]},
    "submission_time": {"description": "Timestamp of confirmation", "example": "2026-05-22 18:00 UTC", "scopes": ["all"]},
    "winning_team": {"description": "Name of the winning team", "example": "Apex Coders", "scopes": ["all"]},
    "prize_details": {"description": "Specific winning prize description", "example": "1st Place - $5,000 + Certificate", "scopes": ["all"]},
    
    # Waitlist & Application
    "waitlist_position": {"description": "Position number in waitlist", "example": "12", "scopes": ["all"]},
    "application_status": {"description": "Status of opportunity application", "example": "Approved", "scopes": ["all"]},
    "status_message": {"description": "Custom organizer feedback or update note", "example": "Your profile matched our criteria...", "scopes": ["all"]},
    
    # Certificates
    "certificate_id": {"description": "Unique verification certificate identifier", "example": "CERT-88192-X", "scopes": ["all"]},
    "issued_date": {"description": "Date the certificate was generated", "example": "2026-05-22", "scopes": ["all"]},
    "certificate_download_link": {"description": "Direct PDF download URL", "example": "http://localhost:3000/certificates/download/123", "scopes": ["all"]},
    "verification_url": {"description": "URL for public certificate verification", "example": "http://localhost:3000/verify/CERT-88192-X", "scopes": ["all"]},
    "achievement_level": {"description": "Specific badge or level of achievement", "example": "Winner / Participant", "scopes": ["all"]},
    
    # Subscriptions & Billing
    "user_name": {"description": "Full name of the platform user", "example": "John Doe", "scopes": ["all"]},
    "plan_name": {"description": "Name of subscription plan", "example": "Studlyf Premium Organizer", "scopes": ["all"]},
    "start_date": {"description": "Subscription period start date", "example": "2026-05-22", "scopes": ["all"]},
    "expiry_date": {"description": "Subscription period expiry date", "example": "2027-05-22", "scopes": ["all"]},
    "billing_cycle": {"description": "Frequency of billing (monthly/annual)", "example": "Annual", "scopes": ["all"]},
    "manage_subscription_url": {"description": "Direct URL to checkout portal settings", "example": "http://localhost:3000/dashboard/billing", "scopes": ["all"]},
    "expiry_label": {"description": "Descriptive tag for expiry state (expired/expires soon)", "example": "expired", "scopes": ["all"]},
    "renew_url": {"description": "Stripe/Payment gateway checkout URL", "example": "http://localhost:3000/dashboard/billing/renew", "scopes": ["all"]},
    "renew_section": {"description": "HTML button/section to renew subscription", "example": "<a href='...'>Renew Now</a>", "scopes": ["all"]},
    "message": {"description": "Custom system or warning message", "example": "Your subscription expired yesterday.", "scopes": ["all"]},
    "payment_link": {"description": "Checkout page url to update card", "example": "http://localhost:3000/dashboard/billing/pay", "scopes": ["all"]},
    "amount": {"description": "Amount paid/confirmed", "example": "$199.00 USD", "scopes": ["all"]},
    "transaction_id": {"description": "Unique transaction code", "example": "ch_3Mv9zXLk...", "scopes": ["all"]},
    "billing_date": {"description": "Date transaction took place", "example": "2026-05-22", "scopes": ["all"]},
    
    # System Triggers
    "reset_link": {"description": "Single-use secure link for password resets", "example": "http://localhost:3000/reset-password?token=...", "scopes": ["all"]},
    "expiry_duration": {"description": "Time until link expires", "example": "1 hour", "scopes": ["all"]},
    "verification_link": {"description": "Link to verify registration email", "example": "http://localhost:3000/verify-email?token=...", "scopes": ["all"]},
    "invite_link": {"description": "Link to accept invitation to join team", "example": "http://localhost:3000/join-team?token=...", "scopes": ["all"]},
    
    # Organizer notification specifics
    "organizer_name": {"description": "Name of the event organizer", "example": "Vivek Goud", "scopes": ["all"]},
    "registration_count": {"description": "Total registration count", "example": "154", "scopes": ["all"]},
    "dashboard_link": {"description": "Link to the organizer administration panel", "example": "http://localhost:3000/dashboard/organizer", "scopes": ["all"]},
    
    # Recommendations
    "recommended_opportunities": {"description": "HTML or text block list of recommended opportunities", "example": "• Opportunity A...", "scopes": ["all"]},
    "recommendation_link": {"description": "Personalized discovery page URL", "example": "http://localhost:3000/dashboard/learner/discover", "scopes": ["all"]},
    
    # Legacy specific fallback variables
    "custom_message": {"description": "Freeform rich-text message body", "example": "Dear team, please note...", "scopes": ["all"]}
}

ALLOWED_PLACEHOLDERS = set(AVAILABLE_STAGE_VARIABLES.keys()) | {"frontend_url"}

def validate_stage_email_placeholders(subject: str, body: str) -> list:
    """
    Finds and returns any invalid placeholders used in subject or body.
    Supports both {{placeholder}} and {placeholder} styles.
    """
    import re
    invalid = []
    # Find all pattern occurrences like {{word}} or {word}
    double_braces = re.findall(r'\{\{([a-zA-Z0-9_]+)\}\}', subject + " " + body)
    single_braces = re.findall(r'(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})', subject + " " + body)
    
    all_found = set(double_braces + single_braces)
    for p in all_found:
        if p not in ALLOWED_PLACEHOLDERS:
            invalid.append(p)
            
    return sorted(invalid)





