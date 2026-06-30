import os
from datetime import datetime, timedelta
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Body, Response
from fastapi.responses import StreamingResponse
import io, csv
from bson import ObjectId

from auth_institution import get_auth_user
from db import teams_col, participants_col, events_col, users_col, notifications_col, team_invite_acceptances_col
from bson.son import SON
from datetime import timezone
from services.email_service import send_notification_email, get_team_invite_template, get_team_join_template
import asyncio
import logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/teams", tags=["Teams"])

@router.get("/test")
async def test_teams_endpoint():
    """Test endpoint to verify team routes are working"""
    return {"status": "ok", "message": "Team routes are working"}

def _team_size_limits(ev: dict) -> Optional[tuple[int, int]]:
    # Support both naming conventions, but do not invent defaults.
    min_s = ev.get("min_team_size") if ev else None
    if min_s is None and ev:
        min_s = ev.get("minTeamSize")
    max_s = ev.get("max_team_size") if ev else None
    if max_s is None and ev:
        max_s = ev.get("maxTeamSize")
    if min_s is None or max_s is None:
        return None
    try:
        min_i = int(min_s)
        max_i = int(max_s)
    except Exception:
        return None
    if min_i < 1 or max_i < min_i:
        return None
    return min_i, max_i


@router.get("/me")
async def my_team_for_event(event_id: str, user: dict = Depends(get_auth_user)):
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
        if team:
            team["_id"] = str(team["_id"])
            if "leader_id" in team:
                team["leader_id"] = str(team["leader_id"])
            if "team_leader_id" in team:
                team["team_leader_id"] = str(team["team_leader_id"])
                if "leader_id" not in team:
                    team["leader_id"] = team["team_leader_id"]
    if p and "_id" in p:
        p["_id"] = str(p["_id"])
        # Don't leak fields we don't need
        p = {k: p.get(k) for k in ("_id", "event_id", "user_id", "team_id", "status", "current_stage")}
    return {"participant": p, "team": team}


