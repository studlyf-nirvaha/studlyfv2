"""
Team Join Request Service - Handle team join requests with approval system
Implements Unstop-like team formation with request/approval workflow
"""

import os

from db import (
    teams_col, participants_col, users_col, events_col,
    notifications_col
)
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
import secrets
import asyncio

import logging
logger = logging.getLogger(__name__)

from services.email_service import (
    send_notification_email,
    get_team_join_request_approved_template,
)

class JoinRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"

async def send_join_request(
    event_id: str,
    team_id: str,
    requester_user_id: str,
    message: str = ""
) -> Dict[str, Any]:
    """
    Student sends join request to a team.
    Team lead gets notified.
    """
    try:
        # Get team
        team = await teams_col.find_one({"_id": ObjectId(team_id)})
        if not team:
            return {"error": "Team not found"}

        team_lead_id = str(team.get("team_leader_id") or "")
        if not team_lead_id:
            return {"error": "Team has no leader configured"}
        
        # Check if team is full
        max_size = int(team.get("size_max", 5) or 5)
        members = team.get("members", [])
        if len(members) >= max_size:
            return {"error": "Team is at full capacity"}
        
        # Check if requester already in team
        member_ids = [str(m.get("user_id")) for m in members]
        if str(requester_user_id) in member_ids:
            return {"error": "You are already a member of this team"}
        
        # Check if request already pending
        existing = await find_join_request(
            event_id, team_id, requester_user_id, [JoinRequestStatus.PENDING]
        )
        if existing:
            return {"error": "You already have a pending request for this team"}
        
        # Get requester profile
        requester = await users_col.find_one({"user_id": str(requester_user_id)})
        if not requester:
            return {"error": "User profile not found"}
        
        # Create join request
        join_request_doc = {
            "event_id": str(event_id),
            "team_id": str(team_id),
            "requester_user_id": str(requester_user_id),
            "team_lead_user_id": team_lead_id,
            "requester_name": requester.get("full_name", ""),
            "requester_email": requester.get("email", ""),
            "requester_college": requester.get("college", ""),
            "requester_skills": requester.get("skills", []),
            "message": message,
            "status": JoinRequestStatus.PENDING,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "responded_at": None,
            "response_by_user_id": None,
            "response_message": None,
        }
        
        result = await find_join_requests_collection().insert_one(join_request_doc)
        
        # Create notification for team lead
        await create_notification(
            user_id=team_lead_id,
            type="join_request",
            title=f"Join Request from {requester.get('full_name', 'A student')}",
            message=f"{requester.get('full_name')} requested to join your team '{team.get('team_name')}'",
            related_id=str(result.inserted_id),
            related_type="join_request",
            event_id=str(event_id),
        )
        
        return {
            "status": "success",
            "message": "Join request sent successfully",
            "request_id": str(result.inserted_id),
            "team_id": str(team_id),
            "expires_at": join_request_doc["expires_at"].isoformat(),
        }
    
    except Exception as e:
        logger.error(f"[ERROR] send_join_request: {e}")
        return {"error": str(e)}

async def send_join_request_by_code(
    event_id: str,
    invite_code: str,
    requester_user_id: str,
    message: str = ""
) -> Dict[str, Any]:
    """
    Student sends join request to a team using an invite code.
    Looks up the team by invite code and sends request to team lead.
    """
    try:
        code = str(invite_code or "").strip().upper()
        if not code:
            return {"error": "Invite code is required"}

        # Find team by invite code (supports both permanent and invites[] codes)
        team = await teams_col.find_one({
            "event_id": str(event_id),
            "$or": [{"invite_code": code}, {"invites.code": code}]
        })
        if not team:
            return {"error": "Invalid invite code for this event"}

        # Verify the invite code is not revoked
        if team.get("invite_code") == code:
            invites = team.get("invites") or []
            for inv in invites:
                if inv.get("code") == code and inv.get("revoked"):
                    return {"error": "This invite code has been revoked"}
        else:
            inv = next((i for i in team.get("invites", []) if i.get("code") == code), None)
            if not inv:
                return {"error": "Invite code not found"}
            if inv.get("revoked"):
                return {"error": "This invite code has been revoked"}
            try:
                exp = inv.get("expires_at")
                if exp:
                    exp_dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00")) if isinstance(exp, str) else exp
                    if hasattr(exp_dt, 'tzinfo') and exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) > exp_dt:
                        return {"error": "This invite code has expired"}
            except Exception:
                pass

        # Delegate to send_join_request
        return await send_join_request(
            event_id=event_id,
            team_id=str(team["_id"]),
            requester_user_id=requester_user_id,
            message=message,
        )

    except Exception as e:
        logger.error(f"[ERROR] send_join_request_by_code: {e}")
        return {"error": str(e)}

