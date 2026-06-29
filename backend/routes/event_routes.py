from fastapi import APIRouter, HTTPException, Body, Depends, File, UploadFile, Form, Query
from services.event_service import (
    create_event,
    get_all_events,
    get_event_by_id,
    update_event,
    delete_event,
    update_event_status
)
from typing import List, Optional
from auth_institution import get_auth_user, get_auth_user_optional, assert_institution_owns_event
from bson import ObjectId
import os
import uuid
import asyncio
from db import events_col
from datetime import datetime

router = APIRouter(prefix="/api/v1/events", tags=["Events"])

@router.post("/")
async def post_event(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    try:
        role = str(user.get("role") or "").lower()
        if role not in ("institution", "admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Institution access required")
        if not data.get("title"):
            raise HTTPException(status_code=400, detail="Event title is required")
        if role == "institution":
            institution_id = user.get("institution_id")
            if not institution_id:
                raise HTTPException(status_code=403, detail="Institution profile is not linked")
            data["institution_id"] = institution_id
        return await create_event(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_events(
    status: Optional[str] = None,
    institution_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_auth_user_optional),
):
    filters = {}
    role = str((user or {}).get("role") or "").lower()
    if role in ("admin", "super_admin"):
        if status: filters["status"] = status
        if institution_id: filters["institution_id"] = institution_id
    elif role == "institution":
        # Institution users should not see soft-deleted events by default.
        filters["institution_id"] = str((user or {}).get("institution_id") or institution_id or "")
        if status:
            filters["status"] = status
        else:
            filters["status"] = {"$ne": "DELETED"}
    else:
        filters["status"] = "LIVE"
    return await get_all_events(filters)

@router.get("/my-registrations")
async def get_my_event_registrations(user: dict = Depends(get_auth_user)):
    """Student: Get all events + standalone opportunities the user is registered/applied for."""
    from db import participants_col, events_col, opportunities_col, opportunity_applications_col
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    hidden_event_statuses = {"DELETED", "ENDED", "CLOSED", "COMPLETED"}
    
    tracked_event_ids = set()
    results = []
    
    # --- Part 1: Event participants ---
    participants = await participants_col.find({"user_id": uid}).sort("registered_at", -1).to_list(None)
    event_ids = [ObjectId(p.get("event_id")) for p in participants if p.get("event_id")]
    
    events_dict = {}
    if event_ids:
        events_cursor = events_col.find({"_id": {"$in": event_ids}})
        async for event in events_cursor:
            events_dict[str(event["_id"])] = event

    for p in participants:
        eid = str(p.get("event_id") or "")
        if not eid:
            continue
        tracked_event_ids.add(eid)
        
        event = events_dict.get(eid)
        if not event:
            continue
        
        event_stages = event.get("stages", [])
        total_stages = len(event_stages) if isinstance(event_stages, list) else 0
        event_status = str(event.get("status") or "DRAFT").upper()
        
        current_stage = p.get("current_stage")
        last_submitted = p.get("last_stage_submitted")
        completed_stages = p.get("completed_stages", [])
        if not isinstance(completed_stages, list):
            completed_stages = []

        stages_cleared = len(completed_stages)
        pct = round((stages_cleared / total_stages) * 100) if total_stages > 0 else 0

        # Hide events that are no longer active or have been fully completed by the learner.
        if event_status in hidden_event_statuses:
            continue
        if total_stages > 0 and stages_cleared >= total_stages:
            continue

        results.append({
            "event_id": eid,
            "event_title": event.get("title", "Untitled Event"),
            "event_status": event_status,
            "event_category": event.get("category", ""),
            "participant_id": str(p["_id"]),
            "current_stage": current_stage,
            "last_stage_submitted": last_submitted,
            "completed_stages": completed_stages,
            "status": p.get("status", "registered"),
            "registered_at": p.get("registered_at"),
            "total_stages": total_stages,
            "stages_cleared": stages_cleared,
            "progress_pct": pct,
            "source": "event",
            "type": event.get("category", "Event"),
        })
    
    # --- Part 2: Standalone opportunity applications (no linked event) ---
    opp_cursor = opportunity_applications_col.find({"user_id": uid}).sort("applied_at", -1)
    async for app in opp_cursor:
        oid = str(app.get("opportunity_id") or "")
        if not oid:
            continue
        try:
            opp = await opportunities_col.find_one({"_id": ObjectId(oid)})
        except Exception:
            opp = None
        if not opp:
            continue
        # Skip if already linked to a tracked event participant record
        if opp.get("event_link_id"):
            linked_eid = str(opp["event_link_id"])
            if linked_eid in tracked_event_ids:
                continue
            try:
                linked_event = await events_col.find_one({"_id": ObjectId(linked_eid)})
            except Exception:
                linked_event = None
            if linked_event:
                linked_status = str(linked_event.get("status") or "").upper()
                linked_stages = linked_event.get("stages", [])
                total_linked_stages = len(linked_stages) if isinstance(linked_stages, list) else 0
                if linked_status in hidden_event_statuses:
                    continue
                if total_linked_stages > 0:
                    try:
                        completed_for_link = await participants_col.count_documents({
                            "event_id": linked_eid,
                            "user_id": uid,
                            "completed_stages.0": {"$exists": True},
                        })
                    except Exception:
                        completed_for_link = 0
                    if completed_for_link > 0:
                        participant_doc = await participants_col.find_one({"event_id": linked_eid, "user_id": uid})
                        completed_linked_stages = participant_doc.get("completed_stages", []) if participant_doc else []
                        if isinstance(completed_linked_stages, list) and len(completed_linked_stages) >= total_linked_stages:
                            continue
        
        results.append({
            "event_id": oid,
            "event_title": opp.get("title", "Untitled Opportunity"),
            "event_status": opp.get("status", "active"),
            "event_category": opp.get("type", "Opportunity"),
            "participant_id": str(app["_id"]),
            "current_stage": None,
            "last_stage_submitted": None,
            "status": app.get("status", "pending"),
            "registered_at": app.get("applied_at"),
            "total_stages": 0,
            "stages_cleared": 0,
            "progress_pct": 0,
            "source": "opportunity",
            "type": opp.get("type", "Opportunity"),
        })
    
    return results

@router.get("/{event_id}")
async def view_event(event_id: str, user: Optional[dict] = Depends(get_auth_user_optional)):
    event = await get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    role = str((user or {}).get("role") or "").lower()
    # If event is soft-deleted, only admin/super_admin may view it
    if str(event.get("status") or "").upper() == "DELETED":
        if role not in ("admin", "super_admin"):
            raise HTTPException(status_code=404, detail="Event not found")

    # For non-LIVE events, allow admins to view; institutions and students see only LIVE unless explicitly requested
    if str(event.get("status") or "").upper() not in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        if role not in ("admin", "super_admin") and str((user or {}).get("institution_id") or "") != str(event.get("institution_id") or ""):
            raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.put("/{event_id}")
async def modify_event(event_id: str, data: dict = Body(...), user: dict = Depends(get_auth_user)):
    await assert_institution_owns_event(event_id, user)
    if str(user.get("role") or "").lower() == "institution":
        data.pop("institution_id", None)
    return await update_event(event_id, data)

@router.delete("/{event_id}")
async def remove_event(event_id: str, user: dict = Depends(get_auth_user)):
    await assert_institution_owns_event(event_id, user)
    return await delete_event(event_id)

@router.patch("/{event_id}/status")
async def change_event_status(event_id: str, status: str = Body(embed=True), user: dict = Depends(get_auth_user)):
    await assert_institution_owns_event(event_id, user)
    return await update_event_status(event_id, status)

@router.post("/{event_id}/upload-media")
async def upload_event_media(
    event_id: str,
    file: UploadFile = File(...),
    field: str = Form(...),
    user: dict = Depends(get_auth_user)
):
    """
    Upload logo or banner for an event, encoded as base64 Data URI directly in MongoDB.
    """
    try:
        # Validate field parameter
        if field not in ['logo_url', 'banner_url']:
            raise HTTPException(status_code=400, detail="field must be 'logo_url' or 'banner_url'")
        
        # Validate file extension
        await assert_institution_owns_event(event_id, user)
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"File type {file_ext} not allowed. Use: {', '.join(allowed_extensions)}")
        
        # Read file contents and validate size
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")
        
        # Convert to base64 Data URI
        import base64
        mime_type = "image/png"
        if file_ext in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"
        elif file_ext == ".webp":
            mime_type = "image/webp"
        elif file_ext == ".gif":
            mime_type = "image/gif"
            
        b64_data = base64.b64encode(file_content).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{b64_data}"
        
        # Update event in DB
        try:
            event_id_obj = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception as e:
            logger.warning(f"Handled exception at line 270: {e}")
            event_id_obj = event_id
        
        # Try updating events collection first
        result = await events_col.update_one(
            {"_id": event_id_obj},
            {"$set": {field: data_uri}}
        )
        
        from db import opportunities_col
        
        # Sync to linked opportunity if a matching event was found and updated
        if result.matched_count > 0:
            try:
                await opportunities_col.update_many(
                    {"event_link_id": str(event_id)},
                    {"$set": {field: data_uri}}
                )
            except Exception as e:
                import logging
                logging.getLogger("event_routes").warning(f"[SYNC] Failed to update opportunity media: {e}")
        else:
            # Fallback: if the event wasn't in events_col, check if it's a standalone opportunity
            opp_result = await opportunities_col.update_one(
                {"_id": event_id_obj},
                {"$set": {field: data_uri}}
            )
            if opp_result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Event not found")
        
        return {"url": data_uri, "status": "success", "field": field}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/{event_id}/hub")
