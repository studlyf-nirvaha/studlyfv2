"""
Opportunity Notification Service
Handles email notifications for opportunities:
- New opportunity posted
- Deadline reminders (3 days, 1 day)
- Daily digest of upcoming opportunities
"""

import asyncio
import os
from datetime import datetime, timedelta
from db import db, users_col, opportunities_col, events_col, participants_col
from services.email_service import send_notification_email
from services.email_template_service import get_active_template, render_template
from bson import ObjectId

opportunity_emails_log_col = db["opportunity_emails_log"]

async def send_new_opportunity_email(opportunity: dict, event: dict = None) -> dict:
    """
    Send immediate email to all users about a new opportunity.
    Uses the DB-based template system (supports event-level, institution-level, default overrides).
    """
    sent_count = 0
    failed_count = 0
    log_entries = []

    try:
        event_data = event or {}
        org_name = opportunity.get("organization") or event_data.get("organisation") or "Unknown Organization"
        event_mode = opportunity.get("location") or event_data.get("opportunityMode") or "Online"
        prize_pool = opportunity.get("prizePool") or opportunity.get("prize_pool") or event_data.get("prize_pool") or event_data.get("prizePool")
        if not prize_pool or str(prize_pool).strip() == '':
            prize_pool = "Not specified"
        eligibility = opportunity.get("candidateTypes") or event_data.get("candidateTypes") or []
        eligibility_str = ", ".join(eligibility) if isinstance(eligibility, list) else (str(eligibility) or "Open to all")
        short_desc = opportunity.get("description") or event_data.get("description") or ""
        if len(short_desc) > 250:
            short_desc = short_desc[:250] + "..."

        opp_id = str(opportunity.get("_id", ""))
        opp_title = opportunity.get("title") or event_data.get("title") or ""
        opp_deadline = opportunity.get("deadline") or event_data.get("registrationDeadline")
        opp_type = opportunity.get("type") or event_data.get("opportunityType") or ""

        institution_id = str(event_data.get("institution_id", "")) if event_data else ""

        deadline_str = "Not specified"
        if opp_deadline:
            if isinstance(opp_deadline, str):
                deadline_str = opp_deadline
            else:
                deadline_str = opp_deadline.strftime("%B %d, %Y")

        email_subject = f"New Opportunity: {opp_title} by {org_name}"
        frontend_url = os.getenv('FRONTEND_URL', 'https://studlyf.in')
        event_link = f"{frontend_url}/#/opportunities/{opp_id}"

        # Resolve template from DB (event-level > institution-level > default)
        template = await get_active_template(opp_id, institution_id, "new_opportunity")
        base_context = {
            "event_title": opp_title or "Untitled Opportunity",
            "organization_name": org_name,
            "event_type": opp_type or "General",
            "event_mode": event_mode,
            "registration_deadline": deadline_str,
            "prize_pool": prize_pool,
            "eligibility": eligibility_str,
            "short_description": short_desc,
            "event_link": event_link,
            "frontend_url": frontend_url,
        }

        async for user in users_col.find({}):
            try:
                email = user.get("email", "").strip()
                if not email:
                    continue

                participant_name = user.get("name") or user.get("full_name") or user.get("displayName") or "there"
                context = {**base_context, "participant_name": participant_name}
                subj, body = render_template(template, context)

                await send_notification_email(email, subj or email_subject, body)
                sent_count += 1
                log_entries.append({
                    "opportunity_id": opp_id,
                    "user_id": user.get("user_id"),
                    "email": email,
                    "type": "new_opportunity",
                    "sent_at": datetime.utcnow(),
                    "status": "sent"
                })

            except Exception as e:
                failed_count += 1
                print(f"[EMAIL FAIL] {user.get('email')}: {str(e)}")

        if log_entries:
            try:
                await opportunity_emails_log_col.insert_many(log_entries, ordered=False)
            except Exception as log_err:
                print(f"[LOG FAIL] Failed to bulk insert logs: {str(log_err)}")

        print(f"[EMAIL] New opportunity: sent={sent_count}, failed={failed_count}")
        return {"sent_count": sent_count, "failed_count": failed_count, "opportunity_id": opp_id}

    except Exception as e:
        print(f"[EMAIL ERROR] send_new_opportunity_email: {str(e)}")
        return {"sent_count": sent_count, "failed_count": failed_count, "error": str(e)}


