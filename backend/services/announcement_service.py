from typing import Optional
import asyncio
import logging
from datetime import datetime
from bson import ObjectId

from db import announcements_col, announcement_audit_col, users_col
from services.email_queue_service import enqueue_email
from services.registration_service import validate_event_restrictions

logger = logging.getLogger("announcement_service")


async def create_announcement_job(event: dict, subject: str, body: str, created_by: dict, limit: Optional[int] = None):
    """Create announcement job and enqueue recipients in background."""
    now = datetime.utcnow()
    job = {
        "event_id": str(event.get("_id") or event.get("event_id")),
        "institution_id": str(event.get("institution_id") or event.get("createdBy") or ""),
        "subject": subject,
        "body": body,
        "created_by": {"user_id": created_by.get("user_id"), "email": created_by.get("email")},
        "status": "queued",
        "estimated_recipients": 0,
        "created_at": now,
        "updated_at": now,
    }
    res = await announcements_col.insert_one(job)
    announcement_id = str(res.inserted_id)

    # Fire-and-forget background task to process the job
    asyncio.create_task(_process_announcement_job(announcement_id, event, subject, body, created_by, limit))
    return announcement_id


async def _process_announcement_job(announcement_id: str, event: dict, subject: str, body: str, created_by: dict, limit: Optional[int] = None):
    """Scan eligible users, enqueue emails via email_queue_service, and record audit entries."""
    try:
        logger.info(f"Starting announcement job {announcement_id} for event {event.get('title')}")
        count = 0
        cursor = users_col.find({})
        async for u in cursor:
            uid = str(u.get("user_id") or u.get("uid") or u.get("_id"))
            if not uid:
                continue
            # Validate eligibility using central service
            try:
                msg = await validate_event_restrictions(event, uid)
            except Exception:
                # Fail-open: if validation fails, include the user
                msg = None
            if msg:
                continue
            email = u.get("email")
            if not email:
                continue

            # Enqueue email with idempotency key to avoid duplicates
            try:
                idemp = f"announcement_{announcement_id}_{uid}"
                await enqueue_email(email, subject, body, metadata={"announcement_id": announcement_id, "user_id": uid}, idempotency_key=idemp)
                await announcement_audit_col.insert_one({
                    "announcement_id": announcement_id,
                    "recipient": email,
                    "user_id": uid,
                    "status": "queued",
                    "created_at": datetime.utcnow(),
                })
                count += 1
            except Exception as e:
                logger.exception(f"Failed to enqueue announcement email for {email}: {e}")

            if limit and count >= int(limit):
                break

        # Update job with final counts
        await announcements_col.update_one({"_id": ObjectId(announcement_id)}, {"$set": {"estimated_recipients": count, "status": "enqueued", "updated_at": datetime.utcnow()}})
        logger.info(f"Announcement job {announcement_id} enqueued {count} recipients")
    except Exception as e:
        logger.exception(f"Announcement job {announcement_id} failed: {e}")
        try:
            await announcements_col.update_one({"_id": ObjectId(announcement_id)}, {"$set": {"status": "failed", "error": str(e), "updated_at": datetime.utcnow()}})
        except Exception:
            pass