@router.post("/send-invite")
async def send_team_invite(
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    """Send team invite email"""
    try:
        team_id = str(payload.get("team_id") or "")
        invite_email = str(payload.get("invite_email") or "")
        event_id = str(payload.get("event_id") or "")
        
        if not team_id or not invite_email:
            raise HTTPException(status_code=400, detail="team_id and invite_email are required")
        
        # Get team details
        team = await teams_col.find_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)})
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get event details
        event = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        limits = _team_size_limits(event)
        if not limits:
            raise HTTPException(status_code=400, detail="Team size is not configured for this event")
        min_s, max_s = limits
        
        # Create invite code
        invite_code = secrets.token_urlsafe(8)
        
        # Store invite
        await teams_col.update_one(
            {"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)},
            {"$push": {"invites": {
                "code": invite_code,
                "email": invite_email,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(hours=72)
            }}}
        )
        
        # Send email via template system
        try:
            from services.platform_notification_service import notify_team_invitation
            leader_name = user.get("full_name") or user.get("name") or "Team Leader"
            event_name = event.get("title") or event.get("name") or "Event"
            team_name = team.get("team_name", "Our Team")
            org_name = event.get("organisation") or event.get("organization") or "Studlyf"
            frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
            invite_link = f"{frontend_url}/events/join-team?code={invite_code}"
            await notify_team_invitation(
                recipient_email=invite_email,
                participant_name="there",
                team_leader_name=leader_name,
                team_name=team_name,
                event_title=event_name,
                organization_name=org_name,
                invite_link=invite_link,
                current_team_size=len(team.get("members", [])) + 1,
                max_team_size=max_s,
            )
        except Exception as e:
            logger.error(f"Error sending team invite email: {e}")
        
        return {
            "success": True,
            "message": f"Invite sent to {invite_email}",
            "invite_code": invite_code
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-secure")
async def create_team_secure(
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    logger.info(f"DEBUG: Team creation request - User: {user}, Payload: {payload}")
    
    uid = str(user.get("user_id") or "")
    if not uid:
        logger.info("DEBUG: No user_id found")
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    event_id = str(payload.get("event_id") or "").strip()
    team_name = str(payload.get("team_name") or "").strip()
    
    logger.info(f"DEBUG: Extracted - event_id: {event_id}, team_name: {team_name}")
    
    if not event_id or not team_name:
        logger.info("DEBUG: Missing event_id or team_name")
        raise HTTPException(status_code=400, detail="event_id and team_name are required")

    try:
        ev = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    except Exception as e:
        logger.info(f"DEBUG: Invalid ObjectId format for event_id: {event_id}")
        raise HTTPException(status_code=400, detail="Invalid event_id format")
    
    if not ev:
        logger.info(f"DEBUG: Event not found for event_id: {event_id}")
        raise HTTPException(status_code=404, detail="Event not found")

    logger.info(f"DEBUG: Event found: {ev.get('name', 'Unknown')}")

    # Check if user is already registered or has applied
    p = await participants_col.find_one({"event_id": event_id, "user_id": uid})
    logger.info(f"DEBUG: Participant record: {p}")
    
    if p and p.get("team_id"):
        logger.info(f"DEBUG: User already in team: {p.get('team_id')}")
        raise HTTPException(status_code=400, detail="You are already in a team")
    
    # If not registered, create a basic participant record
    if not p:
        logger.info("DEBUG: Creating new participant record")
        first_stage = None
        st = ev.get("stages")
        if isinstance(st, list) and st:
            first_stage = st[0].get("name") or st[0].get("id")
        p = {
            "event_id": event_id,
            "user_id": uid,
            "status": "registered",
            "current_stage": first_stage,
            "team_id": None
        }
        result = await participants_col.insert_one(p)
        p["_id"] = str(result.inserted_id)
        logger.info(f"DEBUG: Created participant record: {p['_id']}")
    else:
        logger.info("DEBUG: Using existing participant record")

    limits = _team_size_limits(ev)
    if not limits:
        raise HTTPException(status_code=400, detail="Team size is not configured for this event")
    min_s, max_s = limits
    # Team can be created with just the leader; min/max enforced at submission time
    if 1 > max_s:
        raise HTTPException(status_code=400, detail="Invalid team size config")

    import string as str_mod
    alphabet = str_mod.ascii_uppercase + str_mod.digits
    invite_code = ''.join(secrets.choice(alphabet) for _ in range(12))
    team_doc = {
        "event_id": event_id,
        "team_name": team_name,
        "team_leader_id": uid,
        "members": [{"user_id": uid, "role": "LEADER"}],
        "status": "Pending",
        "invites": [],
        "invite_code": invite_code,
        "size_min": min_s,
        "size_max": max_s,
        "formed_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    res = await teams_col.insert_one(team_doc)
    team_id = str(res.inserted_id)
    await participants_col.update_one(
        {"_id": p["_id"]},
        {"$set": {"team_id": team_id, "updated_at": datetime.utcnow()}},
    )

    # Notify Institution
    inst_id = ev.get("institution_id")
    if inst_id:
        from notification_helpers import notify_institution
        asyncio.create_task(notify_institution(
            institution_id=inst_id,
            title="Team Formed",
            message=f"A new team has been formed for {ev.get('title')}.",
            ntype="info"
        ))

    return {"status": "success", "team_id": team_id}


@router.post("/{team_id}/invites")
async def create_team_invite(
    team_id: str,
    ttl_hours: int = Body(72, embed=True),
    single_use: bool = Body(False, embed=True),
    user: dict = Depends(get_auth_user),
):
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        team = await teams_col.find_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)})
    except Exception:
        team = None
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team.get("team_leader_id") or "") != uid:
        raise HTTPException(status_code=403, detail="Only the team leader can create invite codes")

    now = datetime.utcnow()

    # ── Return existing permanent invite_code first ──────────────────────────
    permanent_code = team.get("invite_code")
    if permanent_code:
        # Check if it was revoked
        invites = team.get("invites") or []
        revoked = False
        for inv in invites:
            if inv.get("code") == permanent_code and inv.get("revoked"):
                revoked = True
                break
        if not revoked:
            return {"status": "success", "code": permanent_code, "team_id": team_id, "reused": True, "permanent": True}

    # ── Return existing active temporary code if one still exists ────────────
    existing_invites = team.get("invites") or []
    for inv in reversed(existing_invites):
        if inv.get("revoked"):
            continue
        try:
            exp = datetime.fromisoformat(str(inv.get("expires_at", "")).replace("Z", "+00:00"))
            if now > exp.replace(tzinfo=None):
                continue
        except Exception:
            pass
        return {"status": "success", "code": inv["code"], "team_id": team_id, "reused": True}

    # ── No active code — generate a fresh one ────────────────────────────────
    import string as str_mod
    alphabet = str_mod.ascii_uppercase + str_mod.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(12))
    invite = {
        "code": code,
        "created_by": uid,
        "created_at": now.isoformat(),
        "expires_at": None,
        "uses": 0,
        "revoked": False,
    }
    await teams_col.update_one(
        {"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)},
        {"$set": {"invite_code": code, "invites": [invite], "updated_at": now}},
    )
    return {"status": "success", "code": code, "team_id": team_id, "reused": False, "permanent": True}


@router.post("/{team_id}/invites/{code}/revoke")
async def revoke_team_invite(team_id: str, code: str, user: dict = Depends(get_auth_user)):
    """Revoke a previously generated invite code (mark revoked=True). Only team leader can revoke."""
    uid = str(user.get("user_id") or "")
    try:
        team = await teams_col.find_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)})
    except Exception:
        team = None
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team.get("team_leader_id") or "") != uid:
        raise HTTPException(status_code=403, detail="Only team leader can revoke invites")

    invites = team.get("invites") or []
    found = False
    for inv in invites:
        if str(inv.get("code")) == str(code):
            inv["revoked"] = True
            inv["revoked_at"] = datetime.utcnow().isoformat()
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Invite code not found")

    update = {"invites": invites, "updated_at": datetime.utcnow()}
    # If this is the permanent invite_code, clear it
    if team.get("invite_code") == code:
        update["invite_code"] = None
    await teams_col.update_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)}, {"$set": update})
    return {"status": "success", "message": "Invite revoked"}