async def send_deadline_reminder_emails(days_until: int = 3) -> dict:
    """
    Send deadline reminder emails for opportunities.
    Call this daily with days_until=3 for 3-day reminders, days_until=1 for 1-day reminders.
    
    Args:
        days_until: Days until deadline (3 or 1)
    
    Returns:
        dict with sent_count and failed_count
    """
    sent_count = 0
    failed_count = 0
    
    try:
        # Calculate date range for deadline
        now = datetime.utcnow()
        target_date = now + timedelta(days=days_until)
        
        # Get start and end of day for target_date
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Find opportunities with deadline in this range
        opportunities = await opportunities_col.find({
            "deadline": {"$gte": start_of_day, "$lte": end_of_day},
            "status": "active"
        }).to_list(length=1000)
        
        for opp in opportunities:
            try:
                opp_id = str(opp.get("_id", ""))
                opp_title = opp.get("title") or ""
                opp_org = opp.get("organization") or ""
                
                # Check if we already sent reminder for this opportunity and user combo
                # Iterate through all registered users
                async for user in users_col.find({"role": {"$in": ["student", "learner"]}}):
                    try:
                        # Check if reminder already sent
                        already_sent = await opportunity_emails_log_col.find_one({
                            "opportunity_id": opp_id,
                            "user_id": user.get("user_id"),
                            "type": f"reminder_{days_until}d"
                        })
                        
                        if already_sent:
                            continue
                        
                        email = user.get("email", "").strip()
                        if not email:
                            continue
                        
                        # Prepare email via template system
                        reminder_dt = opp.get('deadline')
                        reminder_date = reminder_dt.strftime('%B %d, %Y') if isinstance(reminder_dt, datetime) else str(reminder_dt or '')
                        from services.platform_notification_service import notify_opportunity_reminder
                        await notify_opportunity_reminder(
                            recipient_email=email,
                            participant_name=user.get("name") or user.get("full_name") or "Student",
                            event_title=opp_title,
                            organization_name=opp_org,
                            registration_deadline=reminder_date,
                            event_link=f"{os.getenv('FRONTEND_URL', 'https://studlyf.in')}/#/opportunities/{opp_id}",
                        )
                        sent_count += 1
                        
                        # Log the reminder
                        await opportunity_emails_log_col.insert_one({
                            "opportunity_id": opp_id,
                            "user_id": user.get("user_id"),
                            "email": email,
                            "type": f"reminder_{days_until}d",
                            "sent_at": datetime.utcnow(),
                            "status": "sent"
                        })
                    except Exception as e:
                        failed_count += 1
                        print(f"Failed to send reminder to {user.get('email')}: {str(e)}")
            except Exception as e:
                print(f"Error processing opportunity {opp_id}: {str(e)}")
        
        print(f"Deadline reminder emails ({days_until}d) sent: {sent_count}, failed: {failed_count}")
        return {"sent_count": sent_count, "failed_count": failed_count, "days_until": days_until}
        
    except Exception as e:
        print(f"Error in send_deadline_reminder_emails: {str(e)}")
        return {"sent_count": 0, "failed_count": 0, "error": str(e)}


async def send_daily_digest_email() -> dict:
    """
    Send daily digest emails to all students with upcoming opportunities and deadlines.
    Call this once per day.
    
    Returns:
        dict with sent_count and failed_count
    """
    sent_count = 0
    failed_count = 0
    
    try:
        now = datetime.utcnow()
        # Get opportunities in next 7 days
        seven_days_later = now + timedelta(days=7)
        
        # Find upcoming opportunities
        upcoming_opps = await opportunities_col.find({
            "deadline": {"$gte": now, "$lte": seven_days_later},
            "status": "active"
        }).sort("deadline", 1).to_list(length=1000)
        
        if not upcoming_opps:
            return {"sent_count": 0, "failed_count": 0, "message": "No upcoming opportunities"}
        
        # Iterate over all students
        async for user in users_col.find({"role": {"$in": ["student", "learner"]}}):
            try:
                email = user.get("email", "").strip()
                if not email:
                    continue
                
                user_name = user.get("name", "Student").split()[0]  # First name
                
                # Build digest HTML
                opportunities_html = ""
                for opp in upcoming_opps:
                    deadline = opp.get("deadline")
                    if isinstance(deadline, datetime):
                        deadline_str = deadline.strftime("%b %d, %Y")
                    else:
                        deadline_str = str(deadline)
                    
                    days_left = (deadline - now).days if isinstance(deadline, datetime) else 0
                    
                    opportunities_html += f"""
                    <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <h3 style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">{opp.get('title') or ''}</h3>
                            <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;">{opp.get('type') or ''}</span>
                        </div>
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">{opp.get('organization') or ''}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 12px;">📅 {deadline_str} <span style="color: #f59e0b; font-weight: 600;">({days_left}d left)</span></span>
                            <a href="{os.getenv('FRONTEND_URL', 'https://studlyf.in')}/#/opportunities/{str(opp.get('_id'))}" style="background: #667eea; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 600;">View</a>
                        </div>
                    </div>
                    """
                
                email_subject = f"📬 Daily Digest: {len(upcoming_opps)} upcoming opportunities for you"
                email_body = f"""
                <html>
                    <body style="font-family: 'Poppins', sans-serif; color: #111827; line-height: 1.6;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 900;">📬 Daily Digest</h1>
                                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Hi {user_name}! Here are your upcoming opportunities</p>
                            </div>

                            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Opportunities in the next 7 days</h2>
                                {opportunities_html}
                            </div>

                            <div style="text-align: center; margin-bottom: 30px;">
                                <a href="{os.getenv('FRONTEND_URL', 'https://studlyf.in')}/opportunities" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Browse All Opportunities
                                </a>
                            </div>

                            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
                                <p style="margin: 0;">You're receiving this daily digest because you're registered on Studlyf. <a href="{os.getenv('FRONTEND_URL', 'https://studlyf.in')}/settings/notifications" style="color: #667eea; text-decoration: none;">Manage preferences</a></p>
                            </div>
                        </div>
                    </body>
                </html>
                """
                
                await send_notification_email(email, email_subject, email_body)
                sent_count += 1
                
                # Log the digest
                await opportunity_emails_log_col.insert_one({
                    "user_id": user.get("user_id"),
                    "email": email,
                    "type": "daily_digest",
                    "sent_at": datetime.utcnow(),
                    "status": "sent",
                    "opportunities_count": len(upcoming_opps)
                })
            except Exception as e:
                failed_count += 1
                print(f"Failed to send digest to {user.get('email')}: {str(e)}")
        
        print(f"Daily digest emails sent: {sent_count}, failed: {failed_count}")
        return {"sent_count": sent_count, "failed_count": failed_count, "opportunities_count": len(upcoming_opps)}
        
    except Exception as e:
        print(f"Error in send_daily_digest_email: {str(e)}")
        return {"sent_count": 0, "failed_count": 0, "error": str(e)}

