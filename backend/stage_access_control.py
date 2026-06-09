"""
Stage Access Control - Validate participant eligibility for stage submissions
Admin controls who can progress through stages via shortlist/reject status
Also enforces time-based stage deadlines (e.g., registration 18:00-19:00)
"""

from fastapi import HTTPException
from db import participants_col, opportunities_col, events_col, teams_col, submission_data_col
from datetime import datetime, timezone
from bson import ObjectId
from services.stage_service import get_event_stages
from typing import Optional, List, Dict, Any


async def _event_id_variants(event_id: str) -> List[str]:
    from routes.registration_flow_routes import resolve_event_id

    resolved = await resolve_event_id(event_id)
    variants: List[str] = []
    for candidate in (event_id, resolved):
        if candidate and str(candidate) not in variants:
            variants.append(str(candidate))
    try:
        ev = await events_col.find_one({"_id": ObjectId(resolved)}, {"event_id": 1})
        if ev and ev.get("event_id") and str(ev["event_id"]) not in variants:
            variants.append(str(ev["event_id"]))
    except Exception:
        pass
    return variants


async def _find_participant(event_id: str, user_id: str) -> Optional[dict]:
    """Fast participant lookup across event_id formats; self-heal only as last resort."""
    event_ids = await _event_id_variants(event_id)
    participant = await participants_col.find_one({
        "user_id": str(user_id),
        "event_id": {"$in": event_ids},
    })
    if participant:
        return participant
    return await _get_participant_fallback(event_id, user_id)


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
                    mapped_status = (
                        "shortlisted" if app_status in ("shortlisted", "accepted", "approved", "selected", "hired")
                        else "registered"
                    )
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
                        "registration_data": opp_app.get("profile_snapshot") or {},
                        "status": mapped_status,
                        "current_stage": opp_app.get("current_stage") or first_stage,
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


def _parse_dt(value) -> Optional[datetime]:
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return None


def _stage_order(stage_obj: dict, fallback: int = 0) -> int:
    try:
        if stage_obj.get("order") is not None:
            return int(stage_obj.get("order"))
    except Exception:
        pass
    return fallback


def _find_stage_index(stages: List[dict], ref: str) -> Optional[int]:
    if not ref:
        return None
    ref_str = str(ref)
    ref_lower = ref_str.lower()
    for idx, s in enumerate(stages):
        if str(s.get("id") or "") == ref_str:
            return idx
        if str(s.get("name") or "") == ref_str:
            return idx
        if str(s.get("name") or "").lower() == ref_lower:
            return idx
        if str(s.get("type") or "").upper() == ref_str.upper():
            return idx
    return None


def _build_stage_map(stages: List[dict]) -> dict:
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
    return stage_map


def _resolve_dep_stage(dep_ref: str, stages: List[dict], stage_map: dict) -> Optional[dict]:
    dep_stage = stage_map.get(dep_ref) or stage_map.get(str(dep_ref).lower())
    if dep_stage:
        return dep_stage
    for s in stages:
        if str(s.get("type", "")).upper() == str(dep_ref).upper():
            return s
        if str(s.get("name", "")).lower() == str(dep_ref).lower():
            return s
    return None


async def _dependency_completed(
    event_id: str,
    user_id: str,
    dep_stage: dict,
    participant: dict,
    stages: List[dict],
    submitted_stage_ids: Optional[set] = None,
) -> bool:
    """Return True when a dependency stage is satisfied for this participant."""
    participant_status = (participant.get("status") or "pending").lower()
    participant_current_stage = participant.get("current_stage")
    participant_team_id = str(participant.get("team_id") or "").strip()
    dep_id = str(dep_stage.get("id") or "")
    dep_type = str(dep_stage.get("type") or "").upper()
    dep_name = str(dep_stage.get("name") or "")
    dep_name_lower = dep_name.lower()
    dep_idx = _find_stage_index(stages, dep_id or dep_name) if dep_id or dep_name else _stage_order(dep_stage)

    if dep_type == "REGISTRATION" or "register" in dep_name_lower:
        return participant_status not in ("not_registered", "rejected")

    if dep_type == "TEAM_FORMATION" or "team" in dep_name_lower or "formation" in dep_name_lower:
        team_doc = None
        if participant_team_id:
            try:
                team_doc = await teams_col.find_one({"_id": ObjectId(participant_team_id)})
            except Exception:
                team_doc = await teams_col.find_one({"team_id": participant_team_id})
        if not team_doc:
            team_doc = await teams_col.find_one({
                "event_id": str(event_id),
                "team_leader_id": str(user_id),
            })
        if not team_doc:
            return False
        team_status = str(team_doc.get("status") or "").lower()
        if team_status in ("approved", "finalized", "shortlisted", "accepted"):
            return True
        members = team_doc.get("members") or []
        return any(str(member.get("user_id") or "") == str(user_id) for member in members if isinstance(member, dict))

    completed_stages = participant.get("completed_stages") or []
    completed_refs = {str(x).lower() for x in completed_stages}
    if dep_name_lower in completed_refs or dep_id in completed_stages:
        return True

    last_submitted = str(participant.get("last_stage_submitted") or "")
    if dep_id and last_submitted == dep_id:
        return True

    if dep_id:
        if submitted_stage_ids is not None:
            if dep_id in submitted_stage_ids:
                return True
        else:
            sub_query: Dict[str, Any] = {"event_id": str(event_id), "stage_id": dep_id}
            if participant_team_id:
                sub_query["team_id"] = participant_team_id
            else:
                sub_query["user_id"] = str(user_id)
            if await submission_data_col.find_one(sub_query):
                return True

    current_idx = _find_stage_index(stages, str(participant_current_stage or ""))
    if current_idx is not None and dep_idx is not None and current_idx > dep_idx:
        return True
    if current_idx is not None and dep_idx is not None and current_idx == dep_idx:
        dep_visibility = str(dep_stage.get("visibility") or (dep_stage.get("config") or {}).get("visibility") or "").lower()
        if "shortlist" not in dep_visibility:
            return True
        if participant_status in ("shortlisted", "accepted", "approved"):
            return True

    dep_visibility = str(dep_stage.get("visibility") or (dep_stage.get("config") or {}).get("visibility") or "").lower()
    if "shortlist" in dep_visibility and participant_status in ("shortlisted", "accepted", "approved"):
        return True

    return False


