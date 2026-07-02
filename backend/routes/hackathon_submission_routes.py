from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from db import hackathon_submissions_col, events_col, users_col, judges_col, participants_col, teams_col
from domain_models import HackathonSubmission
from routes.auth import get_current_user
from stage_access_control import check_stage_submission_access, check_stage_deadline

router = APIRouter(prefix="/api/hackathons", tags=["Hackathon Submissions"])

from utils.db_helpers import fix_id

@router.post("/submissions")
async def create_hackathon_submission(submission: HackathonSubmission, current_user: dict = Depends(get_current_user)):
    """Create a new hackathon submission and auto-register participant/team.
    
    STAGE ACCESS CONTROL:
    - Stage type is derived dynamically from the event's current active stage
    - Registration stages skip the shortlist check (new registrations welcome)
    - Submission/final stages require shortlisted status
    - Submission must be within stage time window
    """
    try:
        user_id = current_user.get("user_id")
        
        # 0. Resolve target Event ID first
        target_event_id = submission.eventId or submission.hackathonId
        try:
            from db import opportunities_col
            lookup_id = submission.eventId or submission.hackathonId
            opp = await opportunities_col.find_one({"_id": ObjectId(lookup_id)})
            if opp and opp.get("event_link_id"):
                target_event_id = str(opp["event_link_id"])
        except:
            pass
        
        # Derive current stage type from event stages
        current_stage_type = None
        current_stage_name = ""
        try:
            ev = await events_col.find_one({"_id": ObjectId(target_event_id)})
            if not ev:
                ev = await opportunities_col.find_one({"_id": ObjectId(target_event_id)})
            if ev and isinstance(ev.get("stages"), list):
                now = datetime.now(timezone.utc)
                for stage in ev["stages"]:
                    start = stage.get("start_date") or stage.get("startDate")
                    end = stage.get("end_date") or stage.get("endDate") or stage.get("deadline")
                    if isinstance(start, str):
                        try:
                            start = datetime.fromisoformat(start.replace("Z", "+00:00"))
                        except:
                            start = None
                    if isinstance(end, str):
                        try:
                            end = datetime.fromisoformat(end.replace("Z", "+00:00"))
                        except:
                            end = None
                    if isinstance(start, datetime) and start.tzinfo is None:
                        start = start.replace(tzinfo=timezone.utc)
                    if isinstance(end, datetime) and end.tzinfo is None:
                        end = end.replace(tzinfo=timezone.utc)
                    if start and end and start <= now <= end:
                        current_stage_type = stage.get("type")
                        current_stage_name = stage.get("name", "")
                        break
                else:
                    # No active stage — use first stage type
                    if ev["stages"]:
                        current_stage_type = ev["stages"][0].get("type")
                        current_stage_name = ev["stages"][0].get("name", "")
        except:
            pass

        # Access control: skip participant existence check for registration stages
        stage_type_lower = (current_stage_type or "").lower()
        if stage_type_lower != "registration":
            await check_stage_submission_access(
                event_id=target_event_id,
                user_id=user_id,
                stage_type=current_stage_type or "SUBMISSION"
            )

        # Check stage deadline
        stage_name_for_deadline = current_stage_name or current_stage_type or "current stage"
        await check_stage_deadline(
            event_id=target_event_id,
            stage_name=stage_name_for_deadline
        )
        
        # 1. Check if submission already exists for this team/user
        dup_query = {"hackathonId": submission.eventId or submission.hackathonId}
        if submission.teamType == "Team":
            dup_query["teamName"] = submission.teamName
        else:
            dup_query["submittedBy"] = user_id
            dup_query["teamType"] = "Solo"
            
        existing = await hackathon_submissions_col.find_one(dup_query)
        if existing:
            raise HTTPException(status_code=400, detail="Team/User has already submitted for this hackathon")

        submission_dict = submission.dict(exclude={"id", "submissionId"})
        submission_dict["submittedBy"] = user_id
        submission_dict["hackathonId"] = target_event_id
        submission_dict["eventId"] = target_event_id
        submission_dict["createdAt"] = datetime.utcnow()
        submission_dict["updatedAt"] = datetime.utcnow()
        submission_dict["status"] = "Pending"
        submission_dict["totalScore"] = 0.0

        # 1. Ensure Participant Record exists (for the institution dashboard)
        participant_data = {
            "user_id": user_id,
            "event_id": target_event_id,
            "institution_id": submission.institutionId,
            "registration_status": "Registered",
            "updated_at": datetime.utcnow()
        }
        
        # Try to hydrate from user profile if possible
        user_profile = await users_col.find_one({"user_id": user_id})
        if user_profile:
            participant_data["college_name"] = user_profile.get("college_name") or user_profile.get("institution_name")
            participant_data["department"] = user_profile.get("department")
            participant_data["year"] = user_profile.get("year")

        await participants_col.update_one(
            {"user_id": user_id, "event_id": target_event_id},
            {"$set": participant_data, "$setOnInsert": {"registered_at": datetime.utcnow(), "created_at": datetime.utcnow()}},
            upsert=True
        )

        # 2. Handle Team Record (if applicable)
        if submission.teamType == "Team" or submission.teamName:
            team_name = submission.teamName or f"Team {submission.teamLead}"
            team_data = {
                "event_id": target_event_id,
                "team_name": team_name,
                "team_leader_id": user_id,
                "status": "Approved",
                "updated_at": datetime.utcnow()
            }
            
            # Map members
            members = [{"user_id": user_id, "name": submission.teamLead, "role": "Lead"}]
            for m_name in (submission.teamMembers or []):
                members.append({"name": m_name, "role": "Member"})
            team_data["members"] = members

            await teams_col.update_one(
                {"team_name": team_name, "event_id": submission.hackathonId},
                {"$set": team_data, "$setOnInsert": {"formed_at": datetime.utcnow(), "created_at": datetime.utcnow()}},
                upsert=True
            )
            
            # Link participant to team
            team_doc = await teams_col.find_one({"team_name": team_name, "event_id": target_event_id})
            if team_doc:
                await participants_col.update_one(
                    {"user_id": user_id, "event_id": target_event_id},
                    {"$set": {"team_id": str(team_doc["_id"])}}
                )

        # ML Plagiarism Detection
        try:
            from services.ml_service import ml_service
            
            # Fetch existing submissions for this event to compare
            existing_cursor = hackathon_submissions_col.find(
                {"$or": [{"eventId": target_event_id}, {"hackathonId": target_event_id}]},
                {"solution": 1, "problemStatement": 1, "_id": 1}
            )
            existing_subs = await existing_cursor.to_list(length=1000)
            
            # Prepare data format for ML service
            previous_submissions = [
                {"_id": str(sub["_id"]), "code": f"{sub.get('problemStatement', '')} {sub.get('solution', '')}"}
                for sub in existing_subs
            ]
            
            new_code = f"{submission.problemStatement} {submission.solution}"
            
            is_plagiarized, sim_score, matched_id = await ml_service.detect_plagiarism(new_code, previous_submissions)
            
            submission_dict["plagiarism_flag"] = is_plagiarized
            submission_dict["plagiarism_score"] = float(sim_score)
            if is_plagiarized:
                submission_dict["matched_submission_id"] = matched_id
                
        except Exception as ml_err:
            print(f"ML Plagiarism Check Failed: {ml_err}")

        # 3. Insert the actual submission
        result = await hackathon_submissions_col.insert_one(submission_dict)
        submission_dict["_id"] = str(result.inserted_id)
        
        return fix_id(submission_dict)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Submission Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}/submissions")
