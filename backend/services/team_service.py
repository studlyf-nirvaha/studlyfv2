"""
Team Formation Service - Dynamic Team Creation/Joining with Invite Codes
"""

from datetime import datetime, timezone, timedelta
import secrets
import string
from typing import Optional

from bson import ObjectId

from db import teams_col, participants_col, users_col, events_col
import logging
logger = logging.getLogger(__name__)


async def create_team(
    event_id: str,
    user_id: str,
    team_name: str,
    team_size_min: Optional[int] = None,
    team_size_max: Optional[int] = None
) -> dict:
    """Create a new team for an event."""
    try:
        # Verify participant exists
        participant = await participants_col.find_one({
            "event_id": str(event_id),
            "user_id": str(user_id)
        })
        
        if not participant:
            return {"error": "You must register for the event first", "status": "not_registered"}
        
        # Check participation type - block team creation for 'individual' events
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if event:
            ptype = str(event.get("participationType") or "").lower().strip()
            if ptype == "individual":
                return {"error": "This event is for individual participation only. Teams are not allowed.", "status": "restricted"}

        event_min_size = event.get("min_team_size") if event else None
        if event_min_size is None and event:
            event_min_size = event.get("minTeamSize")
        event_max_size = event.get("max_team_size") if event else None
        if event_max_size is None and event:
            event_max_size = event.get("maxTeamSize")

        if event_min_size is None or event_max_size is None:
            return {"error": "Team size is not configured for this event", "status": "missing_team_size_config"}

        try:
            event_min_size = int(event_min_size)
            event_max_size = int(event_max_size)
        except Exception:
            return {"error": "Team size is not configured for this event", "status": "missing_team_size_config"}

        if event_max_size < event_min_size:
            return {"error": "Invalid team size config", "status": "error"}
        
        # Check if already in a team
        if participant.get("team_id"):
            existing_team = await teams_col.find_one({"_id": ObjectId(participant["team_id"])})
            if existing_team:
                return {
                    "error": "You are already in a team",
                    "status": "already_in_team",
                    "team": {
                        "_id": str(existing_team["_id"]),
                        "team_name": existing_team.get("team_name"),
                    }
                }
        
        # Get user details
        user = await users_col.find_one({"user_id": str(user_id)})
        
        # Generate permanent invite code
        alphabet = string.ascii_uppercase + string.digits
        invite_code = ''.join(secrets.choice(alphabet) for _ in range(12))
        
        # Create team
        team_doc = {
            "event_id": str(event_id),
            "team_name": team_name,
            "team_leader_id": str(user_id),
            "leader_name": user.get("full_name", "Leader") if user else "Leader",
            "members": [
                {
                    "user_id": str(user_id),
                    "name": user.get("full_name", "") if user else "",
                    "email": user.get("email", "") if user else "",
                    "role": "LEADER",
                    "joined_at": datetime.now(timezone.utc),
                }
            ],
            "status": "active",
            "size_min": event_min_size,
            "size_max": event_max_size,
            "invite_code": invite_code,
            "invites": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        
        result = await teams_col.insert_one(team_doc)
        team_id = str(result.inserted_id)
        
        # Update participant with team_id
        await participants_col.update_one(
            {"_id": participant["_id"]},
            {"$set": {"team_id": team_id, "updated_at": datetime.now(timezone.utc)}}
        )

        # ADVANCE STAGE: Move to next stage (e.g. Idea Submission) after team formation
        from services.stage_service import advance_participant_to_next_stage
        await advance_participant_to_next_stage(event_id, user_id)

        return {
            "status": "success",
            "message": f"Team '{team_name}' created successfully",
            "team": {
                "_id": team_id,
                "team_name": team_name,
                "team_leader_id": str(user_id),
                "members": team_doc["members"],
                "size_info": f"1/{event_max_size}",
                "invite_code": invite_code,
            }
        }
    except Exception as e:
        logger.error(f"[ERROR] create_team: {e}")
        return {"error": str(e), "status": "error"}

async def generate_invite_code(team_id: str, ttl_hours: int = 72) -> dict:
    """Generate an invite code.

    If `ttl_hours` is provided and > 0, create a temporary invite entry under `team.invites` with expiry.
    If `ttl_hours` is falsy, create/return a permanent `invite_code` on the team document (backwards-compatible).
    """
    try:
        team = await teams_col.find_one({"_id": ObjectId(team_id)})
        if not team:
            return {"error": "Team not found"}

        import string
        alphabet = string.ascii_uppercase + string.digits
        code = ''.join(secrets.choice(alphabet) for _ in range(12))

        now = datetime.now(timezone.utc)

        # Temporary invite (ttl provided)
        if ttl_hours and int(ttl_hours) > 0:
            expires_at = now + timedelta(hours=int(ttl_hours))
            invite_obj = {
                "code": code,
                "email": None,
                "created_at": now,
                "expires_at": expires_at,
                "revoked": False,
            }
            await teams_col.update_one(
                {"_id": ObjectId(team_id)},
                {"$push": {"invites": invite_obj}, "$set": {"updated_at": now}}
            )
            return {"status": "success", "invite_code": code, "expires_at": expires_at.isoformat()}

        # Permanent invite (backwards compatible)
        existing_code = team.get("invite_code")
        if existing_code:
            return {"status": "success", "invite_code": existing_code}

        await teams_col.update_one(
            {"_id": ObjectId(team_id)},
            {"$set": {"invite_code": code, "updated_at": now}}
        )

        return {"status": "success", "invite_code": code}
    except Exception as e:
        logger.error(f"[ERROR] generate_invite_code: {e}")
        return {"error": str(e)}

async def join_team_with_code(
    event_id: str,
    user_id: str,
    invite_code: str
) -> dict:
    """Join team using invite code."""
    try:
        # Verify participant exists
        participant = await participants_col.find_one({
            "event_id": str(event_id),
            "user_id": str(user_id)
        })
        
        if not participant:
            return {"error": "You must register for the event first"}
        
        # Check participation type - block joining teams for 'individual' events
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if event:
            ptype = str(event.get("participationType") or "").lower().strip()
            if ptype == "individual":
                return {"error": "This event is for individual participation only. Teams are not allowed.", "status": "restricted"}
        
        # Check if already in a team
        if participant.get("team_id"):
            return {"error": "You are already in a team. Leave your current team first."}
        
        # Find team with this code: check permanent invite_code first, then temporary invites array
        team = await teams_col.find_one({
            "event_id": str(event_id),
            "$or": [
                {"invite_code": invite_code.upper()},
                {"invites.code": invite_code.upper()}
            ]
        })

        if not team:
            return {"error": "Invalid invite code"}

        # Block if team is already finalized
        if team.get("status") == "finalized":
            return {"error": "This team has already been finalized and locked."}

        # If matched a temporary invite object, validate expiry and revoked state
        valid_invite = False
        if team.get("invite_code") and str(team.get("invite_code")) == invite_code.upper():
            valid_invite = True
        else:
            # search invites array for matching code
            for inv in team.get("invites", []):
                if str(inv.get("code", "")).upper() == invite_code.upper():
                    # check revoked/expiry
                    if inv.get("revoked"):
                        return {"error": "Invite has been revoked"}
                    expires_at = inv.get("expires_at")
                    if expires_at:
                        try:
                            exp_dt = expires_at if isinstance(expires_at, datetime) else datetime.fromisoformat(expires_at)
                        except Exception:
                            exp_dt = None
                        if exp_dt and exp_dt < datetime.now(timezone.utc):
                            return {"error": "Invite has expired"}
                    valid_invite = True
                    break
        
        # Check if team is full
        current_members = len(team.get("members", []))
        max_size = team.get("size_max")
        if max_size is None and event:
            max_size = event.get("max_team_size") if event.get("max_team_size") is not None else event.get("maxTeamSize")
        if max_size is None:
            return {"error": "Team size is not configured for this event", "status": "missing_team_size_config"}
        try:
            max_size = int(max_size)
        except Exception:
            return {"error": "Team size is not configured for this event", "status": "missing_team_size_config"}
        if current_members >= max_size:
            return {"error": "Team is full"}
        
        # Check if user already in team (duplicate prevention)
        user_ids = [m.get("user_id") for m in team.get("members", [])]
        if str(user_id) in user_ids:
            return {"error": "You are already a member of this team"}
        
        # Get user details
        user = await users_col.find_one({"user_id": str(user_id)})
        
        # If temporary invite, increment uses and possibly revoke
        invites = team.get("invites", [])
        if not team.get("invite_code") or team.get("invite_code") != invite_code.upper():
            for i, inv in enumerate(invites):
                if str(inv.get("code", "")).upper() == invite_code.upper():
                    if inv.get("revoked"):
                        return {"error": "Invite has been revoked"}
                    expires_at = inv.get("expires_at")
                    if expires_at:
                        try:
                            exp_dt = expires_at if isinstance(expires_at, datetime) else datetime.fromisoformat(expires_at)
                        except Exception:
                            exp_dt = None
                        if exp_dt and exp_dt < datetime.now(timezone.utc):
                            return {"error": "Invite has expired"}
                    uses = int(inv.get("uses", 0) or 0)
                    max_uses = inv.get("max_uses")
                    if max_uses is not None and uses >= int(max_uses):
                        return {"error": "Invite has been used"}
                    # increment uses
                    invites[i]["uses"] = uses + 1
                    if max_uses is not None and invites[i]["uses"] >= int(max_uses):
                        invites[i]["revoked"] = True
                        invites[i]["revoked_at"] = datetime.now(timezone.utc).isoformat()
                    await teams_col.update_one({"_id": team["_id"]}, {"$set": {"invites": invites, "updated_at": datetime.now(timezone.utc)}})

        # Add member to team
        new_member = {
            "user_id": str(user_id),
            "name": user.get("full_name", "") if user else "",
            "email": user.get("email", "") if user else "",
            "role": "MEMBER",
            "joined_at": datetime.now(timezone.utc),
        }
        
        await teams_col.update_one(
            {"_id": team["_id"]},
            {
                "$push": {"members": new_member},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        # Update participant with team_id
        await participants_col.update_one(
            {"_id": participant["_id"]},
            {"$set": {"team_id": str(team["_id"]), "is_solo_participant": True, "updated_at": datetime.now(timezone.utc)}}
        )

        # ADVANCE STAGE
        from services.stage_service import advance_participant_to_next_stage
        await advance_participant_to_next_stage(event_id, user_id)

        return {
            "status": "success",
            "message": f"Successfully joined team '{team.get('team_name')}'",
            "team": {
                "_id": str(team["_id"]),
                "team_name": team.get("team_name"),
                "team_leader_id": team.get("team_leader_id"),
                "members": [
                    {
                        "user_id": m.get("user_id"),
                        "name": m.get("name"),
                        "role": m.get("role"),
                        "is_leader": str(m.get("user_id")) == str(team.get("team_leader_id")),
                    }
                    for m in team.get("members", [])
                ],
                "size_info": f"{len(team.get('members', [])) + 1}/{max_size}",
            }
        }
    except Exception as e:
        logger.error(f"[ERROR] join_team_with_code: {e}")
        return {"error": str(e)}

async def leave_team(event_id: str, user_id: str) -> dict:
    """Leave current team."""
    try:
        participant = await participants_col.find_one({
            "event_id": str(event_id),
            "user_id": str(user_id)
        })
        
        if not participant or not participant.get("team_id"):
            return {"error": "You are not in a team"}
        
        team_id = participant["team_id"]
        team = await teams_col.find_one({"_id": ObjectId(team_id)})
        
        if not team:
            return {"error": "Team not found"}
        
        # If leader, delete team entirely
        if str(team.get("team_leader_id")) == str(user_id):
            # Remove all members from participants
            for member in team.get("members", []):
                await participants_col.update_one(
                    {"event_id": str(event_id), "user_id": member.get("user_id")},
                    {"$unset": {"team_id": ""}}
                )
            
            # Delete team
            await teams_col.delete_one({"_id": ObjectId(team_id)})
            
            return {
                "status": "success",
                "message": "Team deleted. All members have been removed.",
                "team_deleted": True
            }
        else:
            # Remove member from team
            await teams_col.update_one(
                {"_id": ObjectId(team_id)},
                {"$pull": {"members": {"user_id": str(user_id)}}},
                {"$set": {"updated_at": datetime.now(timezone.utc)}}
            )
            
            # Remove team_id from participant
            await participants_col.update_one(
                {"_id": participant["_id"]},
                {"$unset": {"team_id": ""}}
            )
            
            return {
                "status": "success",
                "message": f"You have left the team '{team.get('team_name')}'",
            }
    except Exception as e:
        logger.error(f"[ERROR] leave_team: {e}")
        return {"error": str(e)}

async def create_solo_team(event_id: str, user_id: str) -> dict:
    """Create a solo team for individual participation."""
    try:
        participant = await participants_col.find_one({
            "event_id": str(event_id),
            "user_id": str(user_id)
        })
        if not participant:
            return {"error": "You must register for the event first", "status": "not_registered"}

        if participant.get("team_id"):
            existing_team = await teams_col.find_one({"_id": ObjectId(participant["team_id"])})
            if existing_team:
                return {
                    "status": "already_in_team",
                    "team": {"_id": str(existing_team["_id"]), "team_name": existing_team.get("team_name")}
                }

        user = await users_col.find_one({"user_id": str(user_id)})
        user_name = user.get("full_name", user.get("username", "Solo Participant")) if user else "Solo Participant"
        team_name = f"{user_name}'s Solo Entry"

        team_doc = {
            "event_id": str(event_id),
            "team_name": team_name,
            "team_leader_id": str(user_id),
            "leader_name": user_name,
            "is_solo": True,
            "members": [
                {
                    "user_id": str(user_id),
                    "name": user_name,
                    "email": user.get("email", "") if user else "",
                    "role": "LEADER",
                    "joined_at": datetime.now(timezone.utc),
                }
            ],
            "status": "active",
            "size_min": 1,
            "size_max": 1,
            "invite_code": None,
            "invites": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        result = await teams_col.insert_one(team_doc)
        team_id = str(result.inserted_id)

        await participants_col.update_one(
            {"_id": participant["_id"]},
            {"$set": {"team_id": team_id, "updated_at": datetime.now(timezone.utc)}}
        )

        # ADVANCE STAGE
        from services.stage_service import advance_participant_to_next_stage
        await advance_participant_to_next_stage(event_id, user_id)

        return {
            "status": "success",
            "message": "Solo team created successfully",
            "team": {
                "_id": team_id,
                "team_name": team_name,
                "team_leader_id": str(user_id),
                "members": team_doc["members"],
                "is_solo": True,
            }
        }
    except Exception as e:
        logger.error(f"[ERROR] create_solo_team: {e}")
        return {"error": str(e), "status": "error"}


async def get_team_details(team_id: str) -> dict:
    """Get full team details including member info."""
    try:
        query = {"team_id": team_id}
        if ObjectId.is_valid(team_id):
            query = {"$or": [{"_id": ObjectId(team_id)}, {"team_id": team_id}]}
            
        team = await teams_col.find_one(query)
        if not team:
            return {"error": "Team not found"}
        
        # Enrich member info
        enriched_members = []
        for member in team.get("members", []):
            enriched_members.append({
                "user_id": member.get("user_id"),
                "name": member.get("name"),
                "email": member.get("email"),
                "role": member.get("role"),
                "is_leader": str(member.get("user_id")) == str(team.get("team_leader_id")),
                "joined_at": member.get("joined_at"),
            })
        
        return {
            "status": "success",
            "team": {
                "_id": str(team["_id"]),
                "event_id": team.get("event_id"),
                "team_name": team.get("team_name"),
                "team_leader_id": team.get("team_leader_id"),
                "members": enriched_members,
                "member_count": len(enriched_members),
                "max_size": team.get("size_max", 5),
                "can_add_more": len(enriched_members) < team.get("size_max", 5),
                "status": team.get("status"),
                "created_at": team.get("created_at"),
                "invite_code": team.get("invite_code"),
            }
        }
    except Exception as e:
        logger.error(f"[ERROR] get_team_details: {e}")
        return {"error": str(e)}