async def get_stage_access_state(
    event_id: str,
    user_id: str,
    stage: dict,
    participant: Optional[dict] = None,
    stages: Optional[List[dict]] = None,
    event: Optional[dict] = None,
    submitted_stage_ids: Optional[set] = None,
) -> Dict[str, Any]:
    """
    Single source of truth for per-stage unlock/submit state.
    Used by APIs and should drive all participant UI badges.
    """
    stage_id = str(stage.get("id") or "")
    stage_name = str(stage.get("name") or "Stage")
    stage_type = str(stage.get("type") or "").upper()

    if stages is None:
        stages = await get_event_stages(event_id)
    for idx, s in enumerate(stages):
        if s.get("order") is None:
            s["order"] = idx

    if participant is None:
        participant = await _find_participant(event_id, user_id)

    if not participant:
        return {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "is_unlocked": False,
            "can_submit": False,
            "has_submission": False,
            "lock_reason": "not_registered",
            "status_badge": "locked",
        }

    participant_status = (participant.get("status") or "pending").lower()
    participant_team_id = str(participant.get("team_id") or "").strip()

    # Self-heal: team already approved by admin but participant record not synced (legacy)
    if participant_status in ("registered", "pending", "active") and participant_team_id:
        try:
            team_doc = await teams_col.find_one({"_id": ObjectId(participant_team_id)})
        except Exception:
            team_doc = await teams_col.find_one({"team_id": participant_team_id})
        if team_doc and str(team_doc.get("status") or "").lower() in ("approved", "finalized", "shortlisted", "accepted"):
            participant_status = "shortlisted"
            heal_update = {"status": "shortlisted", "updated_at": datetime.now(timezone.utc)}
            stages_list = stages or await get_event_stages(event_id)
            next_name = None
            for idx, s in enumerate(stages_list):
                stype = str(s.get("type") or "").upper()
                sname = str(s.get("name") or "").lower()
                if stype == "TEAM_FORMATION" or "team formation" in sname:
                    if idx + 1 < len(stages_list):
                        next_name = stages_list[idx + 1].get("name")
                    break
            if next_name:
                cur_idx = _find_stage_index(stages_list, str(participant.get("current_stage") or ""))
                next_idx = _find_stage_index(stages_list, next_name)
                if cur_idx is None or (next_idx is not None and cur_idx < next_idx):
                    heal_update["current_stage"] = next_name
            await participants_col.update_one(
                {"_id": participant["_id"]},
                {"$set": heal_update},
            )
            participant = {**participant, **heal_update}

    if participant_status == "rejected":
        return {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "is_unlocked": False,
            "can_submit": False,
            "has_submission": False,
            "lock_reason": "rejected",
            "status_badge": "locked",
        }

    stage_idx = _find_stage_index(stages, stage_id or stage_name)
    current_idx = _find_stage_index(stages, str(participant.get("current_stage") or ""))

    depends_on = stage.get("depends_on") or []
    for dep_ref in depends_on:
        dep_stage = _resolve_dep_stage(str(dep_ref), stages, _build_stage_map(stages))
        if not dep_stage:
            continue
        if not await _dependency_completed(
            event_id, user_id, dep_stage, participant, stages, submitted_stage_ids
        ):
            dep_label = dep_stage.get("name") or dep_ref
            return {
                "stage_id": stage_id,
                "stage_name": stage_name,
                "is_unlocked": False,
                "can_submit": False,
                "has_submission": False,
                "lock_reason": "dependency",
                "lock_detail": f"You must complete '{dep_label}' first.",
                "status_badge": "locked",
            }

    admin_advanced = current_idx is not None and stage_idx is not None and current_idx >= stage_idx

    stage_visibility = str(
        stage.get("visibility") or (stage.get("config") or {}).get("visibility") or ""
    ).lower().strip()
    requires_shortlist = "shortlist" in stage_visibility

    allow_individual = False
    if event is None:
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
        except Exception:
            event = await events_col.find_one({"event_id": event_id}) or await events_col.find_one({"event_link_id": str(event_id)})
    if event and event.get("allow_individual_progress_with_no_team"):
        allow_individual = True

    allowed_statuses = ["shortlisted", "accepted", "approved"] if requires_shortlist else ["registered", "shortlisted", "accepted", "approved"]
    if allow_individual:
        allowed_statuses.append("registered")

    if requires_shortlist and participant_status not in allowed_statuses and not admin_advanced:
        return {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "is_unlocked": False,
            "can_submit": False,
            "has_submission": False,
            "lock_reason": "not_shortlisted",
            "lock_detail": (
                f"Your application status is '{participant_status}'. "
                "Only shortlisted or approved participants can submit at this stage."
            ),
            "status_badge": "locked",
        }

    cfg = stage.get("config") or {}
    stage_team_required = cfg.get("team_required") if isinstance(cfg, dict) else None
    if stage_team_required is None:
        stage_team_required = stage.get("team_required", False)
    if stage_team_required and not participant_team_id and not allow_individual:
        return {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "is_unlocked": True,
            "can_submit": False,
            "has_submission": False,
            "lock_reason": "team_required",
            "lock_detail": "This stage requires a team. Please form or join a team before submitting.",
            "status_badge": "open",
        }

    has_submission = False
    if stage_id:
        if submitted_stage_ids is not None:
            has_submission = stage_id in submitted_stage_ids
        else:
            sub_query: Dict[str, Any] = {"event_id": str(event_id), "stage_id": stage_id}
            if participant_team_id:
                sub_query["team_id"] = participant_team_id
            else:
                sub_query["user_id"] = str(user_id)
            has_submission = bool(await submission_data_col.find_one(sub_query))

    now = datetime.now(timezone.utc)
    start_date = _parse_dt(stage.get("start_date") or stage.get("startDate"))
    end_date = _parse_dt(stage.get("end_date") or stage.get("endDate") or stage.get("deadline"))

    if start_date and now < start_date:
        return {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "is_unlocked": True,
            "can_submit": False,
            "has_submission": has_submission,
            "lock_reason": "not_started",
            "lock_detail": f"This stage opens at {start_date.strftime('%Y-%m-%d %H:%M UTC')}.",
            "status_badge": "upcoming",
        }

    if end_date and now > end_date:
        return {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "is_unlocked": True,
            "can_submit": False,
            "has_submission": has_submission,
            "lock_reason": "ended",
            "lock_detail": f"This stage closed at {end_date.strftime('%Y-%m-%d %H:%M UTC')}.",
            "status_badge": "completed" if has_submission else "closed",
        }

    if has_submission and (stage_type in ("FINAL", "REVIEW") or stage.get("view_only")):
        status_badge = "completed"
    elif has_submission:
        status_badge = "submitted"
    else:
        status_badge = "open"

    return {
        "stage_id": stage_id,
        "stage_name": stage_name,
        "is_unlocked": True,
        "can_submit": True,
        "has_submission": has_submission,
        "lock_reason": None,
        "lock_detail": None,
        "status_badge": status_badge,
    }