async def get_event_submissions(
    event_id: str, 
    domain: Optional[str] = None, 
    status: Optional[str] = None, 
    judge_id: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "latest"
):
    """List all submissions for an event with filters."""
    from bson import ObjectId
    from db import opportunities_col
    
    # Robust variants for the event ID
    ev_variants = [event_id, str(event_id)]
    try:
        if len(str(event_id)) == 24:
            ev_variants.append(ObjectId(event_id))
    except:
        pass
    
    # Submissions might be linked to the event ID or the opportunity ID
    linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_variants}})
    
    hack_ids = list(ev_variants)
    if linked_opp:
        opp_id_str = str(linked_opp["_id"])
        hack_ids.append(opp_id_str)
        try:
            hack_ids.append(ObjectId(opp_id_str))
        except:
            pass
            
    # FIX: Query by hackathonId OR eventId to be more inclusive
    query = {
        "$or": [
            {"hackathonId": {"$in": hack_ids}},
            {"eventId": {"$in": hack_ids}}
        ]
    }
    
    if domain: query["domain"] = domain
    if status: query["status"] = status
    if judge_id: query["assignedJudgeId"] = judge_id
    if search:
        query["$or"] = [
            {"teamName": {"$regex": search, "$options": "i"}},
            {"teamLead": {"$regex": search, "$options": "i"}}
        ]
        
    cursor = hackathon_submissions_col.find(query)
    
    if sort == "highest_score":
        cursor = cursor.sort("totalScore", -1)
    elif sort == "lowest_score":
        cursor = cursor.sort("totalScore", 1)
    else:
        cursor = cursor.sort("createdAt", -1)
        
    submissions = await cursor.to_list(length=1000)
    return [fix_id(s) for s in submissions]

