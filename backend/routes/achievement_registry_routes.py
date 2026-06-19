from fastapi import APIRouter, HTTPException, Depends, Query, Body
from db import certificates_col, events_col, participants_col, submission_data_col, scores_col, users_col, teams_col
from auth_institution import get_auth_user
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
from services.institutional_certificate_service import certificate_service, ACHIEVEMENT_TYPES, VALID_ACHIEVEMENTS

router = APIRouter(prefix="/api/v1/institution/certificates", tags=["Achievement Registry"])


async def _get_leaderboard_for_event(event_id: str, stage_id: str | None = None):
    """Fetch submissions with scores to build a leaderboard."""
    match = {"event_id": event_id}
    if stage_id:
        match["stage_id"] = stage_id
    submissions = await submission_data_col.find(match).to_list(length=None)
    scores_by_sub = {}
    cursor = scores_col.find({"event_id": event_id})
    async for sc in cursor:
        sid = str(sc.get("submission_id") or "")
        if not sid:
            continue
        total = sc.get("total_score") or sc.get("score") or 0
        try:
            total = float(total)
        except (TypeError, ValueError):
            total = 0
        scores_by_sub.setdefault(sid, []).append(total)

    entries = []
    for sub in submissions:
        sid = str(sub.get("_id"))
        total = float(sub.get("total_score") or sub.get("evaluation_score") or 0)
        sub_scores = scores_by_sub.get(sid, [])
        if total == 0 and sub_scores:
            total = sum(sub_scores) / len(sub_scores)
        user_id = str(sub.get("user_id") or "")
        team_id = str(sub.get("team_id") or "")
        data = sub.get("data") or {}
        title = ""
        if isinstance(data, dict):
            for k in data:
                if "title" in k.lower() or "project" in k.lower() or "idea" in k.lower() or "name" in k.lower():
                    v = data[k]
                    if isinstance(v, str) and len(v) > 3:
                        title = v
                        break
        entry = {
            "submission_id": sid,
            "user_id": user_id,
            "team_id": team_id,
            "title": title or sub.get("title") or "Untitled",
            "score": round(total, 1),
            "user_name": sub.get("user_name") or sub.get("name") or "Participant",
            "team_name": sub.get("team_name") or "",
        }
        entries.append(entry)

    entries.sort(key=lambda x: x["score"], reverse=True)
    for idx, e in enumerate(entries):
        e["rank"] = idx + 1
    return entries


@router.get("/stats")
async def get_certificate_stats(institution_id: str, user: dict = Depends(get_auth_user)):
    total = await certificates_col.count_documents({"institution_id": institution_id})
    ach = await certificates_col.count_documents({"institution_id": institution_id, "type": "Achievement"})
    part = await certificates_col.count_documents({"institution_id": institution_id, "type": "Participation"})
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
        "revoked": revoked,
    }


@router.post("/preview")
async def get_eligibility_preview(
    event_id: str,
    stage_id: str = None,
    user: dict = Depends(get_auth_user),
):
    entries = await _get_leaderboard_for_event(event_id, stage_id)
    winners = [e for e in entries if e.get("rank") == 1]
    runners = [e for e in entries if e.get("rank") in [2, 3]]
    finalists = [e for e in entries if e.get("rank") in range(4, 21)]

    # Count all registered participants (including non-qualifiers) for participation eligibility
    total_participants = await participants_col.count_documents({"event_id": event_id})
    qualified_count = len([e for e in entries if e.get("rank") and e["rank"] <= 20])
    non_qualifier_count = max(0, total_participants - qualified_count)

    return {
        "winner_teams": {"count": len(winners), "recipients": len(winners)},
        "runner_up_teams": {"count": len(runners), "recipients": len(runners)},
        "finalist_teams": {"count": len(finalists), "recipients": len(finalists)},
        "participation_eligible": {"count": total_participants},
        "non_qualifier_participants": {"count": non_qualifier_count},
    }


