from fastapi import APIRouter, HTTPException, Depends, Query, Body
from db import db, certificates_col, events_col, participants_col, submissions_col, submission_data_col, scores_col, users_col, teams_col, cert_templates_col, event_certificates_col
from auth_institution import get_auth_user
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
import os
import uuid
from services.institutional_certificate_service import certificate_service, ACHIEVEMENT_TYPES, VALID_ACHIEVEMENTS
from services.email_service import send_notification_email, get_certificate_issued_template
from services.email_template_service import get_active_template, render_template

router = APIRouter(prefix="/api/v1/institution/certificates", tags=["Achievement Registry"])

# The frontend calls /api/v1/institution/certificates/templates
# The current router prefix is /api/v1/institution/certificates
# So @router.get("/templates") results in /api/v1/institution/certificates/templates
# This IS correct.


async def _get_leaderboard_for_event(event_id: str, stage_id: str | None = None):
    """Fetch submissions with scores to build a leaderboard (queries both collections)."""
    match = {"event_id": event_id}
    if stage_id:
        match["stage_id"] = stage_id

    subs_data = await submission_data_col.find(match).to_list(length=None)
    subs_main = await submissions_col.find(match).to_list(length=None)

    seen = set()
    submissions = []
    for sub in subs_main + subs_data:
        sid = str(sub.get("_id"))
        if sid not in seen:
            seen.add(sid)
            submissions.append(sub)

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
            "title": title or sub.get("title") or sub.get("project_name") or sub.get("project_title") or "Untitled",
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
    achievement_keys = ["winner", "runner_up", "second_runner_up", "finalist", "top_performer", "organizer", "mentor"]
    total = await event_certificates_col.count_documents({"institution_id": institution_id})
    ach = await event_certificates_col.count_documents({"institution_id": institution_id, "achievement_key": {"$in": achievement_keys}})
    part = await event_certificates_col.count_documents({"institution_id": institution_id, "achievement_key": "participation"})
    pending = await event_certificates_col.count_documents({"institution_id": institution_id, "$or": [{"status": "Pending"}, {"status": {"$exists": False}}]})
    return {
        "total": total,
        "achievement": ach,
        "participation": part,
        "verified_today": 0,
        "pending": pending,
        "revoked": 0,
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
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    event_id = payload.get("event_id")
    stage_id = payload.get("stage_id")
    min_score = float(payload.get("min_score", 0))
    
    if not event_id:
        raise HTTPException(status_code=400, detail="event_id is required")
        
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
    event_id: str = Query(...),
    recipient_ids: List[str] = Body(..., embed=True, description="List of submission/participant IDs"),
    achievement_type: str = Query("participation", description="Achievement type key"),
    send_email: bool = Query(False),
    rank: Optional[int] = Query(None),
    template_id: Optional[str] = Query(None, description="Template ID to use"),
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
        # Helper to convert to ObjectId if valid, else keep as string
        def to_oid(s):
            if ObjectId.is_valid(s):
                return ObjectId(s)
            return s

        sid_query = to_oid(sid)
        
        # Try to resolve from submission_data_col first, then participants_col
        sub = await submission_data_col.find_one({"_id": sid_query})
        user_id = None
        participant_name = "Participant"
        team_id = None

        if sub:
            user_id = str(sub.get("user_id") or "")
            participant_name = sub.get("user_name") or sub.get("name") or "Participant"
            team_id = str(sub.get("team_id") or "")
        else:
            # Fall back to participants_col (for non-qualifiers without submissions)
            participant = await participants_col.find_one({"_id": sid_query})
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
            template_id=template_id, # ADDED
        )
        issued.append(record)

        if send_email:
            try:
                user_doc = await users_col.find_one({"user_id": user_id})
                recipient_email = (user_doc or {}).get("email", "")
                if recipient_email:
                    template = await get_active_template(event_id, institution_id, "certificate_issued")
                    frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
                    context = {
                        "participant_name": participant_name,
                        "event_title": event_title,
                        "organization_name": org_name,
                        "event_date": event_date,
                        "certificate_id": record["certificate_id"],
                        "issued_date": record["issued_date"],
                        "certificate_download_link": f"{frontend_url}/api/v1/institution/download-certificate/{record['certificate_id']}",
                        "verification_url": record["verification_url"],
                    }
                    subj, body = render_template(template, context) if template else (
                        f"Certificate Issued: {event_title}",
                        get_certificate_issued_template(
                            participant_name=participant_name,
                            event_title=event_title,
                            organization_name=org_name,
                            certificate_id=record["certificate_id"],
                            issued_date=record["issued_date"],
                            certificate_download_link=f"{frontend_url}/api/v1/institution/download-certificate/{record['certificate_id']}",
                            verification_url=record["verification_url"],
                        ),
                    )
                    await send_notification_email(recipient_email, subj, body)
            except Exception as e:
                print(f"[CERT EMAIL FAIL] {user_id}: {e}")

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
    if type and type != "All Types":
        query["achievement_key"] = type
    if status and status != "All Status":
        query["status"] = status
    if search:
        query["$or"] = [
            {"participant_name": {"$regex": search, "$options": "i"}},
            {"team_name": {"$regex": search, "$options": "i"}},
            {"certificate_id": {"$regex": search, "$options": "i"}},
        ]
    certs = await event_certificates_col.find(query).sort("issued_at", -1).to_list(length=100)
    result = []
    for c in certs:
        c["_id"] = str(c["_id"])
        c["recipient_name"] = c.get("participant_name") or ""
        c["type"] = c.get("achievement_type") or "Participation"
        c["issued_on"] = c.get("issued_date") or ""
        c["status"] = c.get("status") or "Issued"
        team_id = c.get("team_id")
        if team_id and not c.get("team_name"):
            try:
                team_doc = await teams_col.find_one({"_id": ObjectId(team_id)})
                if team_doc:
                    c["team_name"] = team_doc.get("team_name") or team_doc.get("name") or ""
            except Exception:
                pass
        c["team_name"] = c.get("team_name") or ""
        result.append(c)
    return result