async def get_event_hub_data(event_id: str, user: dict = Depends(get_auth_user)):
    from db import participants_col, teams_col
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    p = await participants_col.find_one({"event_id": str(event_id), "user_id": uid})
    team = None
    if p and p.get("team_id"):
        try:
            team = await teams_col.find_one({"_id": ObjectId(str(p.get("team_id")))})
        except Exception:
            team = None
            
    if p:
        p["_id"] = str(p["_id"])
        # Standardize fields for frontend
        p = {
            "_id": p["_id"],
            "event_id": p.get("event_id"),
            "user_id": p.get("user_id"),
            "team_id": p.get("team_id"),
            "status": p.get("status", "pending"),
            "current_stage": p.get("current_stage"),
            "last_stage_submitted": p.get("last_stage_submitted")
        }
        
    if team:
        team["_id"] = str(team["_id"])
        # Stringify leader_id for frontend comparison (EventHub.tsx:265)
        if "leader_id" in team:
            team["leader_id"] = str(team["leader_id"])
        if "team_leader_id" in team:
            team["team_leader_id"] = str(team["team_leader_id"])
            # Map team_leader_id to leader_id for compatibility with EventHub.tsx
            if "leader_id" not in team:
                team["leader_id"] = team["team_leader_id"]
                
        if "members" in team:
            # Enrich team members with user details
            from db import users_col
            member_user_ids = [str(m.get("user_id")) for m in team["members"] if m.get("user_id")]
            users = {}
            if member_user_ids:
                cursor = users_col.find({"user_id": {"$in": member_user_ids}})
                async for user_doc in cursor:
                    users[str(user_doc["user_id"])] = {
                        "name": user_doc.get("name", ""),
                        "email": user_doc.get("email", "")
                    }
            
            for m in team["members"]:
                if "user_id" in m:
                    user_id = str(m["user_id"])
                    m["user_id"] = user_id
                    # Add user details
                    if user_id in users:
                        m["name"] = users[user_id]["name"]
                        m["email"] = users[user_id]["email"]
                    else:
                        m["name"] = "Unknown User"
                        m["email"] = ""
                    # Set leader flag
                    m["is_leader"] = str(m.get("role", "MEMBER")) == "LEADER" or user_id == str(team.get("leader_id", ""))
                    
    # Check for existing evaluations (to lock submissions)
    from db import scores_col, submissions_col, events_col
    is_evaluated = False
    evaluation_data = {}

    # Fetch event to resolve stage names
    event = await events_col.find_one({"_id": ObjectId(event_id)}) if ObjectId.is_valid(event_id) else await events_col.find_one({"event_id": event_id})
    event_stages = (event or {}).get("stages", []) or []

    def resolve_stage_name(stage_id):
        if not stage_id:
            return None
        for s in event_stages:
            if str(s.get("id")) == str(stage_id):
                return s.get("name")
        return None

    if p:
        # Check submissions_col first for the new judging system results
        sub_query = {"event_id": str(event_id)}
        if p.get("team_id"):
            sub_query["team_id"] = str(p["team_id"])
        else:
            sub_query["user_id"] = uid
            
        latest_sub = await submissions_col.find_one(sub_query, sort=[("submitted_at", -1)])
        if latest_sub and latest_sub.get("status") in ("Evaluated", "Reviewed", "Scored", "Scoring", "Shortlisted", "Waitlisted"):
            is_evaluated = True
            stage_id = latest_sub.get("stage_id") or p.get("current_stage") or p.get("last_stage_submitted")
            evaluation_data = {
                "score": latest_sub.get("total_score") or latest_sub.get("evaluation_score"),
                "feedback": latest_sub.get("evaluator_feedback") or latest_sub.get("feedback"),
                "evaluated_at": latest_sub.get("evaluated_at") or latest_sub.get("last_evaluated_at"),
                "stage_id": stage_id,
                "stage_name": resolve_stage_name(stage_id)
            }
        else:
            # Fallback to legacy scores_col
            score_query = {"event_id": str(event_id)}
            if p.get("team_id"):
                score_query["team_id"] = str(p["team_id"])
            else:
                score_query["user_id"] = uid
            
            legacy_score = await scores_col.find_one(score_query)
            if legacy_score:
                is_evaluated = True
                stage_id = legacy_score.get("stage_id") or p.get("current_stage") or p.get("last_stage_submitted")
                evaluation_data = {
                    "score": legacy_score.get("total_score"),
                    "feedback": legacy_score.get("comments"),
                    "evaluated_at": legacy_score.get("evaluated_at"),
                    "stage_id": stage_id,
                    "stage_name": resolve_stage_name(stage_id)
                }

    return {
        "participant": p, 
        "team": team, 
        "is_evaluated": is_evaluated,
        "evaluation": evaluation_data
    }


