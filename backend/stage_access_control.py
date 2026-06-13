"""
Stage Access Control - Validate participant eligibility for stage submissions
Admin controls who can progress through stages via shortlist/reject status
Also enforces time-based stage deadlines (e.g., registration 18:00-19:00)
"""

from fastapi import HTTPException
from db import participants_col, opportunities_col, events_col, teams_col
from datetime import datetime, timezone
from bson import ObjectId
from services.stage_service import get_event_stages
from typing import Optional

async def _get_participant_fallback(event_id: str, user_id: str) -> Optional[dict]:
    """Helper to query participant with fallback for legacy human-readable event_id strings and self-healing opportunity apps."""
    try:
        participant = await participants_col.find_one({
            "event_id": str(event_id),
            "user_id": str(user_id)
        })
        if participant:
            return participant
            
        ev = None
        # Fallback 1: check if event_id is a valid ObjectId and map to human-readable event_id
        try:
            ev = await events_col.find_one({"_id": ObjectId(event_id)})
            if ev and ev.get("event_id"):
                participant = await participants_col.find_one({
                    "event_id": str(ev["event_id"]),
                    "user_id": str(user_id)
                })
                if participant:
                    return participant
        except:
            pass
            
        # Fallback 2: check if event_id is human-readable and map to ObjectId string
        try:
            ev = await events_col.find_one({"event_id": event_id})
            if ev and ev.get("_id"):
                participant = await participants_col.find_one({
                    "event_id": str(ev["_id"]),
                    "user_id": str(user_id)
                })
                if participant:
                    return participant
        except:
            pass

        # Fallback 3 (Self-healing): Check if user has an application in opportunity_applications
        opp = None
        # Find opportunity by ID or event_link_id
        try:
            opp = await opportunities_col.find_one({"_id": ObjectId(event_id)})
        except:
            pass
        if not opp:
            opp = await opportunities_col.find_one({"event_link_id": event_id})
        if not opp and ev:
            opp = await opportunities_col.find_one({"event_link_id": ev.get("event_id")})
            if not opp:
                opp = await opportunities_col.find_one({"event_link_id": str(ev.get("_id"))})

        if opp:
            from db import opportunity_applications_col, opportunities_col, users_col
            opp_app = await opportunity_applications_col.find_one({
                "opportunity_id": str(opp["_id"]),
                "user_id": str(user_id)
            })
            if opp_app:
                app_status = str(opp_app.get("status") or "").strip().lower()
                # Check if the application is approved, accepted, shortlisted, or active
                if app_status in ["shortlisted", "accepted", "approved", "applied", "selected", "hired", "registered"]:
                    # User is registered via opportunity application! Let's dynamically create the participant record
                    user_doc = await users_col.find_one({"user_id": str(user_id)})
                    email = (user_doc or {}).get("email", "")
                    name = (user_doc or {}).get("full_name") or (user_doc or {}).get("name") or "Participant"
                    
                    # Find matching event
                    target_event = ev
                    if not target_event:
                        try:
                            if opp.get("event_link_id"):
                                target_event = await events_col.find_one({"event_id": opp["event_link_id"]})
                                if not target_event:
                                    target_event = await events_col.find_one({"_id": ObjectId(opp["event_link_id"])})
                        except:
                            pass
                    
                    first_stage = None
                    if target_event and target_event.get("stages"):
                        stages = target_event["stages"]
                        if stages:
                            first_stage = stages[0].get("name") or stages[0].get("type")
                            
                    inst_id = ""
                    if target_event:
                        inst_id = str(target_event.get("institution_id") or target_event.get("createdBy") or "")
                    elif opp:
                        inst_id = str(opp.get("institution_id") or opp.get("createdBy") or "")

                    participant_doc = {
                        "event_id": str(event_id),
                        "user_id": str(user_id),
                        "institution_id": inst_id,
                        "name": name,
                        "email": email,
                        "current_stage": first_stage,
                        "registration_data": opp_app.get("profile_snapshot") or {},
                        "status": "registered",
                        "registered_at": opp_app.get("applied_at") or datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                    
                    # Write to participants_col
                    await participants_col.update_one(
                        {"event_id": str(event_id), "user_id": str(user_id)},
                        {"$set": participant_doc},
                        upsert=True
                    )
                    
                    # If the fallback event_id is different, sync it too
                    alt_event_id = str(target_event["_id"]) if target_event else None
                    if alt_event_id and alt_event_id != str(event_id):
                        alt_doc = dict(participant_doc)
                        alt_doc["event_id"] = alt_event_id
                        await participants_col.update_one(
                            {"event_id": alt_event_id, "user_id": str(user_id)},
                            {"$set": alt_doc},
                            upsert=True
                        )
                        
                    alt_event_code = target_event.get("event_id") if target_event else None
                    if alt_event_code and alt_event_code != str(event_id) and alt_event_code != alt_event_id:
                        alt_doc = dict(participant_doc)
                        alt_doc["event_id"] = alt_event_code
                        await participants_col.update_one(
                            {"event_id": alt_event_code, "user_id": str(user_id)},
                            {"$set": alt_doc},
                            upsert=True
                        )
                        
                    return participant_doc
            
    except Exception as e:
        print(f"[ERROR] _get_participant_fallback: {e}")
        
    return None

async def check_stage_unlock_rules(
    event_id: str,
    user_id: str,
    stage: dict
) -> None:
    """
    Check if all dependency stages (depends_on) have been completed by the participant.
    
    Each stage's `depends_on` lists stage IDs (or type names) that must be completed
    before this stage unlocks. Completion is determined by:
    1. Participant's `current_stage` being past the dependency stage index
    2. Or participant's `status` indicating advancement past the dependency
    
    Raises HTTPException 403 if any dependency is not met.
    """
    depends_on = stage.get("depends_on", [])
    if not depends_on:
        return

    participant = await _get_participant_fallback(event_id, user_id)
    if not participant:
        raise HTTPException(
            status_code=403,
            detail="You must register before accessing this stage."
        )

    stages = await get_event_stages(event_id)
    if not stages:
        raise HTTPException(status_code=404, detail="No stages configured for this event")

    participant_status = (participant.get("status") or "pending").lower()
    participant_current_stage = participant.get("current_stage")
    participant_team_id = str(participant.get("team_id") or "").strip()

    # Build a map of stage identifiers for quick lookup
    stage_map = {}
    for s in stages:
        sid = str(s.get("id") or "")
        sname = str(s.get("name") or "")
        stype = str(s.get("type") or "")
        if sid:
            stage_map[sid] = s
        if sname:
            stage_map.setdefault(sname, s)
            stage_map.setdefault(sname.lower(), s)
        if stype:
            stage_map.setdefault(stype, s)
            stage_map.setdefault(stype.upper(), s)

    def _stage_order(stage_obj: dict) -> int:
        try:
            return int(stage_obj.get("order") or 0)
        except Exception:
            return 0

    async def _dependency_completed(dep_stage: dict) -> bool:
        dep_type = str(dep_stage.get("type") or "").upper()
        dep_name = str(dep_stage.get("name") or "").lower()

        if dep_type == "REGISTRATION" or "register" in dep_name:
            return participant_status not in ("not_registered", "rejected")

        if dep_type == "TEAM_FORMATION" or "team" in dep_name or "formation" in dep_name:
            if not participant_team_id:
                return False
            try:
                team_doc = await teams_col.find_one({"_id": ObjectId(participant_team_id)})
            except Exception:
                team_doc = await teams_col.find_one({"team_id": participant_team_id})
            if not team_doc:
                return False
            members = team_doc.get("members") or []
            return any(str(member.get("user_id") or "") == str(user_id) for member in members if isinstance(member, dict))

        return False

    for dep_ref in depends_on:
        # Find the dependency stage by id or by type name
        dep_stage = stage_map.get(dep_ref)
        if not dep_stage:
            for s in stages:
                if str(s.get("type", "")).upper() == str(dep_ref).upper() or str(s.get("name", "")).lower() == str(dep_ref).lower():
                    dep_stage = s
                    break

        if not dep_stage:
            continue  # unknown dependency — skip

        dep_name = dep_stage.get("name", dep_ref)
        dep_order = _stage_order(dep_stage)

        if await _dependency_completed(dep_stage):
            continue

        # Check if participant's current_stage is past the dependency for generic stage chains.
        if participant_current_stage:
            current_past_dep = False
            for s in stages:
                if s.get("id") == participant_current_stage or s.get("name") == participant_current_stage or s.get("type") == participant_current_stage:
                    if _stage_order(s) > dep_order:
                        current_past_dep = True
                    break
            if current_past_dep:
                continue

        raise HTTPException(
            status_code=403,
            detail=f"Stage '{stage.get('name', 'this stage')}' is locked. You must complete '{dep_name}' first."
        )


async def check_stage_submission_access(
    event_id: str, 
    user_id: str, 
    team_id: str = None,
    stage_type: str = None,  # "team_formation", "submission", "final"
    stage: Optional[dict] = None  # Full stage object for unlock rules
):
    """
    Validate if participant can submit at this stage.
    
    Rules:
    - team_formation stage: participant must exist (registered)
    - submission stage: participant status must be "shortlisted" or "accepted"
    - final stage: participant status must be "shortlisted" or "accepted"
    
    Args:
        event_id: The event/opportunity ID
        user_id: The user attempting to submit
        team_id: Optional team ID (for team submissions)
        stage_type: The current stage type
    
    Returns:
        dict with participant data if allowed
    
    Raises:
        HTTPException 403 if not eligible
        HTTPException 404 if participant not found
    """
    
    # Find participant record
    participant = await _get_participant_fallback(event_id, user_id)
    
    if not participant:
        raise HTTPException(
            status_code=404, 
            detail="Participant not found. Please register for this event first."
        )
    
    current_status = (participant.get("status") or "pending").lower()

    # Enforce unlock rules if stage object is provided
    if stage:
        await check_stage_unlock_rules(event_id, user_id, stage)

    # Stage-specific validation (applies to all types except team_formation)
    if stage_type not in ("team_formation",):
        # Fetch event to determine participation rules
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
        except Exception:
            event = await events_col.find_one({"event_link_id": str(event_id)})

        allow_individual = False
        try:
            if event and event.get("allow_individual_progress_with_no_team"):
                allow_individual = True
        except:
            allow_individual = False

        # Dynamically determine required status from stage visibility
        stage_visibility = str((stage and (stage.get("visibility") or (stage.get("config") or {}).get("visibility"))) or "").lower().strip()
        requires_shortlist = "shortlist" in stage_visibility

        allowed_statuses = ["shortlisted", "accepted", "approved"] if requires_shortlist else ["registered", "shortlisted", "accepted", "approved"]
        # Allow registered if event explicitly allows individual progress without team
        if allow_individual:
            if "registered" not in allowed_statuses:
                allowed_statuses.append("registered")
        
        if current_status not in allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail=f"You cannot submit at this stage. Your application status is '{current_status}'. "
                       f"Only shortlisted or approved participants can submit. Please wait for admin review."
            )

        # If the current stage requires a team, ensure participant belongs to a team
        if stage and not participant.get("team_id") and not allow_individual:
            cfg = stage.get("config") or {}
            stage_team_required = cfg.get("team_required") if isinstance(cfg, dict) else None
            if stage_team_required is None:
                stage_team_required = stage.get("team_required", False)
            if stage_team_required:
                raise HTTPException(
                    status_code=403,
                    detail="This stage requires a team. Please form or join a team before submitting."
                )
    
    if stage_type == "team_formation":
        # Registered participants can form teams
        # But rejected participants cannot
        if current_status == "rejected":
            raise HTTPException(
                status_code=403,
                detail="Your application has been rejected. You cannot proceed to team formation."
            )
    
    return participant