@router.get("/{team_id}/invites")
async def list_team_invites(team_id: str, user: dict = Depends(get_auth_user)):
    """List invites for a team (leader only). Returns invite code, email, uses, max_uses, expires_at, revoked."""
    uid = str(user.get("user_id") or "")
    try:
        team = await teams_col.find_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)})
    except Exception:
        team = None
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team.get("team_leader_id") or "") != uid:
        raise HTTPException(status_code=403, detail="Only the team leader can view invites")

    invites = team.get("invites") or []
    # Normalize invite fields for JSON
    out = []
    for inv in invites:
        out.append({
            "code": str(inv.get("code")),
            "email": inv.get("email"),
            "uses": int(inv.get("uses", 0) or 0),
            "max_uses": inv.get("max_uses"),
            "expires_at": (inv.get("expires_at") if isinstance(inv.get("expires_at"), str) else (inv.get("expires_at").isoformat() if inv.get("expires_at") else None)),
            "revoked": bool(inv.get("revoked", False)),
            "created_at": (inv.get("created_at") if isinstance(inv.get("created_at"), str) else (inv.get("created_at").isoformat() if inv.get("created_at") else None)),
        })

    return {"status": "success", "invite_code": team.get("invite_code"), "invites": out}


@router.get("/{team_id}/invite-acceptances")
async def list_invite_acceptances(team_id: str, user: dict = Depends(get_auth_user)):
    """List invite acceptance audit records for a team (leader only)."""
    uid = str(user.get("user_id") or "")
    try:
        team = await teams_col.find_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)})
    except Exception:
        team = None
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team.get("team_leader_id") or "") != uid:
        raise HTTPException(status_code=403, detail="Only the team leader can view invite acceptances")

    # Query the audit collection
    try:
        records = []
        cursor = team_invite_acceptances_col.find({"team_id": str(team_id)}).sort("accepted_at", -1).limit(200)
        async for r in cursor:
            records.append({
                "user_id": r.get("user_id"),
                "user_email": r.get("user_email"),
                "invite_code": r.get("invite_code"),
                "accepted_at": (r.get("accepted_at").isoformat() if hasattr(r.get("accepted_at"), "isoformat") else r.get("accepted_at")),
                "source": r.get("source")
            })
        return {"status": "success", "acceptances": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{team_id}/invite-acceptances/export")
async def export_invite_acceptances_csv(team_id: str, user: dict = Depends(get_auth_user)):
    """Export invite acceptance audit as CSV (leader-only)."""
    uid = str(user.get("user_id") or "")
    try:
        team = await teams_col.find_one({"_id": (ObjectId(team_id) if ObjectId.is_valid(team_id) else team_id)})
    except Exception:
        team = None
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team.get("team_leader_id") or "") != uid:
        raise HTTPException(status_code=403, detail="Only the team leader can export invite acceptances")

    try:
        cursor = team_invite_acceptances_col.find({"team_id": str(team_id)}).sort("accepted_at", -1)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["accepted_at", "user_id", "user_email", "invite_code", "source"]) 
        async for r in cursor:
            accepted_at = r.get("accepted_at")
            if hasattr(accepted_at, 'isoformat'):
                accepted_at = accepted_at.isoformat()
            writer.writerow([accepted_at, r.get("user_id"), r.get("user_email"), r.get("invite_code"), r.get("source")])
        output.seek(0)
        headers = {
            'Content-Disposition': f'attachment; filename="invite_acceptances_{team_id}.csv"'
        }
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/institution/{institution_id}/invite-acceptances")
async def institution_invite_acceptances(
    institution_id: str,
    team_id: Optional[str] = None,
    code: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 200,
    user: dict = Depends(get_auth_user),
):
    """List invite acceptances across an institution. Admin-only.
    Supports optional filters: team_id, code (invite_code), date range.
    """
    uid = str(user.get("user_id") or "")
    # simple permission: user must belong to institution
    if str(user.get("institution_id") or "") != str(institution_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        q: dict = {"institution_id": str(institution_id)}
        if team_id:
            q["team_id"] = str(team_id)
        if code:
            q["invite_code"] = str(code)
        # date filters expect ISO strings
        if date_from or date_to:
            q["accepted_at"] = {}
            if date_from:
                q["accepted_at"]["$gte"] = date_from
            if date_to:
                q["accepted_at"]["$lte"] = date_to

        cursor = team_invite_acceptances_col.find(q).sort("accepted_at", -1).limit(min(max(1, int(limit)), 500))
        out = []
        async for r in cursor:
            out.append({
                "team_id": r.get("team_id"),
                "user_id": r.get("user_id"),
                "user_email": r.get("user_email"),
                "invite_code": r.get("invite_code"),
                "accepted_at": (r.get("accepted_at").isoformat() if hasattr(r.get("accepted_at"), "isoformat") else r.get("accepted_at")),
            })
        return {"status": "success", "acceptances": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/institution/{institution_id}/invite-acceptances/export")
async def export_institution_invite_acceptances_csv(
    institution_id: str,
    team_id: Optional[str] = None,
    code: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_auth_user),
):
    """Export institution-level invite acceptances CSV (admin-only)."""
    if str(user.get("institution_id") or "") != str(institution_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        q: dict = {"institution_id": str(institution_id)}
        if team_id:
            q["team_id"] = str(team_id)
        if code:
            q["invite_code"] = str(code)
        if date_from or date_to:
            q["accepted_at"] = {}
            if date_from:
                q["accepted_at"]["$gte"] = date_from
            if date_to:
                q["accepted_at"]["$lte"] = date_to

        cursor = team_invite_acceptances_col.find(q).sort("accepted_at", -1)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["accepted_at", "team_id", "user_id", "user_email", "invite_code"]) 
        async for r in cursor:
            accepted_at = r.get("accepted_at")
            if hasattr(accepted_at, 'isoformat'):
                accepted_at = accepted_at.isoformat()
            writer.writerow([accepted_at, r.get("team_id"), r.get("user_id"), r.get("user_email"), r.get("invite_code")])
        output.seek(0)
        headers = {
            'Content-Disposition': f'attachment; filename="invite_acceptances_institution_{institution_id}.csv"'
        }
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/institution/{institution_id}/invite-analytics")
async def invite_analytics(institution_id: str, days: int = 14, user: dict = Depends(get_auth_user)):
    """Return analytics summary for invites and acceptances for an institution."""
    if str(user.get("institution_id") or "") != str(institution_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        # Total invites: unwind invites array across teams for the institution
        pipeline = [
            {"$match": {"institution_id": str(institution_id)}},
            {"$project": {"invites": {"$size": {"$ifNull": ["$invites", []]}}}},
            {"$group": {"_id": None, "total_invites": {"$sum": "$invites"}}}
        ]
        agg = await teams_col.aggregate(pipeline).to_list(length=2)
        total_invites = agg[0]["total_invites"] if agg and len(agg) > 0 and "total_invites" in agg[0] else 0

        # Total acceptances
        total_acceptances = await team_invite_acceptances_col.count_documents({"institution_id": str(institution_id)})

        # Acceptance rate
        acceptance_rate = (total_acceptances / total_invites) if total_invites > 0 else None

        # Daily acceptances for the past `days` days
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        start = now - timedelta(days=int(days))
        pipeline2 = [
            {"$match": {"institution_id": str(institution_id), "accepted_at": {"$gte": start}}},
            {"$project": {"day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$accepted_at"}}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
            {"$sort": SON([("_id", 1)])}
        ]
        daily = await team_invite_acceptances_col.aggregate(pipeline2).to_list(length=100)

        # Convert list to map for easy lookup and fill zeros for missing days
        daily_map = {d["_id"]: d["count"] for d in daily}
        series = []
        for i in range(int(days)):
            day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
            series.append({"day": day, "count": int(daily_map.get(day, 0))})

        return {"status": "success", "total_invites": int(total_invites), "total_acceptances": int(total_acceptances), "acceptance_rate": acceptance_rate, "daily": series}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/join-by-invite")
async def join_by_invite(
    code: str = Body(embed=True),
    user: dict = Depends(get_auth_user),
):
    uid = str(user.get("user_id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    raw = str(code or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Invite code is required")

    # Support both permanent invite_code and time-limited invites[] codes
    team = await teams_col.find_one({"$or": [{"invite_code": raw.upper()}, {"invites.code": raw}]})
    if not team:
        raise HTTPException(status_code=404, detail="Invite code not found")

    event_id = str(team.get("event_id") or "")
    ev = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    limits = _team_size_limits(ev)
    if not limits:
        raise HTTPException(status_code=400, detail="Team size is not configured for this event")
    min_s, max_s = limits
    if len(team.get("members") or []) >= max_s:
        raise HTTPException(status_code=400, detail="Team is already full")

    # Check if registered for event, if not, auto-register them
    p = await participants_col.find_one({"event_id": event_id, "user_id": uid})
    if p and p.get("team_id"):
        raise HTTPException(status_code=400, detail="You are already in a team")

    if not p:
        from db import users_col
        u = await users_col.find_one({"user_id": uid}) or {}
        first_stage = None
        try:
            st = ev.get("stages")
            if isinstance(st, list) and st:
                first_stage = st[0].get("name") or st[0].get("id")
        except Exception:
            pass
        
        p = {
            "event_id": event_id,
            "institution_id": ev.get("institution_id"),
            "user_id": uid,
            "full_name": u.get("full_name") or u.get("name") or user.get("email") or uid,
            "email": u.get("email") or user.get("email") or "",
            "event_title": ev.get("title"),
            "registered_at": datetime.utcnow(),
            "status": "pending",
            "current_stage": first_stage,
            "source": "team_invite",
            "team_id": None
        }
        res = await participants_col.insert_one(p)
        p["_id"] = res.inserted_id
    
    existing_members = team.get("members", [])
    is_already_member = any(member.get("user_id") == uid for member in existing_members)
    if is_already_member:
        raise HTTPException(status_code=400, detail="You are already a member of this team")

    # Check if using permanent invite_code (skip expiry check)
    is_permanent = team.get("invite_code") and team["invite_code"] == raw.upper()

    if not is_permanent:
        invites = team.get("invites") or []
        inv = next((x for x in invites if str(x.get("code")) == raw), None)
        if not inv or inv.get("revoked"):
            raise HTTPException(status_code=400, detail="Invite is not active")
        try:
            exp = datetime.fromisoformat(str(inv.get("expires_at")).replace("Z", "+00:00"))
            if datetime.utcnow() > exp.replace(tzinfo=None):
                raise HTTPException(status_code=400, detail="Invite has expired")
        except HTTPException:
            raise
        except Exception:
            pass

    # Handle max_uses / single-use invites: increment use count and revoke if limit reached
    if not is_permanent:
        invites = team.get("invites") or []
        updated = False
        for i, inv in enumerate(invites):
            if str(inv.get("code")) == raw:
                uses = int(inv.get("uses", 0) or 0)
                max_uses = inv.get("max_uses")
                if max_uses is not None and uses >= int(max_uses):
                    raise HTTPException(status_code=400, detail="Invite has been used")
                uses += 1
                invites[i]["uses"] = uses
                # revoke if reached max_uses
                if max_uses is not None and uses >= int(max_uses):
                    invites[i]["revoked"] = True
                    invites[i]["revoked_at"] = datetime.utcnow().isoformat()
                updated = True
                break
        if updated:
            await teams_col.update_one({"_id": team["_id"]}, {"$set": {"invites": invites, "updated_at": datetime.utcnow()}})

    await teams_col.update_one(
        {"_id": team["_id"]},
        {
            "$push": {"members": {"user_id": uid, "role": "MEMBER"}},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
    await participants_col.update_one(
        {"_id": p["_id"]},
        {"$set": {"team_id": str(team["_id"]), "updated_at": datetime.utcnow()}},
    )
    # Notify existing members
    try:
        new_member_name = user.get("full_name") or user.get("name") or "A student"
        team_name = team.get("team_name", "Our Team")
        event_name = ev.get("title") or ev.get("name") or "the event"
        
        member_emails = []
        for m in team.get("members", []):
            m_uid = m.get("user_id")
            if m_uid:
                m_user = await users_col.find_one({"user_id": str(m_uid)})
                if m_user and m_user.get("email"):
                    member_emails.append(m_user["email"])
        
        if member_emails:
            subj = f"New member joined: {new_member_name} is now in your team!"
            body = get_team_join_template(new_member_name, team_name, event_name)
            for m_email in member_emails:
                asyncio.create_task(send_notification_email(m_email, subj, body))
            
            # Also create dynamic in-app notifications for existing members
            for m in team.get("members", []):
                m_uid = m.get("user_id")
                if m_uid:
                    asyncio.create_task(notifications_col.insert_one({
                        "user_id": str(m_uid),
                        "title": "New Team Member",
                        "message": f"{new_member_name} has joined your team '{team_name}' for {event_name}!",
                        "type": "team_update",
                        "is_read": False,
                        "created_at": datetime.utcnow()
                    }))
    except Exception as e:
        logger.error(f"Error sending team join notification: {e}")

    # Notify Institution
    inst_id = ev.get("institution_id")
    if inst_id:
        from notification_helpers import notify_institution
        asyncio.create_task(notify_institution(
            institution_id=inst_id,
            title="Team Update",
            message=f"A student has joined a team for {ev.get('title')}.",
            ntype="info"
        ))

    # Record invite acceptance in audit collection
    try:
        from db import team_invite_acceptances_col, users_col
        user_doc = await users_col.find_one({"user_id": uid}) or {}
        acceptance = {
            "team_id": str(team["_id"]),
            "event_id": event_id,
            "institution_id": ev.get("institution_id"),
            "user_id": uid,
            "user_email": user_doc.get("email") or user.get("email") or None,
            "invite_code": raw,
            "accepted_at": datetime.utcnow(),
            "source": "invite_join"
        }
        await team_invite_acceptances_col.insert_one(acceptance)
    except Exception as e:
        logger.error(f"Warning: failed to write invite acceptance audit: {e}")

    return {"status": "success", "team_id": str(team["_id"]), "event_id": event_id}


@router.get("/preview")
async def preview_invite(code: str):
    """Preview an invite code without joining. Publicly accessible — returns team & event summary and invite metadata."""
    raw = str(code or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Invite code is required")

    # Find team by permanent invite_code or invites.code
    team = await teams_col.find_one({"$or": [{"invite_code": raw.upper()}, {"invites.code": raw}]})
    if not team:
        raise HTTPException(status_code=404, detail="Invite code not found")

    event_id = str(team.get("event_id") or "")
    ev = None
    try:
        if event_id:
            ev = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    except Exception:
        ev = None

    invites = team.get("invites") or []
    inv = next((x for x in invites if str(x.get("code")) == raw), None)
    is_permanent = bool(team.get("invite_code") and team.get("invite_code") == raw.upper())

    # Build normalized invite metadata
    invite_meta = None
    if is_permanent:
        invite_meta = {"type": "permanent"}
    elif inv:
        invite_meta = {
            "code": str(inv.get("code")),
            "email": inv.get("email"),
            "uses": int(inv.get("uses", 0) or 0),
            "max_uses": inv.get("max_uses"),
            "revoked": bool(inv.get("revoked", False)),
            "expires_at": (inv.get("expires_at") if isinstance(inv.get("expires_at"), str) else (inv.get("expires_at").isoformat() if inv.get("expires_at") else None)),
        }

    members_count = len(team.get("members") or [])
    limits = _team_size_limits(ev or {})
    min_s = max_s = None
    if limits:
        min_s, max_s = limits

    return {
        "status": "success",
        "team": {
            "team_id": str(team.get("_id")),
            "team_name": team.get("team_name") or team.get("name") or None,
            "members_count": members_count,
            "max_team_size": max_s,
            "min_team_size": min_s,
            "team_size_configured": bool(limits),
        },
        "event": {
            "event_id": event_id,
            "title": (ev.get("title") if ev else None),
        },
        "invite": invite_meta,
    }


    # NOTE: invitation acceptance audit is inserted earlier when available