# Template Builder Endpoints
@router.get("/templates")
async def list_cert_templates_for_institution(user: dict = Depends(get_auth_user)):
    """Institution-scoped: list all user-saved certificate templates only."""
    results = []
    async for doc in cert_templates_col.find({}):
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results

@router.post("/templates")
async def create_cert_template_for_institution(payload: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Institution-scoped: create a new certificate template.
    Uses institution JWT auth instead of super-admin."""
    cert_templates_col = db["cert_templates"]
    template_id = str(uuid.uuid4())[:8]
    doc = {
        "template_id": template_id,
        "name": payload.get("name", "Certificate Template"),
        "html_content": payload.get("html_content", ""),
        "description": payload.get("description", ""),
        "preview_thumbnail": payload.get("preview_thumbnail", ""),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": str(user.get("user_id") or user.get("email") or ""),
        "is_builtin": False,
    }
    await cert_templates_col.insert_one(doc)
    doc["_id"] = str(doc.get("_id", ""))
    return doc

@router.put("/templates/{template_id}")
async def update_cert_template_for_institution(
    template_id: str,
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Institution-scoped: update a certificate template."""
    cert_templates_col = db["cert_templates"]
    
    # Check if template exists and user has permission
    existing = await cert_templates_col.find_one({"template_id": template_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Only allow update if user created the template or is super admin
    if existing.get("created_by") != str(user.get("user_id") or user.get("email") or ""):
        role = str(user.get("role") or "").lower()
        if role != "super_admin":
            raise HTTPException(status_code=403, detail="Permission denied")
    
    update_data = {
        "name": payload.get("name", existing.get("name", "")),
        "html_content": payload.get("html_content", existing.get("html_content", "")),
        "description": payload.get("description", existing.get("description", "")),
        "preview_thumbnail": payload.get("preview_thumbnail", existing.get("preview_thumbnail", "")),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    await cert_templates_col.update_one(
        {"template_id": template_id},
        {"$set": update_data}
    )
    
    updated = await cert_templates_col.find_one({"template_id": template_id})
    updated["_id"] = str(updated.get("_id", ""))
    return updated

@router.delete("/templates/{template_id}")
async def delete_cert_template_for_institution(
    template_id: str,
    user: dict = Depends(get_auth_user)
):
    """Institution-scoped: delete a certificate template."""
    cert_templates_col = db["cert_templates"]
    
    # Check if template exists and user has permission
    existing = await cert_templates_col.find_one({"template_id": template_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Only allow delete if user created the template or is super admin
    if existing.get("created_by") != str(user.get("user_id") or user.get("email") or ""):
        role = str(user.get("role") or "").lower()
        if role != "super_admin":
            raise HTTPException(status_code=403, detail="Permission denied")
    
    await cert_templates_col.delete_one({"template_id": template_id})
    return {"status": "success", "message": "Template deleted successfully"}