async def check_team_submission_access(
    event_id: str,
    team_id: str,
    stage_type: str = None
):
    """
    Validate if team can submit at this stage.
    All team members must be shortlisted for submission/final stages.
    """
    from db import teams_col
    
    team = await teams_col.find_one({"_id": team_id, "event_id": str(event_id)})
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    
    if stage_type in ["submission", "final"]:
        # Check all team members' status
        member_ids = team.get("members", [])
        
        for member in member_ids:
            member_user_id = member.get("user_id")
            member_status = await _get_participant_fallback(event_id, member_user_id)
            
            if not member_status or (member_status.get("status") or "").lower() not in ["shortlisted", "accepted"]:
                raise HTTPException(
                    status_code=403,
                    detail=f"Not all team members are shortlisted. All members must be approved before submission."
                )
    
    return team


async def check_stage_deadline(event_id: str, stage_index: int = None, stage_name: str = None):
    """
    Validate if current time is within stage deadline window.
    
    Stages have start_date and end_date. Users can only act during this window.
    Example: Registration open 18:00-19:00 only
    
    Args:
        event_id: The event/opportunity ID
        stage_index: Index of stage (0, 1, 2, etc.)
        stage_name: Name of stage (e.g., "Registration", "Team Formation")
    
    Returns:
        dict with stage data if allowed
    
    Raises:
        HTTPException 403 if outside stage window
        HTTPException 404 if stage not found
    """
    try:
        opp_id = ObjectId(event_id) if len(str(event_id)) == 24 else event_id
    except:
        opp_id = event_id
    
    # Prefer the canonical `events` collection where stages are persisted by admins.
    opportunity = None
    try:
        # Try by ObjectId first if possible
        try:
            obj_id = ObjectId(event_id) if len(str(event_id)) == 24 else None
        except:
            obj_id = None

        if obj_id:
            opportunity = await events_col.find_one({"_id": obj_id})
        if not opportunity:
            opportunity = await events_col.find_one({"event_link_id": str(event_id)})
    except Exception:
        opportunity = None

    # Fallback to legacy `opportunities` collection for backward compatibility
    if not opportunity:
        opportunity = await opportunities_col.find_one({"_id": opp_id})
    if not opportunity:
        opportunity = await opportunities_col.find_one({"event_link_id": str(event_id)})
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Event/Opportunity not found")
    
    stages = opportunity.get("stages", [])
    
    if not stages:
        raise HTTPException(status_code=404, detail="No stages configured for this event")
    
    # Find the target stage
    target_stage = None
    stage_pos = None
    
    if stage_index is not None and 0 <= stage_index < len(stages):
        target_stage = stages[stage_index]
        stage_pos = stage_index
    elif stage_name:
        for idx, s in enumerate(stages):
            if (s.get("name") or "").lower() == stage_name.lower():
                target_stage = s
                stage_pos = idx
                break
    
    if not target_stage:
        raise HTTPException(status_code=404, detail=f"Stage not found (index: {stage_index}, name: {stage_name})")
    
    # Check if current time is within stage window
    now = datetime.now(timezone.utc)
    start_date = target_stage.get("start_date")
    end_date = target_stage.get("end_date")
    
    # Convert to datetime if they're strings
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    if isinstance(start_date, datetime) and start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if isinstance(end_date, datetime) and end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)
    
    if not start_date or not end_date:
        # If no dates set, allow it
        return target_stage
    
    # Check if now is within [start_date, end_date]
    if now < start_date:
        raise HTTPException(
            status_code=403,
            detail=f"This stage has not started yet. It opens at {start_date.strftime('%Y-%m-%d %H:%M UTC')}"
        )
    
    if now > end_date:
        raise HTTPException(
            status_code=403,
            detail=f"This stage has ended. It closed at {end_date.strftime('%Y-%m-%d %H:%M UTC')}"
        )
    
    return target_stage


