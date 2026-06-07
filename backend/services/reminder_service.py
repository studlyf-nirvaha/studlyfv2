from db import events_col, judges_col, submissions_col, notifications_col, audit_logs_col, participants_col
from bson import ObjectId
from services.email_service import send_notification_email
import asyncio
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("reminder_service")

# Dedup collection for participant reminders
from db import db as _db
reminder_logs_col = _db["reminder_logs"]

class ReminderService:
    @staticmethod
    async def send_judge_reminders():
        """
        Scans for upcoming deadlines and pings judges with pending assignments.
        Runs periodically via scheduler.
        """
        logger.info("Scanning for upcoming judging deadlines...")
        
        # 1. Find active events with deadlines in the next 24-48 hours
        now = datetime.now(timezone.utc)
        soon = now + timedelta(hours=48)
        
        active_events = []
        async for event in events_col.find({
            "submission_deadline": {"$exists": True}
        }):
            try:
                deadline = datetime.fromisoformat(event["submission_deadline"].replace('Z', '+00:00'))
                if now < deadline <= soon:
                    active_events.append(event)
            except:
                continue
                
        if not active_events:
            logger.info("No urgent judging deadlines found.")
            return

        for event in active_events:
            event_id = str(event["_id"])
            event_name = event.get("title", event.get("name", "Event"))
            
            # 2. Get all submissions for this event that are 'Under Review'
            pending_submissions = []
            async for sub in submissions_col.find({
                "event_id": event_id,
                "status": "Under Review"
            }):
                pending_submissions.append(sub)
                
            if not pending_submissions:
                continue
                
            # 3. Identify unique judges who have pending work
            judges_to_remind = {} # email -> [submission_titles]
            
            for sub in pending_submissions:
                emails = sub.get("assigned_judge_emails", [])
                # If judge hasn't scored yet (check if scores exist for this judge/sub combo)
                from db import scores_col
                for email in emails:
                    score_exists = await scores_col.find_one({
                        "submission_id": str(sub["_id"]),
                        "judge_email": email
                    })
                    if not score_exists:
                        if email not in judges_to_remind:
                            judges_to_remind[email] = []
                        judges_to_remind[email].append(sub.get("project_title", "Untitled Project"))

            # 4. Send emails and in-app notifications
            for email, projects in judges_to_remind.items():
                logger.info(f"Sending reminder to judge: {email} for {len(projects)} projects")
                
                # In-app notification
                judge_user = await judges_col.find_one({"email": email, "event_id": event_id})
                if judge_user:
                    await notifications_col.insert_one({
                        "user_id": judge_user.get("user_id"),
                        "email": email,
                        "type": "judge_reminder",
                        "title": "Judging Deadline Approaching",
                        "message": f'You have {len(projects)} pending evaluations for "{event_name}". Deadline: {event["submission_deadline"]}',
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "meta": {"event_id": event_id, "project_count": len(projects)}
                    })

                # Email
                subject = f"Urgent: Judging Deadline for {event_name}"
                body = f"""
                <html>
                    <body style="font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #6C3BFF;">Judging Protocol Reminder</h2>
                            <p>Hello Evaluator,</p>
                            <p>This is an automated reminder that the judging deadline for <strong>{event_name}</strong> is approaching.</p>
                            <p>Our records show you have <strong>{len(projects)}</strong> pending assessments:</p>
                            <ul>
                                {"".join([f"<li>{p}</li>" for p in projects[:5]])}
                                {f"<li>...and {len(projects)-5} more</li>" if len(projects) > 5 else ""}
                            </ul>
                            <p>Please log in to your <strong>Judge Portal</strong> to complete your evaluations.</p>
                            <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                                <strong>Deadline:</strong> {event["submission_deadline"]}
                            </div>
                            <p style="font-size: 12px; color: #999; margin-top: 40px;">
                                This is a synchronized system notification from Studlyf Engineering.
                            </p>
                        </div>
                    </body>
                </html>
                """
                asyncio.create_task(send_notification_email(email, subject, body))

    @staticmethod
    async def _send_stage_reminders(lookahead_hours: int, reminder_type: str):
        """
        Core method: sends stage deadline reminders within the given lookahead window.
        
        Args:
            lookahead_hours: window size in hours (e.g. 48, 24, 1)
            reminder_type: log identifier (e.g. "48h", "24h", "1h")
        """
        logger.info(f"Scanning for submission deadlines within {lookahead_hours}h...")
        now = datetime.now(timezone.utc)
        soon = now + timedelta(hours=lookahead_hours)
        
        async for event in events_col.find({"status": {"$in": ["ACTIVE", "LIVE", "PUBLISHED"]}}):
            event_id = str(event["_id"])
            stages = event.get("stages", [])
            if not isinstance(stages, list):
                continue
            
            from services.opportunity_service import _safe_dt
            from services.email_template_service import get_active_template, render_template
            reminder_tmpl = await get_active_template(event_id, event.get("institution_id", ""), "deadline_reminder")
            
            for stage in stages:
                if not isinstance(stage, dict):
                    continue
                stype = str(stage.get("type") or "").upper()
                if stype != "SUBMISSION":
                    continue
                
                end = _safe_dt(stage.get("deadline") or stage.get("endDate") or stage.get("end_date"))
                if not end:
                    continue
                
                if now < end <= soon:
                    stage_id = str(stage.get("id") or "")
                    stage_name = stage.get("name") or ""
                    logger.info(f"Deadline within {lookahead_hours}h: {event.get('title')} - {stage_name} at {end}")
                    
                    async for p in participants_col.find({"event_id": event_id}):
                        uid = p.get("user_id")
                        if not uid:
                            continue
                        
                        # Dedup: skip if already sent for this window
                        dedup_key = f"{event_id}:{stage_id}:{uid}:{reminder_type}"
                        already = await reminder_logs_col.find_one({"_id": dedup_key})
                        if already:
                            continue
                        
                        # Check if already submitted
                        from db import submission_data_col
                        query = {"event_id": event_id, "stage_id": stage_id}
                        if p.get("team_id"):
                            query["team_id"] = p.get("team_id")
                        else:
                            query["user_id"] = uid
                        
                        sub_exists = await submission_data_col.find_one(query)
                        if sub_exists:
                            continue
                        
                        email = p.get("email")
                        if email:
                            logger.info(f"Reminder ({reminder_type}): {email} for {stage_name}")
                            
                            p_name = p.get("name") or p.get("full_name") or ""
                            context = {
                                "team_name": p_name,
                                "event_name": event.get("title") or "",
                                "stage_name": stage_name,
                                "participant_name": p_name,
                                "deadline": end.strftime("%Y-%m-%d %H:%M UTC"),
                            }
                            
                            # In-app notification
                            await notifications_col.insert_one({
                                "user_id": uid,
                                "type": "submission_reminder",
                                "title": f"Deadline {reminder_type.replace('h','h ')}Approaching",
                                "message": f'Don\'t forget to submit for "{stage_name}" in "{event.get("title")}". Deadline: {end.strftime("%Y-%m-%d %H:%M")}',
                                "is_read": False,
                                "created_at": datetime.now(timezone.utc).isoformat(),
                                "meta": {"event_id": event_id, "stage_id": stage_id, "reminder_type": reminder_type}
                            })
                            
                            if reminder_tmpl:
                                subject, body = render_template(reminder_tmpl, context)
                            else:
                                subject = f"Deadline Reminder: {event.get('title')}"
                                body = f"<p>Hello <strong>{p_name}</strong>, the deadline for <strong>{stage_name}</strong> in <strong>{event.get('title')}</strong> is <strong>{end.strftime('%Y-%m-%d %H:%M')} UTC</strong>.</p>"
                            
                            asyncio.create_task(send_notification_email(email, subject, body))
                            
                            # Mark dedup
                            await reminder_logs_col.insert_one({
                                "_id": dedup_key,
                                "event_id": event_id,
                                "stage_id": stage_id,
                                "user_id": uid,
                                "reminder_type": reminder_type,
                                "sent_at": datetime.now(timezone.utc)
                            })

    @staticmethod
    async def send_participant_reminders():
        """Legacy: 48h lookahead (runs every 6h)."""
        await ReminderService._send_stage_reminders(48, "48h")

    @staticmethod
    async def send_24h_participant_reminders():
        """24h lookahead (runs every 2h)."""
        await ReminderService._send_stage_reminders(24, "24h")

    @staticmethod
    async def send_1h_participant_reminders():
        """1h lookahead (runs every 30 min)."""
        await ReminderService._send_stage_reminders(1, "1h")

reminder_service = ReminderService()

