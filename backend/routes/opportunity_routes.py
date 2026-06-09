from fastapi import APIRouter, HTTPException, Body, Query, Depends, File, UploadFile
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import asyncio
import os

from auth_institution import get_auth_user, get_auth_user_optional
from services.opportunity_service import (
    create_opportunity,
    get_all_opportunities,
    get_opportunity_by_id,
    apply_for_opportunity,
    get_user_applications,
    get_learner_opportunity_overview,
)
from services.subscription_service import validate_new_listing_against_plan
from db import notifications_col
from db import quizzes_col, events_col, participants_col, opportunities_col, opportunity_applications_col, opportunity_reviews_col
from services.email_service import send_notification_email

router = APIRouter(prefix="/api/opportunities", tags=["Opportunities"])


def _strict_team_size_bounds(ev: dict) -> Optional[tuple[int, int]]:
    min_raw = ev.get("min_team_size") if ev else None
    if min_raw is None and ev:
        min_raw = ev.get("minTeamSize")
    max_raw = ev.get("max_team_size") if ev else None
    if max_raw is None and ev:
        max_raw = ev.get("maxTeamSize")
    if min_raw is None or max_raw is None:
        return None
    try:
        min_team = int(min_raw)
        max_team = int(max_raw)
    except Exception:
        return None
    if min_team < 1 or max_team < min_team:
        return None
    return min_team, max_team

