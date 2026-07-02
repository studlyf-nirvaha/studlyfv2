from fastapi import APIRouter, HTTPException, Body, Depends, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import secrets
from db import (
    rubrics_col, 
    submissions_col, 
    submission_scores_col, 
    opportunities_col, 
    events_col, 
    participants_col,
    users_col,
    scores_col,
    leaderboard_col,
    certificates_col,
    judges_col
)
from auth_institution import get_auth_user

router = APIRouter(prefix="/api/judging", tags=["Hackathon Judging"])


def _normalize_submission_status(doc: dict) -> dict:
    status = str(doc.get("status") or "").strip().lower()
    evaluation_status = str(doc.get("evaluation_status") or "").strip().lower()
    if status == "evaluated" or evaluation_status == "evaluated":
        doc["status"] = "Pending Review"
    return doc

# --- Judges Management ---

@router.post("/judges")
async def add_judge(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Add a judge for the institution."""
    inst_id = str(user.get("institution_id") or user.get("user_id"))
    judge_doc = {
        "institution_id": inst_id,
        "name": data.get("name"),
        "domain": data.get("domain"),
        "created_at": datetime.utcnow()
    }
    result = await judges_col.insert_one(judge_doc)
    judge_doc["_id"] = str(result.inserted_id)
    return judge_doc

@router.get("/judges")
async def list_judges(user: dict = Depends(get_auth_user)):
    """List all judges for the institution."""
    inst_id = str(user.get("institution_id") or user.get("user_id"))
    cursor = judges_col.find({"institution_id": inst_id})
    judges = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        judges.append(doc)
    return judges

@router.delete("/judges/{judge_id}")
async def delete_judge(judge_id: str, user: dict = Depends(get_auth_user)):
    """Remove a judge."""
    inst_id = str(user.get("institution_id") or user.get("user_id"))
    await judges_col.delete_one({"_id": ObjectId(judge_id), "institution_id": inst_id})
    return {"status": "success"}

# --- Rubrics ---

@router.post("/rubrics")
async def create_rubric(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Create a new scoring rubric. Restricted to Institution."""
    # Rubrics are only for institutions/judges
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    data["created_at"] = datetime.utcnow()
    if data.get("opportunity_id") and not data.get("event_id"):
        opp = await opportunities_col.find_one({"_id": ObjectId(data["opportunity_id"])})
        if opp and opp.get("event_link_id"):
            data["event_id"] = opp["event_link_id"]
            
    result = await rubrics_col.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return data

@router.get("/rubrics/{opportunity_id}")
async def get_rubrics(opportunity_id: str, user: dict = Depends(get_auth_user)):
    """Get all rubrics. Restricted to Institution/Judge."""
    # Ensure role is not student
    role = user.get("role")
    if role == "student":
        raise HTTPException(status_code=403, detail="Students cannot access scoring rubrics")

    cursor = rubrics_col.find({"opportunity_id": opportunity_id})
    rubrics = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        rubrics.append(doc)
        
    if not rubrics:
        try:
            opp = await opportunities_col.find_one({"_id": ObjectId(opportunity_id)})
            if opp and opp.get("event_link_id"):
                cursor = rubrics_col.find({"event_id": opp["event_link_id"]})
                async for doc in cursor:
                    doc["_id"] = str(doc["_id"])
                    rubrics.append(doc)
        except:
            pass
            
    return rubrics

@router.post("/rubrics/sync")
async def sync_rubrics(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Sync rubrics from event configuration to rubrics collection."""
    event_id = data.get("event_id")
    opportunity_id = data.get("opportunity_id")
    rubrics_data = data.get("rubrics", [])
    
    if not event_id and not opportunity_id:
        raise HTTPException(status_code=400, detail="Missing event_id or opportunity_id")
        
    # We'll use opportunity_id as the primary key for rubrics if available
    # otherwise event_id
    query_key = "opportunity_id" if opportunity_id else "event_id"
    query_val = opportunity_id if opportunity_id else event_id
    
    # Clear existing rubrics for this scope to perform a fresh sync
    await rubrics_col.delete_many({query_key: query_val})
    
    synced_count = 0
    for r in rubrics_data:
        rubric_doc = {
            "title": r.get("title"),
            "description": r.get("description"),
            "max_points": r.get("max_points", 10),
            "event_id": event_id,
            "opportunity_id": opportunity_id,
            "created_at": datetime.utcnow()
        }
        # If the frontend provided an ID (from a previous sync or random gen), we try to preserve it
        # but Mongo prefers its own ObjectId usually for rubrics_col if we want to link scores.
        # Actually, let's just insert new ones and the judging panel will fetch the latest.
        await rubrics_col.insert_one(rubric_doc)
        synced_count += 1
        
    return {"status": "success", "synced": synced_count}

# --- Submissions & Bulk Assignment ---

@router.post("/bulk-assign")
async def bulk_assign_judge(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Assign a judge to multiple submissions at once."""
    submission_ids = data.get("submission_ids", [])
    judge_id = data.get("judge_id")
    
    if not submission_ids or not judge_id:
        raise HTTPException(status_code=400, detail="Missing submission_ids or judge_id")
        
    judge = await judges_col.find_one({"_id": ObjectId(judge_id)})
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
        
    # Update status to 'Assigned' and link judge
    obj_ids = [ObjectId(sid) for sid in submission_ids]
    await submissions_col.update_many(
        {"_id": {"$in": obj_ids}},
        {"$set": {
            "assigned_judge_id": judge_id,
            "assigned_judge_name": judge.get("name"),
            "evaluation_status": "Assigned"
        }}
    )
    return {"status": "success", "count": len(submission_ids)}

@router.get("/submissions/{opportunity_id}")
async def list_submissions(opportunity_id: str, user: dict = Depends(get_auth_user)):
    """List submissions with judge and status info."""
    event_id = None
    try:
        opp = await opportunities_col.find_one({"_id": ObjectId(opportunity_id)})
        if opp:
            event_id = opp.get("event_link_id")
    except:
        pass
        
    query = {"$or": [{"opportunity_id": opportunity_id}]}
    if event_id:
        query["$or"].append({"event_id": event_id})
        
    cursor = submissions_col.find(query).sort("submitted_at", -1)
    submissions = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Student info
        if doc.get("user_id"):
            u = await users_col.find_one({"user_id": doc["user_id"]})
            if u:
                doc["student_name"] = u.get("name")
        _normalize_submission_status(doc)
        submissions.append(doc)
    return submissions

# --- Judge Evaluation Panel ---

@router.get("/judge/assigned/{judge_id}")
async def get_assigned_submissions(judge_id: str):
    """Fetch submissions assigned to a specific judge."""
    cursor = submissions_col.find({"assigned_judge_id": judge_id})
    submissions = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        _normalize_submission_status(doc)
        submissions.append(doc)
    return submissions

@router.post("/evaluate")
async def evaluate_submission(data: dict = Body(...)):
    """Submit evaluation scores (0-10 per rubric)."""
    submission_id = data.get("submission_id")
    scores = data.get("scores") # List of {rubric_id, score}
    judge_id = data.get("judge_id")
    feedback = data.get("feedback")
    
    if not submission_id or not scores:
        raise HTTPException(status_code=400, detail="Missing submission_id or scores")
        
    # Calculate total score
    total_score = sum(float(s.get("score", 0)) for s in scores)
    
    # Save scores
    await submission_scores_col.delete_many({"submission_id": submission_id}) # Clear old if any
    for s in scores:
        score_doc = {
            "submission_id": submission_id,
            "rubric_id": s.get("rubric_id"),
            "judge_id": judge_id,
            "score": float(s.get("score", 0)),
            "created_at": datetime.utcnow()
        }
        await submission_scores_col.insert_one(score_doc)
        
    # Update submission — try submission_data_col first, then legacy submissions_col
    from db import submission_data_col
    sd_updated = False
    try:
        sd_res = await submission_data_col.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {
                "total_score": total_score,
                "evaluation_score": total_score,
                "evaluation_status": "completed",
                "status": "Scored",
            }}
        )
        sd_updated = sd_res.matched_count > 0
    except Exception:
        pass

    if not sd_updated:
        await submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {
                "evaluation_status": "Evaluated",
                "status": "Pending Review",
                "total_score": total_score,
                "evaluator_feedback": feedback,
                "evaluated_at": datetime.utcnow()
            }}
        )

    # Auto-advance participant if score meets shortlist threshold
    from stage_access_control import auto_advance_participant_on_score
    # Resolve event_id from the submission
    sub_doc_ev = await submission_data_col.find_one(
        {"_id": ObjectId(submission_id)},
        {"event_id": 1}
    )
    if not sub_doc_ev:
        sub_doc_ev = await submissions_col.find_one(
            {"_id": ObjectId(submission_id)},
            {"event_id": 1}
        )
    if sub_doc_ev:
        await auto_advance_participant_on_score(
            str(sub_doc_ev.get("event_id", "")),
            submission_id,
            float(total_score),
        )
        
    # Broadcast to WebSocket connected clients (Leaderboard)
    try:
        from routes.websocket_routes import manager
        event_id_to_broadcast = str(sub_doc_ev.get("event_id", "")) if sub_doc_ev else ""
        if not event_id_to_broadcast:
            # Try to get opportunity_id
            sub_doc = await submissions_col.find_one({"_id": ObjectId(submission_id)})
            if sub_doc and "opportunity_id" in sub_doc:
                event_id_to_broadcast = str(sub_doc["opportunity_id"])
                
        if event_id_to_broadcast:
            await manager.broadcast_global(
                event_id_to_broadcast, 
                {"type": "LEADERBOARD_UPDATE", "submission_id": str(submission_id)}
            )
    except Exception as e:
        print(f"WS Broadcast failed: {e}")

    return {"status": "success", "total_score": total_score}