@router.get("/institution/{institution_id}/submissions")
async def get_institution_hackathon_submissions(institution_id: str):
    """List all hackathon submissions for an institution."""
    from bson import ObjectId
    from db import events_col, opportunities_col

    inst_variants = [institution_id, str(institution_id)]
    try:
        if len(str(institution_id)) == 24:
            inst_variants.append(ObjectId(institution_id))
    except:
        pass

    events = await events_col.find({"institution_id": {"$in": inst_variants}}).to_list(length=1000)
    opps = await opportunities_col.find({
        "$or": [
            {"institution_id": {"$in": inst_variants}},
            {"createdBy": {"$in": inst_variants}}
        ]
    }).to_list(length=1000)

    event_ids = [str(e["_id"]) for e in events]
    event_ids.extend([str(o["_id"]) for o in opps])
    try:
        event_ids.extend([ObjectId(e["_id"]) for e in events if len(str(e["_id"])) == 24])
        event_ids.extend([ObjectId(o["_id"]) for o in opps if len(str(o["_id"])) == 24])
    except:
        pass

    query = {
        "$or": [
            {"institutionId": institution_id},
            {"hackathonId": {"$in": event_ids}},
            {"eventId": {"$in": event_ids}}
        ]
    }

    cursor = hackathon_submissions_col.find(query).sort("createdAt", -1)
    submissions = await cursor.to_list(length=1000)
    return [fix_id(s) for s in submissions]

@router.get("/submissions/{submission_id}")
async def get_submission(submission_id: str):
    """Get a specific submission by ID."""
    submission = await hackathon_submissions_col.find_one({"_id": ObjectId(submission_id)})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return fix_id(submission)

@router.patch("/submissions/assign-judge")
async def assign_judge(data: dict = Body(...)):
    """Assign a judge to multiple submissions."""
    submission_ids = data.get("submission_ids", [])
    judge_id = data.get("judge_id")
    
    if not submission_ids or not judge_id:
        raise HTTPException(status_code=400, detail="Missing submission_ids or judge_id")
    
    try:
        object_ids = [ObjectId(sid) for sid in submission_ids]
        await hackathon_submissions_col.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": {"assignedJudgeId": judge_id, "status": "Assigned", "updatedAt": datetime.utcnow()}}
        )
        return {"status": "success", "message": f"Assigned judge to {len(submission_ids)} submissions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/submissions/{submission_id}/evaluate")