@router.post("/")
async def post_opportunity(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """API to post a new opportunity."""
    try:
        role = str(user.get("role") or "").lower()
        if role not in ("institution", "admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Institution access required")
        if role == "institution":
            institution_id = user.get("institution_id")
            if not institution_id:
                raise HTTPException(status_code=403, detail="Institution profile is not linked")
            data["institution_id"] = institution_id
            data["createdBy"] = institution_id
            status_val = str(data.get("status") or "active").strip().lower()
            if status_val != "draft":
                try:
                    await validate_new_listing_against_plan(
                        str(institution_id),
                        deadline_value=data.get("deadline"),
                        deadline_label="application deadline",
                        start_date_value=data.get("startDate"),
                    )
                except ValueError as ve:
                    raise HTTPException(status_code=400, detail=str(ve))
        return await create_opportunity(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_opportunities(
    type: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None)
):
    """API to list opportunities with optional filters."""
    try:
        filters = {}
        if type: filters["type"] = type
        if institution_id: filters["institution_id"] = institution_id
        return await get_all_opportunities(filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me/applications")
async def my_applications(user: dict = Depends(get_auth_user)):
    """Authenticated learner: all portal applications with titles and status."""
    try:
        return await get_user_applications(user["user_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me/overview")
async def my_overview(user: dict = Depends(get_auth_user), limit: int = 8):
    """Authenticated learner: upcoming deadlines + application timeline widgets."""
    try:
        return await get_learner_opportunity_overview(user["user_id"], limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/notifications")
async def my_notifications(user: dict = Depends(get_auth_user), limit: int = 40):
    """In-app notifications for the current learner (e.g. application review updates)."""
    try:
        cap = max(1, min(int(limit), 100))
        cur = notifications_col.find({"user_id": user["user_id"]}).sort("created_at", -1).limit(cap)
        items = []
        async for doc in cur:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/me/notifications/{notification_id}/read")
async def mark_my_notification_read(notification_id: str, user: dict = Depends(get_auth_user)):
    try:
        await notifications_col.update_one(
            {"_id": ObjectId(notification_id), "user_id": user["user_id"]},
            {"$set": {"is_read": True}},
        )
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification id")


@router.get("/user/{user_id}/applications")
async def list_user_applications(user_id: str, user: dict = Depends(get_auth_user)):
    """List applications for a user (self or admin only)."""
    role = str(user.get("role") or "").lower()
    if user.get("user_id") != user_id and role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        return await get_user_applications(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply")
async def apply(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """API to apply for an opportunity."""
    try:
        data["user_id"] = user["user_id"]
        return await apply_for_opportunity(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{opportunity_id}")
async def view_opportunity(
    opportunity_id: str,
    applicant_user_id: Optional[str] = Query(
        None,
        description="If set, draft listings remain visible when this user has already applied.",
    ),
    include_process_stats: bool = Query(
        False,
        description="Include live participant aggregation stats (slow; off by default).",
    ),
    user: Optional[dict] = Depends(get_auth_user_optional),
):
    """API to view a specific opportunity."""
    try:
        trusted_applicant_user_id = user.get("user_id") if user else None
        opportunity = await get_opportunity_by_id(
            opportunity_id,
            trusted_applicant_user_id,
            include_process_stats=include_process_stats,
        )
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return opportunity
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/{event_id}/quizzes/{quiz_id}")
async def learner_view_quiz(event_id: str, quiz_id: str, user: dict = Depends(get_auth_user)):
    """Learner access to quiz with stage visibility enforcement."""
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from bson.errors import InvalidId
    quiz_query = {"_id": ObjectId(quiz_id), "$or": [{"event_id": resolved_eid}]}
    try:
        quiz_query["$or"].append({"event_id": ObjectId(resolved_eid)})
    except (InvalidId, ValueError):
        pass
    quiz = await quizzes_col.find_one(quiz_query)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    ev = await events_col.find_one({"_id": ObjectId(resolved_eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    participants_query = {"$and": [{"user_id": uid}, {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}]}
    p = await participants_col.find_one(participants_query)
    if not p:
        raise HTTPException(status_code=403, detail="Register/apply first to access this quiz")

    # Visibility lock from stage config
    visibility = "Public"
    stages = ev.get("stages") if isinstance(ev.get("stages"), list) else []
    for s in stages:
        if not isinstance(s, dict):
            continue
        cfg = s.get("config") if isinstance(s.get("config"), dict) else {}
        if str(cfg.get("quiz_id") or "") == str(quiz_id):
            visibility = str(s.get("visibility") or "Public")
            break
    vis = visibility.lower()
    if vis == "private":
        raise HTTPException(status_code=403, detail="This round is private")
    if vis == "shortlisted only":
        st = str(p.get("status") or "").lower()
        if st not in ("shortlisted", "accepted"):
            raise HTTPException(status_code=403, detail="This round is only for shortlisted participants")

    # Enforce unlock rules (depends_on)
    from stage_access_control import check_stage_unlock_rules
    for s in stages:
        if not isinstance(s, dict):
            continue
        cfg = s.get("config") if isinstance(s.get("config"), dict) else {}
        if str(cfg.get("quiz_id") or "") == str(quiz_id):
            await check_stage_unlock_rules(resolved_eid, uid, s)
            break

    # Hide answers
    q_out = []
    for q in (quiz.get("questions") or []):
        if not isinstance(q, dict):
            continue
        clean = dict(q)
        clean.pop("correctOptionIndex", None)
        q_out.append(clean)

    return {
        "_id": str(quiz["_id"]),
        "event_id": str(resolved_eid),
        "title": quiz.get("title"),
        "duration": quiz.get("duration"),
        "pass_mark": quiz.get("pass_mark", 70),
        "questions": q_out,
        "already_submitted": any(
            str(a.get("quiz_id") or "") == str(quiz_id)
            for a in (p.get("quiz_attempts") or [])
        ),
    }


@router.post("/events/{event_id}/quizzes/{quiz_id}/submit")
async def learner_submit_quiz(event_id: str, quiz_id: str, payload: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Learner submits quiz attempt; auto-score single-choice and queue coding for review."""
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from bson.errors import InvalidId
    quiz_query = {"_id": ObjectId(quiz_id), "$or": [{"event_id": resolved_eid}]}
    try:
        quiz_query["$or"].append({"event_id": ObjectId(resolved_eid)})
    except (InvalidId, ValueError):
        pass
    quiz = await quizzes_col.find_one(quiz_query)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    ev = await events_col.find_one({"_id": ObjectId(resolved_eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    participants_query = {"$and": [{"user_id": uid}, {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}]}
    p = await participants_col.find_one(participants_query)
    if not p:
        raise HTTPException(status_code=400, detail="You must register/apply before attempting the assessment")

    # Prevent multiple attempts
    existing_attempts = [a for a in (p.get("quiz_attempts") or []) if str(a.get("quiz_id") or "") == str(quiz_id)]
    if existing_attempts:
        raise HTTPException(status_code=400, detail="You have already submitted this assessment")

    # Enforce unlock rules (depends_on)
    from stage_access_control import check_stage_unlock_rules
    for s in (ev.get("stages") or []):
        if not isinstance(s, dict):
            continue
        cfg = s.get("config") if isinstance(s.get("config"), dict) else {}
        if str(cfg.get("quiz_id") or "") == str(quiz_id):
            await check_stage_unlock_rules(resolved_eid, uid, s)
            break

    answers = payload.get("answers") or []
    if not isinstance(answers, list):
        raise HTTPException(status_code=400, detail="answers must be a list")

    total, correct = 0, 0
    total_marks, earned_marks = 0.0, 0.0
    coding_pending = False
    coding_answers = []
    for i, q in enumerate(quiz.get("questions") or []):
        if not isinstance(q, dict):
            continue
        qtype = str(q.get("type") or "").upper()
        if qtype == "SINGLE_CHOICE":
            total += 1
            q_marks = float(q.get("marks") if q.get("marks") is not None else 1.0)
            total_marks += q_marks
            expected = q.get("correctOptionIndex")
            got = None
            if i < len(answers) and isinstance(answers[i], dict):
                got = answers[i].get("selectedIndex")
            if isinstance(expected, int) and isinstance(got, int) and expected == got:
                correct += 1
                earned_marks += q_marks
        elif qtype == "CODING":
            coding_pending = True
            if i < len(answers) and isinstance(answers[i], dict):
                coding_answers.append({"q_index": i, "code": answers[i].get("code") or "", "language": answers[i].get("language") or q.get("language")})

    if total_marks > 0:
        score = int(round(max(0.0, earned_marks) / total_marks * 100))
    else:
        score = int(round((correct / total) * 100)) if total > 0 else 0
    pass_mark = int(quiz.get("pass_mark") or 70)
    passed = (score >= pass_mark) and (not coding_pending)

    attempt = {
        "quiz_id": str(quiz_id),
        "score": score,
        "pass_mark": pass_mark,
        "passed": passed,
        "correct": correct,
        "total": total,
        "coding_pending_review": coding_pending,
        "coding_answers": coding_answers,
        "submitted_at": datetime.utcnow().isoformat(),
    }
    await participants_col.update_one({"_id": p["_id"]}, {"$push": {"quiz_attempts": attempt}, "$set": {"updated_at": datetime.utcnow()}})

    return {"status": "success", "score": score, "passed": passed, "coding_pending_review": coding_pending}


@router.get("/events/{event_id}/stage-submissions")
async def list_event_stage_submissions(event_id: str, user: dict = Depends(get_auth_user)):
    """
    Admin/Institution: List all stage-specific submissions (PPTs, Files, Links).
    """
    from db import submission_data_col, teams_col, users_col
    from bson import ObjectId
    
    try:
        print(f"DEBUG: Fetching stage submissions for event_id: {event_id}")
        
        # Validate event_id format
        try:
            ObjectId(event_id)
        except Exception as ve:
            print(f"DEBUG: Invalid event_id format: {event_id}")
            raise HTTPException(status_code=400, detail=f"Invalid event_id format: {str(ve)}")
        
        cursor = submission_data_col.find({"event_id": str(event_id)})
        items = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            print(f"DEBUG: Processing submission document: {doc['_id']}")
            
            # Try to attach team name or user name if possible
            if doc.get("team_id"):
                try:
                    team = await teams_col.find_one({"_id": ObjectId(doc["team_id"])})
                    if team: doc["team_name"] = team.get("team_name")
                except Exception as te:
                    print(f"DEBUG: Error fetching team {doc['team_id']}: {str(te)}")
            else:
                user_rec = await users_col.find_one({"user_id": doc["user_id"]})
                if user_rec: doc["user_name"] = user_rec.get("name")
            
            # Include assigned judges if available
            if doc.get("assigned_judges") and isinstance(doc["assigned_judges"], list):
                doc["assigned_judge_emails"] = [j.get("email") for j in doc["assigned_judges"] if j.get("email")]
            
            items.append(doc)
        
        # 2. Merge Hackathon Submissions (Submission-Only)
        from db import hackathon_submissions_col, opportunities_col
        ev_id_variants = [event_id, str(event_id)]
        linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_id_variants}})
        opp_id_ctx = str(linked_opp["_id"]) if linked_opp else None
        
        hackathon_id_variants = [str(v) for v in ev_id_variants]
        if opp_id_ctx:
            hackathon_id_variants.append(opp_id_ctx)

        h_cursor = hackathon_submissions_col.find({"hackathonId": {"$in": hackathon_id_variants}})
        async for h_sub in h_cursor:
            # Check for duplicates by checking the submittedBy/teamName combo or just ID
            if any(str(i.get("_id")) == str(h_sub["_id"]) for i in items):
                continue
                
            h_doc = {
                "_id": str(h_sub["_id"]),
                "event_id": event_id,
                "user_id": h_sub.get("submittedBy") or h_sub.get("user_id"),
                "team_id": None, # Hackathon subs might not have a formal team_id yet
                "team_name": h_sub.get("teamName") or h_sub.get("teamLead") or "Hackathon Team",
                "teamLead": h_sub.get("teamLead"),
                "domain": h_sub.get("domain"),
                "problemStatement": h_sub.get("problemStatement"),
                "solution": h_sub.get("solution"),
                "pptLink": h_sub.get("pptLink"),
                "githubLink": h_sub.get("githubLink"),
                "deployedLink": h_sub.get("deployedLink"),
                "status": h_sub.get("status", "Submitted"),
                "totalScore": h_sub.get("totalScore", 0.0),
                "evaluations": h_sub.get("evaluations", []),
                "submitted_at": h_sub.get("createdAt"),
                "source": "hackathon_submission"
            }
            items.append(h_doc)
            
        print(f"DEBUG: Returning {len(items)} total submissions (including hackathon) for event {event_id}")
        return items
        
    except HTTPException as he:
        print(f"DEBUG: HTTP Exception in stage submissions: {str(he)}")
        raise he
    except Exception as e:
        print(f"DEBUG: Unexpected error in stage submissions: {str(e)}")
        print(f"DEBUG: Error details - Event ID: {event_id}, Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stage submissions: {str(e)}")

@router.post("/events/{event_id}/stages/{stage_id}/upload")
async def learner_upload_stage_file(
    event_id: str, 
    stage_id: str, 
    file: UploadFile = File(...), 
    user: dict = Depends(get_auth_user)
):
    """
    Handle physical file uploads (PPT, PDF, ZIP) for a specific stage.
    """
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from db import submission_data_col
    import os
    import uuid
    import shutil
    
    # 1. Verify participant
    p = await participants_col.find_one({"event_id": str(event_id), "user_id": uid})
    if not p:
        raise HTTPException(status_code=403, detail="Not registered for this event")
        
    # If in a team, ONLY team leader can submit
    if p.get("team_id"):
        from db import teams_col
        from bson import ObjectId
        team = await teams_col.find_one({"_id": ObjectId(p["team_id"])})
        if team:
            leader_id = team.get("team_leader_id") or team.get("leader_id")
            if not leader_id:
                for m in team.get("members", []):
                    if str(m.get("role", "")).upper() == "LEADER":
                        leader_id = m.get("user_id")
                        break
            if str(leader_id) != uid:
                raise HTTPException(status_code=403, detail="Only the team leader can submit files for the team")

    # 2. Basic file validation
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file size (limit to 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is 50MB"
        )
    
    # Check file extension
    allowed_extensions = {'.pdf', '.ppt', '.pptx', '.doc', '.docx', '.zip', '.rar', '.txt', '.jpg', '.jpeg', '.png', '.gif'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} is not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )

    # 3. Deadline check + judge-score lock
    ev = await events_col.find_one({"_id": ObjectId(str(event_id))})
    if ev:
        stages = ev.get("stages") or []
        for s in stages:
            if str(s.get("id")) == stage_id:
                from services.opportunity_service import _safe_dt
                end = _safe_dt(s.get("deadline") or s.get("endDate") or s.get("end_date"))
                if end:
                    end_dt = end.replace(tzinfo=None)
                    if end_dt.hour == 0 and end_dt.minute == 0:
                        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                    if datetime.utcnow() > end_dt:
                        raise HTTPException(status_code=403, detail=f"Submission deadline for {s.get('name')} has passed.")

    # Check for existing submission and allow re-upload if not evaluated and deadline not passed
    from db import submissions_col as _submissions_col, scores_col as _scores_col
    
    submission_query = {"event_id": str(event_id), "stage_id": str(stage_id)}
    if p.get("team_id"):
        submission_query["team_id"] = str(p["team_id"])
    else:
        submission_query["user_id"] = uid
        
    existing_submission = await _submissions_col.find_one(submission_query)
    
    # Check if judge has already evaluated this submission
    score_query = {"event_id": str(event_id), "stage_id": str(stage_id)}
    if p.get("team_id"):
        score_query["team_id"] = str(p["team_id"])
    else:
        score_query["user_id"] = uid
    
    existing_score = await _scores_col.find_one(score_query)
    
    # Allow re-upload logic
    if existing_submission:
        if existing_score:
            # Judge has already evaluated - NO re-upload allowed
            raise HTTPException(
                403,
                detail="Your submission has already been evaluated by a judge and can no longer be modified."
            )
        
        # Check deadline again for existing submission
        ev = await events_col.find_one({"_id": ObjectId(str(event_id))})
        if ev:
            stages = ev.get("stages") or []
            for s in stages:
                if str(s.get("id")) == stage_id:
                    from services.opportunity_service import _safe_dt
                    end = _safe_dt(s.get("deadline") or s.get("endDate") or s.get("end_date"))
                    if end:
                        end_dt = end.replace(tzinfo=None)
                        if end_dt.hour == 0 and end_dt.minute == 0:
                            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                        if datetime.utcnow() > end_dt:
                            # Deadline has passed - NO re-upload allowed
                            raise HTTPException(
                                403, 
                                detail=f"Submission deadline for {s.get('name')} has passed. Re-uploads are not allowed after deadline."
                            )
        
        # If we reach here: No evaluation AND deadline not passed - ALLOW re-upload
        # Delete old submission data to allow clean re-upload
        await _submissions_col.delete_one(submission_query)
        
        # Also delete old file from filesystem if it exists
        try:
            old_file_url = existing_submission.get("data", {}).get("file_url")
            if old_file_url and old_file_url.startswith("/api/files/"):
                old_file_id = old_file_url.split("/")[-1]
                from db import _get_gridfs_bucket
                bucket = _get_gridfs_bucket()
                if bucket:
                    # Get old file metadata to find filesystem path
                    old_gridfs_cursor = bucket.find({"_id": ObjectId(old_file_id)})
                    async for old_doc in old_gridfs_cursor:
                        old_metadata = old_doc.metadata or {}
                        old_file_path = old_metadata.get("file_path")
                        if old_file_path and os.path.exists(old_file_path):
                            os.remove(old_file_path)
                            print(f"Deleted old file: {old_file_path}")
                        break
                    
                    # Delete old GridFS entry
                    await bucket.delete(ObjectId(old_file_id))
        except Exception as e:
            print(f"Warning: Could not delete old file: {str(e)}")
        
        print(f"ALLOWING RE-UPLOAD for user {uid}, stage {stage_id}")

    # ── Store file in filesystem and path in GridFS metadata ──────
    import os
    import logging
    from db import _get_gridfs_bucket

    logger = logging.getLogger(__name__)

    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "events")
    os.makedirs(upload_dir, exist_ok=True)

    unique_filename = f"{stage_id}_{uid}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file to filesystem
    file_bytes = await file.read()
    try:
        logger.info(f"Saving file to filesystem: {file_path}")
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        logger.info(f"File saved successfully: {file_path}")
    except Exception as e:
        logger.error(f"Failed to save file {unique_filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Store only the file path in GridFS metadata (not the file content)
    bucket = _get_gridfs_bucket()
    if bucket is None:
        logger.error("GridFS bucket not available during file upload")
        raise HTTPException(status_code=503, detail="File storage unavailable - database not connected")

    try:
        # Store minimal metadata with file path reference
        metadata_doc = {
            "event_id": str(event_id),
            "stage_id": str(stage_id),
            "user_id": uid,
            "original_filename": file.filename,
            "content_type": file.content_type or "application/octet-stream",
            "file_path": file_path,  # Store the actual file path
            "file_size": len(file_bytes),
            "upload_type": "filesystem_path"  # Flag to indicate path-based storage
        }
        
        # Store empty content with metadata
        grid_id = await bucket.upload_from_stream(
            unique_filename,
            b"",  # Empty content since we store path in metadata
            metadata=metadata_doc
        )
        logger.info(f"File path stored in GridFS with ID: {grid_id}")
    except Exception as e:
        logger.error(f"Failed to store file path metadata {unique_filename}: {str(e)}")
        # Clean up the saved file if GridFS fails
        try:
            os.remove(file_path)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to store file metadata: {str(e)}")

    # Serve URL — routed through /api/opportunities/files/{id} which will read from filesystem
    file_url = f"/api/opportunities/files/{str(grid_id)}"

    # Store in DB
    submission_entry = {
        "event_id": str(event_id),
        "stage_id": str(stage_id),
        "user_id": uid,
        "team_id": p.get("team_id"),
        "data": {"file_url": file_url, "filename": file.filename},
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "Submitted"
    }

    query = {"event_id": str(event_id), "stage_id": str(stage_id)}
    if p.get("team_id"):
        query["team_id"] = p.get("team_id")
    else:
        query["user_id"] = uid

    await submission_data_col.update_one(query, {"$set": submission_entry}, upsert=True)

    # Update participant progress
    await participants_col.update_one(
        {"_id": p["_id"]},
        {"$set": {"last_stage_submitted": stage_id, "updated_at": datetime.utcnow()}}
    )

    return {"status": "success", "file_url": file_url}


@router.get("/files/{file_id}")
async def serve_gridfs_file(file_id: str):
    """Serve file from filesystem using path stored in GridFS metadata."""
    from db import _get_gridfs_bucket
    from bson import ObjectId
    from bson.errors import InvalidId
    from fastapi.responses import FileResponse, StreamingResponse
    import os
    import logging

    logger = logging.getLogger(__name__)

    try:
        oid = ObjectId(file_id)
    except (InvalidId, Exception):
        logger.error(f"Invalid file ID format: {file_id}")
        raise HTTPException(status_code=400, detail="Invalid file id")

    bucket = _get_gridfs_bucket()
    if bucket is None:
        logger.error("GridFS bucket not available - database not connected")
        raise HTTPException(status_code=503, detail="File storage unavailable - database not connected")

    try:
        logger.info(f"Attempting to serve file: {file_id}")
        
        # Get GridFS document to read metadata (contains file path)
        gridfs_cursor = bucket.find({"_id": oid})
        gridfs_doc = None
        async for doc in gridfs_cursor:
            gridfs_doc = doc
            break
        
        if not gridfs_doc:
            logger.error(f"GridFS document not found for ID: {file_id}")
            raise HTTPException(status_code=404, detail="File metadata not found")

        metadata = gridfs_doc.metadata or {}
        file_path = metadata.get("file_path")
        upload_type = metadata.get("upload_type")
        content_type = metadata.get("content_type", "application/octet-stream")
        original_filename = metadata.get("original_filename", gridfs_doc.filename or file_id)

        logger.info(f"File metadata found: path={file_path}, type={upload_type}")

        if upload_type == "filesystem_path" and file_path and os.path.exists(file_path):
            # Serve file from filesystem
            logger.info(f"Serving file from filesystem: {file_path}")
            return FileResponse(
                path=file_path,
                filename=original_filename,
                media_type=content_type,
                headers={
                    "Cache-Control": "private, max-age=3600",
                    "Content-Disposition": f'inline; filename="{original_filename}"'
                }
            )
        else:
            # Fallback: try to stream from GridFS (for backward compatibility)
            logger.info(f"Attempting GridFS fallback for file: {file_id}")
            stream = await bucket.open_download_stream(oid)
            file_info = stream.grid_in
            
            async def _iter():
                while True:
                    chunk = await stream.read(65536)  # 64KB chunks
                    if not chunk:
                        break
                    yield chunk

            return StreamingResponse(
                _iter(), 
                media_type=content_type,
                headers={
                    "Content-Disposition": f'inline; filename="{original_filename}"',
                    "Cache-Control": "private, max-age=3600",
                }
            )

    except Exception as e:
        logger.error(f"Error serving file {file_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")



@router.post("/{opportunity_id}/reviews")
async def add_opportunity_review(
    opportunity_id: str,
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """API for registered participants to add a review."""
    uid = user.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    rating = int(payload.get("rating", 0))
    review_text = payload.get("review_text", "").strip()
    
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    # Check if opportunity exists
    try:
        opp_oid = ObjectId(opportunity_id)
    except:
        opp_oid = opportunity_id
        
    opp = await opportunities_col.find_one({"$or": [{"_id": opp_oid}, {"_id": opportunity_id}]})
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    real_opp_id = str(opp["_id"])
        
    # Optional: ensure user is registered for this opportunity (by checking applications or participants)
    # We will check if they have applied:
    app = await opportunity_applications_col.find_one({
        "opportunity_id": real_opp_id,
        "user_id": uid
    })
    
    # Check if they already reviewed
    existing_review = await opportunity_reviews_col.find_one({
        "opportunity_id": real_opp_id,
        "user_id": uid
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this opportunity")
        
    new_review = {
        "opportunity_id": real_opp_id,
        "user_id": uid,
        "user_name": user.get("name", "Anonymous"),
        "rating": rating,
        "review_text": review_text,
        "created_at": datetime.utcnow()
    }
    await opportunity_reviews_col.insert_one(new_review)
    
    # Update average rating
    pipeline = [
        {"$match": {"opportunity_id": real_opp_id}},
        {"$group": {"_id": "$opportunity_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    aggr = await opportunity_reviews_col.aggregate(pipeline).to_list(1)
    if aggr:
        avg_rating = round(aggr[0]["avg"], 1)
        total_reviews = aggr[0]["count"]
        await opportunities_col.update_one(
            {"_id": ObjectId(real_opp_id)},
            {"$set": {"average_rating": avg_rating, "total_reviews": total_reviews}}
        )
        
    return {"status": "success", "message": "Review submitted successfully"}

@router.get("/{opportunity_id}/reviews")
async def get_opportunity_reviews(opportunity_id: str):
    """Fetch reviews for an opportunity."""
    opp = None
    try:
        opp_oid = ObjectId(opportunity_id)
        opp = await opportunities_col.find_one({"_id": opp_oid})
    except:
        pass
    if not opp:
        opp = await opportunities_col.find_one({"event_link_id": opportunity_id})
    if not opp:
        try:
            opp = await opportunities_col.find_one({"_id": opportunity_id})
        except:
            pass
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    real_opp_id = str(opp["_id"])
    cursor = opportunity_reviews_col.find({"opportunity_id": real_opp_id}).sort("created_at", -1)
    reviews = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        reviews.append(doc)
        
    return {"reviews": reviews, "average_rating": opp.get("average_rating", 0), "total_reviews": opp.get("total_reviews", 0)}

@router.post("/events/{event_id}/stages/{stage_id}/submit")
async def learner_submit_stage_data(
    event_id: str, 
    stage_id: str, 
    payload: dict = Body(...), 
    user: dict = Depends(get_auth_user)
):
    """
    Learner submits stage-specific data (e.g. PPT URL, GitHub Link, or Document).
    Used for SUBMISSION type stages in the hackathon pipeline.
    """
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from db import submission_data_col
    
    # 1. Verify event and participant
    try:
        ev_oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid event id")
        
    ev = await events_col.find_one({"_id": ev_oid})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
        
    p = await participants_col.find_one({"event_id": str(event_id), "user_id": uid})
    if not p:
        raise HTTPException(status_code=403, detail="You must register/apply for this event first")

    # Enforce participation type
    ptype = str(ev.get("participationType") or "").lower().strip()
    if ptype == "individual":
        if p.get("team_id"):
            raise HTTPException(
                status_code=403,
                detail="This event is for individual participation only. You cannot submit as part of a team."
            )
    elif ptype == "team":
        if not p.get("team_id"):
            raise HTTPException(
                status_code=403,
                detail="This event requires team participation. Please form or join a team before submitting."
            )
    # Enforce team size requirement (strictly from event config; no defaults)
    team_bounds = _strict_team_size_bounds(ev)
    if team_bounds is None:
        raise HTTPException(status_code=400, detail="Team size is not configured for this event. Ask the admin to set it before publishing.")
    min_team, max_team = team_bounds
    if p.get("team_id"):
        from db import teams_col as _t_col
        _team = await _t_col.find_one({"_id": ObjectId(p["team_id"])} )
        if _team:
            member_count = len(_team.get("members", []))
            if member_count < min_team:
                raise HTTPException(
                    status_code=403,
                    detail=f"Your team has {member_count} member(s) but needs at least {min_team}."
                )
            if member_count > max_team:
                raise HTTPException(
                    status_code=403,
                    detail=f"Your team has {member_count} member(s) but exceeds the maximum allowed size of {max_team}."
                )

    # If in a team, ONLY team leader can submit
    if p.get("team_id"):
        from db import teams_col
        team = await teams_col.find_one({"_id": ObjectId(p["team_id"])})
        if team:
            leader_id = team.get("team_leader_id") or team.get("leader_id")
            if not leader_id:
                for m in team.get("members", []):
                    if str(m.get("role", "")).upper() == "LEADER":
                        leader_id = m.get("user_id")
                        break


            if str(leader_id) != uid:
                raise HTTPException(status_code=403, detail="Only the team leader can submit data for the team")

    # 2. Verify stage exists
    stages = ev.get("stages") if isinstance(ev.get("stages"), list) else []
    target_stage = None
    for s in stages:
        if str(s.get("id") or "") == stage_id:
            target_stage = s
            break
            
    if not target_stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    from stage_access_control import check_stage_submission_access
    await check_stage_submission_access(
        event_id=str(event_id),
        user_id=uid,
        team_id=str(p.get("team_id") or "") or None,
        stage_type=str(target_stage.get("type") or "").lower(),
        stage=target_stage,
    )
        
    # Check deadline
    from services.opportunity_service import _safe_dt
    end = _safe_dt(target_stage.get("deadline") or target_stage.get("endDate") or target_stage.get("end_date"))
    if end:
        end_dt = end.replace(tzinfo=None)
        if end_dt.hour == 0 and end_dt.minute == 0:
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        if datetime.utcnow() > end_dt:
            raise HTTPException(status_code=403, detail=f"Submission deadline for {target_stage.get('name')} has passed.")
        
    # Check if stage is of type SUBMISSION
    stype = str(target_stage.get("type") or "").upper()
    if stype != "SUBMISSION":
         raise HTTPException(status_code=400, detail=f"Stage type '{stype}' does not accept manual file/link submissions")

    # 3. Validate submission data
    submission_data = payload.get("data") or {}
    if not submission_data:
        raise HTTPException(status_code=400, detail="No submission data provided")
    
    # Validate URLs if present
    for key, value in submission_data.items():
        if key.lower().endswith('_url') or key.lower() == 'url':
            if not isinstance(value, str) or not value.strip():
                raise HTTPException(status_code=400, detail=f"URL field '{key}' cannot be empty")
            # Basic URL validation
            if not (value.startswith('http://') or value.startswith('https://')):
                raise HTTPException(status_code=400, detail=f"Invalid URL format for '{key}'. Must start with http:// or https://")

    # 4. Store the submission data
    submission_entry = {
        "event_id": str(event_id),
        "stage_id": str(stage_id),
        "user_id": uid,
        "team_id": p.get("team_id"),
        "data": submission_data, # contains links, ppt_url, etc.
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "Submitted"
    }
    
    # Update existing or insert new (one submission per user/team per stage)
    query = {"event_id": str(event_id), "stage_id": str(stage_id)}
    if p.get("team_id"):
        query["team_id"] = p.get("team_id")
    else:
        query["user_id"] = uid
        
    await submission_data_col.update_one(
        query,
        {"$set": submission_entry},
        upsert=True
    )
    
    # 4. Update participant record to track progress
    await participants_col.update_one(
        {"_id": p["_id"]},
        {"$set": {"last_stage_submitted": stage_id, "updated_at": datetime.utcnow()}}
    )
    
    # 5. Upsert opportunity_applications record so it appears in "My Applications"
    from db import opportunities_col, opportunity_applications_col
    try:
        opp = await opportunities_col.find_one({"event_link_id": str(event_id)})
        if opp:
            await opportunity_applications_col.update_one(
                {"opportunity_id": str(opp["_id"]), "user_id": uid},
                {"$set": {
                    "user_id": uid,
                    "opportunity_id": str(opp["_id"]),
                    "status": "submitted",
                    "submitted_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow(),
                    "team_id": p.get("team_id"),
                    "stage_id": stage_id,
                }},
                upsert=True
            )
    except Exception as e:
        logger.warning(f"[OPPORTUNITY_APPLICATIONS] Failed to upsert submission record: {e}")
    
    return {"status": "success", "message": "Stage data submitted successfully"}


@router.post("/events/{event_id}/hackathon-submit")
async def hackathon_project_submit(
    event_id: str,
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """
    Submit a hackathon project. Stores lightweight structured data only
    (links, short text) — optimized for MongoDB free tier (512 MB).
    Automatically appears in institution submissions panel.
    """
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    def count_words(text: str) -> int:
        """Count words in a text string."""
        return len(text.strip().split()) if text and text.strip() else 0

    # Validate word counts
    problem = payload.get("problem_statement", "").strip()
    solution = payload.get("solution", "").strip()
    domain = payload.get("domain", "").strip()

    if count_words(problem) > 50:
        raise HTTPException(status_code=400, detail="Problem statement must be 50 words or fewer")
    if count_words(solution) > 80:
        raise HTTPException(status_code=400, detail="Solution must be 80 words or fewer")
    if count_words(domain) > 3:
        raise HTTPException(status_code=400, detail="Domain must be 2-3 words")

    ppt_link = payload.get("ppt_link", "").strip()
    if ppt_link and not (ppt_link.startswith("http://") or ppt_link.startswith("https://")):
        raise HTTPException(status_code=400, detail="PPT link must be a valid URL")

    # Check participant
    p = await participants_col.find_one({"event_id": str(event_id), "user_id": uid})
    if not p:
        raise HTTPException(status_code=403, detail="You must be registered for this event")

    # Enforce team size requirement
    ev = await events_col.find_one({"_id": ObjectId(str(event_id))})
    if ev:
        # Enforce participation type
        ptype = str(ev.get("participationType") or "").lower().strip()
        if ptype == "individual" and p.get("team_id"):
            raise HTTPException(
                status_code=403,
                detail="This event is for individual participation only. You cannot submit as part of a team."
            )
        if ptype == "team" and not p.get("team_id"):
            raise HTTPException(
                status_code=403,
                detail="This event requires team participation. Please form or join a team before submitting."
            )
        team_bounds = _strict_team_size_bounds(ev)
        if team_bounds is None:
            raise HTTPException(status_code=400, detail="Team size is not configured for this event. Ask the admin to set it before publishing.")
        min_team, max_team = team_bounds
        if not p.get("team_id"):
            raise HTTPException(
                status_code=403,
                detail=f"This event requires a team of at least {min_team} members. Please form or join a team first."
            )
        from db import teams_col as _teams_col
        team = await _teams_col.find_one({"_id": ObjectId(p["team_id"])} )
        if team:
            member_count = len(team.get("members", []))
            if member_count < min_team:
                raise HTTPException(
                    status_code=403,
                    detail=f"Your team has {member_count} member(s) but this event requires at least {min_team}. Invite more members before submitting."
                )
            if member_count > max_team:
                raise HTTPException(
                    status_code=403,
                    detail=f"Your team has {member_count} member(s) but this event allows at most {max_team}."
                )

    # Build submission doc — lightweight, links only
    from db import submissions_col
    submission_doc = {} # Initialize to avoid UnboundLocalError
    try:
        submission_doc = {
            "event_id": str(event_id),
            "opportunity_id": payload.get("opportunity_id"),
            "user_id": uid,
            "team_id": str(p.get("team_id")) if p.get("team_id") else None,
            "team_name": payload.get("team_name", ""),
            "team_members": payload.get("team_members", ""),
            "problem_statement": problem,
            "solution": solution,
            "domain": domain,
            "ppt_link": ppt_link,
            "deployed_link": payload.get("deployed_link", "").strip(),
            "submitted_at": datetime.utcnow(),
            "evaluation_status": "Pending Evaluation",
            "assigned_judge_id": None,
            "total_score": None,
        }
    except Exception as e:
        logger.error(f"Error building submission doc: {e}")
        raise HTTPException(status_code=500, detail="Error preparing submission document")

    # Upsert — one submission per user/team per event
    query = {"event_id": str(event_id)}
    if p.get("team_id"):
        query["team_id"] = str(p["team_id"])
    else:
        query["user_id"] = uid

    try:
        result = await submissions_col.update_one(query, {"$set": submission_doc}, upsert=True)
        if getattr(result, "upserted_id", None):
            submission_doc["_id"] = str(result.upserted_id)
        else:
            existing = await submissions_col.find_one(query, {"_id": 1})
            submission_doc["_id"] = str(existing["_id"]) if existing else "updated"
    except Exception as e:
        logger.error(f"Error upserting submission: {e}")
        raise HTTPException(status_code=500, detail="Database error during submission")

    # Also update participant progress
    await participants_col.update_one(
        {"_id": p["_id"]},
        {"$set": {"submission_status": "Submitted", "updated_at": datetime.utcnow()}}
    )

    return {"status": "success", "message": "Project submitted successfully", "data": submission_doc}


def _stage_unlock_email_html(participant_name: str, event_title: str, org_name: str, stage_name: str, unlock_time: str, stage_link: str) -> str:
    from html import escape
    pn = escape(participant_name)
    et = escape(event_title)
    on = escape(org_name)
    sn = escape(stage_name)
    ut = escape(unlock_time)
    sl = escape(stage_link)
    return f"""<html><body style="font-family: 'Poppins', sans-serif'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
<div style="background:linear-gradient(135deg,#6C3BFF,#8B5CF6);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
<div style="font-size:40px;margin-bottom:8px;">🎉</div>
<h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">Congratulations!</h1>
<p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">You have successfully qualified for the next stage</p>
</div>
<div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px 24px;">
<p style="font-size:15px;color:#0f172a;margin:0 0 16px;">Hi <strong>{pn}</strong>,</p>
<p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">You have successfully qualified for the next stage of <strong>{et}</strong> hosted by <strong>{on}</strong>.</p>
<div style="background:#f1f5f9;border-radius:12px;padding:16px;margin-bottom:20px;">
<table style="width:100%;font-size:13px;">
<tr><td style="color:#64748b;padding:4px 0;">Stage</td><td style="font-weight:600;padding:4px 0;">{sn}</td></tr>
<tr><td style="color:#64748b;padding:4px 0;">Unlock Time</td><td style="font-weight:600;padding:4px 0;">{ut}</td></tr>
</table>
</div>
<a href="{sl}" style="display:inline-block;background:#6C3BFF;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">Access Your Stage</a>
<p style="font-size:12px;color:#94a3b8;margin-top:24px;">Best of luck for the next round.</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;">
<p style="font-size:12px;color:#94a3b8;margin:0;">Regards,<br>Team Studlyf<br>On behalf of {on}</p>
</div>
</div></body></html>"""