# --- Leaderboard ---

@router.get("/leaderboard/{opportunity_id}")
async def get_leaderboard(opportunity_id: str):
    """Rank students by total score. (Institution view only usually)"""
    event_id = None
    try:
        opp = await opportunities_col.find_one({"_id": ObjectId(opportunity_id)})
        if opp:
            event_id = opp.get("event_link_id")
    except:
        pass
        
    query = {"$or": [{"opportunity_id": opportunity_id}]}
    if event_id:
        query["$or"].append({"event_id": event_id})
        
    query["evaluation_status"] = "Evaluated"
    
    cursor = submissions_col.find(query).sort("total_score", -1)
    leaderboard = []
    rank = 1
    async for doc in cursor:
        entry = {
            "rank": rank,
            "student_id": doc.get("user_id"),
            "team_name": doc.get("team_name") or doc.get("student_name") or "Anonymous",
            "total_score": doc.get("total_score"),
            "rubric_scores": {} # For breakdown
        }
        
        # Attach rubric breakdown for the matrix
        # Pre-fetch scores for this submission
        all_sub_scores = await submission_scores_col.find({"submission_id": str(doc["_id"])}).to_list(length=1000)
        
        # Batch fetch all required rubrics for this submission
        rubric_ids = [ObjectId(s["rubric_id"]) for s in all_sub_scores if s.get("rubric_id")]
        rubrics_map = {}
        if rubric_ids:
            rubrics_cursor = rubrics_col.find({"_id": {"$in": rubric_ids}})
            async for r in rubrics_cursor:
                rubrics_map[str(r["_id"])] = r
                
        for s in all_sub_scores:
            r = rubrics_map.get(str(s.get("rubric_id")))
            if r:
                entry["rubric_scores"][r["title"]] = s["score"]
                
        leaderboard.append(entry)
        rank += 1
        
    return leaderboard