# ============================================================================
# STAGE ACCESS CONTROL - Admin endpoints for managing participant eligibility
# ============================================================================

@router.get("/{event_id}/dashboard-data")
async def get_event_dashboard_data(
    event_id: str,
    limit: int = Query(0, ge=0, le=50000, description="Per-collection cap; 0 = no cap"),
    user: dict = Depends(get_auth_user),
):
    """
    Admin/Institution endpoint: Aggregate event dashboard data.
    All queries are scoped dynamically to the resolved event_id variants — no static event lists.
    """
    from db import participants_col, quizzes_col, teams_col, submissions_col, submission_data_col, scores_col
    from routes.registration_flow_routes import resolve_event_id
    from services.submission_format import summarize_submission_data
    import logging
    logger = logging.getLogger("event_routes")

    from db import opportunities_col

    event = await assert_institution_owns_event(event_id, user)
    resolved = await resolve_event_id(event_id)
    event_ids = list(dict.fromkeys([
        str(event_id),
        str(resolved),
        str(event.get("_id", "")),
        str(event.get("event_id", "")),
        str(event.get("event_link_id", "")),
    ]))
    event_ids = [eid for eid in event_ids if eid]
    opp_or = []
    for eid in list(event_ids):
        opp_or.append({"event_link_id": eid})
        if ObjectId.is_valid(eid):
            try:
                opp_or.append({"_id": ObjectId(eid)})
            except Exception:
                pass
    if opp_or:
        async for opp in opportunities_col.find({"$or": opp_or}, {"_id": 1, "event_link_id": 1}):
            for key in ("_id", "event_link_id"):
                val = opp.get(key)
                if val and str(val) not in event_ids:
                    event_ids.append(str(val))
    event_filter = {"event_id": {"$in": [eid for eid in event_ids if eid]}}
    list_cap = limit if limit > 0 else None

    async def _load(cursor):
        return await cursor.to_list(length=list_cap)

    try:
        participants, quizzes, teams, submissions, stage_submissions = await asyncio.gather(
            _load(participants_col.find(event_filter)),
            _load(quizzes_col.find(event_filter)),
            _load(teams_col.find(event_filter)),
            _load(submissions_col.find(event_filter)),
            _load(submission_data_col.find(
                event_filter,
                {
                    "stage_id": 1,
                    "stage_name": 1,
                    "stage_type": 1,
                    "user_id": 1,
                    "user_name": 1,
                    "team_id": 1,
                    "team_name": 1,
                    "title": 1,
                    "status": 1,
                    "submitted_at": 1,
                    "last_updated_at": 1,
                    "event_id": 1,
                    "data": 1,
                    "assigned_judge_id": 1,
                    "assigned_judges": 1,
                    "assigned_judge_emails": 1,
                    "total_score": 1,
                },
            )),
        )
        counts = await asyncio.gather(
            participants_col.count_documents(event_filter),
            quizzes_col.count_documents(event_filter),
            teams_col.count_documents(event_filter),
            submissions_col.count_documents(event_filter),
            submission_data_col.count_documents(event_filter),
        )
    except Exception as e:
        logger.error(f"Error gathering dashboard data for {event_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error gathering data: {str(e)}")

    def _score_sum(sc: dict) -> float:
        total = sc.get("total_score")
        if total is not None:
            return float(total)
        rubric = sc.get("scores") or sc.get("criteria_scores") or {}
        if isinstance(rubric, dict) and rubric:
            try:
                return sum(float(v) for v in rubric.values())
            except (TypeError, ValueError):
                pass
        score = sc.get("score")
        return float(score) if score is not None else 0.0

    team_lookup = {str(t.get("_id")): t for t in teams if t.get("_id")}
    enriched_stage_submissions = []
    for doc in stage_submissions:
        row = dict(doc)
        sid = str(row.get("_id", ""))
        row["_id"] = sid
        if isinstance(row.get("data"), dict):
            row["data_summary"] = summarize_submission_data(row["data"])
        tid = str(row.get("team_id") or "")
        if tid and tid in team_lookup:
            row["team_name"] = team_lookup[tid].get("team_name") or team_lookup[tid].get("name")
        or_sub = [{"submission_id": sid}]
        try:
            or_sub.append({"submission_id": ObjectId(sid)})
        except Exception:
            pass
        totals = []
        judges_feedback = []
        async for sc in scores_col.find({"$or": or_sub}):
            judge_id = str(sc.get("judge_id") or "").strip()
            judge_email = str(sc.get("judge_email") or "").strip().lower()
            score_val = _score_sum(sc)
            # Check if this judge (by either ID or email) already has feedback
            found_idx = None
            for idx, entry in enumerate(judges_feedback):
                if (judge_id and entry.get("judge_id") == judge_id) or (judge_email and entry.get("judge_email") == judge_email):
                    found_idx = idx
                    break
            if found_idx is not None:
                judges_feedback[found_idx]["score"] = score_val
                judges_feedback[found_idx]["feedback"] = sc.get("feedback") or sc.get("comments") or ""
                judges_feedback[found_idx]["comments"] = sc.get("comments") or sc.get("feedback") or ""
            else:
                judges_feedback.append({
                    "judge_name": sc.get("judge_name") or sc.get("judge") or "",
                    "judge_email": sc.get("judge_email") or "",
                    "judge_id": sc.get("judge_id") or "",
                    "feedback": sc.get("feedback") or sc.get("comments") or "",
                    "comments": sc.get("comments") or sc.get("feedback") or "",
                    "score": score_val,
                })
        # Keep only the highest-scoring judge feedback (single judge per submission)
        if judges_feedback:
            judges_feedback.sort(key=lambda fb: fb.get("score", 0), reverse=True)
            judges_feedback = judges_feedback[:1]
            row["total_score"] = judges_feedback[0]["score"]
        elif row.get("total_score") is not None:
            row["total_score"] = float(row["total_score"])
        row["judges_feedback"] = judges_feedback
        assigned = row.get("assigned_judges") or []
        if assigned and not row.get("assigned_judge_id"):
            first = assigned[0] if isinstance(assigned[0], dict) else {}
            row["assigned_judge_id"] = first.get("judge_id") or ""
        enriched_stage_submissions.append(row)

    # Enrich regular submissions with average scores from scores_col
    enriched_submissions = []
    for doc in submissions:
        row = dict(doc)
        sid = str(row.get("_id", ""))
        row["_id"] = sid
        or_sub = [{"submission_id": sid}]
        try:
            or_sub.append({"submission_id": ObjectId(sid)})
        except Exception:
            pass
        totals = []
        judges_feedback = []
        seen_judges = set()
        async for sc in scores_col.find({"$or": or_sub}):
            judge_id = str(sc.get("judge_id") or "").strip()
            judge_email = str(sc.get("judge_email") or "").strip().lower()
            dedup_key = judge_id or judge_email
            score_val = _score_sum(sc)
            if dedup_key:
                if dedup_key in seen_judges:
                    for entry in judges_feedback:
                        if entry.get("judge_id") == judge_id or entry.get("judge_email") == judge_email:
                            entry["score"] = score_val
                            entry["feedback"] = sc.get("feedback") or sc.get("comments") or ""
                            entry["comments"] = sc.get("comments") or sc.get("feedback") or ""
                            break
                    continue
                seen_judges.add(dedup_key)
            totals.append(score_val)
            judges_feedback.append({
                "judge_name": sc.get("judge_name") or sc.get("judge") or "",
                "judge_email": sc.get("judge_email") or "",
                "judge_id": sc.get("judge_id") or "",
                "feedback": sc.get("feedback") or sc.get("comments") or "",
                "comments": sc.get("comments") or sc.get("feedback") or "",
                "score": score_val,
            })
        if totals:
            row["total_score"] = round(sum(totals) / len(totals), 1)
        elif row.get("total_score") is not None:
            row["total_score"] = float(row["total_score"])
        row["judges_feedback"] = judges_feedback
        enriched_submissions.append(row)

    for collection_rows in (participants, quizzes, teams):
        for row in collection_rows:
            if row.get("_id"):
                row["_id"] = str(row["_id"])

    return {
        "event_ids": event_ids,
        "participants": participants,
        "quizzes": quizzes,
        "teams": teams,
        "submissions": enriched_submissions,
        "stage_submissions": enriched_stage_submissions,
        "counts": {
            "participants": counts[0],
            "quizzes": counts[1],
            "teams": counts[2],
            "submissions": counts[3],
            "stage_submissions": counts[4],
        },
        "truncated": bool(limit > 0 and any(len(c) > limit for c in [
            participants, quizzes, teams, submissions, stage_submissions
        ])),
    }


