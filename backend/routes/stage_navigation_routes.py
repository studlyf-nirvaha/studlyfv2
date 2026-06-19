"""
Routes for Dynamic Stage Navigation & Submission - Unstop-like Flow
"""

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from auth_institution import get_auth_user, assert_institution_owns_event
from services.stage_service import (
    get_event_stages,
    get_participant_stage_progress,
    get_stage_action_required,
)
import asyncio
from services.team_service import (
    create_team,
    create_solo_team,
    generate_invite_code,
    join_team_with_code,
    leave_team,
    get_team_details,
)
from services.dynamic_submission_service import (
    submit_stage_data,
    get_submission_data,
    update_profile_registration,
)
from services.registration_service import (
    complete_registration,
    get_registration_fields_with_prefill,
    check_registration_status,
)
from stage_access_control import check_stage_deadline, check_stage_submission_access, get_all_stages_access
from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/stages", tags=["Stage Navigation"])

# ─────────────────────────────────────────────────────────────────────────────
# STAGE OVERVIEW ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/stages")
async def list_event_stages(event_id: str):
    """Get all stages for an event with details."""
    stages = await get_event_stages(event_id)
    if not stages:
        raise HTTPException(status_code=404, detail="Event not found or no stages configured")
    return {"event_id": event_id, "stages": stages}

from routes.registration_flow_routes import resolve_event_id

@router.get("/events/{event_id}/progress")
async def get_progress(event_id: str, user: dict = Depends(get_auth_user)):
    """Get current stage progress and next actions for learner."""
    # Resolve event_id in case it's an opportunity_id
    resolved_id = await resolve_event_id(event_id)
    progress = await get_participant_stage_progress(resolved_id, user["user_id"])
    if "error" in progress:
        raise HTTPException(status_code=400, detail=progress["error"])
    return progress


@router.get("/events/{event_id}/stages-access")
async def get_stages_access(event_id: str, user: dict = Depends(get_auth_user)):
    """Per-participant unlock/submit state for each admin-configured stage."""
    resolved_id = await resolve_event_id(event_id)
    return await get_all_stages_access(resolved_id, user["user_id"])

@router.get("/events/{event_id}/stages/{stage_id}/action")
async def get_stage_action(event_id: str, stage_id: str, user: dict = Depends(get_auth_user)):
    """Get what action is required for current stage (registration form, team creation, etc.)"""
    action = await get_stage_action_required(event_id, user["user_id"], stage_id)
    if "error" in action:
        raise HTTPException(status_code=400, detail=action["error"])
    return action

# ─────────────────────────────────────────────────────────────────────────────
# REGISTRATION STAGE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/registration-fields")
async def get_registration_fields(
    event_id: str,
    user: dict = Depends(get_auth_user)
):
    """
    Get registration fields with prefill information.
    Frontend uses this to render form with:
    - Prefilled fields (grayed out from user profile)
    - Custom fields (highlighted, requires user input)
    """
    result = await get_registration_fields_with_prefill(event_id, user["user_id"])
    if "error" in result:
        return {"status": "success", "custom_fields": [], "prefilled_fields": [], "event_id": event_id}
    return result