async def get_all_stages_access(event_id: str, user_id: str) -> Dict[str, Any]:
    """Return access state for every configured stage (admin-driven, per participant)."""
    from routes.registration_flow_routes import resolve_event_id

    event_id = await resolve_event_id(event_id)
    stages = await get_event_stages(event_id)
    if not stages:
        return {"stages": [], "active_stage_id": None, "participant_status": "not_registered"}

    participant = await _find_participant(event_id, user_id)
    event_ids_to_check = await _event_id_variants(event_id)
    event = None
    try:
        event = await events_col.find_one({"_id": ObjectId(event_ids_to_check[0])})
    except Exception:
        event = await events_col.find_one({"event_id": event_id}) or await events_col.find_one({"event_link_id": str(event_id)})

    submitted_stage_ids: set = set()
    if participant:
        participant_team_id = str(participant.get("team_id") or "").strip()
        or_filters: List[Dict[str, Any]] = [{"user_id": str(user_id)}]
        if participant_team_id:
            or_filters.append({"team_id": participant_team_id})
        async for sub_doc in submission_data_col.find(
            {"event_id": {"$in": event_ids_to_check}, "$or": or_filters},
            {"stage_id": 1},
        ):
            sid = sub_doc.get("stage_id")
            if sid:
                submitted_stage_ids.add(str(sid))

    access_list = []
    active_stage_id = None
    for idx, stage in enumerate(stages):
        if stage.get("order") is None:
            stage["order"] = idx
        stype = str(stage.get("type") or "").upper()
        sname = str(stage.get("name") or "").lower()
        if stype in ("REGISTRATION", "TEAM_FORMATION") or "regist" in sname or "team formation" in sname:
            continue

        state = await get_stage_access_state(
            event_id, user_id, stage, participant, stages, event, submitted_stage_ids
        )
        state["order"] = stage.get("order", idx)
        state["description"] = stage.get("description") or (stage.get("config") or {}).get("description") or ""
        raw_fields = stage.get("fields") or (stage.get("config") or {}).get("fields") or []
        if event and event.get("stages"):
            for raw in event.get("stages", []):
                if str(raw.get("id")) == str(stage.get("id")):
                    raw_fields = raw.get("fields") or (raw.get("config") or {}).get("fields") or raw_fields
                    break
        try:
            from services.field_validation import normalize_stage_fields
            state["fields"] = normalize_stage_fields(raw_fields)
        except Exception:
            state["fields"] = raw_fields
        state["type"] = stype
        access_list.append(state)

        if active_stage_id is None and state.get("is_unlocked") and state.get("can_submit") and not state.get("has_submission"):
            active_stage_id = state.get("stage_id")
        elif active_stage_id is None and state.get("is_unlocked") and state.get("can_submit"):
            active_stage_id = state.get("stage_id")

    if active_stage_id is None:
        for state in access_list:
            if state.get("is_unlocked"):
                active_stage_id = state.get("stage_id")
                break

    team_name = None
    team_id_str = str(participant.get("team_id") or "") if participant else ""
    if team_id_str:
        try:
            team_doc = await teams_col.find_one({"_id": ObjectId(team_id_str)})
        except Exception:
            team_doc = await teams_col.find_one({"team_id": team_id_str})
        if team_doc:
            team_name = team_doc.get("team_name") or team_doc.get("name")

    active_stage_obj = next((s for s in access_list if s.get("stage_id") == active_stage_id), None)
    # Only expose unlocked or already-submitted stages — hide locked future stages from participant UI
    visible_stages = [s for s in access_list if s.get("is_unlocked") or s.get("has_submission")]
    completed_stages = [s for s in access_list if s.get("has_submission") and s.get("stage_id") != active_stage_id]

    return {
        "stages": visible_stages,
        "active_stage": active_stage_obj,
        "active_stage_id": active_stage_id,
        "completed_stages": completed_stages,
        "team_name": team_name,
        "team_id": team_id_str or None,
        "participant_status": (participant.get("status") if participant else "not_registered"),
        "current_stage": participant.get("current_stage") if participant else None,
        "total_configured_stages": len(access_list),
    }


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
    state = await get_stage_access_state(event_id, user_id, stage)
    if not state.get("is_unlocked"):
        reason = state.get("lock_detail") or state.get("lock_reason") or "Stage is locked."
        if state.get("lock_reason") == "dependency":
            raise HTTPException(status_code=403, detail=f"Stage '{stage.get('name', 'this stage')}' is locked. {reason}")
        if state.get("lock_reason") == "not_shortlisted":
            raise HTTPException(
                status_code=403,
                detail=f"You cannot submit at this stage. {reason} Please wait for admin review."
            )
        raise HTTPException(status_code=403, detail=reason)


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
    participant = await _find_participant(event_id, user_id)
    
    if not participant:
        raise HTTPException(
            status_code=404, 
            detail="Participant not found. Please register for this event first."
        )
    
    current_status = (participant.get("status") or "pending").lower()

    if stage:
        access = await get_stage_access_state(event_id, user_id, stage, participant)
        if not access.get("can_submit"):
            detail = access.get("lock_detail") or access.get("lock_reason") or "Access denied."
            if access.get("lock_reason") == "not_shortlisted":
                detail = (
                    f"You cannot submit at this stage. Your application status is '{current_status}'. "
                    "Only shortlisted or approved participants can submit. Please wait for admin review."
                )
            elif access.get("lock_reason") == "dependency":
                detail = f"Stage '{stage.get('name', 'this stage')}' is locked. {access.get('lock_detail') or detail}"
            raise HTTPException(status_code=403, detail=detail)
    
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
        allowed_statuses = ["shortlisted", "accepted", "approved"] if requires_shortlist else ["registered"]
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