@router.get("/scores/{opportunity_id}")
async def get_all_scores(opportunity_id: str):
    """Fetch all scores for a given opportunity/event."""
    # Find all submissions for this opportunity
    event_id = None
    try:
        opp = await opportunities_col.find_one({"_id": ObjectId(opportunity_id)})
        if opp:
            event_id = opp.get("event_link_id")
    except:
        pass
        
    sub_query = {"$or": [{"opportunity_id": opportunity_id}]}
    if event_id:
        sub_query["$or"].append({"event_id": event_id})
        
    cursor = submissions_col.find(sub_query)
    submission_ids = []
    async for doc in cursor:
        submission_ids.append(str(doc["_id"]))
        
    # Fetch scores for these submissions
    scores_cursor = submission_scores_col.find({"submission_id": {"$in": submission_ids}})
    
    # Group scores by submission_id
    grouped_scores = {}
    async for s in scores_cursor:
        sid = s["submission_id"]
        if sid not in grouped_scores:
            sub_doc = await submissions_col.find_one({"_id": ObjectId(sid)})
            grouped_scores[sid] = {
                "submission_id": sid,
                "total_score": sub_doc.get("total_score", 0) if sub_doc else 0,
                "feedback": sub_doc.get("evaluator_feedback", "") if sub_doc else "",
                "scores": []
            }
        
        # Get rubric title
        r = await rubrics_col.find_one({"_id": ObjectId(s["rubric_id"])})
        grouped_scores[sid]["scores"].append({
            "name": r.get("title") if r else "Unknown",
            "score": s["score"]
        })
        
    return list(grouped_scores.values())

