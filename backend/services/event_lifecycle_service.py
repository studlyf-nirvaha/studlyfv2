"""
EVENT LIFECYCLE AUTOMATION SERVICE
Manages event states, deadlines, auto-transitions, and lifecycle notifications
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from enum import Enum
from db import events_col, participants_col, submissions_col, notifications_col, audit_logs_col
from bson import ObjectId
import asyncio

class EventStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    LIVE = "LIVE"
    SUBMISSION_CLOSED = "SUBMISSION_CLOSED"
    EVALUATION = "EVALUATION"
    RESULTS_READY = "RESULTS_READY"
    ENDED = "ENDED"
    ARCHIVED = "ARCHIVED"

class EventLifecycleService:
    """Manages automated event lifecycle transitions and notifications."""
    
    @staticmethod
    async def create_event_with_lifecycle(
        institution_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create an event and initialize its lifecycle tracking.
        """
        try:
            event_doc = {
                "institution_id": institution_id,
                "status": EventStatus.DRAFT.value,
                "lifecycle_stage": "planning",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                **event_data
            }
            
            # Initialize lifecycle timelines
            event_doc["lifecycle_timeline"] = {
                "draft_created_at": datetime.now(timezone.utc),
                "published_at": None,
                "live_at": None,
                "submission_closed_at": None,
                "evaluation_started_at": None,
                "results_announced_at": None,
                "ended_at": None
            }
            
            result = await events_col.insert_one(event_doc)
            
            return {
                "success": True,
                "event_id": str(result.inserted_id),
                "status": event_doc["status"]
            }
        except Exception as e:
            print(f"Event Creation Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def transition_event_status(
        event_id: str,
        new_status: EventStatus,
        admin_email: str
    ) -> Dict[str, Any]:
        """
        Transition an event to a new status with validation and notifications.
        """
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
            if not event:
                return {"success": False, "error": "Event not found"}
            
            current_status = EventStatus(event.get("status", EventStatus.DRAFT.value))
            
            # Validate transition rules
            valid_transitions = {
                EventStatus.DRAFT: [EventStatus.PUBLISHED, EventStatus.ARCHIVED],
                EventStatus.PUBLISHED: [EventStatus.LIVE, EventStatus.DRAFT],
                EventStatus.LIVE: [EventStatus.SUBMISSION_CLOSED],
                EventStatus.SUBMISSION_CLOSED: [EventStatus.EVALUATION],
                EventStatus.EVALUATION: [EventStatus.RESULTS_READY],
                EventStatus.RESULTS_READY: [EventStatus.ENDED],
                EventStatus.ENDED: [EventStatus.ARCHIVED]
            }
            
            if new_status not in valid_transitions.get(current_status, []):
                return {
                    "success": False,
                    "error": f"Cannot transition from {current_status.value} to {new_status.value}"
                }
            
            # Update event status
            update_dict = {
                "status": new_status.value,
                "updated_at": datetime.now(timezone.utc)
            }
            
            # Update lifecycle timeline
            timeline_key = f"{new_status.value.lower()}_at"
            if timeline_key in event.get("lifecycle_timeline", {}):
                update_dict["lifecycle_timeline." + timeline_key] = datetime.now(timezone.utc)
            
            await events_col.update_one(
                {"_id": ObjectId(event_id)},
                {"$set": update_dict}
            )
            
            # Trigger notifications based on new status
            await EventLifecycleService._notify_on_status_change(
                event_id, new_status, event
            )
            
            # Audit log
            await audit_logs_col.insert_one({
                "action": "EVENT_STATUS_CHANGED",
                "user": admin_email,
                "event_id": event_id,
                "from_status": current_status.value,
                "to_status": new_status.value,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "event_id": event_id,
                "new_status": new_status.value,
                "message": f"Event transitioned to {new_status.value}"
            }
        except Exception as e:
            print(f"Status Transition Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def _notify_on_status_change(
        event_id: str,
        new_status: EventStatus,
        event: Dict[str, Any]
    ) -> None:
        """
        Send appropriate notifications based on event status change.
        """
        try:
            event_title = event.get("title", "Event")
            participants = await participants_col.find({
                "event_id": event_id
            }).to_list(length=1000)
            
            notification_map = {
                EventStatus.LIVE: {
                    "title": "Event is Live!",
                    "message": f"{event_title} is now accepting submissions. Register now!"
                },
                EventStatus.SUBMISSION_CLOSED: {
                    "title": "Submission Closed",
                    "message": f"Submissions for {event_title} are now closed. Evaluation begins."
                },
                EventStatus.RESULTS_READY: {
                    "title": "Results Announced",
                    "message": f"Results for {event_title} have been announced. Check the leaderboard!"
                },
                EventStatus.ENDED: {
                    "title": "Event Concluded",
                    "message": f"{event_title} has concluded. Thank you for participating!"
                }
            }
            
            if new_status in notification_map:
                notif_data = notification_map[new_status]
                for participant in participants:
                    user_id = participant.get("user_id")
                    await notifications_col.insert_one({
                        "user_id": user_id,
                        "event_id": event_id,
                        "title": notif_data["title"],
                        "message": notif_data["message"],
                        "type": "status_update",
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc)
                    })
        except Exception as e:
            print(f"Notification Error: {e}")

    @staticmethod
    async def auto_enforce_deadlines() -> Dict[str, Any]:
        """
        Background job to automatically enforce submission deadlines.
        Runs periodically to transition events based on deadlines.
        """
        try:
            now = datetime.now(timezone.utc)
            results = {"processed": 0, "transitioned": 0}
            
            # Find LIVE events past submission deadline
            live_events = await events_col.find({
                "status": EventStatus.LIVE.value,
                "submission_deadline": {"$lte": now}
            }).to_list(length=1000)
            
            for event in live_events:
                await EventLifecycleService.transition_event_status(
                    str(event["_id"]),
                    EventStatus.SUBMISSION_CLOSED,
                    "system@automated"
                )
                results["transitioned"] += 1
            
            # Find EVALUATION events ready for results
            eval_events = await events_col.find({
                "status": EventStatus.EVALUATION.value,
                "evaluation_end_date": {"$lte": now}
            }).to_list(length=1000)
            
            for event in eval_events:
                await EventLifecycleService.transition_event_status(
                    str(event["_id"]),
                    EventStatus.RESULTS_READY,
                    "system@automated"
                )
                results["transitioned"] += 1
            
            results["processed"] = len(live_events) + len(eval_events)
            return results
        except Exception as e:
            print(f"Deadline Enforcement Error: {e}")
            return {"error": str(e)}

    @staticmethod
    async def get_event_lifecycle_status(event_id: str) -> Dict[str, Any]:
        """
        Get detailed lifecycle status for an event.
        """
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
            if not event:
                return {"success": False, "error": "Event not found"}
            
            timeline = event.get("lifecycle_timeline", {})
            current_status = event.get("status", EventStatus.DRAFT.value)
            
            # Calculate time until next deadline
            now = datetime.now(timezone.utc)
            next_deadline = None
            
            if current_status == EventStatus.LIVE.value:
                next_deadline = event.get("submission_deadline")
            elif current_status == EventStatus.SUBMISSION_CLOSED.value:
                next_deadline = event.get("evaluation_end_date")
            
            time_remaining = None
            if next_deadline:
                time_remaining = (next_deadline - now).total_seconds()
            
            return {
                "success": True,
                "event_id": event_id,
                "current_status": current_status,
                "timeline": {k: v.isoformat() if v else None for k, v in timeline.items()},
                "next_deadline": next_deadline.isoformat() if next_deadline else None,
                "time_remaining_seconds": time_remaining,
                "progress_percentage": EventLifecycleService._calculate_progress(
                    current_status, timeline
                )
            }
        except Exception as e:
            print(f"Lifecycle Status Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _calculate_progress(status: str, timeline: Dict) -> int:
        """
        Calculate event completion percentage based on status.
        """
        status_progress = {
            EventStatus.DRAFT.value: 10,
            EventStatus.PUBLISHED.value: 25,
            EventStatus.LIVE.value: 50,
            EventStatus.SUBMISSION_CLOSED.value: 65,
            EventStatus.EVALUATION.value: 75,
            EventStatus.RESULTS_READY.value: 90,
            EventStatus.ENDED.value: 100,
            EventStatus.ARCHIVED.value: 100
        }
        return status_progress.get(status, 0)

# Initialize singleton
event_lifecycle_service = EventLifecycleService()
