"""
PARTICIPANT COMMUNICATION HUB
Bulk messaging, email campaigns, segmentation, and targeted notifications
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from enum import Enum
from db import (
    participants_col, notifications_col, events_col,
    users_col, institutions_col, messages_col
)
from services.email_service import send_notification_email
from bson import ObjectId

class MessageType(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    BOTH = "both"

class SegmentationType(str, Enum):
    ALL = "all"
    BY_DEPARTMENT = "by_department"
    BY_YEAR = "by_year"
    BY_COLLEGE = "by_college"
    BY_STATUS = "by_status"
    BY_PERFORMANCE = "by_performance"
    CUSTOM = "custom"

class CommunicationService:
    """Handles multi-channel participant communications."""
    
    @staticmethod
    async def create_segment(
        institution_id: str,
        event_id: str,
        segment_type: SegmentationType,
        criteria: Dict[str, Any]
    ) -> List[str]:
        """
        Create a participant segment based on criteria.
        Returns list of participant IDs matching criteria.
        """
        query = {
            "event_id": event_id,
            "institution_id": institution_id
        }
        
        if segment_type == SegmentationType.BY_DEPARTMENT:
            query["department"] = criteria.get("department")
        elif segment_type == SegmentationType.BY_YEAR:
            query["year"] = criteria.get("year")
        elif segment_type == SegmentationType.BY_COLLEGE:
            query["college_name"] = criteria.get("college_name")
        elif segment_type == SegmentationType.BY_STATUS:
            query["registration_status"] = criteria.get("status")
        elif segment_type == SegmentationType.BY_PERFORMANCE:
            min_score = criteria.get("min_score", 0)
            # Find participants with submissions scoring >= min_score
            from db import submissions_col
            high_performers = await submissions_col.find({
                "event_id": event_id,
                "average_score": {"$gte": min_score}
            }).to_list(None)
            high_performer_ids = [s.get("participant_id") for s in high_performers]
            query["_id"] = {"$in": [ObjectId(pid) for pid in high_performer_ids if pid]}
        
        participants = await participants_col.find(query).to_list(None)
        return [str(p["_id"]) for p in participants]

    @staticmethod
    async def send_bulk_message(
        institution_id: str,
        event_id: str,
        segment_ids: List[str],
        subject: str,
        message_body: str,
        message_type: MessageType = MessageType.BOTH,
        scheduled_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Send a message to multiple participants via email and/or in-app.
        """
        try:
            # Get participant details
            participants = await participants_col.find({
                "_id": {"$in": [ObjectId(pid) for pid in segment_ids]}
            }).to_list(None)
            
            email_count = 0
            in_app_count = 0
            failed_count = 0
            
            for participant in participants:
                try:
                    user_id = participant.get("user_id")
                    
                    # Get user email
                    user = await users_col.find_one({"user_id": user_id})
                    user_email = user.get("email") if user else None
                    
                    # Send Email
                    if message_type in [MessageType.EMAIL, MessageType.BOTH] and user_email:
                        asyncio.create_task(
                            send_notification_email(
                                to_email=user_email,
                                subject=subject,
                                body_html=message_body
                            )
                        )
                        email_count += 1
                    
                    # Create In-App Notification
                    if message_type in [MessageType.IN_APP, MessageType.BOTH]:
                        await notifications_col.insert_one({
                            "user_id": user_id,
                            "event_id": event_id,
                            "title": subject,
                            "message": message_body,
                            "type": "campaign",
                            "is_read": False,
                            "created_at": datetime.now(timezone.utc)
                        })
                        in_app_count += 1
                    
                    # Store message in archive
                    await messages_col.insert_one({
                        "recipient_id": str(participant["_id"]),
                        "event_id": event_id,
                        "institution_id": institution_id,
                        "subject": subject,
                        "body": message_body,
                        "type": message_type.value,
                        "status": "sent",
                        "created_at": datetime.now(timezone.utc)
                    })
                except Exception as e:
                    logger.error(f"Message send error for participant {participant.get('_id')}: {e}")
                    failed_count += 1
            
            return {
                "success": True,
                "emails_sent": email_count,
                "in_app_sent": in_app_count,
                "total_recipients": len(participants),
                "failed": failed_count
            }
        except Exception as e:
            logger.error(f"Bulk Message Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def create_email_campaign(
        institution_id: str,
        campaign_name: str,
        subject: str,
        html_template: str,
        segments: List[Dict[str, Any]],
        schedule_send: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create a reusable email campaign for multiple segments.
        """
        try:
            campaign_doc = {
                "institution_id": institution_id,
                "name": campaign_name,
                "subject": subject,
                "html_template": html_template,
                "segments": segments,
                "schedule_send": schedule_send,
                "status": "draft",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "sent_count": 0
            }
            
            result = await messages_col.insert_one(campaign_doc)
            return {
                "success": True,
                "campaign_id": str(result.inserted_id)
            }
        except Exception as e:
            logger.error(f"Campaign Creation Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_communication_history(
        institution_id: str,
        event_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Retrieve communication history for an institution.
        """
        try:
            query = {"institution_id": institution_id}
            if event_id:
                query["event_id"] = event_id
            
            messages = await messages_col.find(query).sort(
                "created_at", -1
            ).to_list(limit)
            
            return [
                {
                    "id": str(m["_id"]),
                    "subject": m.get("subject"),
                    "body": m.get("body", "")[:100] + "...",
                    "type": m.get("type"),
                    "recipient_count": 1 if "recipient_id" in m else 0,
                    "status": m.get("status"),
                    "created_at": m.get("created_at").isoformat()
                } for m in messages
            ]
        except Exception as e:
            logger.error(f"History Fetch Error: {e}")
            return []

    @staticmethod
    async def setup_automated_reminders(
        event_id: str,
        reminder_types: List[str]  # "48h_before", "24h_before", "1h_before"
    ) -> Dict[str, Any]:
        """
        Configure automated reminder messages for an event.
        reminder_types: list of reminder trigger points
        """
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
            if not event:
                return {"success": False, "error": "Event not found"}
            
            submission_deadline = event.get("submission_deadline")
            if not submission_deadline:
                return {"success": False, "error": "Event has no submission deadline"}
            
            reminders_config = {
                "event_id": event_id,
                "reminders": [],
                "created_at": datetime.now(timezone.utc)
            }
            
            for reminder_type in reminder_types:
                if reminder_type == "48h_before":
                    send_time = submission_deadline - timedelta(hours=48)
                elif reminder_type == "24h_before":
                    send_time = submission_deadline - timedelta(hours=24)
                elif reminder_type == "1h_before":
                    send_time = submission_deadline - timedelta(hours=1)
                else:
                    continue
                
                reminders_config["reminders"].append({
                    "type": reminder_type,
                    "send_at": send_time,
                    "status": "pending"
                })
            
            # Store configuration
            await notifications_col.insert_one(reminders_config)
            
            return {
                "success": True,
                "reminders_configured": len(reminders_config["reminders"])
            }
        except Exception as e:
            logger.error(f"Reminder Setup Error: {e}")
            return {"success": False, "error": str(e)}

from datetime import timedelta
import logging
logger = logging.getLogger(__name__)


# Initialize singleton
communication_service = CommunicationService()