async def evaluate_submission(submission_id: str, data: dict = Body(...)):
    """Evaluate a submission with rubric scores."""
    from db import scores_col, submission_data_col, submissions_col
    from stage_access_control import auto_advance_participant_on_score
    import asyncio
    from services.leaderboard_service import leaderboard_service

    rubric_scores = data.get("rubricScores", {})
    feedback = data.get("feedback", "")
    
    # Calculate total score
    total_score = sum(rubric_scores.values()) if rubric_scores else 0.0
    now = datetime.utcnow()
    
    try:
        # 1. Update hackathon_submissions_col
        await hackathon_submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "rubricScores": rubric_scores,
                    "totalScore": total_score,
                    "feedback": feedback,
                    "status": "Evaluated",
                    "updatedAt": now,
                }
            }
        )

        # 2. Update scores_col
        judge_id = data.get("judgeId") or ""
        upsert_filter = {"submission_id": submission_id}
        if judge_id:
            upsert_filter["judge_id"] = judge_id
        await scores_col.update_one(
            upsert_filter,
            {"$set": {
                "submission_id": submission_id,
                "judge_id": judge_id,
                "total_score": total_score,
                "criteria_scores": rubric_scores,
                "scores": rubric_scores,
                "feedback": feedback,
                "comments": feedback,
                "evaluated_at": now,
                "updated_at": now,
            }, "$setOnInsert": {"created_at": now}},
            upsert=True
        )

        # 3. Update submission_data_col
        try:
            await submission_data_col.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {
                    "status": "Scored",
                    "total_score": total_score,
                    "evaluation_score": total_score,
                    "last_evaluated_at": now,
                }},
            )
        except Exception:
            pass

        # 4. Update legacy submissions_col
        try:
            await submissions_col.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {
                    "status": "Reviewed",
                    "total_score": total_score,
                    "evaluation_score": total_score,
                }},
            )
        except Exception:
            pass

        # 5. Auto-advance participant if shortlisted
        try:
            sub_doc = await hackathon_submissions_col.find_one(
                {"_id": ObjectId(submission_id)},
                {"eventId": 1}
            )
            event_id = (sub_doc or {}).get("eventId") or ""
            if event_id:
                await auto_advance_participant_on_score(event_id, submission_id, total_score)
        except Exception:
            pass

        # 6. Refresh leaderboard in background
        async def _refresh_lb():
            try:
                await leaderboard_service.calculate_event_leaderboard(str(event_id))
            except Exception:
                pass
        asyncio.create_task(_refresh_lb())

        return {"status": "success", "totalScore": total_score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}/leaderboard")
async def get_hackathon_leaderboard(event_id: str, include_all: bool = Query(False)):
    """Get the leaderboard for a hackathon (ranked by totalScore).

    - Supports event_id that may be either the event _id or a linked opportunity _id.
    - `include_all=true` will include non-evaluated submissions (score may be 0).
    """
    from bson import ObjectId
    from db import opportunities_col

    ev_variants = [event_id, str(event_id)]
    try:
        if len(str(event_id)) == 24:
            ev_variants.append(ObjectId(event_id))
    except:
        pass

    linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_variants}})

    hack_ids = list(ev_variants)
    if linked_opp:
        opp_id_str = str(linked_opp["_id"])
        hack_ids.append(opp_id_str)
        try:
            hack_ids.append(ObjectId(opp_id_str))
        except:
            pass

    query = {"hackathonId": {"$in": hack_ids}}
    if not include_all:
        query["status"] = "Evaluated"

    cursor = hackathon_submissions_col.find(query).sort(
        [("totalScore", -1), ("updatedAt", -1), ("createdAt", -1)]
    )

    submissions = await cursor.to_list(length=1000)
    leaderboard = []
    for i, s in enumerate(submissions):
        entry = fix_id(s)
        entry["rank"] = i + 1
        leaderboard.append(entry)

    return leaderboard

