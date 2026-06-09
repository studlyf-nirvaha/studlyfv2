from fastapi import APIRouter, HTTPException, Body, Depends, Query
from services.submission_service import create_submission, get_all_submissions, get_submission_by_id, update_submission_status
from typing import List, Optional
from routes.auth import get_current_user

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])

@router.post("/")
async def submit_project(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    try:
        from db import submissions_col
        from bson import ObjectId
        
        # Check if submission already exists for this team/user
        event_id = data.get("event_id")
        team_id = data.get("team_id")
        user_id = current_user.get("user_id")
        
        dup_query = {"event_id": event_id}
        if team_id:
            dup_query["team_id"] = team_id
        else:
            dup_query["user_id"] = user_id
            dup_query["team_id"] = {"$exists": False}
            
        existing = await submissions_col.find_one(dup_query)
        if existing:
            raise HTTPException(status_code=400, detail="Team/User has already submitted for this opportunity")

        # Check if user is team leader for team submissions
        team_name = ""
        if team_id:
            from db import teams_col
            team = await teams_col.find_one({"_id": ObjectId(team_id)})
            if not team:
                raise HTTPException(status_code=404, detail="Team not found")

            team_leader_id = team.get("team_leader_id") or team.get("leader_id")
            if str(user_id) != team_leader_id:
                raise HTTPException(status_code=403, detail="Only team leaders can submit projects")
            
            team_name = team.get("team_name") or team.get("name") or ""
            data["team_name"] = team_name

            # Dedup by team name to prevent duplicate submissions with same team name
            if team_name:
                name_dup = await submissions_col.find_one({
                    "event_id": event_id,
                    "team_name": team_name
                })
                if name_dup and str(name_dup.get("team_id")) != team_id:
                    raise HTTPException(status_code=400, detail=f"A submission already exists for team '{team_name}'")
        
        return await create_submission(data)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_submissions(event_id: Optional[str] = None, status: Optional[str] = None):
    filters = {}
    if event_id: filters["event_id"] = event_id
    if status: filters["status"] = status
    return await get_all_submissions(filters)

@router.get("/{submission_id}")
async def view_submission(submission_id: str):
    submission = await get_submission_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.patch("/{submission_id}/status")
async def change_status(submission_id: str, status: str = Body(embed=True)):
    return await update_submission_status(submission_id, status)

@router.get("/student-view")
async def student_view_submissions(user: dict = Depends(get_current_user)):
    """Allow students to view submissions they are part of"""
    from db import submissions_col, teams_col, participants_col
    from bson import ObjectId
    
    try:
        user_id = user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID required")
        
        # Get all submissions where user is part of the team or is solo participant
        submissions = []
        
        # Check team submissions
        teams = await teams_col.find({"members.user_id": user_id}).to_list(length=None)
        for team in teams:
            team_id = str(team.get("_id"))
            team_subs = await submissions_col.find({"team_id": team_id}).to_list(length=None)
            
            # Check if user is team leader or member
            is_leader = str(user_id) == (team.get("team_leader_id") or team.get("leader_id"))
            
            for sub in team_subs:
                sub_data = dict(sub)
                sub_data["_id"] = str(sub_data["_id"])
                sub_data["access_level"] = "leader" if is_leader else "member"
                sub_data["can_view"] = True  # All team members can view
                submissions.append(sub_data)
        
        # Check solo submissions
        solo_subs = await submissions_col.find({"user_id": user_id, "team_id": {"$exists": False}}).to_list(length=None)
        for sub in solo_subs:
            sub_data = dict(sub)
            sub_data["_id"] = str(sub_data["_id"])
            sub_data["access_level"] = "owner"  # Solo participant is owner
            sub_data["can_view"] = True
            submissions.append(sub_data)
        
        return {"submissions": submissions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/notify-shortlisted")
async def notify_shortlisted(
    data: dict = Body(...),
    user: dict = Depends(get_current_user)
):
    """
    Admin endpoint: Bulk notify shortlisted candidates.
    Supports 'dry_run' mode for verification.
    """
    from db import submission_data_col as submissions_col, events_col, users_col, teams_col
    from services.email_service import send_notification_email
    from bson import ObjectId
    import asyncio
    
    submission_ids = data.get("submission_ids", [])
    dry_run = data.get("dry_run", False)
    
    if not submission_ids:
        raise HTTPException(status_code=400, detail="No submission IDs provided")
    
    results = {"success": 0, "failed": 0, "logs": []}
    
    for sub_id in submission_ids:
        try:
            sub = await submissions_col.find_one({"_id": ObjectId(sub_id)})
            if not sub:
                results["failed"] += 1
                results["logs"].append(f"Sub {sub_id}: Not found")
                continue
            
            # Verify event ownership
            event_id = str(sub.get("event_id"))
            event = await events_col.find_one({"_id": ObjectId(event_id)})
            if not event or str(event.get("institution_id")) != str(user.get("institution_id")):
                results["failed"] += 1
                results["logs"].append(f"Sub {sub_id}: Permission denied")
                continue
            
            # Get recipient info
            email = ""
            name = ""
            if sub.get("team_id"):
                team = await teams_col.find_one({"_id": ObjectId(sub.get("team_id"))})
                name = team.get("team_name") if team else "Team"
                # For teams, we might need a better way to get leader email
                # For now, simplistic approach or skipping if complex
            else:
                usr = await users_col.find_one({"user_id": sub.get("user_id")})
                if usr:
                    email = usr.get("email")
                    name = usr.get("full_name") or usr.get("name")
            
            if not email:
                results["failed"] += 1
                results["logs"].append(f"Sub {sub_id}: No email found")
                continue
                
            subject = f"Congratulations! Shortlisted for {event.get('title')}"
            body = f"<p>Hi {name},</p><p>Congratulations! You have been shortlisted for the next stage of <strong>{event.get('title')}</strong>.</p>"
            
            if dry_run:
                results["logs"].append(f"Sub {sub_id}: DRY RUN - Would send to {email}")
            else:
                await send_notification_email(email, subject, body)
                results["logs"].append(f"Sub {sub_id}: Sent to {email}")
                
            results["success"] += 1
            
        except Exception as e:
            results["failed"] += 1
            results["logs"].append(f"Sub {sub_id}: Error - {str(e)}")
            
    return {"status": "success", "results": results}


@router.get("/admin/events/{event_id}/submissions")
async def admin_view_event_submissions(
    event_id: str,
    stage_id: Optional[str] = None,
    user_id: Optional[str] = None,
    team_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint: View all submissions for an event, optionally filtered by stage/user/team.
    
    Requires: User is institution owner of the event
    Returns: All submission data with participant info and submission history
    """
    from db import submission_data_col as submissions_col, events_col, users_col, teams_col, participants_col
    from bson import ObjectId
    
    try:
        # Verify user is admin/institution owner
        calling_user = user.get("user_id")
        if not calling_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get event and verify ownership
        try:
            ev_id = ObjectId(event_id)
        except Exception:
            ev_id = event_id
            
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Verify calling user is institution owner
        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        calling_inst_id = str(user.get("institution_id") or "")
        if inst_id != calling_inst_id:
            raise HTTPException(status_code=403, detail="Only event organizers can view submissions")
        
        # Build query
        query = {"event_id": str(event_id)}
        if stage_id:
            query["stage_id"] = stage_id
        if user_id:
            query["user_id"] = user_id
        if team_id:
            query["team_id"] = team_id
        
        # Fetch submissions
        cursor = submissions_col.find(query).sort("submitted_at", -1)
        submissions = []
        
        async for sub in cursor:
            sub_id = str(sub.get("_id"))
            sub_user_id = sub.get("user_id")
            sub_team_id = sub.get("team_id")
            
            # Get participant/user info
            participant_info = {}
            if sub_team_id:
                team = await teams_col.find_one({"_id": ObjectId(sub_team_id) if isinstance(sub_team_id, str) else sub_team_id})
                if team:
                    participant_info["team_id"] = str(team.get("_id"))
                    participant_info["team_name"] = team.get("team_name")
                    participant_info["team_leader_id"] = str(team.get("team_leader_id") or team.get("leader_id") or "")
                    participant_info["member_count"] = len(team.get("members", []))
            
            if sub_user_id:
                usr = await users_col.find_one({"user_id": sub_user_id})
                if usr:
                    participant_info["user_id"] = sub_user_id
                    participant_info["user_name"] = usr.get("full_name") or usr.get("name")
                    participant_info["user_email"] = usr.get("email")
                    participant_info["user_college"] = usr.get("college") or usr.get("institution")
            
            submissions.append({
                "_id": sub_id,
                "event_id": str(event_id),
                "stage_id": sub.get("stage_id"),
                "stage_name": sub.get("stage_name"),
                "participant": participant_info,
                "submission_data": sub.get("data") or sub.get("submission_data") or {},
                "status": sub.get("status"),
                "submitted_at": sub.get("submitted_at"),
                "last_updated_at": sub.get("last_updated_at") or sub.get("updated_at"),
                "evaluation_score": sub.get("evaluation_score"),
                "evaluator_feedback": sub.get("evaluator_feedback"),
            })
        
        return {
            "status": "success",
            "event_id": str(event_id),
            "event_title": event.get("title"),
            "total_submissions": len(submissions),
            "submissions": submissions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/events/{event_id}/stage/{stage_id}/submissions")
async def admin_view_stage_submissions(
    event_id: str,
    stage_id: str,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint: View all submissions for a specific stage of an event.
    
    Requires: User is institution owner of the event
    Returns: Paginated submission list with participant details
    """
    from db import submission_data_col as submissions_col, events_col, users_col, teams_col
    from bson import ObjectId
    
    try:
        # Verify event ownership
        try:
            ev_id = ObjectId(event_id)
        except Exception:
            ev_id = event_id
            
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        calling_inst_id = str(user.get("institution_id") or "")
        if inst_id != calling_inst_id:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Get stage name and field schema from event stages (admin-configured, dynamic)
        stage_name = ""
        stage_fields = []
        stages = event.get("stages") or []
        for stage in stages:
            if stage.get("id") == stage_id or stage.get("name") == stage_id:
                stage_name = stage.get("name", stage_id)
                raw_fields = stage.get("fields") or (stage.get("config") or {}).get("fields") or []
                try:
                    from services.field_validation import normalize_stage_fields
                    stage_fields = normalize_stage_fields(raw_fields)
                except Exception:
                    stage_fields = raw_fields
                break

        def _format_labeled_data(data: dict) -> list:
            if not isinstance(data, dict):
                return []
            labeled = []
            used = set()
            for f in stage_fields:
                fid = str(f.get("field_id") or f.get("id") or "")
                if not fid:
                    continue
                val = data.get(fid)
                if val is None:
                    continue
                used.add(fid)
                ftype = str(f.get("field_type") or f.get("type") or "text")
                display = val
                if ftype == "file" and isinstance(val, str) and val.startswith("data:"):
                    display = "[File uploaded]"
                elif isinstance(val, str) and len(val) > 200:
                    display = val[:200] + "…"
                labeled.append({
                    "field_id": fid,
                    "label": f.get("label") or fid,
                    "type": ftype,
                    "value": display,
                })
            for key, val in data.items():
                if key in used or key == "team_display_name":
                    continue
                labeled.append({"field_id": key, "label": key.replace("_", " ").title(), "type": "text", "value": val})
            return labeled

        # Fetch submissions for this stage
        query = {"event_id": str(event_id), "stage_id": stage_id}
        cursor = submissions_col.find(query).sort("submitted_at", -1)
        
        submissions = []
        async for sub in cursor:
            sub_user_id = sub.get("user_id")
            sub_team_id = sub.get("team_id")
            
            participant_name = ""
            participant_email = ""
            team = None
            
            if sub_team_id:
                team = await teams_col.find_one({"_id": ObjectId(sub_team_id) if isinstance(sub_team_id, str) else sub_team_id})
                participant_name = team.get("team_name") if team else f"Team {sub_team_id}"
            elif sub_user_id:
                usr = await users_col.find_one({"user_id": sub_user_id})
                participant_name = (usr.get("full_name") or usr.get("name")) if usr else sub_user_id
                participant_email = usr.get("email") if usr else ""
            
            team_name = participant_name if sub_team_id else ""
            if sub_team_id and team:
                team_name = team.get("team_name") or team.get("name") or participant_name

            submissions.append({
                "_id": str(sub.get("_id")),
                "participant_name": participant_name,
                "participant_email": participant_email,
                "team_name": team_name,
                "user_id": sub_user_id,
                "team_id": sub_team_id,
                "stage_id": stage_id,
                "stage_name": stage_name or sub.get("stage_name"),
                "data": sub.get("data") or {},
                "labeled_data": _format_labeled_data(sub.get("data") or {}),
                "status": sub.get("status"),
                "submitted_at": sub.get("submitted_at"),
                "last_updated_at": sub.get("last_updated_at") or sub.get("updated_at"),
                "evaluation_score": sub.get("evaluation_score"),
                "feedback": sub.get("evaluator_feedback"),
            })
        
        return {
            "status": "success",
            "event_id": str(event_id),
            "event_title": event.get("title"),
            "stage_id": stage_id,
            "stage_name": stage_name,
            "stage_fields": stage_fields,
            "total_submissions": len(submissions),
            "submissions": submissions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/submissions/{submission_id}/history")
async def admin_view_submission_history(
    submission_id: str,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint: View submission edit history and all changes made by participant.
    
    Returns: Submission data with timestamps showing when participant edited/saved
    """
    from db import submissions_col, events_col
    from bson import ObjectId
    
    try:
        # Get submission
        try:
            sub_id = ObjectId(submission_id)
        except Exception:
            sub_id = submission_id
        
        sub = await submissions_col.find_one({"_id": sub_id})
        if not sub:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Verify event ownership
        event_id = str(sub.get("event_id"))
        try:
            ev_id = ObjectId(event_id)
        except Exception:
            ev_id = event_id
            
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        calling_inst_id = str(user.get("institution_id") or "")
        if inst_id != calling_inst_id:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        return {
            "status": "success",
            "submission_id": str(sub.get("_id")),
            "event_id": event_id,
            "stage_id": sub.get("stage_id"),
            "user_id": sub.get("user_id"),
            "team_id": sub.get("team_id"),
            "current_data": sub.get("data") or {},
            "submission_status": sub.get("status"),
            "first_submitted_at": sub.get("first_submitted_at") or sub.get("submitted_at"),
            "last_updated_at": sub.get("last_updated_at") or sub.get("updated_at"),
            "edit_count": sub.get("edit_count", 0),
            "change_log": sub.get("change_log") or [],
            "evaluation_score": sub.get("evaluation_score"),
            "evaluator_feedback": sub.get("evaluator_feedback"),
            "evaluated_at": sub.get("evaluated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