async def approve_join_request(
    request_id: str,
    approver_user_id: str,
    message: str = ""
) -> Dict[str, Any]:
    """
    Team lead approves a join request.
    Student is added to team and gets notified.
    """
    try:
        # Get request
        join_request = await find_join_requests_collection().find_one(
            {"_id": ObjectId(request_id)}
        )
        if not join_request:
            return {"error": "Request not found"}
        
        # Verify approver is team lead
        team = await teams_col.find_one({"_id": ObjectId(join_request["team_id"])})
        if not team or str(team.get("team_leader_id") or "") != str(approver_user_id):
            return {"error": "You are not authorized to approve this request"}
        
        # Check request not expired
        if join_request.get("status") != JoinRequestStatus.PENDING:
            return {"error": f"Request is already {join_request.get('status')}"}
        
        if datetime.now(timezone.utc) > join_request.get("expires_at"):
            await find_join_requests_collection().update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {"status": JoinRequestStatus.EXPIRED}}
            )
            return {"error": "Request has expired"}
        
        # Add member to team
        requester_id = str(join_request["requester_user_id"])
        requester = await users_col.find_one({"user_id": requester_id})
        new_member = {
            "user_id": requester_id,
            "name": (requester.get("full_name") if requester else "") or join_request.get("requester_name", ""),
            "email": (requester.get("email") if requester else "") or "",
            "role": "MEMBER",
            "joined_at": datetime.now(timezone.utc),
        }
        await teams_col.update_one(
            {"_id": ObjectId(join_request["team_id"])},
            {
                "$push": {"members": new_member},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        # Update participant to reflect team membership
        await participants_col.update_one(
            {
                "event_id": str(join_request["event_id"]),
                "user_id": requester_id
            },
            {
                "$set": {
                    "team_id": str(join_request["team_id"]),
                    "team_name": team.get("team_name", ""),
                    "team_lead_id": str(team.get("team_leader_id") or ""),
                    "joined_team_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )
        
        # Update request
        await find_join_requests_collection().update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": JoinRequestStatus.APPROVED,
                    "responded_at": datetime.now(timezone.utc),
                    "response_by_user_id": str(approver_user_id),
                    "response_message": message,
                }
            }
        )
        
        # Notify requester
        requester = await users_col.find_one({"user_id": requester_id})
        await create_notification(
            user_id=requester_id,
            type="join_approved",
            title="Team Join Request Approved! 🎉",
            message=f"You've been accepted to join team '{team.get('name')}'",
            related_id=str(request_id),
            related_type="join_request",
            event_id=str(join_request["event_id"]),
        )

        try:
            from services.platform_notification_service import notify_team_join_approved
            event = await events_col.find_one({"_id": ObjectId(join_request["event_id"])} )
            if requester and requester.get("email"):
                frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
                await notify_team_join_approved(
                    recipient_email=requester["email"],
                    participant_name=requester.get("full_name") or requester.get("name") or "Participant",
                    team_name=team.get("team_name") or team.get("name") or "Your Team",
                    event_title=event.get("title") if event else "Studlyf Event",
                    organization_name=(event or {}).get("organisation") or (event or {}).get("organization") or "Studlyf",
                    team_link=f"{frontend_url}/#/events/{join_request['event_id']}?tab=team",
                )
        except Exception as email_error:
            logger.error(f"[WARN] Could not send join approval email: {email_error}")
        
        return {
            "status": "success",
            "message": "Join request approved",
            "team_id": str(join_request["team_id"]),
            "requester_name": join_request.get("requester_name"),
        }
    
    except Exception as e:
        logger.error(f"[ERROR] approve_join_request: {e}")
        return {"error": str(e)}

async def reject_join_request(
    request_id: str,
    rejector_user_id: str,
    reason: str = ""
) -> Dict[str, Any]:
    """
    Team lead rejects a join request.
    Student is notified with reason.
    """
    try:
        # Get request
        join_request = await find_join_requests_collection().find_one(
            {"_id": ObjectId(request_id)}
        )
        if not join_request:
            return {"error": "Request not found"}
        
        # Verify rejector is team lead
        team = await teams_col.find_one({"_id": ObjectId(join_request["team_id"])})
        if not team or str(team.get("team_leader_id") or "") != str(rejector_user_id):
            return {"error": "You are not authorized to reject this request"}
        
        # Check request not already responded
        if join_request.get("status") != JoinRequestStatus.PENDING:
            return {"error": f"Request is already {join_request.get('status')}"}
        
        # Update request
        await find_join_requests_collection().update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": JoinRequestStatus.REJECTED,
                    "responded_at": datetime.now(timezone.utc),
                    "response_by_user_id": str(rejector_user_id),
                    "response_message": reason,
                }
            }
        )
        
        # Notify requester
        await create_notification(
            user_id=str(join_request["requester_user_id"]),
            type="join_rejected",
            title="Team Join Request Declined",
            message=f"Your request to join '{team.get('name')}' was declined" + 
                   (f": {reason}" if reason else ""),
            related_id=str(request_id),
            related_type="join_request",
            event_id=str(join_request["event_id"]),
        )
        
        return {
            "status": "success",
            "message": "Join request rejected",
            "requester_name": join_request.get("requester_name"),
        }
    
    except Exception as e:
        logger.error(f"[ERROR] reject_join_request: {e}")
        return {"error": str(e)}

