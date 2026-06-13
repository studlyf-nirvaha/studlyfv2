from fastapi import APIRouter, HTTPException, Depends
from db import certificates_col, events_col, participants_col, leaderboard_col, opportunity_applications_col
from auth_institution import get_auth_user
from bson import ObjectId
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/api/v1/institution/certificates", tags=["Achievement Registry"])

@router.get("/stats")
async def get_certificate_stats(institution_id: str, user: dict = Depends(get_auth_user)):
    # 1. Total Issued
    total = await certificates_col.count_documents({"institution_id": institution_id})
    
    # 2. Achievement vs Participation
    ach = await certificates_col.count_documents({"institution_id": institution_id, "type": "Achievement"})
    part = await certificates_col.count_documents({"institution_id": institution_id, "type": "Participation"})
    
    # 3. Status Counts
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    verified = await certificates_col.count_documents({"institution_id": institution_id, "status": "Verified", "verified_at": {"$gte": today}})
    pending = await certificates_col.count_documents({"institution_id": institution_id, "status": "Pending"})
    revoked = await certificates_col.count_documents({"institution_id": institution_id, "status": "Revoked"})
    
    return {
        "total": total,
        "achievement": ach,
        "participation": part,
        "verified_today": verified,
        "pending": pending,
        "revoked": revoked
    }

@router.post("/preview")
async def get_eligibility_preview(
    event_id: str,
    stage_id: str,
    user: dict = Depends(get_auth_user)
):
    # Fetch leaderboard for achievement counts
    lb_entries = await leaderboard_col.find({"event_id": event_id, "stage_id": stage_id}).to_list(length=None)
    
    # Simplified logic: In real app, apply award band rules here
    winners = [e for e in lb_entries if e.get('rank') == 1]
    runners = [e for e in lb_entries if e.get('rank') in [2, 3]]
    finalists = [e for e in lb_entries if e.get('rank') in range(4, 21)]
    
    # Participation: Count unique participants in this stage
    participants = await participants_col.count_documents({"event_id": event_id, "current_stage": stage_id})
    
    return {
        "winner_teams": {"count": len(winners), "recipients": len(winners)}, # Extend for teams
        "runner_up_teams": {"count": len(runners), "recipients": len(runners)},
        "finalist_teams": {"count": len(finalists), "recipients": len(finalists)},
        "participation_eligible": {"count": participants}
    }

@router.get("/registry")
async def get_certificate_registry(
    institution_id: str,
    event_id: Optional[str] = None,
    stage_id: Optional[str] = None,
    user: dict = Depends(get_auth_user)
):
    query = {"institution_id": institution_id}
    if event_id: query["event_id"] = event_id
    if stage_id: query["stage_id"] = stage_id
    
    certs = await certificates_col.find(query).sort("issued_on", -1).to_list(length=100)
    
    # Stringify ObjectIds
    for c in certs:
        c["_id"] = str(c["_id"])
        
    return certs