@router.post("/eligible-recipients")
async def get_eligible_recipients(
    event_id: str,
    stage_id: str = None,
    min_score: float = Query(0, description="Minimum score filter"),
    user: dict = Depends(get_auth_user),
):
    entries = await _get_leaderboard_for_event(event_id, stage_id)
    if min_score > 0:
        entries = [e for e in entries if e["score"] >= min_score]
    categories = {
        "winner": {
            "label": "Winner",
            "achievement_key": "winner",
            "recipients": [e for e in entries if e.get("rank") == 1],
            "rank_range": "1",
        },
        "runner_up": {
            "label": "Runner Up",
            "achievement_key": "runner_up",
            "recipients": [e for e in entries if e.get("rank") in [2, 3]],
            "rank_range": "2-3",
        },
        "finalist": {
            "label": "Finalist",
            "achievement_key": "finalist",
            "recipients": [e for e in entries if e.get("rank") in range(4, 21)],
            "rank_range": "4-20",
        },
        "participation": {
            "label": "Participation",
            "achievement_key": "participation",
            "recipients": [e for e in entries if e.get("rank") and e["rank"] >= 21],
            "rank_range": "21+",
        },
    }
    # Include all registered participants who are not in winner/runner_up/finalist
    qualified_ids = set()
    for cat in categories.values():
        for r in cat["recipients"]:
            if r.get("user_id"):
                qualified_ids.add(r["user_id"])
            if r.get("team_id"):
                qualified_ids.add(r["team_id"])
    all_participants = await participants_col.find({"event_id": event_id}).to_list(length=None)
    non_qualifiers = []
    for p in all_participants:
        pid = str(p.get("user_id") or "")
        if pid and pid not in qualified_ids:
            non_qualifiers.append({
                "user_id": pid,
                "user_name": p.get("name") or p.get("participant_name") or "Participant",
                "team_name": p.get("team_name") or "",
                "rank": 999,
                "score": 0,
            })
    if non_qualifiers:
        categories.setdefault("non_qualifier_participation", {
            "label": "Non-Qualifier Participation",
            "achievement_key": "participation",
            "recipients": non_qualifiers,
            "rank_range": "Registered (no qualifying score)",
        })
    return {"categories": categories, "total_entries": len(entries)}


@router.post("/issue")
async def issue_certificates(
    event_id: str,
    recipient_ids: List[str] = Query(..., description="List of submission/participant IDs"),
    achievement_type: str = Query("participation", description="Achievement type key"),
    send_email: bool = Query(False),
    rank: Optional[int] = Query(None),
    user: dict = Depends(get_auth_user),
):
    role = str(user.get("role") or "").lower()
    if role not in ("institution", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Institution access required")

    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event_title = event.get("title", "Untitled Event")
    org_name = event.get("organisation") or event.get("organization") or "Unknown"
    event_date = event.get("eventDate") or event.get("start_date") or datetime.utcnow().strftime("%B %d, %Y")
    institution_id = str(user.get("institution_id", ""))
    event_code = (event.get("eventCode") or event.get("event_type") or "HACK")[:6].upper()

    if achievement_type not in VALID_ACHIEVEMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid achievement type. Valid: {VALID_ACHIEVEMENTS}")

    issued = []
    for sid in recipient_ids:
        # Try to resolve from submission_data_col first, then participants_col
        sub = await submission_data_col.find_one({"_id": ObjectId(sid)})
        user_id = None
        participant_name = "Participant"
        team_id = None

        if sub:
            user_id = str(sub.get("user_id") or "")
            participant_name = sub.get("user_name") or sub.get("name") or "Participant"
            team_id = str(sub.get("team_id") or "")
        else:
            # Fall back to participants_col (for non-qualifiers without submissions)
            participant = await participants_col.find_one({"_id": ObjectId(sid)})
            if not participant:
                # Try treating sid as a user_id
                participant = await participants_col.find_one({"event_id": event_id, "user_id": sid})
            if participant:
                user_id = str(participant.get("user_id") or "")
                participant_name = participant.get("name") or participant.get("participant_name") or "Participant"
                team_id = str(participant.get("team_id") or "")
                if not user_id:
                    continue
                # Look up user name from users_col if needed
                if participant_name == "Participant":
                    user_doc = await users_col.find_one({"user_id": user_id})
                    if user_doc:
                        participant_name = user_doc.get("full_name") or user_doc.get("name") or "Participant"

        if not user_id:
            continue
        existing = await certificates_col.find_one({
            "event_id": event_id,
            "user_id": user_id,
            "type": ACHIEVEMENT_TYPES.get(achievement_type, "Participation"),
        })
        if existing:
            continue
        record = await certificate_service.issue_event_certificate(
            event_id=event_id,
            user_id=user_id,
            participant_name=participant_name,
            event_title=event_title,
            organization_name=org_name,
            event_date=event_date,
            achievement_type=achievement_type,
            event_code=event_code,
            institution_id=institution_id,
            rank=rank,
            team_id=team_id or None,
        )
        issued.append(record)

    return {
        "status": "success",
        "issued": len(issued),
        "certificates": issued,
    }


@router.get("/registry")
async def get_certificate_registry(
    institution_id: str,
    event_id: Optional[str] = None,
    stage_id: Optional[str] = None,
    search: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_auth_user),
):
    query = {"institution_id": institution_id}
    if event_id and event_id != "All Events":
        query["event_id"] = event_id
    if stage_id and stage_id != "All Stages":
        query["stage_id"] = stage_id
    if type and type != "All Types":
        query["type"] = type
    if category and category != "All Certificates":
        query["category"] = category
    if status and status != "All Status":
        query["status"] = status
    if search:
        query["$or"] = [
            {"recipient_name": {"$regex": search, "$options": "i"}},
            {"student_name": {"$regex": search, "$options": "i"}},
            {"team_name": {"$regex": search, "$options": "i"}},
            {"certificate_id": {"$regex": search, "$options": "i"}},
        ]
    certs = await certificates_col.find(query).sort("issued_on", -1).to_list(length=100)
    for c in certs:
        c["_id"] = str(c["_id"])
    return certs