async def withdraw_join_request(
    request_id: str,
    requester_user_id: str
) -> Dict[str, Any]:
    """
    Requester withdraws their join request.
    """
    try:
        join_request = await find_join_requests_collection().find_one(
            {"_id": ObjectId(request_id)}
        )
        if not join_request:
            return {"error": "Request not found"}
        
        # Verify requester
        if str(join_request["requester_user_id"]) != str(requester_user_id):
            return {"error": "You can only withdraw your own requests"}
        
        if join_request.get("status") != JoinRequestStatus.PENDING:
            return {"error": f"Cannot withdraw a {join_request.get('status')} request"}
        
        await find_join_requests_collection().update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": JoinRequestStatus.WITHDRAWN}}
        )
        
        return {
            "status": "success",
            "message": "Join request withdrawn",
        }
    
    except Exception as e:
        logger.error(f"[ERROR] withdraw_join_request: {e}")
        return {"error": str(e)}

async def find_join_request(
    event_id: str,
    team_id: str,
    requester_user_id: str,
    statuses: List[str] = None
) -> Optional[Dict[str, Any]]:
    """Find specific join request."""
    try:
        query = {
            "event_id": str(event_id),
            "team_id": str(team_id),
            "requester_user_id": str(requester_user_id),
        }
        
        if statuses:
            query["status"] = {"$in": statuses}
        
        return await find_join_requests_collection().find_one(query)
    
    except Exception as e:
        logger.error(f"[ERROR] find_join_request: {e}")
        return None

async def get_team_join_requests(
    team_id: str,
    user_id: str,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get join requests for a team (team lead only).
    Shows pending requests with requester details.
    """
    try:
        # Verify user is team lead
        team = await teams_col.find_one({"_id": ObjectId(team_id)})
        if not team or str(team.get("team_leader_id") or "") != str(user_id):
            return {"error": "You are not the team lead"}
        
        query = {"team_id": str(team_id)}
        if status:
            query["status"] = status
        
        requests = []
        cursor = find_join_requests_collection().find(query).sort("created_at", -1)
        
        async for req in cursor:
            req["_id"] = str(req["_id"])
            req["created_at"] = req["created_at"].isoformat()
            req["expires_at"] = req["expires_at"].isoformat()
            if req.get("responded_at"):
                req["responded_at"] = req["responded_at"].isoformat()
            requests.append(req)
        
        # Count by status
        pending_count = await find_join_requests_collection().count_documents({
            "team_id": str(team_id),
            "status": JoinRequestStatus.PENDING
        })
        approved_count = await find_join_requests_collection().count_documents({
            "team_id": str(team_id),
            "status": JoinRequestStatus.APPROVED
        })
        rejected_count = await find_join_requests_collection().count_documents({
            "team_id": str(team_id),
            "status": JoinRequestStatus.REJECTED
        })
        
        return {
            "status": "success",
            "team_id": str(team_id),
            "requests": requests,
            "stats": {
                "pending": pending_count,
                "approved": approved_count,
                "rejected": rejected_count,
            }
        }
    
    except Exception as e:
        logger.error(f"[ERROR] get_team_join_requests: {e}")
        return {"error": str(e)}

async def get_user_sent_requests(
    user_id: str,
    event_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get all join requests sent by a user."""
    try:
        query = {"requester_user_id": str(user_id)}
        if event_id:
            query["event_id"] = str(event_id)
        
        requests = []
        cursor = find_join_requests_collection().find(query).sort("created_at", -1)
        
        async for req in cursor:
            req["_id"] = str(req["_id"])
            req["created_at"] = req["created_at"].isoformat()
            req["expires_at"] = req["expires_at"].isoformat()
            if req.get("responded_at"):
                req["responded_at"] = req["responded_at"].isoformat()
            requests.append(req)
        
        return {
            "status": "success",
            "requests": requests,
            "count": len(requests),
        }
    
    except Exception as e:
        logger.error(f"[ERROR] get_user_sent_requests: {e}")
        return {"error": str(e)}

def find_join_requests_collection():
    """Get join requests collection - creates if doesn't exist."""
    from db import db
    return db["team_join_requests"]

async def create_notification(
    user_id: str,
    type: str,
    title: str,
    message: str,
    related_id: str,
    related_type: str,
    event_id: str
) -> Optional[str]:
    """Create in-app notification."""
    try:
        notification_doc = {
            "user_id": str(user_id),
            "type": type,
            "title": title,
            "message": message,
            "related_id": str(related_id),
            "related_type": related_type,
            "event_id": str(event_id),
            "created_at": datetime.now(timezone.utc),
            "read": False,
        }
        
        result = await notifications_col.insert_one(notification_doc)
        return str(result.inserted_id)
    
    except Exception as e:
        logger.error(f"[ERROR] create_notification: {e}")
        return None