@router.get("/events/{event_id}/registration-status")
async def get_registration_status_endpoint(
    event_id: str,
    user: dict = Depends(get_auth_user)
):
    """Check if user is already registered for event."""
    result = await check_registration_status(event_id, user["user_id"])
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/events/{event_id}/register")
async def register_for_event(
    event_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """
    Complete registration with auto-filled profile data.
    Only custom fields (event-specific) need to be in the request body.
    Prefilled profile data is automatically merged.
    """
    # Extract only the custom field answers from request
    custom_fields = data.get("custom_fields", {})
    institution_id = data.get("institution_id")
    
    # Server-side: enforce registration stage window if a registration stage exists
    try:
        stages = await get_event_stages(event_id)
        reg_stage_name = None
        for s in stages:
            stype = str(s.get("type") or "").upper()
            sname = str(s.get("name") or "").upper()
            if stype == "REGISTRATION" or "REGISTER" in sname:
                reg_stage_name = s.get("name") or sname
                break

        if reg_stage_name:
            # This will raise HTTPException(403) if outside window
            await check_stage_deadline(event_id=event_id, stage_name=reg_stage_name)
    except Exception:
        # Preserve existing behavior on unexpected errors but surface deadline rejections
        raise

    result = await complete_registration(
        event_id=event_id,
        user_id=user["user_id"],
        registration_data=custom_fields,
        institution_id=institution_id
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# ─────────────────────────────────────────────────────────────────────────────
# TEAM FORMATION STAGE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/teams/create")
async def create_new_team(
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Create a new team for an event."""
    result = await create_team(
        event_id=data.get("event_id"),
        user_id=user["user_id"],
        team_name=data.get("team_name"),
        team_size_min=data.get("min_size"),
        team_size_max=data.get("max_size"),
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/teams/create-solo")
async def create_solo_team_endpoint(
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Create a solo team for individual participation."""
    result = await create_solo_team(
        event_id=data.get("event_id"),
        user_id=user["user_id"]
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/teams/submit-solo")
async def submit_solo_team_for_review(
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Submit a solo team for admin review: finalize team + link registration."""
    event_id = data.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event_id")

    from db import teams_col, registrations_col, participants_col
    from datetime import datetime, timezone

    team = await teams_col.find_one({
        "event_id": str(event_id),
        "team_leader_id": str(user["user_id"]),
        "is_solo": True
    })
    if not team:
        raise HTTPException(status_code=404, detail="Solo team not found. Create one first.")

    if team.get("status") == "finalized":
        return {"status": "success", "message": "Team already submitted for review"}

    await teams_col.update_one(
        {"_id": team["_id"]},
        {"$set": {"status": "finalized", "updated_at": datetime.now(timezone.utc)}}
    )

    team_id_str = str(team["_id"])
    team_name = team.get("team_name", "Solo Entry")

    await registrations_col.update_one(
        {"event_id": str(event_id), "user_id": str(user["user_id"])},
        {"$set": {
            "team_id": team_id_str,
            "team_name": team_name,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    await participants_col.update_one(
        {"event_id": str(event_id), "user_id": str(user["user_id"])},
        {"$set": {
            "team_id": team_id_str,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return {"status": "success", "message": "Solo team submitted for admin review!"}

@router.post("/teams/{team_id}/invite")
async def generate_team_invite(
    team_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Generate invite code for team (leader only)."""
    result = await generate_invite_code(
        team_id=team_id,
        ttl_hours=data.get("ttl_hours", 72)
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/teams/join")
async def join_team_by_code(
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Join a team using invite code."""
    result = await join_team_with_code(
        event_id=data.get("event_id"),
        user_id=user["user_id"],
        invite_code=data.get("invite_code"),
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/teams/leave")
async def leave_current_team(
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Leave current team."""
    result = await leave_team(
        event_id=data.get("event_id"),
        user_id=user["user_id"],
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/teams/{team_id}")
async def get_team_info(team_id: str):
    """Get team details including members."""
    result = await get_team_details(team_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/teams/finalize")
async def finalize_existing_team(
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Finalize/lock a team for an event (leader only)."""
    event_id = data.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event_id")
        
    from db import teams_col, events_col
    from bson import ObjectId
    
    # Find team where user is leader and matches event_id
    team = await teams_col.find_one({
        "event_id": str(event_id),
        "team_leader_id": str(user["user_id"])
    })
    
    if not team:
        raise HTTPException(status_code=404, detail="You are not the leader of any team for this event.")
        
    if team.get("status") == "finalized":
        return {"status": "success", "message": "Team is already finalized"}
        
    # Get size constraints
    min_size = team.get("size_min", 1)
    max_size = team.get("size_max", 5)
    
    current_members = len(team.get("members", []))
    if current_members < min_size:
        raise HTTPException(
            status_code=400,
            detail=f"Your team has {current_members} members, but this event requires at least {min_size} members to finalize."
        )
        
    # Lock the team
    from datetime import datetime, timezone
    await teams_col.update_one(
        {"_id": team["_id"]},
        {"$set": {"status": "finalized", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"status": "success", "message": "Team has been finalized and locked successfully!"}

# ─────────────────────────────────────────────────────────────────────────────
# SUBMISSION STAGE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/stages/{stage_id}/submission")
async def get_existing_submission(
    event_id: str,
    stage_id: str,
    team_id: Optional[str] = None,
    access_verified: bool = Query(
        False,
        description="Skip redundant access re-check when stages-access already ran.",
    ),
    user: dict = Depends(get_auth_user)
):
    """Get existing submission data for a stage (if any)."""
    resolved_id = await resolve_event_id(event_id)

    if not access_verified:
        stages = await get_event_stages(resolved_id)
        target_stage = None
        if stages:
            for s in stages:
                if s.get("id") == stage_id:
                    target_stage = s
                    break

        if not target_stage and stages:
            for s in stages:
                if str(s.get("type", "")).upper() == "SUBMISSION":
                    target_stage = s
                    break

        if not target_stage:
            raise HTTPException(status_code=404, detail="Stage not found")

        stage_type = str(target_stage.get("type", "")).lower()
        await check_stage_submission_access(
            event_id=resolved_id,
            user_id=user["user_id"],
            team_id=team_id,
            stage_type=stage_type,
            stage=target_stage,
        )

    result = await get_submission_data(
        event_id=resolved_id,
        stage_id=stage_id,
        user_id=user["user_id"],
        team_id=team_id,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.post("/events/{event_id}/stages/{stage_id}/submit")
async def submit_stage(
    event_id: str,
    stage_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Submit data for a stage (registration, submission form, etc.)."""
    form_data = data.get("data", {})
    team_id = data.get("team_id")
    
    # Resolve event_id in case it's an opportunity_id
    resolved_id = await resolve_event_id(event_id)
    stages = await get_event_stages(resolved_id)
    target_stage = None
    if stages:
        for s in stages:
            if s.get("id") == stage_id:
                target_stage = s
                break
                
    if not target_stage and stages:
        # Fallback to SUBMISSION type if stage_id is missing or doesn't match
        for s in stages:
            if str(s.get("type", "")).upper() == "SUBMISSION":
                target_stage = s
                break

    if not target_stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    stage_type = str(target_stage.get("type", "")).lower()
    await check_stage_submission_access(
        event_id=resolved_id,
        user_id=user["user_id"],
        team_id=team_id,
        stage_type=stage_type,
        stage=target_stage
    )

    result = await submit_stage_data(
        event_id=resolved_id,
        stage_id=stage_id,
        user_id=user["user_id"],
        form_data=form_data,
        team_id=team_id,
    )
    if result.get("status") == "validation_error":
        raise HTTPException(
            status_code=400,
            detail={
                "message": result.get("message", "Please fix the errors and try again"),
                "errors": result.get("errors", {})
            }
        )
    if "error" in result or result.get("status") in ("deadline_passed", "not_registered"):
        raise HTTPException(status_code=400, detail=result.get("error") or result.get("message"))
    return result

# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS - Stage Configuration
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/events/{event_id}/stages/configure")
async def configure_stages(
    event_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Admin: Configure stages for an event."""
    from db import events_col
    
    # Verify user is event owner
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event or str(event.get("institution_id")) != str(user.get("institution_id")):
        raise HTTPException(status_code=403, detail="You don't have permission to configure this event")
    
    stages = data.get("stages", [])
    
    # Update event with new stages
    result = await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"stages": stages, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Sync stages to opportunities mirror
    from db import opportunities_col
    await opportunities_col.update_many(
        {"event_link_id": str(event_id)},
        {"$set": {"stages": stages, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "status": "success",
        "message": f"Configured {len(stages)} stages for event",
        "stages_count": len(stages),
    }

@router.get("/events/{event_id}/submissions")
async def list_event_submissions(
    event_id: str,
    user: dict = Depends(get_auth_user)
):
    """Admin: List all submissions for an event."""
    from db import submission_data_col, events_col
    
    # Verify user is event owner
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event or str(event.get("institution_id")) != str(user.get("institution_id")):
        raise HTTPException(status_code=403, detail="You don't have permission to view this event's submissions")
    
    # Get all submissions
    submissions = []
    cursor = submission_data_col.find({"event_id": str(event_id)})
    async for sub in cursor:
        sub["_id"] = str(sub["_id"])
        submissions.append(sub)
    
    return {
        "event_id": event_id,
        "total_submissions": len(submissions),
        "submissions": submissions,
    }

# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/stage-analytics")
async def get_stage_analytics(
    event_id: str,
    user: dict = Depends(get_auth_user)
):
    """Admin: Get analytics for each stage (completion rates, etc.)."""
    from db import events_col, participants_col, submission_data_col
    from datetime import datetime, timezone
    
    # Verify user is event owner
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event or str(event.get("institution_id")) != str(user.get("institution_id")):
        raise HTTPException(status_code=403, detail="You don't have permission to view this event")
    
    # Get stages
    stages = await get_event_stages(event_id)
    
    # Count registrations
    total_registered = await participants_col.count_documents({"event_id": str(event_id)})
    
    # Count submissions per stage
    stage_stats = []
    for stage in stages:
        stage_id = stage.get("id")
        submissions = await submission_data_col.count_documents({
            "event_id": str(event_id),
            "stage_id": str(stage_id)
        })
        
        completion_rate = int((submissions / total_registered) * 100) if total_registered > 0 else 0
        
        stage_stats.append({
            "stage_id": stage_id,
            "stage_name": stage.get("name"),
            "stage_type": stage.get("type"),
            "total_participants": total_registered,
            "submissions": submissions,
            "completion_rate": completion_rate,
        })
    
    return {
        "event_id": event_id,
        "total_registered": total_registered,
        "stage_stats": stage_stats,
    }
