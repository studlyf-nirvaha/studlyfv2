"""
Stage Management Service - Dynamic Stage Rendering & Progression
Handles: Registration, Team Formation, Submissions, Final stages with dynamic fields
"""

from db import db, events_col, participants_col, teams_col, submission_data_col, users_col
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import logging
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# STAGE TYPE DEFINITIONS (Admin defines these when creating event)
# ─────────────────────────────────────────────────────────────────────────────

STAGE_TYPES = {
    "REGISTRATION": {
        "label": "Registration",
        "icon": "📝",
        "description": "Register for the event",
        "allow_multiple_attempts": False,
        "auto_fill_profile": True,  # Key: Auto-fill from student profile
    },
    "TEAM_FORMATION": {
        "label": "Team Formation",
        "icon": "👥",
        "description": "Form or join a team",
        "allow_multiple_attempts": False,
        "requires_team": True,
    },
    "SUBMISSION": {
        "label": "Submission",
        "icon": "📤",
        "description": "Submit your project/abstract",
        "allow_multiple_attempts": True,  # Can re-submit before deadline
        "dynamic_fields": True,  # Admin defines fields
    },
    "REVIEW": {
        "label": "Review",
        "icon": "⚖️",
        "description": "Judge evaluation stage",
        "allow_multiple_attempts": False,
        "review_stage": True,
    },
    "QUIZ": {
        "label": "Quiz",
        "icon": "📝",
        "description": "Assessment/Quiz stage",
        "allow_multiple_attempts": False,
        "has_quiz": True,
    },
    "CUSTOM": {
        "label": "Custom",
        "icon": "⚙️",
        "description": "Custom stage",
        "allow_multiple_attempts": False,
    },
    "FINAL": {
        "label": "Final Stage",
        "icon": "🏁",
        "description": "View results",
        "allow_multiple_attempts": False,
        "view_only": True,
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# DYNAMIC FORM FIELDS (Admin defines these per stage)
# ─────────────────────────────────────────────────────────────────────────────

class FormField:
    """Defines a form field for a stage"""
    def __init__(self, field_id: str, label: str, field_type: str, required: bool = True, **kwargs):
        self.field_id = field_id
        self.label = label
        self.field_type = field_type  # text, textarea, number, email, file, url, select, checkbox
        self.required = required
        self.placeholder = kwargs.get("placeholder", "")
        self.help_text = kwargs.get("help_text", "")
        self.options = kwargs.get("options", [])  # For select fields
        self.max_length = kwargs.get("max_length", None)
        self.accept_types = kwargs.get("accept_types", [])  # For file uploads
    
    def to_dict(self) -> dict:
        return {
            "field_id": self.field_id,
            "label": self.label,
            "field_type": self.field_type,
            "required": self.required,
            "placeholder": self.placeholder,
            "help_text": self.help_text,
            "options": self.options,
            "max_length": self.max_length,
            "accept_types": self.accept_types,
        }

# ─────────────────────────────────────────────────────────────────────────────
# STAGE PROGRESSION SERVICE
# ─────────────────────────────────────────────────────────────────────────────

async def advance_participant_to_next_stage(event_id: str, user_id: str) -> dict:
    """
    Move participant to the next logical stage based on current progression.
    Used after completing registration or team formation.
    """
    try:
        participant = await participants_col.find_one({"event_id": str(event_id), "user_id": str(user_id)})
        if not participant:
            return {"error": "Participant not found"}
            
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event or not event.get("stages"):
            return {"error": "Event or stages not found"}
            
        stages = event["stages"]
        current_stage_id = participant.get("current_stage")
        
        # Find index of current stage
        current_idx = -1
        for i, s in enumerate(stages):
            if s.get("id") == current_stage_id or s.get("name") == current_stage_id:
                current_idx = i
                break
        
        # Move to next index
        next_idx = current_idx + 1
        if next_idx >= len(stages):
            return {"status": "success", "message": "Already at final stage"}
            
        next_stage = stages[next_idx]
        next_stage_name = next_stage.get("name") or next_stage.get("id")
        
        # Update participant
        update_data = {
            "current_stage": next_stage_name,
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Also auto-approve/shortlist if moving to a restricted stage
        # This allows participants who just formed a team to access the Idea Submission stage
        visibility = str(next_stage.get("visibility") or (next_stage.get("config") or {}).get("visibility") or "").lower()
        if "shortlist" in visibility or "approved" in visibility or "accepted" in visibility:
            update_data["status"] = "shortlisted"
            
        await participants_col.update_one(
            {"_id": participant["_id"]},
            {"$set": update_data}
        )
        
        return {"status": "success", "next_stage": next_stage_name, "new_status": update_data.get("status")}
    except Exception as e:
        logger.error(f"[ERROR] advance_participant_to_next_stage: {e}")
        return {"error": str(e)}

async def get_event_stages(event_id: str) -> List[dict]:
    """Get all stages for an event with metadata."""
    try:
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event:
            return []
        
        stages = event.get("stages", [])
        if not isinstance(stages, list):
            return []
        
        def _parse_dt(value):
            if isinstance(value, str):
                try:
                    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
                except Exception:
                    return None
            if isinstance(value, datetime):
                return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return None

        # Look up subscription-based deadline extension
        inst_id = event.get("institution_id")
        access_days = 0
        if inst_id:
            try:
                from services.subscription_service import get_current_plan_rules
                rules = await get_current_plan_rules(inst_id)
                access_days = int(rules.get("access_days_after_deadline") or 0)
            except Exception:
                pass

        # Enrich stages with type info and a computed live status
        enriched = []
        now = datetime.now(timezone.utc)
        for idx, stage in enumerate(stages):
            if not isinstance(stage, dict):
                continue
            
            stage_type = str(stage.get("type", "SUBMISSION")).upper()
            stage_info = STAGE_TYPES.get(stage_type, {})
            start_date = _parse_dt(stage.get("start_date") or stage.get("startDate"))
            end_date = _parse_dt(stage.get("end_date") or stage.get("endDate") or stage.get("deadline"))
            result_time = _parse_dt(stage.get("result_time"))

            stored_status = stage.get("stored_status", "")
            # Apply subscription extension to deadline if available
            effective_end = end_date
            if access_days and end_date:
                effective_end = end_date + timedelta(days=access_days)

            # Compute from dates first — dates are the source of truth.
            # stored_status only applies when dates are absent or ambiguous.
            if start_date and now < start_date:
                computed_status = "Upcoming"
            elif effective_end and now > effective_end:
                computed_status = "Completed"
            elif start_date or end_date:
                computed_status = "Active"
            elif stored_status:
                computed_status = {
                    "draft": "Upcoming",
                    "scheduled": "Upcoming",
                    "active": "Active",
                    "completed": "Completed",
                    "cancelled": "Completed",
                }.get(stored_status, "Upcoming")
            else:
                computed_status = "Active"

            # Compute locked state from unlock rules
            depends_on = stage.get("depends_on", [])
            is_locked = len(depends_on) > 0  # resolved at access-check time

            enriched.append({
                "id": stage.get("id") or f"stage_{idx}",
                "name": stage.get("name", stage_info.get("label", "Stage")),
                "type": stage_type,
                "description": stage.get("description") or (stage.get("config") or {}).get("description") or stage_info.get("description", ""),
                "icon": stage_info.get("icon", ""),
                "start_date": stage.get("start_date") or stage.get("startDate"),
                "end_date": stage.get("end_date") or stage.get("endDate") or stage.get("deadline"),
                "result_time": result_time.isoformat() if result_time else None,
                "status": computed_status,
                "stored_status": stored_status if stored_status else None,
                "depends_on": depends_on,
                "fields": stage.get("fields") or (stage.get("config") or {}).get("fields", []),
                "config": stage.get("config") or {},
                "team_required": stage_info.get("requires_team", False),
                "view_only": stage_info.get("view_only", False),
                "order": idx,
            })
        
        return enriched
    except Exception as e:
        logger.error(f"[ERROR] get_event_stages: {e}")
        return []

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
        except Exception as e:
            logger.warning(f"Handled exception at line 274: {e}")
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
        except Exception as e:
            logger.warning(f"Handled exception at line 287: {e}")
            pass

        # Fallback 3 (Self-healing): Check if user has an application in opportunity_applications
        opp = None
        # Find opportunity by ID or event_link_id
        try:
            opp = await opportunities_col.find_one({"_id": ObjectId(event_id)})
        except Exception as e:
            logger.warning(f"Handled exception at line 295: {e}")
            pass
        if not opp:
            opp = await opportunities_col.find_one({"event_link_id": event_id})
        if not opp and ev:
            opp = await opportunities_col.find_one({"event_link_id": ev.get("event_id")})
            if not opp:
                opp = await opportunities_col.find_one({"event_link_id": str(ev.get("_id"))})

        if opp:
            from db import opportunity_applications_col, opportunities_col
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
                        except Exception as e:
                            logger.warning(f"Handled exception at line 327: {e}")
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
        logger.error(f"[ERROR] _get_participant_fallback: {e}")
        
    return None

async def get_participant_stage_progress(event_id: str, user_id: str) -> dict:
    """Get current stage, submissions, and next actions for a participant.
    
    Production-ready logic:
    1. First checks participant's stored `current_stage` (set by admin advance-stage or registration)
    2. Falls back to date-based computation if no stored stage
    3. Validates the stored stage against the event's actual stage list
    """
    try:
        # Get participant
        participant = await _get_participant_fallback(event_id, user_id)
        
        if not participant:
            return {"status": "not_registered", "message": "Please register for this event first"}
        
        # Get all stages
        stages = await get_event_stages(event_id)
        if not stages:
            return {"status": "no_stages"}
        
        stored_current_stage = participant.get("current_stage")
        
        # Determine current stage: prefer stored value, fallback to computed status
        current_stage_idx = 0
        
        current_stage = None
        upcoming_stages = []
        completed_stages = []
        
        # Try to find the stored stage in the event's stage list
        if stored_current_stage:
            for idx, stage in enumerate(stages):
                stage_name = stage.get("name", "")
                stage_type = stage.get("type", "")
                if stage_name == stored_current_stage or stage_type == stored_current_stage:
                    current_stage = stage
                    current_stage_idx = idx
                    break
        
        # Classify stages based on stored_current_stage or date computation
        for stage in stages:
            # If we found a stored current_stage match, use ordering for classification
            if current_stage:
                if stage["order"] < current_stage_idx:
                    completed_stages.append(stage)
                elif stage["order"] > current_stage_idx:
                    upcoming_stages.append(stage)
                # stage at current_stage_idx stays as current_stage
            else:
                # Fallback: use get_event_stages computed status (accounts for subscription extensions)
                stage_status = stage.get("status", "Upcoming")
                stage_passed = stage_status == "Completed"
                stage_started = stage_status in ("Active", "Completed")
                
                if current_stage is None and not stage_passed and stage_started:
                    current_stage = stage
                    current_stage_idx = stage["order"]
                elif stage_passed:
                    completed_stages.append(stage)
                else:
                    upcoming_stages.append(stage)
        
        # Get submissions for current participant
        submissions = {}
        if participant.get("team_id"):
            # Team submission
            subs = await submission_data_col.find_one({
                "event_id": str(event_id),
                "team_id": str(participant["team_id"])
            })
            if subs:
                submissions = subs.get("data", {})
        else:
            # Individual submission
            subs = await submission_data_col.find_one({
                "event_id": str(event_id),
                "user_id": str(user_id)
            })
            if subs:
                submissions = subs.get("data", {})
        
        # Get team if exists
        team = None
        if participant.get("team_id"):
            team = await teams_col.find_one({"_id": ObjectId(participant["team_id"])})
            if team:
                team["_id"] = str(team["_id"])
        
        return {
            "registered": True,
            "current_stage": current_stage,
            "completed_stages": completed_stages,
            "upcoming_stages": upcoming_stages,
            "progress_percentage": int((current_stage_idx / len(stages)) * 100) if stages else 0,
            "submissions": submissions,
            "team": team,
            "participant_id": str(participant["_id"]),
        }
    except Exception as e:
        logger.error(f"[ERROR] get_participant_stage_progress: {e}")
        return {"error": str(e)}

async def get_stage_action_required(event_id: str, user_id: str, stage_id: str) -> dict:
    """Get what action is required at current stage (what form to show)."""
    try:
        stages = await get_event_stages(event_id)
        target_stage = None
        
        for stage in stages:
            if stage["id"] == stage_id:
                target_stage = stage
                break
        
        if not target_stage:
            return {"error": "Stage not found"}
        
        stage_type = target_stage.get("type", "SUBMISSION")
        
        # ─── REGISTRATION STAGE ───
        if stage_type == "REGISTRATION":
            return await _handle_registration_stage(event_id, user_id, target_stage)
        
        # ─── TEAM FORMATION STAGE ───
        elif stage_type == "TEAM_FORMATION":
            return await _handle_team_formation_stage(event_id, user_id, target_stage)
        
        # ─── SUBMISSION STAGE ───
        elif stage_type == "SUBMISSION":
            return await _handle_submission_stage(event_id, user_id, target_stage)
        
        # ─── FINAL STAGE ───
        elif stage_type == "FINAL":
            return await _handle_final_stage(event_id, user_id, target_stage)
        
        # ─── REVIEW STAGE ───
        elif stage_type == "REVIEW":
            return {"stage_type": "REVIEW", "action": "view", "message": "Review stage — waiting for judge evaluation"}
        
        # ─── QUIZ STAGE ───
        elif stage_type == "QUIZ":
            return {"stage_type": "QUIZ", "action": "take_quiz", "message": "Quiz stage — assessment required"}
        
        # ─── CUSTOM STAGE ───
        elif stage_type == "CUSTOM":
            return {"stage_type": "CUSTOM", "action": "custom", "message": "Custom stage"}
        
        else:
            return {"error": f"Unknown stage type: {stage_type}"}
    
    except Exception as e:
        logger.error(f"[ERROR] get_stage_action_required: {e}")
        return {"error": str(e)}

# ─────────────────────────────────────────────────────────────────────────────
# STAGE HANDLERS
# ─────────────────────────────────────────────────────────────────────────────

async def _handle_registration_stage(event_id: str, user_id: str, stage: dict) -> dict:
    """Registration stage: Auto-fill profile data, ask for missing fields."""
    try:
        # Get student profile
        user = await users_col.find_one({"user_id": str(user_id)})
        if not user:
            return {"error": "User not found"}
        
        # Get learner profile (extended data)
        learner_profile = await db["learner_profiles"].find_one({"user_id": str(user_id)})
        if not learner_profile:
            learner_profile = {}
        
        # Get event to check registration fields
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        registration_fields = event.get("registrationFields", []) if event else []
        
        # Build pre-filled form
        pre_filled_data = {
            "first_name": user.get("full_name", "").split(" ")[0],
            "last_name": " ".join(user.get("full_name", "").split(" ")[1:]) if user.get("full_name") else "",
            "email": user.get("email", ""),
            "college_name": user.get("college_name", ""),
            "graduation_year": user.get("graduation_year", ""),
            "phone": learner_profile.get("phone", ""),
            "gender": learner_profile.get("gender", ""),
            "skills": learner_profile.get("skills", []),
        }
        
        # Fields that still need to be filled
        required_fields = []
        for field in registration_fields:
            if isinstance(field, dict):
                field_id = field.get("field_id", field.get("id", ""))
                if field_id not in pre_filled_data or not pre_filled_data[field_id]:
                    required_fields.append({
                        "field_id": field_id,
                        "label": field.get("label", field_id),
                        "field_type": field.get("field_type", "text"),
                        "required": field.get("required", True),
                        "placeholder": field.get("placeholder", ""),
                    })
        
        # Check if already registered for this event
        participant = await _get_participant_fallback(event_id, user_id)
        
        return {
            "stage_type": "REGISTRATION",
            "action": "fill_form",
            "pre_filled_data": pre_filled_data,
            "required_fields": required_fields,
            "already_registered": bool(participant),
            "message": "Complete your registration using your profile data"
        }
    except Exception as e:
        logger.error(f"[ERROR] _handle_registration_stage: {e}")
        return {"error": str(e)}

async def _handle_team_formation_stage(event_id: str, user_id: str, stage: dict) -> dict:
    """Team formation: Show team creation/join UI."""
    try:
        # Check if user is registered
        participant = await _get_participant_fallback(event_id, user_id)
        
        if not participant:
            return {"error": "You must register first"}
        
        # Get event to check team requirements
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        min_team_size = None
        max_team_size = None
        if event:
            min_team_size = event.get("min_team_size") if event.get("min_team_size") is not None else event.get("minTeamSize")
            max_team_size = event.get("max_team_size") if event.get("max_team_size") is not None else event.get("maxTeamSize")
        if min_team_size is None or max_team_size is None:
            return {"error": "Team size is not configured for this event"}
        
        # Check if user already in a team
        existing_team = None
        if participant.get("team_id"):
            existing_team = await teams_col.find_one({"_id": ObjectId(participant["team_id"])})
            if existing_team:
                existing_team["_id"] = str(existing_team["_id"])
                existing_team["members"] = [
                    {
                        "user_id": m.get("user_id"),
                        "name": m.get("name", ""),
                        "is_leader": str(m.get("user_id")) == str(existing_team.get("team_leader_id", "")),
                    }
                    for m in existing_team.get("members", [])
                ]
        
        return {
            "stage_type": "TEAM_FORMATION",
            "action": "form_team",
            "team_size_range": {"min": min_team_size, "max": max_team_size},
            "existing_team": existing_team,
            "current_user_id": str(user_id),
            "options": [
                {"action": "create_team", "label": "Create a new team"},
                {"action": "join_team", "label": "Join existing team with code"},
            ]
        }
    except Exception as e:
        logger.error(f"[ERROR] _handle_team_formation_stage: {e}")
        return {"error": str(e)}

async def _handle_submission_stage(event_id: str, user_id: str, stage: dict) -> dict:
    """Submission stage: Show dynamic form based on admin-defined fields."""
    try:
        participant = await _get_participant_fallback(event_id, user_id)
        
        if not participant:
            return {"error": "You must register first"}
        
        # Get dynamic fields for this stage (check both direct fields and config.fields)
        fields = stage.get("fields") or (stage.get("config") or {}).get("fields", [])
        
        # Build form schema
        form_fields = []
        for field in fields:
            if isinstance(field, dict):
                form_fields.append({
                    "field_id": field.get("field_id", field.get("id", "")),
                    "label": field.get("label", ""),
                    "field_type": field.get("field_type", "text"),
                    "required": field.get("required", True),
                    "placeholder": field.get("placeholder", ""),
                    "help_text": field.get("help_text", ""),
                    "max_length": field.get("max_length"),
                })
        
        # Get existing submission if any
        existing_submission = {}
        query = {"event_id": str(event_id), "stage_id": stage.get("id")}
        if participant.get("team_id"):
            query["team_id"] = str(participant["team_id"])
        else:
            query["user_id"] = str(user_id)
        
        sub = await submission_data_col.find_one(query)
        if sub:
            existing_submission = sub.get("data", {})
        
        return {
            "stage_type": "SUBMISSION",
            "action": "submit_form",
            "form_fields": form_fields,
            "existing_data": existing_submission,
            "can_re_submit": True,
            "message": f"Please fill out the {stage.get('name', 'submission')} form"
        }
    except Exception as e:
        logger.error(f"[ERROR] _handle_submission_stage: {e}")
        return {"error": str(e)}

async def _handle_final_stage(event_id: str, user_id: str, stage: dict) -> dict:
    """Final stage: Display submitted content (view-only)."""
    try:
        participant = await _get_participant_fallback(event_id, user_id)
        
        if not participant:
            return {"error": "You must register first"}
        
        # Get all submissions
        submissions = []
        query = {"event_id": str(event_id)}
        if participant.get("team_id"):
            query["team_id"] = str(participant["team_id"])
        else:
            query["user_id"] = str(user_id)
        
        cursor = submission_data_col.find(query)
        async for sub in cursor:
            submissions.append({
                "stage_id": sub.get("stage_id"),
                "stage_name": sub.get("stage_name", ""),
                "submitted_at": sub.get("submitted_at"),
                "data": sub.get("data", {}),
            })
        
        return {
            "stage_type": "FINAL",
            "action": "view_results",
            "submissions": submissions,
            "message": "Your submissions are complete. Results will be announced soon."
        }
    except Exception as e:
        logger.error(f"[ERROR] _handle_final_stage: {e}")
        return {"error": str(e)}
