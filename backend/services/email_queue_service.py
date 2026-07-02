from typing import Optional
import asyncio
import logging
from datetime import datetime

from db import email_delivery_logs_col, email_queue_col
from pymongo import ReturnDocument
from services.email_service import send_notification_email
from services.circuit_breaker import get_circuit_breaker

logger = logging.getLogger("email_queue_service")

MAX_RETRY_ATTEMPTS = 5
POLL_INTERVAL_SECONDS = 5

_email_cb = get_circuit_breaker("email_smtp", failure_threshold=3, recovery_timeout=60.0)


async def enqueue_email(recipient: str, subject: str, body: str, metadata: Optional[dict] = None, idempotency_key: Optional[str] = None, priority: int = 0):
    """Add an email to the persistent queue for background delivery."""
    if not recipient or "@" not in recipient:
        raise ValueError("Invalid recipient email")

    now = datetime.utcnow()
    email_doc = {
        "recipient": recipient.strip(),
        "subject": subject,
        "body": body,
        "metadata": metadata or {},
        "status": "pending",
        "attempts": 0,
        "priority": priority,
        "created_at": now,
        "updated_at": now,
    }
    if idempotency_key:
        email_doc["idempotency_key"] = idempotency_key

    result = await email_queue_col.insert_one(email_doc)
    logger.info(f"Email queued for delivery: {recipient} (id={result.inserted_id})")
    return str(result.inserted_id)


async def _fetch_next_email() -> Optional[dict]:
    """Fetch the next queued email and mark it as processing."""
    now = datetime.utcnow()
    query = {
        "status": "pending",
        "attempts": {"$lt": MAX_RETRY_ATTEMPTS},
    }
    update = {
        "$set": {"status": "processing", "updated_at": now},
        "$inc": {"attempts": 1},
    }

    email_job = await email_queue_col.find_one_and_update(
        query,
        update,
        sort=[("priority", -1), ("created_at", 1)],
        return_document=ReturnDocument.AFTER,
    )
    return email_job


async def _finalize_email_job(job: dict, success: bool, failure_reason: Optional[str] = None):
    """Update the queue record and write delivery logs."""
    status = "sent" if success else ("failed" if job.get("attempts", 0) >= MAX_RETRY_ATTEMPTS else "pending")
    now = datetime.utcnow()

    await email_delivery_logs_col.insert_one({
        "recipient": job["recipient"],
        "subject": job["subject"],
        "status": "sent" if success else "failed",
        "attempts": job.get("attempts", 0),
        "provider": "SMTP",
        "failure_reason": failure_reason,
        "metadata": job.get("metadata", {}),
        "created_at": now,
    })

    await email_queue_col.update_one(
        {"_id": job["_id"]},
        {
            "$set": {
                "status": status,
                "updated_at": now,
            }
        },
    )


async def start_email_queue_worker():
    """Continuously process queued emails in the background."""
    logger.info("Email queue worker started")
    while True:
        try:
            job = await _fetch_next_email()
            if not job:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                continue

            logger.info(f"Processing queued email to {job['recipient']} (attempt {job['attempts']})")
            try:
                success = await _email_cb.call(send_notification_email, job["recipient"], job["subject"], job["body"])
            except Exception:
                success = False
            await _finalize_email_job(job, success, None if success else "Delivery failed")
        except Exception as exc:
            logger.exception(f"Email queue worker error: {exc}")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