@router.get("/{event_id}/participants")
async def list_event_participants(
    event_id: str,
    status_filter: Optional[str] = None,
    user: dict = Depends(get_auth_user)
):
    """
    Admin endpoint: List all participants for an event with their status.
    Optional status filter: pending, shortlisted, accepted, rejected
    """
    from db import participants_col, users_col
    
    # Verify event ownership
    event = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    if not event or str(event.get("institution_id")) != str(user.get("institution_id")):
        raise HTTPException(status_code=403, detail="Only event hosts can view participants")
    
    # Build query
    query = {"event_id": str(event_id)}
    if status_filter:
        query["status"] = status_filter.lower()
    
    # Get participants
    cursor = participants_col.find(query)
    participants = await cursor.to_list(length=None)
    
    # Enrich with user info
    user_ids = [str(p.get("user_id")) for p in participants]
    users_dict = {}
    if user_ids:
        user_cursor = users_col.find({"user_id": {"$in": user_ids}})
        async for u in user_cursor:
            users_dict[str(u["user_id"])] = {
                "name": u.get("name", "Unknown"),
                "email": u.get("email", ""),
                "college_name": u.get("college_name", "")
            }
    
    # Format response
    result = []
    for p in participants:
        p_id = str(p.get("user_id"))
        user_data = users_dict.get(p_id, {})
        result.append({
            "_id": str(p["_id"]),
            "user_id": p_id,
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "college": user_data.get("college_name"),
            "status": p.get("status", "pending"),
            "current_stage": p.get("current_stage"),
            "last_stage_submitted": p.get("last_stage_submitted"),
            "team_id": p.get("team_id"),
            "registered_at": p.get("registered_at"),
            "updated_at": p.get("updated_at")
        })
    
    return {
        "event_id": event_id,
        "total_count": len(result),
        "pending": len([p for p in result if p["status"] == "pending"]),
        "shortlisted": len([p for p in result if p["status"] in ["shortlisted", "accepted"]]),
        "rejected": len([p for p in result if p["status"] == "rejected"]),
        "participants": result
    }


@router.post("/{event_id}/participants/bulk-status")
async def bulk_update_participant_status(
    event_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """
    Admin endpoint: Bulk update participant statuses.
    
    Request body:
    {
        "user_ids": ["user1", "user2"],
        "status": "shortlisted"
    }
    """
    from db import participants_col
    
    # Verify event ownership
    event = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    if not event or str(event.get("institution_id")) != str(user.get("institution_id")):
        raise HTTPException(status_code=403, detail="Only event hosts can manage participants")
    
    user_ids = data.get("user_ids", [])
    new_status = data.get("status", "").lower()
    
    if not user_ids or not new_status:
        raise HTTPException(status_code=400, detail="Missing user_ids or status")
    
    allowed_statuses = ["pending", "shortlisted", "accepted", "rejected"]
    if new_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(allowed_statuses)}")
    
    try:
        result = await participants_col.update_many(
            {"event_id": str(event_id), "user_id": {"$in": [str(uid) for uid in user_ids]}},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        
        return {
            "status": "success",
            "message": f"Updated {result.modified_count} participants to {new_status}",
            "modified_count": result.modified_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