async def check_stage_access(event_id: str, user_id: str, stage_index: int = None, stage_name: str = None):
    """
    Combined check: verify user can access stage (deadline + eligibility + unlock rules).
    
    Runs deadline, eligibility, and unlock rule checks.
    
    Args:
        event_id: The event/opportunity ID
        user_id: The user attempting to access
        stage_index: Index of stage
        stage_name: Name of stage
    
    Returns:
        dict with stage and participant data
    
    Raises:
        HTTPException if not allowed
    """
    # Check deadline first
    stage = await check_stage_deadline(event_id, stage_index, stage_name)

    # Enforce unlock rules
    await check_stage_unlock_rules(event_id, user_id, stage)
    
    # Check participant status
    participant = await _get_participant_fallback(event_id, user_id)
    
    if not participant:
        raise HTTPException(
            status_code=404,
            detail="Participant not found. Please register for this event first."
        )
    
    current_status = (participant.get("status") or "pending").lower()
    stage_type = str(stage.get("type") or "").upper()
    stage_name_lower = (stage.get("name") or "").lower()
    
    # Dynamically check stage visibility — only require shortlist if stage has Shortlisted Only visibility
    if stage_type not in ("REGISTRATION", "TEAM_FORMATION") and "regist" not in stage_name_lower:
        stage_visibility = str(stage.get("visibility") or (stage.get("config") or {}).get("visibility") or "").lower().strip()
        requires_shortlist = "shortlist" in stage_visibility
        allowed_statuses = ["shortlisted", "accepted", "approved"] if requires_shortlist else ["registered", "shortlisted", "accepted", "approved"]
        if current_status not in allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail=f"You cannot access this stage. Your status is '{current_status}'. "
                       f"Only shortlisted or approved participants can proceed."
            )
    
    # Rejected users blocked from team formation onwards
    if stage_type == "TEAM_FORMATION" or "team" in stage_name_lower or "formation" in stage_name_lower:
        if current_status == "rejected":
            raise HTTPException(
                status_code=403,
                detail="Your application has been rejected. You cannot proceed."
            )
    
    return {"stage": stage, "participant": participant}