@router.get("/events/{event_id}/stats")
async def get_hackathon_stats(event_id: str):
    """Get live counters for the event page."""
    from bson import ObjectId
    from db import opportunities_col
    
    # Use same robust variant matching as get_event_submissions
    ev_variants = [event_id, str(event_id)]
    try:
        if len(str(event_id)) == 24:
            ev_variants.append(ObjectId(event_id))
    except:
        pass
    
    linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_variants}})
    hack_ids = list(ev_variants)
    if linked_opp:
        opp_id_str = str(linked_opp["_id"])
        hack_ids.append(opp_id_str)
        try:
            hack_ids.append(ObjectId(opp_id_str))
        except:
            pass
    
    submissions = await hackathon_submissions_col.find({"hackathonId": {"$in": hack_ids}}).to_list(length=1000)
    
    unique_users = set()
    for s in submissions:
        unique_users.add(s.get("submittedBy"))
        # Add team members if they are user IDs (assuming comma separated names for now as per UI, but let's see)
        # If teamMembers are names, we count them as unique entities? 
        # The user said "Participants: total unique users". 
        # Usually this means registered users.
        
    teams_count = len(submissions)
    submissions_count = len(submissions)
    
    # Wait, "Participants" logic:
    # If solo, 1. If team, count lead + members.
    total_participants = 0
    for s in submissions:
        if s.get("teamType") == "Solo":
            total_participants += 1
        else:
            # members are comma separated names
            members_str = s.get("teamMembers", "")
            if isinstance(members_str, list):
                total_participants += 1 + len(members_str)
            elif isinstance(members_str, str) and members_str.strip():
                total_participants += 1 + len([m for m in members_str.split(",") if m.strip()])
            else:
                total_participants += 1
                
    return {
        "participants": total_participants,
        "teams": teams_count,
        "submissions": submissions_count
    }

@router.get("/my-submission/{event_id}")
async def get_my_hackathon_submission(event_id: str, current_user: dict = Depends(get_current_user)):
    """Check if the current user or their team has already submitted for this hackathon."""
    user_id = current_user.get("user_id")
    
    # 1. Handle variants of the event ID
    ev_variants = [event_id]
    try:
        from bson import ObjectId
        if len(str(event_id)) == 24:
            ev_variants.append(ObjectId(event_id))
    except:
        pass
    
    # 2. Find any team this user belongs to for this event
    user_team = await teams_col.find_one({
        "event_id": {"$in": ev_variants},
        "members": user_id
    })
    
    # 3. Check for submission by user OR user's team
    query = {"hackathonId": {"$in": ev_variants}}
    conditions = [{"submittedBy": user_id}]
    if user_team:
        conditions.append({"teamName": user_team["team_name"]})
    
    query["$or"] = conditions
        
    submission = await hackathon_submissions_col.find_one(query)
    
    if not submission:
        return {"hasSubmitted": False}
    
    return {"hasSubmitted": True, "submission": fix_id(submission)}

@router.post("/submissions/bulk-notify-judges")
async def bulk_notify_judges(
    submission_ids: List[str] = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Send bulk notifications to judges assigned to the provided submissions.
    """
    if current_user.get("role") not in ["super_admin", "institution"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        from services.email_queue_service import enqueue_email
    except ImportError:
        enqueue_email = None

    if not enqueue_email:
        raise HTTPException(status_code=500, detail="Email service unavailable")

    try:
        from bson import ObjectId
        obj_ids = [ObjectId(sid) for sid in submission_ids if ObjectId.is_valid(sid)]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission IDs")

    cursor = hackathon_submissions_col.find({"_id": {"$in": obj_ids}})
    
    judge_emails = set()
    async for sub in cursor:
        assigned = sub.get("assigned_judge_emails", [])
        if isinstance(assigned, list):
            for e in assigned:
                if e:
                    judge_emails.add(str(e).strip().lower())
                    
    if not judge_emails:
        return {"status": "success", "message": "No judges assigned to the selected submissions."}
        
    for email in judge_emails:
        subject = "New Submissions to Evaluate"
        body = "Hello,\n\nYou have new submissions waiting for your evaluation. Please log in to your dashboard to review them.\n\nBest,\nStudLyf Team"
        await enqueue_email(
            recipient=email,
            subject=subject,
            body=body,
            priority=10
        )
        
    return {"status": "success", "message": f"Successfully queued notifications to {len(judge_emails)} judges."}