# --- Evaluation Matrix ---

@router.get("/evaluation-matrix/{opportunity_id}")
async def get_evaluation_matrix(opportunity_id: str, user: dict = Depends(get_auth_user)):
    """Detailed rubric breakdown for all submissions."""
    rubrics = await get_rubrics(opportunity_id, user)
    rubric_titles = [r["title"] for r in rubrics]
    
    submissions = await list_submissions(opportunity_id, user)
    
    matrix = []
    for sub in submissions:
        if sub.get("evaluation_status") != "Evaluated":
            continue
            
        row = {
            "student_name": sub.get("team_name") or sub.get("student_name"),
            "total_score": sub.get("total_score", 0),
            "rubric_scores": {}
        }
        
        scores_cursor = submission_scores_col.find({"submission_id": sub["_id"]})
        async for s in scores_cursor:
            r = await rubrics_col.find_one({"_id": ObjectId(s["rubric_id"])})
            if r:
                row["rubric_scores"][r["title"]] = s["score"]
            
        matrix.append(row)
        
    return {"rubrics": rubric_titles, "matrix": matrix}

@router.post("/issue-certificates")
async def issue_certificates(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Issue certificates to top performers."""
    event_id = data.get("event_id")
    winners = data.get("winners", []) # List of {student_id, team_name, rank, total_score}
    
    if not event_id or not winners:
        raise HTTPException(status_code=400, detail="Missing event_id or winners list")
        
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    inst_id = str(user.get("institution_id") or user.get("user_id"))
    
    issued_count = 0
    for winner in winners:
        cert_id = f"SL-{secrets.token_hex(4).upper()}"
        cert_doc = {
            "institution_id": inst_id,
            "student_name": winner.get("team_name") or winner.get("student_name"),
            "user_id": winner.get("student_id"),
            "event_id": event_id,
            "event_title": event.get("title"),
            "certificate_id": cert_id,
            "issue_date": datetime.utcnow().isoformat(),
            "category": f"Winner - Rank {winner.get('rank')}",
            "verification_code": secrets.token_urlsafe(8),
            "total_score": winner.get("total_score"),
            "created_at": datetime.utcnow()
        }
        await certificates_col.insert_one(cert_doc)
        issued_count += 1
        
    return {"status": "success", "issued": issued_count}
