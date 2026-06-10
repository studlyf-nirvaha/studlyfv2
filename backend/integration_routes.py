from datetime import datetime, timezone
import asyncio
import os
import re
import uuid
import shutil
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, Form, File, UploadFile, Body, Depends, Query, Response
from auth_institution import get_auth_user, get_auth_user_optional, assert_institution_scope, assert_institution_owns_event
from services.email_service import (
    send_notification_email,
    get_certificate_template,
    get_shortlist_template,
    get_announcement_template,
    get_status_update_template,
    get_winner_announcement_template,
    get_feedback_request_template,
    get_certificate_issued_template,
    get_registration_deadline_reminder_template,
    get_event_published_template,
)
from services.institutional_analytics_service import analytics_service
from services.institutional_certificate_service import certificate_service
from services.leaderboard_service import leaderboard_service
from db import db, leaderboard_col, events_col, participants_col, certificates_col, notifications_col, institutions_col, users_col, teams_col, submissions_col, submission_data_col, scores_col, results_col, audit_logs_col, opportunities_col, opportunity_applications_col, hackathon_submissions_col, event_certificates_col, avatars_col
from bson import ObjectId
from services.audit_service import log_admin_action
from notification_helpers import notify_institution

from services.subscription_service import validate_new_listing_against_plan
import logging

# Ensure upload directory exists
EVENTS_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "events")
os.makedirs(EVENTS_UPLOAD_DIR, exist_ok=True)
INSTITUTIONS_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "institutions")
os.makedirs(INSTITUTIONS_UPLOAD_DIR, exist_ok=True)

BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_live_like_status(value: str) -> bool:
    return str(value or "").strip().upper() in {"LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"}


def _strict_team_size_bounds(event_data: dict) -> Optional[tuple[int, int]]:
    min_raw = event_data.get("minTeamSize") if event_data else None
    if min_raw is None and event_data:
        min_raw = event_data.get("min_team_size")
    max_raw = event_data.get("maxTeamSize") if event_data else None
    if max_raw is None and event_data:
        max_raw = event_data.get("max_team_size")
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


def _event_id_query(event_id: str) -> dict:
    """
    Build a MongoDB query that finds an event regardless of whether
    the event_id is a 24-char ObjectId hex or a UUID/string.
    Prevents bson.errors.InvalidId crashes on UUID-format IDs.
    """
    from bson.errors import InvalidId
    or_clauses = [{"_id": event_id}]  # string _id fallback
    try:
        or_clauses.append({"_id": ObjectId(event_id)})
    except (InvalidId, ValueError):
        pass
    return {"$or": or_clauses}


async def collect_event_id_variants(event_id: str, event: dict | None = None) -> list:
    """All event_id strings that may appear on submissions, scores, and teams."""
    from routes.registration_flow_routes import resolve_event_id

    variants: list = []

    def _add(value) -> None:
        if value is None:
            return
        s = str(value).strip()
        if s and s not in variants:
            variants.append(s)

    _add(event_id)
    try:
        _add(await resolve_event_id(event_id))
    except Exception:
        pass

    if event is None:
        try:
            event = await events_col.find_one(_event_id_query(event_id))
        except Exception:
            event = None
    if event:
        _add(event.get("_id"))
        _add(event.get("event_id"))
        _add(event.get("event_link_id"))

    opp_or: list = []
    for vid in list(variants):
        opp_or.append({"event_link_id": vid})
        if ObjectId.is_valid(vid):
            try:
                opp_or.append({"_id": ObjectId(vid)})
            except Exception:
                pass
    if opp_or:
        async for opp in opportunities_col.find({"$or": opp_or}, {"_id": 1, "event_link_id": 1}):
            _add(opp.get("_id"))
            _add(opp.get("event_link_id"))

    return variants


def _strip_data_uri(value):
    """Omit base64 data URIs from API payloads — they can be hundreds of KB each."""
    if isinstance(value, str) and value.startswith("data:"):
        return None
    return value


def _resolve_institution_logo_url(institution_id: str, profile: dict) -> str | None:
    """Return a logo URL usable by the navbar (file path, https, or compact data URI)."""
    raw = profile.get("logo_url") or profile.get("logo") or profile.get("image_url")
    if not raw or not isinstance(raw, str):
        file_logo = os.path.join(INSTITUTIONS_UPLOAD_DIR, institution_id, "logo")
        for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            if os.path.isfile(file_logo + ext):
                return f"/api/v1/institution/profile/{institution_id}/media/logo"
        return None
    if raw.startswith("/api/"):
        return raw
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw.startswith("data:image/"):
        return raw
    return raw


def _strip_event_payload_bloat(event: dict) -> dict:
    """Remove embedded base64 media and oversized editor payloads from event reads."""
    out = dict(event)
    for key in ("logo_url", "logo", "banner_url", "banner", "image_url", "image", "logoUrl", "bannerUrl"):
        if key in out:
            out[key] = _strip_data_uri(out.get(key)) or out.get(key) if not str(out.get(key) or "").startswith("data:") else ""
    if isinstance(out.get("stages"), list):
        cleaned_stages = []
        for stage in out["stages"]:
            if not isinstance(stage, dict):
                continue
            s = dict(stage)
            for blob_key in ("logo_url", "banner_url", "image_url"):
                if blob_key in s:
                    s[blob_key] = _strip_data_uri(s.get(blob_key))
            cleaned_stages.append(s)
        out["stages"] = cleaned_stages
    return out


async def _enrich_judge_assignment_scores(assignments: list, judge_email: str, judge_user_id: str = "") -> list:
    """Attach existing rubric scores for the current judge to each assignment."""
    if not assignments:
        return assignments
    sub_ids = [str(a.get("_id")) for a in assignments if a.get("_id")]
    score_query: dict = {"submission_id": {"$in": sub_ids}}
    if judge_user_id:
        score_query["$or"] = [{"judge_email": judge_email}, {"judge_id": judge_user_id}]
    else:
        score_query["judge_email"] = judge_email
    score_map: dict[str, dict] = {}
    async for sc in scores_col.find(score_query):
        sid = str(sc.get("submission_id") or "")
        if sid:
            score_map[sid] = {
                "scores": sc.get("scores") or sc.get("criteria_scores") or {},
                "comments": sc.get("feedback") or sc.get("comments") or "",
                "total_score": sc.get("total_score"),
            }
    for item in assignments:
        item["existing_scores"] = score_map.get(str(item.get("_id")))
    return assignments


async def _list_submissions_for_judge_user(
    user: dict,
    event_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list:
    """Return stage + legacy submissions assigned to the authenticated judge's email."""
    email = (user.get("email") or "").strip().lower()
    judge_user_id = str(user.get("user_id") or user.get("id") or "")
    if not email:
        raise HTTPException(status_code=400, detail="Your account must have an email to load judge assignments")

    review_statuses = [
        "Submitted", "Under Review", "Scored", "Assigned", "Pending Review",
        "submitted", "under review", "scored",
    ]
    out: list[dict] = []
    seen: set[str] = set()

    def _judge_assigned(doc: dict) -> bool:
        emails = doc.get("assigned_judge_emails") or []
        norm = {str(a).strip().lower() for a in emails if a}
        if email in norm:
            return True
        for aj in doc.get("assigned_judges") or []:
            if isinstance(aj, dict) and str(aj.get("email") or "").strip().lower() == email:
                return True
        return False

    legacy_q: dict = {"status": {"$in": review_statuses}}
    if event_id:
        legacy_q["event_id"] = event_id
    async for doc in submissions_col.find(legacy_q):
        if not _judge_assigned(doc):
            continue
        sid = str(doc["_id"])
        if sid in seen:
            continue
        seen.add(sid)
        row = dict(doc)
        row["_id"] = sid
        row["source"] = "submissions_col"
        row["team_name"] = row.get("team_name") or row.get("title") or row.get("project_title") or "Team"
        out.append(row)

    sd_q: dict = {"status": {"$in": review_statuses}}
    if event_id:
        sd_q["event_id"] = event_id
    async for doc in submission_data_col.find(sd_q):
        if not _judge_assigned(doc):
            continue
        sid = str(doc["_id"])
        if sid in seen:
            continue
        seen.add(sid)
        row = dict(doc)
        row["_id"] = sid
        row["source"] = "stage_deliverable"
        row["team_name"] = (
            row.get("team_name") or row.get("user_name")
            or (row.get("data") or {}).get("team_display_name")
            or row.get("title") or "Submission"
        )
        row["project_title"] = row.get("stage_name") or row.get("title") or ""
        out.append(row)

    out.sort(key=lambda x: str(x.get("submitted_at") or x.get("created_at") or ""), reverse=True)
    sliced = out[offset : offset + max(1, min(limit, 100))]
    return await _enrich_judge_assignment_scores(sliced, email, judge_user_id)

@router.post("/test-email")
async def test_email_configuration(user: dict = Depends(get_auth_user)):
    """Verifies that SMTP settings are working by sending a test email."""
    from services.email_service import send_notification_email
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Authenticated user has no email")
    
    subject = "🔔 Studlyf SMTP Test"
    body = f"<h1>Connection Successful!</h1><p>This is a test email to verify your SMTP configuration. If you received this, your email system is properly connected.</p>"
    
    success = await send_notification_email(email, subject, body)
    if success:
        return {"status": "success", "message": f"Test email sent to {email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check your SMTP credentials in the environment.")


# A sliding window memory rate limiter for testing emails: max 3 requests per minute per (user_id, IP)
TEST_EMAIL_LIMITS = {}

@router.get("/api/v1/communication/variables")
async def get_communication_variables(user: dict = Depends(get_auth_user)):
    """
    Exposes the central AVAILABLE_STAGE_VARIABLES registry to the frontend.
    """
    from services.email_template_service import AVAILABLE_STAGE_VARIABLES
    return {
        "status": "success",
        "variables": AVAILABLE_STAGE_VARIABLES
    }

@router.post("/events/{event_id}/stages/{stage_id}/send-test-email")
async def send_test_stage_email(
    event_id: str,
    stage_id: str,
    request: Request,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """
    Sends a real test email representing the custom stage transition email.
    """
    await assert_institution_owns_event(event_id, user)
    
    # ── Sliding Window Memory Rate Limiter (Max 3 requests/min per (user_id, IP)) ──
    import time
    user_id = str(user.get("user_id", "anonymous"))
    client_ip = request.client.host if request.client else "127.0.0.1"
    limiter_key = (user_id, client_ip)
    
    current_time = time.time()
    one_minute_ago = current_time - 60.0
    
    if limiter_key not in TEST_EMAIL_LIMITS:
        TEST_EMAIL_LIMITS[limiter_key] = []
        
    # Filter out timestamps older than 1 minute
    TEST_EMAIL_LIMITS[limiter_key] = [ts for ts in TEST_EMAIL_LIMITS[limiter_key] if ts > one_minute_ago]
    
    if len(TEST_EMAIL_LIMITS[limiter_key]) >= 3:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 3 test emails per minute. Please wait before retrying."
        )
        
    TEST_EMAIL_LIMITS[limiter_key].append(current_time)

    # Get test recipient email
    recipient = data.get("test_email") or user.get("email")
    if not recipient:
        raise HTTPException(status_code=400, detail="Recipient email is required")
        
    # Strict regex recipient validation
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_regex, recipient.strip()):
        raise HTTPException(status_code=400, detail="Invalid recipient email format")
        
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Find the stage
    target_stage = None
    for stage in event.get("stages", []):
        if stage.get("id") == stage_id:
            target_stage = stage
            break
            
    # Allow overrides directly from the request (unsaved UI states)
    subject_override = data.get("email_subject_override")
    body_markdown = data.get("email_body_markdown")
    
    if subject_override is None or body_markdown is None:
        if target_stage:
            comm = target_stage.get("communication", {})
            if subject_override is None:
                subject_override = comm.get("email_subject_override")
            if body_markdown is None:
                body_markdown = comm.get("email_body_markdown")
                
    if not subject_override and not body_markdown:
        # Fall back to defaults
        subject_override = "Congratulations {{team_name}}! You've advanced to {{stage_name}}"
        body_markdown = """Hello **{{participant_name}}**,

Congratulations! Team **"{{team_name}}"** has successfully qualified for **{{stage_name}}** in the event **{{event_name}}**.

Please log in to your StudLyf Event Hub to check details and updated deadlines.

Good luck in the next round!"""

    # Validate placeholders
    from services.email_template_service import validate_stage_email_placeholders
    invalid_vars = validate_stage_email_placeholders(subject_override or "", body_markdown or "")
    if invalid_vars:
        raise HTTPException(
            status_code=400,
            detail=f"Template contains invalid placeholders: {', '.join([f'{{{{{v}}}}}' for v in invalid_vars])}. "
                   f"Allowed variables: {{{{participant_name}}}}, {{{{team_name}}}}, {{{{stage_name}}}}, {{{{event_name}}}}, {{{{deadline}}}}, {{{{event_link}}}}"
        )

    stage_name = target_stage.get("name") if target_stage else "Next Round"
    
    # Mock context variables for the test email
    mock_context = {
        "team_name": "Apex Coders",
        "event_name": event.get("title", "StudLyf Hackathon"),
        "stage_name": stage_name,
        "participant_name": "Alex Mercer",
        "deadline": "2026-05-29",
        "event_link": "http://localhost:3000/dashboard/learner",
    }
    
    from services.email_template_service import render_stage_custom_email
    from services.email_service import send_notification_email
    
    subject, html_body = render_stage_custom_email(subject_override, body_markdown, mock_context)
    
    success = await send_notification_email(recipient, f"[TEST] {subject}", html_body)
    if success:
        # Log successful test dispatch in email_delivery_logs
        from db import email_delivery_logs_col
        await email_delivery_logs_col.insert_one({
            "recipient": recipient.strip(),
            "subject": f"[TEST] {subject}",
            "status": "test_sent",
            "attempts": 1,
            "provider": "SMTP",
            "metadata": {
                "event_id": event_id,
                "stage_id": stage_id,
                "user_id": user_id,
                "is_test": True
            },
            "created_at": datetime.utcnow()
        })
        return {"status": "success", "message": f"Test email sent to {recipient}"}
    else:
        # Log failed test dispatch in email_delivery_logs
        from db import email_delivery_logs_col
        await email_delivery_logs_col.insert_one({
            "recipient": recipient.strip(),
            "subject": f"[TEST] {subject}",
            "status": "failed",
            "attempts": 1,
            "provider": "SMTP",
            "failure_reason": "Failed to send test email via SMTP.",
            "metadata": {
                "event_id": event_id,
                "stage_id": stage_id,
                "user_id": user_id,
                "is_test": True
            },
            "created_at": datetime.utcnow()
        })
        raise HTTPException(status_code=500, detail="Failed to send test email via SMTP.")



@router.post("/profile")
async def create_institution_profile(profile: dict, user: dict = Depends(get_auth_user)):
    """Saves a new institution profile to MongoDB. Requires authentication."""
    from db import institutions_col

    # Always use the authenticated user's institution_id as source of truth
    inst_id = str(user.get("institution_id") or "").strip()
    if not inst_id:
        raise HTTPException(status_code=400, detail="User profile does not have an institution_id")

    if not profile.get("name") or not str(profile.get("name", "")).strip():
        raise HTTPException(status_code=400, detail="Institution name is required")

    # Try to find existing institution by institution_id, then by user email
    existing = await institutions_col.find_one({"institution_id": inst_id})
    if not existing:
        user_email = str(user.get("email") or "").strip().lower()
        if user_email:
            existing = await institutions_col.find_one({"email": user_email})

    if existing:
        # Preserve existing logo and banner if missing in request
        if not profile.get("logo_url") and existing.get("logo_url"):
            profile["logo_url"] = existing["logo_url"]
        if not profile.get("banner_url") and existing.get("banner_url"):
            profile["banner_url"] = existing["banner_url"]

    # CRITICAL: Remove MongoDB's internal _id to avoid immutable field errors
    if "_id" in profile:
        del profile["_id"]
        
    profile["institution_id"] = inst_id 
    profile["updated_at"] = datetime.utcnow()

    # Remove empty fields that have unique sparse indexes to avoid duplicate key errors
    for key in ("email", "name"):
        if key in profile and not profile[key]:
            del profile[key]

    if existing:
        await institutions_col.update_one(
            {"_id": existing["_id"]},
            {"$set": profile}
        )
    else:
        try:
            await institutions_col.insert_one(profile)
        except Exception as e:
            if "duplicate key" in str(e).lower():
                raise HTTPException(status_code=409, detail="An institution with this name already exists. Please choose a different name.")
            raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(e)}")
    return {"status": "success"}

@router.get("/profile/{institution_id}/branding")
async def get_institution_branding(institution_id: str, user: dict = Depends(get_auth_user)):
    """Lightweight institution branding for navbar (name + logo URL only, no base64 blobs)."""
    assert_institution_scope(institution_id, user)
    profile = await institutions_col.find_one(
        {"institution_id": institution_id},
        {"name": 1, "institution_name": 1, "logo_url": 1, "logo": 1, "image_url": 1},
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Institution not found")
    logo = _resolve_institution_logo_url(institution_id, profile)
    return {
        "institution_id": institution_id,
        "name": profile.get("name") or profile.get("institution_name") or "Institution",
        "logo_url": logo,
    }


@router.get("/profile/{institution_id}/media/{asset}")
async def get_institution_media(institution_id: str, asset: str):
    """Serve institution logo/banner from disk (fallback: decode stored data URI once)."""
    from fastapi.responses import Response
    import base64

    base_asset = str(asset or "").split(".")[0].lower()
    if base_asset not in ("logo", "banner"):
        raise HTTPException(status_code=404, detail="Not found")

    inst_dir = os.path.join(INSTITUTIONS_UPLOAD_DIR, institution_id)
    if os.path.isdir(inst_dir):
        for fname in os.listdir(inst_dir):
            if fname.startswith(f"{base_asset}."):
                fpath = os.path.join(inst_dir, fname)
                ext = os.path.splitext(fname)[1].lower()
                mime = "image/png"
                if ext in (".jpg", ".jpeg"):
                    mime = "image/jpeg"
                elif ext == ".webp":
                    mime = "image/webp"
                elif ext == ".gif":
                    mime = "image/gif"
                with open(fpath, "rb") as fh:
                    return Response(content=fh.read(), media_type=mime)

    profile = await institutions_col.find_one({"institution_id": institution_id})
    if profile:
        raw = profile.get(f"{base_asset}_url") or (profile.get("logo") if base_asset == "logo" else None)
        if isinstance(raw, str) and raw.startswith("data:"):
            header, _, encoded = raw.partition(",")
            mime = header[5:].split(";")[0] if header.startswith("data:") else "image/png"
            try:
                return Response(content=base64.b64decode(encoded), media_type=mime)
            except Exception:
                pass
    raise HTTPException(status_code=404, detail="Media not found")


@router.get("/profile/{institution_id}")
async def get_institution_profile(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves the full profile of an institution including team and social links."""
    profile = await institutions_col.find_one({"institution_id": institution_id})
    if not profile:
        user_email = str(user.get("email") or "").strip().lower()
        if user_email:
            profile = await institutions_col.find_one({"email": user_email})
    if not profile:
        user_inst_id = str(user.get("institution_id") or "").strip()
        if user_inst_id and user_inst_id != institution_id:
            profile = await institutions_col.find_one({"institution_id": user_inst_id})
        # Don't return fallback - return 404 to force proper institution setup
        raise HTTPException(status_code=404, detail="Institution profile not found. Please complete institution setup.")
    
    # Clean ID
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    return profile

@router.get("/summary/{institution_id}")
async def fetch_summary(institution_id: str, user: dict = Depends(get_auth_user)):
    """Dynamically aggregates real-time metrics for the dashboard."""
    assert_institution_scope(institution_id, user)
    return await analytics_service.get_kpi_summary(institution_id)

def _resolve_event_dates(doc: dict) -> tuple:
    fd = doc.get("festivalData") if isinstance(doc.get("festivalData"), dict) else {}
    form = doc.get("formData") if isinstance(doc.get("formData"), dict) else {}
    stages = doc.get("stages") if isinstance(doc.get("stages"), list) else []
    first = stages[0] if stages and isinstance(stages[0], dict) else {}
    start = (
        doc.get("start_date") or doc.get("startDate") or doc.get("eventStartDate")
        or doc.get("registrationStartDate") or fd.get("startDate") or form.get("startDate")
        or first.get("start_date") or first.get("startDate")
    )
    end = (
        doc.get("end_date") or doc.get("endDate") or doc.get("eventEndDate")
        or doc.get("registrationDeadline") or doc.get("deadline")
        or fd.get("endDate") or form.get("endDate")
        or first.get("end_date") or first.get("endDate") or first.get("deadline")
    )
    return start, end


def _event_list_row(doc: dict, participant_count: int = 0) -> dict:
    logo = _strip_data_uri(doc.get("logo_url") or doc.get("logo") or doc.get("image_url") or doc.get("image"))
    start_date, end_date = _resolve_event_dates(doc)
    return {
        "_id": str(doc.get("_id", "")),
        "title": doc.get("title") or doc.get("name") or "Untitled",
        "status": doc.get("status", "Draft"),
        "category": doc.get("category") or doc.get("type") or "Event",
        "start_date": start_date,
        "end_date": end_date,
        "created_at": doc.get("created_at") or doc.get("createdAt") or doc.get("deadline"),
        "participant_count": participant_count,
        "logo_url": logo,
        "image_url": logo,
    }


@router.get("/events/{institution_id}/summary")
async def get_events_summary(
    institution_id: str,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_auth_user),
):
    """Lightweight event/opportunity list for dashboard widgets (no stages, descriptions, or base64 logos)."""
    assert_institution_scope(institution_id, user)
    from db import opportunity_applications_col

    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    events_list: list[dict] = []
    event_ids: set[str] = set()

    participant_counts: dict[str, int] = {}
    async for row in participants_col.aggregate([
        {"$group": {"_id": "$event_id", "count": {"$sum": 1}}},
    ]):
        if row.get("_id") is not None:
            participant_counts[str(row["_id"])] = int(row.get("count") or 0)

    portal_counts: dict[str, int] = {}
    async for row in opportunity_applications_col.aggregate([
        {"$group": {"_id": "$opportunity_id", "count": {"$sum": 1}}},
    ]):
        if row.get("_id") is not None:
            portal_counts[str(row["_id"])] = int(row.get("count") or 0)

    linked_opps: dict[str, str] = {}
    async for opp in opportunities_col.find(
        {"event_link_id": {"$exists": True, "$ne": None}},
        {"_id": 1, "event_link_id": 1},
    ):
        linked_opps[str(opp.get("event_link_id"))] = str(opp["_id"])

    e_cursor = events_col.find(
        {"institution_id": institution_id, "status": {"$ne": "DELETED"}},
        {
            "_id": 1, "title": 1, "status": 1, "category": 1, "type": 1,
            "start_date": 1, "end_date": 1, "startDate": 1, "endDate": 1,
            "eventStartDate": 1, "eventEndDate": 1, "registrationStartDate": 1, "registrationDeadline": 1,
            "festivalData": 1, "formData": 1, "stages": 1, "deadline": 1,
            "created_at": 1, "createdAt": 1, "logo_url": 1, "logo": 1, "image_url": 1, "image": 1,
        },
    )
    async for event in e_cursor:
        eid = str(event["_id"])
        event_ids.add(eid)
        booth = participant_counts.get(eid, 0)
        linked_id = linked_opps.get(eid)
        portal = portal_counts.get(linked_id, 0) if linked_id else 0
        events_list.append(_event_list_row(event, booth + portal))

    o_cursor = opportunities_col.find(
        {"$or": [{"institution_id": institution_id}, {"createdBy": institution_id}]},
        {
            "_id": 1, "title": 1, "status": 1, "type": 1, "category": 1,
            "start_date": 1, "end_date": 1, "startDate": 1, "endDate": 1,
            "eventStartDate": 1, "eventEndDate": 1, "registrationStartDate": 1, "registrationDeadline": 1,
            "festivalData": 1, "formData": 1, "stages": 1, "deadline": 1,
            "created_at": 1, "createdAt": 1, "event_link_id": 1,
            "logo_url": 1, "logo": 1, "image_url": 1, "image": 1,
        },
    )
    async for opp in o_cursor:
        link = opp.get("event_link_id")
        if link and str(link) in event_ids:
            continue
        opp_id = str(opp["_id"])
        row = _event_list_row(opp, portal_counts.get(opp_id, 0))
        row["category"] = opp.get("type", "Opportunity")
        row["status"] = (opp.get("status") or "Active").upper()
        events_list.append(row)

    def _sort_key(x):
        val = x.get("created_at") or ""
        if hasattr(val, "isoformat"):
            return val.isoformat()
        return str(val)

    events_list.sort(key=_sort_key, reverse=True)
    total = len(events_list)
    return {"items": events_list[offset : offset + limit], "total": total, "limit": limit, "offset": offset}


@router.get("/events/{institution_id}")
async def get_all_events(institution_id: str, user: dict = Depends(get_auth_user)):
    """Institution listings: events from `events` plus standalone opportunities (jobs/internships).

    Rows mirrored from events (`event_link_id` → event `_id`) are omitted to avoid duplicate titles
    and wrong IDs when opening Event Details (which expects an event id).
    Registration counts combine `participants` and portal applications on the linked opportunity.
    """
    assert_institution_scope(institution_id, user)
    from db import opportunity_applications_col

    events_list = []
    event_ids = set()

    e_cursor = events_col.find({"institution_id": institution_id, "status": {"$ne": "DELETED"}})
    async for event in e_cursor:
        eid = str(event["_id"])
        event_ids.add(eid)
        event["_id"] = eid

        booth = await participants_col.count_documents({"event_id": eid})
        linked = await opportunities_col.find_one({"event_link_id": eid})
        portal = 0
        if linked:
            portal = await opportunity_applications_col.count_documents({"opportunity_id": str(linked["_id"])})
        event["participant_count"] = booth + portal
        events_list.append(event)

    o_cursor = opportunities_col.find({
        "$or": [{"institution_id": institution_id}, {"createdBy": institution_id}]
    })
    async for opp in o_cursor:
        link = opp.get("event_link_id")
        if link and str(link) in event_ids:
            continue

        opp_id = str(opp["_id"])
        opp["_id"] = opp_id
        opp["organisation"] = opp.get("organisation") or opp.get("organization") or ""
        opp["participant_count"] = await opportunity_applications_col.count_documents({"opportunity_id": opp_id})
        opp["status"] = opp.get("status", "Active").upper()
        opp["category"] = opp.get("type", "Opportunity")
        events_list.append(opp)

    def _sort_key(x):
        val = x.get("created_at") or x.get("createdAt") or x.get("deadline") or ""
        # Normalize datetime objects to ISO string so str/datetime comparison never occurs
        if hasattr(val, "isoformat"):
            return val.isoformat()
        return str(val)

    events_list.sort(key=_sort_key, reverse=True)

    return events_list

@router.delete("/events/{event_id}")
async def delete_institution_listing(event_id: str, user: dict = Depends(get_auth_user)):
    """Deletes an event or a standalone opportunity listing owned by the institution."""
    from db import events_col, opportunities_col
    from bson import ObjectId
    
    # Try deleting from events first
    try:
        event_result = await events_col.delete_one({"_id": ObjectId(event_id)})
        if event_result.deleted_count > 0:
            # Also clean up any associated opportunities mirrored from this event
            await opportunities_col.delete_many({"event_link_id": event_id})
            # Cascade delete related data
            from db import participants_col, teams_col, submissions_col, submission_data_col, hackathon_submissions_col, scores_col
            try:
                await participants_col.delete_many({"event_id": event_id})
            except: pass
            try:
                await teams_col.delete_many({"event_id": event_id})
            except: pass
            try:
                await submissions_col.delete_many({"event_id": event_id})
            except: pass
            try:
                await submission_data_col.delete_many({"event_id": event_id})
            except: pass
            try:
                await hackathon_submissions_col.delete_many({"hackathonId": event_id})
            except: pass
            try:
                await scores_col.delete_many({"event_id": event_id})
            except: pass
            return {"status": "success", "message": "Event deleted successfully"}
    except Exception:
        pass
        
    # Try deleting from standalone opportunities
    try:
        opp_result = await opportunities_col.delete_one({"_id": ObjectId(event_id)})
        if opp_result.deleted_count > 0:
            return {"status": "success", "message": "Opportunity deleted successfully"}
    except Exception:
        pass
        
    raise HTTPException(status_code=404, detail="Listing not found")

@router.get("/events/{event_id}/participants")
async def get_event_participants(event_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves all students registered for a specific event, including opportunity applicants."""
    await assert_institution_owns_event(event_id, user)
    from db import opportunity_applications_col, opportunities_col
    from bson import ObjectId
    
    students = []
    seen_row_ids = set()
    seen_user_ids = set()

    # Robust event_id variants
    ev_id_variants = [event_id, str(event_id)]
    try:
        if len(str(event_id)) == 24:
            ev_id_variants.append(ObjectId(event_id))
    except:
        pass

    linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_id_variants}})
    opp_id_ctx = str(linked_opp["_id"]) if linked_opp else None

    # 1. Traditional participants collection
    cursor = participants_col.find({"event_id": {"$in": ev_id_variants}})
    async for student in cursor:
        sid = str(student["_id"])
        student["_id"] = sid
        student["full_name"] = student.get("full_name") or student.get("name") or "Student"
        if opp_id_ctx:
            student["opportunity_id"] = opp_id_ctx
        oaid = student.get("opportunity_application_id")
        if oaid is not None:
            student["opportunity_application_id"] = str(oaid)
        seen_row_ids.add(sid)
        u = student.get("user_id")
        if u:
            seen_user_ids.add(str(u))

        # Enrich with team member data if participant belongs to a team
        team_id = student.get("team_id")
        if team_id:
            try:
                team_doc = await teams_col.find_one({"_id": ObjectId(str(team_id))})
                if team_doc:
                    student["team_name"] = team_doc.get("team_name", "")
                    student["team_members"] = team_doc.get("members", [])
                    student["team_leader_id"] = team_doc.get("team_leader_id")
                else:
                    student["team_name"] = None
                    student["team_members"] = []
            except Exception:
                student["team_name"] = None
                student["team_members"] = []

        students.append(student)

    # 2. Merge portal applicants not already represented in participants_col
    try:
        if linked_opp and opp_id_ctx:
            opp_id = opp_id_ctx
            app_cursor = opportunity_applications_col.find({"opportunity_id": opp_id})
            async for app in app_cursor:
                aid = str(app["_id"])
                uid = str(app.get("user_id") or "")
                if uid and uid in seen_user_ids:
                    continue
                if aid in seen_row_ids:
                    continue
                seen_row_ids.add(aid)
                if uid:
                    seen_user_ids.add(uid)
                students.append({
                    "_id": aid,
                    "opportunity_application_id": aid,
                    "opportunity_id": opp_id,
                    "user_id": uid or None,
                    "full_name": app.get("name") or "Applicant",
                    "email": app.get("email"),
                    "event_id": event_id,
                    "status": app.get("status", "pending"),
                    "registered_at": app.get("applied_at"),
                    "resume_url": app.get("resume_url"),
                    "interest_reason": app.get("interest_reason"),
                    "registration_responses": app.get("registration_responses"),
                    "source": "opportunity_application",
                })
    except Exception as e:
        logger.error(f"[PARTICIPANTS] Failed to fetch opportunity applicants: {e}")

    # 3. Merge hackathon submissions (Submission-Only Mode)
    try:
        hackathon_id_variants = [str(v) for v in ev_id_variants]
        if opp_id_ctx:
            hackathon_id_variants.append(opp_id_ctx)
            
        h_cursor = hackathon_submissions_col.find({"hackathonId": {"$in": hackathon_id_variants}})
        async for sub in h_cursor:
            uid = sub.get("submittedBy") or sub.get("user_id")
            if uid and str(uid) in seen_user_ids:
                continue
            
            sid = str(sub["_id"])
            if sid in seen_row_ids:
                continue
            
            seen_row_ids.add(sid)
            if uid:
                seen_user_ids.add(str(uid))
            
            # Detailed hydration from users collection
            u_name = sub.get("teamLead") or "Hackathon Participant"
            u_email = sub.get("email") or "Subscribed via Hackathon"
            u_college = sub.get("college_name") or sub.get("institutionId")
            
            if uid:
                from db import users_col
                u_profile = await users_col.find_one({"user_id": uid})
                if u_profile:
                    u_name = u_profile.get("full_name") or u_profile.get("name") or u_name
                    u_email = u_profile.get("email") or u_email
                    u_college = u_profile.get("college_name") or u_profile.get("institution_name") or u_college

            students.append({
                "_id": sid,
                "user_id": uid,
                "full_name": u_name,
                "email": u_email,
                "event_id": event_id,
                "registration_status": "Registered",
                "registered_at": sub.get("createdAt"),
                "source": "hackathon_submission",
                "college_name": u_college
            })
    except Exception as e:
        logger.error(f"[PARTICIPANTS] Failed to fetch hackathon submissions: {e}")

    # Apply plan-based application view limits
    try:
        event_doc = await events_col.find_one({"event_id": event_id})
        if not event_doc:
            event_doc = await opportunities_col.find_one({"event_link_id": event_id})
        inst_id = (event_doc or {}).get("institution_id")
        if inst_id:
            from services.subscription_service import get_current_plan_rules
            rules = await get_current_plan_rules(inst_id)
            max_views = rules.get("max_app_views")
            if max_views is not None and len(students) > int(max_views):
                students = students[:int(max_views)]
    except Exception:
        pass

    return students


@router.get("/events/{event_id}/teams")
async def get_event_teams(event_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves all teams registered for a specific event (batched enrichment)."""
    event_doc = await assert_institution_owns_event(event_id, user)

    ev_id_variants = list({str(event_doc["_id"]), event_doc["_id"], event_id})
    if event_doc.get("event_id"):
        ev_id_variants.append(event_doc["event_id"])
    if event_doc.get("event_link_id"):
        ev_id_variants.append(event_doc["event_link_id"])

    from db import teams_col
    raw_teams = await teams_col.find({"event_id": {"$in": ev_id_variants}}).to_list(length=5000)

    all_member_ids: set[str] = set()
    for team in raw_teams:
        for m in team.get("members") or []:
            uid = str(m.get("user_id") or "")
            if uid:
                all_member_ids.add(uid)

    user_map: dict[str, dict] = {}
    participant_map: dict[str, str] = {}
    submitted_user_ids: set[str] = set()

    if all_member_ids:
        member_list = list(all_member_ids)
        async for u in users_col.find(
            {"user_id": {"$in": member_list}},
            {"user_id": 1, "full_name": 1, "name": 1, "email": 1},
        ):
            user_map[str(u["user_id"])] = {
                "name": u.get("full_name") or u.get("name") or "Student",
                "email": u.get("email"),
            }
        async for p in participants_col.find(
            {"event_id": {"$in": ev_id_variants}, "user_id": {"$in": member_list}},
            {"user_id": 1, "status": 1},
        ):
            participant_map[str(p["user_id"])] = p.get("status", "registered")
        async for s in submissions_col.find(
            {"event_id": {"$in": ev_id_variants}, "user_id": {"$in": member_list}},
            {"user_id": 1},
        ):
            submitted_user_ids.add(str(s["user_id"]))
        async for ss in submission_data_col.find(
            {"event_id": {"$in": ev_id_variants}, "user_id": {"$in": member_list}},
            {"user_id": 1},
        ):
            submitted_user_ids.add(str(ss["user_id"]))

    teams = []
    seen_team_names = set()
    for team in raw_teams:
        team["_id"] = str(team["_id"])
        leader_id = str(team.get("team_leader_id") or team.get("leader_id") or "")
        for m in team.get("members") or []:
            uid = str(m.get("user_id") or "")
            if uid in user_map:
                m["name"] = user_map[uid]["name"]
                m["email"] = user_map[uid]["email"]
                m["is_leader"] = leader_id == uid
                m["registration_status"] = participant_map.get(uid, "not_registered")
                m["submission_status"] = "submitted" if uid in submitted_user_ids else "no_submission"
        teams.append(team)
        seen_team_names.add(team.get("team_name") or team.get("name"))

    # 2. Merge Hackathon Submission Teams
    try:
        # Resolve linked opportunity ID for cross-referencing hackathon submissions
        from db import opportunities_col
        linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_id_variants}})
        opp_id_ctx = str(linked_opp["_id"]) if linked_opp else None
        
        hackathon_id_variants = [str(v) for v in ev_id_variants]
        if opp_id_ctx:
            hackathon_id_variants.append(opp_id_ctx)

        h_cursor = hackathon_submissions_col.find({"hackathonId": {"$in": hackathon_id_variants}})
        async for sub in h_cursor:
            t_name = sub.get("teamName")
            if not t_name: continue
            if t_name in seen_team_names: continue
            
            seen_team_names.add(t_name)
            
            members = [{"user_id": sub.get("submittedBy"), "name": sub.get("teamLead"), "role": "Lead"}]
            for m_name in (sub.get("teamMembers") or []):
                members.append({"name": m_name, "role": "Member"})
                
            teams.append({
                "_id": str(sub["_id"]),
                "team_name": t_name,
                "event_id": event_id,
                "team_leader_id": sub.get("submittedBy"),
                "members": members,
                "status": "Approved",
                "formed_at": sub.get("createdAt"),
                "source": "hackathon_submission"
            })
    except Exception as e:
        logger.error(f"[TEAMS] Failed to fetch hackathon submission teams: {e}")

    return teams

@router.delete("/events/{event_id}/teams/{team_id}")
async def delete_event_team(
    event_id: str,
    team_id: str,
    user: dict = Depends(get_auth_user),
):
    """Delete a team and remove all members from it (institution admin only)."""
    await assert_institution_owns_event(event_id, user)

    try:
        team = await teams_col.find_one({"_id": ObjectId(team_id), "event_id": {"$in": [event_id, str(event_id)]}})
    except Exception:
        team = None

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    for member in team.get("members", []):
        await participants_col.update_one(
            {"event_id": {"$in": [event_id, str(event_id)]}, "user_id": member.get("user_id")},
            {"$unset": {"team_id": ""}}
        )

    await teams_col.delete_one({"_id": ObjectId(team_id)})

    return {"status": "success", "message": f"Team '{team.get('team_name')}' deleted"}


@router.post("/tools/backfill-portal-participants/{institution_id}")
async def backfill_portal_participants_route(institution_id: str, user: dict = Depends(get_auth_user)):
    """One-time sync: portal applications → ``participants`` for all events owned by this institution."""
    assert_institution_scope(institution_id, user)
    from services.opportunity_service import backfill_portal_participants_for_institution

    return await backfill_portal_participants_for_institution(institution_id)


@router.patch("/opportunity-applications/status")
async def institution_review_opportunity_application(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Set portal application status (pending | accepted | rejected | shortlisted). Institution-only."""
    from services.opportunity_service import set_opportunity_application_review_status

    institution_id = data.get("institution_id")
    if not institution_id:
        raise HTTPException(status_code=400, detail="institution_id is required")
    assert_institution_scope(str(institution_id), user)
    try:
        out = await set_opportunity_application_review_status(
            institution_id=str(institution_id),
            new_status=str(data.get("status", "pending")),
            application_id=data.get("application_id"),
            user_id=data.get("user_id"),
            opportunity_id=data.get("opportunity_id"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not allowed to update this application")
    
    if not out:
        raise HTTPException(status_code=404, detail="Application not found")
    return out

@router.post("/trigger-global-reminders")
async def trigger_global_reminders(institution_id: str = Query(...), user: dict = Depends(get_auth_user)):
    """
    Manually triggers the participant notification engine for all events 
    linked to this institution.
    """
    assert_institution_scope(institution_id, user)
    from services.reminder_service import reminder_service
    
    # We run it as a task to not block the request
    asyncio.create_task(reminder_service.send_participant_reminders())
    
    return {"status": "success", "message": "Global notification protocol initiated."}

@router.post("/events/{event_id}/send-reminders")
async def send_event_deadline_reminders(event_id: str, user: dict = Depends(get_auth_user)):
    """
    Institution triggers deadline reminder emails to all registered participants
    for the current active stage.
    """
    await assert_institution_owns_event(event_id, user)
    
    ev = await events_col.find_one({"_id": ObjectId(event_id)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Find next deadline
    from services.opportunity_service import _safe_dt
    now = datetime.utcnow()
    stages = ev.get("stages") or []
    next_stage = None
    next_deadline = None
    
    for s in stages:
        end = _safe_dt(s.get("deadline") or s.get("endDate") or s.get("end_date"))
        if end and end > now:
            if not next_deadline or end < next_deadline:
                next_deadline = end
                next_stage = s
    
    if not next_stage:
        return {"status": "success", "message": "No upcoming deadlines found."}
        
    # Fetch all participants
    participants = await participants_col.find({"event_id": str(event_id)}).to_list(length=5000)
    emails = [p.get("email") for p in participants if p.get("email")]
    
    if not emails:
        return {"status": "success", "message": "No participants found to email."}
        
    subject = f"Deadline Reminder: {ev.get('title')} - {next_stage.get('name')}"
    deadline_str = next_deadline.strftime("%d %B, %Y at %I:%M %p")
    
    # Send emails in background
    for email in set(emails):
        body = get_registration_deadline_reminder_template(
            participant_name="Participant",
            event_title=ev.get('title') or "Event",
            organization_name=ev.get('organisation') or ev.get('organization') or "Studlyf",
            registration_deadline=deadline_str,
            event_link=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/#/events/{event_id}",
        )
        asyncio.create_task(send_notification_email(email, subject, body))
        
    return {"status": "success", "count": len(emails), "stage": next_stage.get("name")}

@router.get("/participants/{institution_id}")
async def get_all_institution_participants(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves all participants AND opportunity applicants for this institution."""
    assert_institution_scope(institution_id, user)
    from db import opportunity_applications_col
    
    # 1. Fetch Hackathon Participants
    p_cursor = participants_col.find({"institution_id": institution_id}).sort("registered_at", -1)
    results = []
    from db import users_col, events_col
    from bson import ObjectId
    
    async for p in p_cursor:
        p["_id"] = str(p["_id"])
        
        # Hydrate Event Title
        if "event_title" not in p and "event_id" in p:
            event = await events_col.find_one({"_id": ObjectId(p["event_id"])})
            p["event_title"] = event["title"] if event else "Unknown Event"
            
        # Hydrate User Details (Name, Email, Resume)
        if "user_id" in p:
            user = await users_col.find_one({"user_id": p["user_id"]})
            if user:
                p["full_name"] = user.get("full_name") or user.get("name") or "Student"
                p["email"] = user.get("email") or "No Email"
                if "resume_url" not in p:
                    p["resume_url"] = user.get("resume_url")
                    
        results.append(p)

    # 2. Fetch Opportunity Applicants (Jobs/Internships/Hackathons)
    from db import opportunities_col
    opps = await opportunities_col.find({
        "$or": [{"institution_id": institution_id}, {"createdBy": institution_id}]
    }).to_list(length=1000)
    opp_ids = [str(o["_id"]) for o in opps]
    opp_map = {str(o["_id"]): o.get("title", "Opportunity") for o in opps}
    
    app_cursor = opportunity_applications_col.find({
        "$or": [
            {"institution_id": institution_id},
            {"opportunity_id": {"$in": opp_ids}}
        ]
    }).sort("applied_at", -1)
    
    # We use a set to avoid duplicates if an app matches both conditions
    seen_apps = set()
    async for app in app_cursor:
        app_id = str(app["_id"])
        if app_id in seen_apps:
            continue
        seen_apps.add(app_id)
        
        opp_title = opp_map.get(str(app.get("opportunity_id")), "Opportunity Application")
        results.append({
            "_id": app_id,
            "full_name": app.get("name") or "Applicant",
            "email": app.get("email"),
            "phone": "N/A",
            "event_title": opp_title,
            "status": app.get("status", "pending"),
            "registered_at": app.get("applied_at"),
            "resume_url": app.get("resume_url") # Added resume support
        })
        
    return results

@router.get("/events/{event_id}/qualified-bundle")
async def get_qualified_bundle(
    event_id: str,
    threshold: float | None = None,
    waitlist_min: float | None = None,
    reject_below: float | None = None,
    stage_id: str | None = None,
    user: dict = Depends(get_auth_user),
):
    logger.info(f"[QUALIFIED-BUNDLE] Called event_id={event_id}")

    event = await events_col.find_one(_event_id_query(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    total_judges = len(event.get("judges", []))
    all_items: dict = {}
    enriched_count = 0
    event_judges = event.get("judges") or []

    event_id_variants = await collect_event_id_variants(event_id, event)
    event_id_in: list = list(event_id_variants)
    for vid in list(event_id_variants):
        if ObjectId.is_valid(vid):
            try:
                event_id_in.append(ObjectId(vid))
            except Exception:
                pass

    stage_filter = str(stage_id).strip() if stage_id else ""
    raw_subs = await submissions_col.find({"event_id": {"$in": event_id_in}}).to_list(length=10000)
    raw_scores = await scores_col.find({"event_id": {"$in": event_id_in}}).to_list(length=10000)
    sd_query: dict = {"event_id": {"$in": event_id_in}}
    if stage_filter:
        sd_query["stage_id"] = stage_filter
    raw_sd = await submission_data_col.find(sd_query).to_list(length=10000)

    team_ids = set()
    user_ids = set()
    for doc in raw_subs:
        if doc.get("team_id"):
            team_ids.add(str(doc.get("team_id")))
        if doc.get("user_id"):
            user_ids.add(str(doc.get("user_id")))
        if doc.get("submittedBy"):
            user_ids.add(str(doc.get("submittedBy")))
    for doc in raw_sd:
        if doc.get("team_id"):
            team_ids.add(str(doc.get("team_id")))
        if doc.get("user_id"):
            user_ids.add(str(doc.get("user_id")))
        if doc.get("submittedBy"):
            user_ids.add(str(doc.get("submittedBy")))

    # Bulk-fetch teams instead of N+1 per team_id
    team_lookup = {}
    if team_ids:
        valid_tids = [tid for tid in team_ids if ObjectId.is_valid(tid)]
        if valid_tids:
            oid_tids = [ObjectId(t) for t in valid_tids]
            for td in await teams_col.find({"_id": {"$in": oid_tids}}).to_list(length=len(valid_tids)):
                team_lookup[str(td["_id"])] = td
        for tid in team_ids:
            if tid not in team_lookup:
                td = await teams_col.find_one({"team_id": tid})
                if td:
                    team_lookup[tid] = td

    # Bulk-fetch users instead of N+1 per user_id
    user_lookup = {}
    if user_ids:
        for uid in user_ids:
            ud = await users_col.find_one({"user_id": uid})
            if not ud and ObjectId.is_valid(uid):
                try:
                    ud = await users_col.find_one({"_id": ObjectId(uid)})
                except Exception:
                    pass
            if ud:
                user_lookup[uid] = ud

    def _collect_member_emails(team_id_value: str | None, user_id_value: str | None = None) -> list[str]:
        emails: list[str] = []

        def _push(email_value: str | None):
            if not email_value:
                return
            email_str = str(email_value).strip().lower()
            if email_str and email_str not in emails:
                emails.append(email_str)

        if team_id_value:
            team_doc = team_lookup.get(str(team_id_value))
            if team_doc:
                for member in team_doc.get("members", []) or []:
                    _push(member.get("email"))
                    member_uid = member.get("user_id")
                    if not member_uid:
                        continue
                    user_doc = user_lookup.get(str(member_uid))
                    if user_doc:
                        _push(user_doc.get("email"))

        if not emails and user_id_value:
            user_doc = user_lookup.get(str(user_id_value))
            if user_doc:
                _push(user_doc.get("email"))

        return emails

    def _collect_member_user_ids(team_id_value: str | None, user_id_value: str | None = None) -> list[str]:
        user_ids: list[str] = []

        def _push(value: str | None):
            if not value:
                return
            uid = str(value).strip()
            if uid and uid not in user_ids:
                user_ids.append(uid)

        if team_id_value:
            team_doc = team_lookup.get(str(team_id_value))
            if team_doc:
                for member in team_doc.get("members", []) or []:
                    if isinstance(member, dict):
                        _push(member.get("user_id") or member.get("id") or member.get("_id"))
                    else:
                        _push(member)

        if not user_ids and user_id_value:
            _push(user_id_value)

        return user_ids

    def _resolve_candidate_name(doc: dict, fallback: str) -> str:
        candidates = [
            doc.get("team_name"),
            doc.get("teamName"),
            doc.get("user_name"),
            doc.get("full_name"),
        ]
        for value in candidates:
            if value:
                return str(value)

        for key in ("user_id", "submittedBy", "submitted_by"):
            value = doc.get(key)
            if value:
                user_doc = user_lookup.get(str(value))
                if user_doc:
                    return str(user_doc.get("full_name") or user_doc.get("name") or user_doc.get("email") or fallback)

        for key in ("team_id",):
            value = doc.get(key)
            if value:
                team_doc = team_lookup.get(str(value))
                if team_doc:
                    return str(team_doc.get("team_name") or team_doc.get("name") or team_doc.get("title") or fallback)

        return fallback

    def _normalized_submission_id(doc: dict) -> str:
        for key in ("submission_id", "submissionId", "_id", "team_id", "user_id"):
            value = doc.get(key)
            if value is not None and str(value):
                return str(value)
        return ""

    def _ensure_item(item_id: str, source: str, display_name: str) -> dict:
        item = all_items.get(item_id)
        if not item:
            item = {
                "type": "submission",
                "submission_id": item_id,
                "team_name": display_name or f"Submission {item_id[-8:]}",
                "display_name": display_name or f"Submission {item_id[-8:]}",
                "score": 0,
                "judges_completed": 0,
                "total_judges": 0,
                "is_fully_evaluated": False,
                "status": "Pending Review",
                "assigned_judges": [],
                "source": source,
                "judge_ids": set(),
            }
            all_items[item_id] = item
        elif display_name and (item.get("team_name", "").startswith("Submission ") or not item.get("team_name")):
            item["team_name"] = display_name
            item["display_name"] = display_name
        return item

    for s in raw_subs:
        sid = str(s.get("_id"))
        item = _ensure_item(sid, "submissions_col", _resolve_candidate_name(s, f"Submission {sid[-8:]}") )
        item["score"] = float(s.get("total_score") or s.get("score") or item.get("score") or 0)
        item["status"] = s.get("status") or item.get("status") or "Pending Review"
        item["member_emails"] = _collect_member_emails(s.get("team_id"), s.get("user_id") or s.get("submittedBy"))
        item["member_user_ids"] = _collect_member_user_ids(s.get("team_id"), s.get("user_id") or s.get("submittedBy"))
        if s.get("assigned_judges"):
            item["assigned_judges"] = s.get("assigned_judges") or []

    score_judges_by_submission: dict[str, set[str]] = {}
    scores_by_submission: dict[str, list[float]] = {}
    for sc in raw_scores:
        sc_sid = sc.get("submission_id")
        if not sc_sid:
            continue
        sid = str(sc_sid)
        _ensure_item(sid, "scores_col", f"Submission {sid[-8:]}")
        score_val = _score_sum(sc)
        scores_by_submission.setdefault(sid, []).append(score_val)
        judge_key = str(sc.get("judge_email") or sc.get("judge_id") or sc.get("judge") or "").strip().lower()
        if judge_key:
            score_judges_by_submission.setdefault(sid, set()).add(judge_key)

    # Average scores across all judges for each submission
    for sid, score_list in scores_by_submission.items():
        if score_list and sid in all_items:
            all_items[sid]["score"] = round(sum(score_list) / len(score_list), 1)

    for sd in raw_sd:
        sid = _normalized_submission_id(sd)
        if not sid:
            continue
        item = _ensure_item(sid, "stage_deliverable", _resolve_candidate_name(sd, f"Submission {sid[-8:]}") )
        item["member_emails"] = _collect_member_emails(sd.get("team_id"), sd.get("user_id") or sd.get("submittedBy"))
        item["member_user_ids"] = _collect_member_user_ids(sd.get("team_id"), sd.get("user_id") or sd.get("submittedBy"))
        item["stage_id"] = sd.get("stage_id")
        item["notified_at"] = sd.get("notified_at")
        item["domain"] = sd.get("domain") or (sd.get("data") or {}).get("domain")

        rec = str(sd.get("evaluation_recommendation") or sd.get("review_status") or sd.get("status") or "").lower()
        if "shortlist" in rec:
            item["status"] = "Shortlisted"
        elif "reject" in rec:
            item["status"] = "Rejected"
        elif "approve" in rec or "accept" in rec:
            item["status"] = "Approved"
        else:
            item["status"] = item.get("status") or "Pending Review"

        if sd.get("assigned_judges"):
            item["assigned_judges"] = sd.get("assigned_judges") or []

    # Determine a sane event-level judge count even when the event payload is incomplete.
    inferred_total_judges = len({j for judges in score_judges_by_submission.values() for j in judges})
    if not inferred_total_judges:
        inferred_total_judges = len(event_judges)

    judging_criteria = event.get("judging_criteria") or []
    max_possible = sum(float(c.get("max_points") or 10) for c in judging_criteria) or 100.0
    thresholds = event.get("evaluation_thresholds") or {}
    shortlist_min = float(threshold if threshold is not None else thresholds.get("shortlist_min") or 80)
    waitlist_min_val = float(
        waitlist_min
        if waitlist_min is not None
        else thresholds.get("waitlist_min") or max(shortlist_min * 0.75, shortlist_min - 15)
    )
    reject_below_val = float(
        reject_below
        if reject_below is not None
        else thresholds.get("reject_below") or waitlist_min_val
    )

    shortlisted, approved, rejected, pending, waitlisted = [], [], [], [], []
    for sid, item in all_items.items():
        item_judges = score_judges_by_submission.get(sid, set())
        assigned = item.get("assigned_judges") or []
        item["judges_completed"] = len(item_judges)
        item["total_judges"] = max(len(event_judges), inferred_total_judges, len(assigned), item["judges_completed"])
        item["is_fully_evaluated"] = item["total_judges"] > 0 and item["judges_completed"] >= item["total_judges"]
        item.pop("judge_ids", None)

        raw_score = float(item.get("score") or 0)
        item["score_percent"] = round((raw_score / max_possible) * 100, 1) if max_possible > 0 else raw_score

        st = str(item.get("status") or "").lower()
        if "shortlist" in st:
            shortlisted.append(item)
        elif "approve" in st or "accept" in st:
            approved.append(item)
        elif "reject" in st:
            rejected.append(item)
        elif "waitlist" in st:
            waitlisted.append(item)
        elif item["is_fully_evaluated"] or raw_score > 0:
            pct = item["score_percent"]
            if pct >= shortlist_min:
                item["status"] = "Shortlisted"
                shortlisted.append(item)
            elif pct >= waitlist_min_val:
                item["status"] = "Waitlisted"
                waitlisted.append(item)
            elif pct < reject_below_val:
                item["status"] = "Rejected"
                rejected.append(item)
            else:
                pending.append(item)
        else:
            pending.append(item)

    logger.info(
        f"[QUALIFIED-BUNDLE] Final: items={len(all_items)} shortlisted={len(shortlisted)} approved={len(approved)} rejected={len(rejected)} pending={len(pending)}"
    )

    return {
        "summary": {
            "shortlisted": len(shortlisted),
            "approved": len(approved),
            "rejected": len(rejected),
            "pending": len(pending),
            "waitlisted": len(waitlisted),
        },
        "thresholds": {
            "shortlist_min": shortlist_min,
            "waitlist_min": waitlist_min_val,
            "reject_below": reject_below_val,
            "max_possible_score": max_possible,
        },
        "shortlisted": shortlisted,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "waitlisted": waitlisted,
        "_debug": {
            "raw_submissions_count": len(raw_subs),
            "raw_scores_count": len(raw_scores),
            "raw_sd_count": len(raw_sd),
            "all_items_count": len(all_items),
        },
    }

@router.post("/participants/add")
async def admin_add_participant(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    """
    Admin endpoint: Add a participant to an event manually.
    Requires event_id, user_id (or email + name).
    """
    event_id = data.get("event_id")
    user_id = data.get("user_id")
    email = data.get("email")
    name = data.get("name")
    team_id = data.get("team_id")

    if not event_id:
        raise HTTPException(status_code=400, detail="event_id is required")
    if not user_id and not email:
        raise HTTPException(status_code=400, detail="user_id or email+name required")

    await assert_institution_owns_event(event_id, user)

    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # If only email provided, look up user
    if not user_id and email:
        u = await users_col.find_one({"email": email})
        if not u:
            raise HTTPException(status_code=404, detail="No user found with that email")
        user_id = u.get("user_id")
        name = name or u.get("full_name") or u.get("name") or email

    # Check if already registered
    existing = await participants_col.find_one({"event_id": event_id, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=409, detail="User is already registered for this event")

    first_stage = None
    stages = event.get("stages", [])
    if stages and len(stages) > 0:
        first_stage = stages[0].get("name")

    participant = {
        "event_id": event_id,
        "user_id": user_id,
        "institution_id": event.get("institution_id"),
        "name": name or "Participant",
        "email": email or "",
        "status": "registered",
        "current_stage": first_stage,
        "registered_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    if team_id:
        participant["team_id"] = team_id

    result = await participants_col.insert_one(participant)
    participant["_id"] = str(result.inserted_id)

    await log_admin_action("admin@institution.com", "PARTICIPANT_ADDED",
                           f"Added participant {user_id} to event {event_id}")
    return {"status": "success", "participant": participant}

@router.post("/events/{event_id}/bulk-notify")
async def send_bulk_selection_emails(event_id: str, data: dict, user: dict = Depends(get_auth_user)):
    """
    Sends personalized emails to a 'bundle' of selected teams.
    Injects dynamic team names. Supports score-threshold filtering and DB-based templates.
    """
    await assert_institution_owns_event(event_id, user)
    team_ids = data.get("team_ids", [])
    next_stage = data.get("next_stage", "next stage")
    min_score = data.get("min_score")  # Optional: only send to teams with avg score >= this
    skip_stage_update = data.get("skip_stage_update", False)  # Opt-in: don't advance stage
    
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    event_title = event.get("title", "the event") if event else "the event"
    institution_id = event.get("institution_id", "") if event else ""
    
    from db import teams_col, users_col, notifications_col
    from datetime import datetime
    from services.email_template_service import get_active_template, render_template, render_stage_custom_email
    
    # Determine template type based on whether there's a custom message
    custom_msg = data.get("custom_message") or data.get("message")
    tmpl_type = "announcement" if custom_msg else "stage_advancement"
    
    # Extract stage-specific overrides when not sending a custom manual message
    next_stage_doc = None
    has_override = False
    subject_override = None
    body_markdown = None
    
    if not custom_msg:
        stages = event.get("stages", []) if event else []
        for s in stages:
            if s.get("name") == next_stage:
                next_stage_doc = s
                break
        if next_stage_doc:
            comm = next_stage_doc.get("communication", {})
            subject_override = comm.get("email_subject_override")
            body_markdown = comm.get("email_body_markdown")
            has_override = bool(subject_override or body_markdown)

    tmpl = None
    if not has_override:
        tmpl = await get_active_template(event_id, institution_id, tmpl_type)
    
    success_count = 0
    for tid in team_ids:
        # Handle solo participant submissions from bundle
        if str(tid).startswith("sub:"):
            sub_id = str(tid).split(":")[1]
            sub = await submission_data_col.find_one({"_id": ObjectId(sub_id)})
            if sub:
                recipient_email = sub.get("user_email") or sub.get("email")
                if recipient_email:
                    name = sub.get("user_name") or sub.get("team_name") or "Participant"
                    
                    # Score filter
                    score = sub.get("total_score") or sub.get("score") or 0
                    if min_score is not None:
                        try:
                            if float(score) < float(min_score):
                                continue
                        except (ValueError, TypeError):
                            pass
                    
                    context = {
                        "team_name": name,
                        "event_name": event_title,
                        "stage_name": next_stage,
                        "participant_name": name,
                        "custom_message": custom_msg or "",
                    }
                    if has_override:
                        subject, body = render_stage_custom_email(subject_override, body_markdown, context)
                    elif tmpl:
                        subject, body = render_template(tmpl, context)
                    else:
                        subject = f"Selection Alert: Your project is moving to {next_stage}!"
                        body = f"<p>Your team has qualified for <strong>{next_stage}</strong> in <strong>{event_title}</strong>.</p>"
                    
                    # Enqueue email in the persistent background queue
                    from services.email_queue_service import enqueue_email
                    await enqueue_email(
                        recipient_email, 
                        subject, 
                        body, 
                        metadata={"event_id": event_id, "stage_name": next_stage, "type": "selection_alert", "is_bulk": True, "recipient_type": "solo"}
                    )
                    
                    user_id_to_notif = sub.get("user_id") or str(sub.get("_id"))
                    asyncio.create_task(notifications_col.insert_one({
                        "user_id": str(user_id_to_notif),
                        "title": subject,
                        "message": f"Congratulations! You've been selected for {next_stage} in {event_title}.",
                        "type": "selection_alert",
                        "is_read": False,
                        "created_at": datetime.utcnow()
                    }))
                    success_count += 1
            continue

        # Fetch team document for member details
        team = None
        try:
            team = await teams_col.find_one({"_id": ObjectId(tid)})
        except Exception:
            pass

        if team:
            members = team.get("members", [])
            team_name = team.get("name") or team.get("team_name") or "Your team"
            
            # Score filter for teams
            if min_score is not None:
                team_score = team.get("total_score") or team.get("score") or 0
                try:
                    if float(team_score) < float(min_score):
                        continue
                except (ValueError, TypeError):
                    pass
            
            member_emails = []
            for m in members:
                email = m.get("email") if isinstance(m, dict) else m
                if email and "@" in str(email):
                    member_emails.append(email)
                elif isinstance(m, dict) and m.get("user_id"):
                    user_rec = await users_col.find_one({"user_id": str(m["user_id"])})
                    if user_rec and user_rec.get("email"):
                        member_emails.append(user_rec["email"])
            
            for member_email in set(member_emails):
                context = {
                    "team_name": team_name,
                    "event_name": event_title,
                    "stage_name": next_stage,
                    "participant_name": team_name,
                    "custom_message": custom_msg or "",
                }
                if has_override:
                    subject, body = render_stage_custom_email(subject_override, body_markdown, context)
                elif tmpl:
                    subject, body = render_template(tmpl, context)
                else:
                    if custom_msg:
                        subject = data.get("subject") or f"Important Update: {event_title}"
                        body = f"<p>{custom_msg}</p>"
                    else:
                        subject = f"Selection Alert: {team_name} is moving to {next_stage}!"
                        body = f"<p>Team <strong>'{team_name}'</strong> has qualified for <strong>{next_stage}</strong> in <strong>{event_title}</strong>.</p>"
                
                # Enqueue email in the persistent background queue
                from services.email_queue_service import enqueue_email
                await enqueue_email(
                    member_email, 
                    subject, 
                    body, 
                    metadata={"event_id": event_id, "stage_name": next_stage, "type": "selection_alert", "is_bulk": True, "recipient_type": "team_member"}
                )
                
                try:
                    m_user = await users_col.find_one({"email": member_email})
                    if m_user:
                        asyncio.create_task(notifications_col.insert_one({
                            "user_id": str(m_user["user_id"]),
                            "title": subject,
                            "message": f"Your team '{team_name}' has been moved to {next_stage} in {event_title}.",
                            "type": "selection_alert" if not custom_msg else "announcement",
                            "is_read": False,
                            "created_at": datetime.utcnow()
                        }))
                except Exception as e:
                    logger.error(f"Failed to create DB notification for {member_email}: {e}")
            
            if not skip_stage_update:
                await participants_col.update_many(
                    {"event_id": event_id, "team_id": tid},
                    {"$set": {"current_stage": next_stage}}
                )
            success_count += 1
            
    return {"status": "success", "sent_to": success_count}


def _score_sum(sc: dict) -> float:
    """Extract the rubric SUM from a scores_col doc (handles both scores and criteria_scores fields)."""
    rubric = None
    if "scores" in sc and sc["scores"]:
        rubric = sc["scores"]
    elif "criteria_scores" in sc and sc["criteria_scores"]:
        rubric = sc["criteria_scores"]
    if isinstance(rubric, dict):
        try:
            return sum(float(v) for v in rubric.values())
        except (TypeError, ValueError):
            pass
    total = sc.get("total_score")
    if total is not None:
        return float(total)
    score = sc.get("score")
    if score is not None:
        return float(score)
    return 0.0

@router.get("/events/{event_id}/submissions")
async def list_event_submissions_enriched(event_id: str, user: dict = Depends(get_auth_user)):
    """All submissions for an event with team labels, average judge score, and judge assignment emails."""
    event = await assert_institution_owns_event(event_id, user)
    event_id_variants = await collect_event_id_variants(event_id, event)
    event_filter = {"event_id": {"$in": event_id_variants}}
    cursor = submissions_col.find(event_filter)
    out = []
    async for s in cursor:
        sid = str(s["_id"])
        s["_id"] = sid
        tid = s.get("team_id")
        if tid:
            try:
                team = await teams_col.find_one({"_id": ObjectId(str(tid))})
            except Exception:
                team = None
            if team and not s.get("team_name"):
                s["team_name"] = team.get("name")
        or_sub = [{"submission_id": sid}]
        try:
            or_sub.append({"submission_id": ObjectId(sid)})
        except Exception:
            pass
        sc_cursor = scores_col.find({"$or": or_sub})
        totals = []
        async for sc in sc_cursor:
            totals.append(_score_sum(sc))
        s["total_score"] = round(sum(totals) / len(totals), 1) if totals else float(s.get("score") or 0)
        if "assigned_judge_emails" not in s or s["assigned_judge_emails"] is None:
            s["assigned_judge_emails"] = []
        out.append(s)

    # 2. Merge Hackathon Submissions
    try:
        from db import hackathon_submissions_col, opportunities_col
        # Robust event_id variants
        ev_id_variants = [event_id, str(event_id)]
        try:
            if len(str(event_id)) == 24:
                ev_id_variants.append(ObjectId(event_id))
        except: pass

        linked_opp = await opportunities_col.find_one({"event_link_id": {"$in": ev_id_variants}})
        opp_id_ctx = str(linked_opp["_id"]) if linked_opp else None
        
        hackathon_id_variants = [str(v) for v in ev_id_variants]
        if opp_id_ctx:
            hackathon_id_variants.append(opp_id_ctx)

        h_cursor = hackathon_submissions_col.find({"hackathonId": {"$in": hackathon_id_variants}})
        async for sub in h_cursor:
            sid = str(sub["_id"])
            # Avoid duplicate counting if somehow already there
            if any(str(o.get("_id")) == sid for o in out):
                continue
                
            out.append({
                "_id": sid,
                "event_id": event_id,
                "user_id": sub.get("submittedBy") or sub.get("user_id"),
                "team_name": sub.get("teamName") or sub.get("teamLead") or "",
                "status": sub.get("status", ""),
                "submitted_at": sub.get("createdAt").isoformat() if hasattr(sub.get("createdAt"), "isoformat") else sub.get("createdAt"),
                "total_score": sub.get("totalScore", 0.0),
                "source": "hackathon_submission",
                "assigned_judge_emails": [] # Hackathon submissions handle judges differently in their own routes
            })
    except Exception as e:
        logger.error(f"[SUBMISSIONS] Failed to merge hackathon data: {e}")

    # 3. Merge Stage / Phase Deliverables from submission_data_col
    try:
        sd_cursor = submission_data_col.find(event_filter)
        async for sd in sd_cursor:
            sid = str(sd["_id"])
            if any(str(o.get("_id")) == sid for o in out):
                continue
            # Look up scores for this submission from scores_col (by submission_id and team_id)
            sd_or_sub = [{"submission_id": sid}]
            try:
                sd_or_sub.append({"submission_id": ObjectId(sid)})
            except Exception:
                pass
            tid_for_score = sd.get("team_id")
            if tid_for_score:
                sd_or_sub.append({"team_id": str(tid_for_score)})
            sc_cursor = scores_col.find({"$or": sd_or_sub})
            totals = []
            async for sc in sc_cursor:
                totals.append(_score_sum(sc))
            total_score = round(sum(totals) / len(totals), 1) if totals else float(sd.get("total_score") or sd.get("score") or 0)
            team_name = sd.get("team_name") or sd.get("user_name") or ""
            tid = sd.get("team_id")
            if tid and not team_name:
                try:
                    team_doc = await teams_col.find_one({"_id": ObjectId(str(tid))})
                except Exception:
                    team_doc = await teams_col.find_one({"team_id": str(tid)})
                if team_doc:
                    team_name = team_doc.get("team_name") or team_doc.get("name") or team_name
            out.append({
                "_id": sid,
                "event_id": sd.get("event_id") or event_id,
                "user_id": sd.get("user_id", ""),
                "team_id": sd.get("team_id"),
                "team_name": team_name,
                "status": sd.get("status", ""),
                "submitted_at": sd.get("submitted_at").isoformat() if hasattr(sd.get("submitted_at"), "isoformat") else sd.get("submitted_at"),
                "data": sd.get("data", {}),
                "source": "stage_deliverable",
                "stage_id": sd.get("stage_id", ""),
                "stage_name": sd.get("stage_name", ""),
                "stage_type": sd.get("stage_type", ""),
                "total_score": total_score,
                "assigned_judge_id": sd.get("assigned_judge_id", ""),
                "assigned_judges": sd.get("assigned_judges", []),
                "assigned_judge_emails": sd.get("assigned_judge_emails", []),
            })
    except Exception as e:
        logger.error(f"[SUBMISSIONS] Failed to merge stage deliverables: {e}")

    return out


@router.get("/events/{event_id}/stage-leaderboard")
async def get_stage_leaderboard(
    event_id: str,
    stage_id: Optional[str] = None,
    user: dict = Depends(get_auth_user),
):
    """Ranked standings for a stage (or whole event) from judge scores on stage submissions."""
    event = await assert_institution_owns_event(event_id, user)
    variants = await collect_event_id_variants(event_id, event)
    variant_in: list = list(variants)
    for vid in variants:
        if ObjectId.is_valid(vid):
            try:
                variant_in.append(ObjectId(vid))
            except Exception:
                pass

    sd_query: dict = {"event_id": {"$in": variant_in}}
    if stage_id:
        sd_query["stage_id"] = str(stage_id).strip()
    stage_docs = await submission_data_col.find(
        sd_query,
        {"_id": 1, "team_id": 1, "user_id": 1, "team_name": 1, "stage_id": 1, "stage_name": 1, "data": 1},
    ).to_list(length=5000)

    submission_meta: dict[str, dict] = {}
    for doc in stage_docs:
        sid = str(doc["_id"])
        submission_meta[sid] = doc

    score_query: dict = {"event_id": {"$in": variant_in}}
    if stage_id:
        score_query["stage_id"] = str(stage_id).strip()
    scores = await scores_col.find(score_query).to_list(length=20000)

    totals: dict[str, list[float]] = {}
    for sc in scores:
        sub_id = str(sc.get("submission_id") or "")
        if not sub_id:
            continue
        val = sc.get("total_score")
        if val is None and isinstance(sc.get("criteria_scores"), dict):
            try:
                val = sum(float(v) for v in sc["criteria_scores"].values())
            except (TypeError, ValueError):
                val = 0
        if val is None:
            val = sc.get("score") or 0
        totals.setdefault(sub_id, []).append(float(val or 0))

    rows = []
    seen: set[str] = set()
    for sid, doc in submission_meta.items():
        seen.add(sid)
        scores_list = totals.get(sid, [])
        avg = round(sum(scores_list) / len(scores_list), 2) if scores_list else 0.0
        data = doc.get("data") or {}
        rows.append({
            "submission_id": sid,
            "team_name": doc.get("team_name") or data.get("team_display_name") or data.get("name") or f"Submission {sid[-6:]}",
            "project_title": doc.get("stage_name") or data.get("title") or "",
            "stage_id": doc.get("stage_id"),
            "stage_name": doc.get("stage_name"),
            "total_score": avg,
            "judge_count": len(scores_list),
        })

    for sid, scores_list in totals.items():
        if sid in seen:
            continue
        avg = round(sum(scores_list) / len(scores_list), 2) if scores_list else 0.0
        rows.append({
            "submission_id": sid,
            "team_name": f"Submission {sid[-6:]}",
            "project_title": "",
            "total_score": avg,
            "judge_count": len(scores_list),
        })

    rows.sort(key=lambda r: (-float(r.get("total_score") or 0), str(r.get("team_name") or "")))
    for idx, row in enumerate(rows, start=1):
        row["rank"] = idx
    return rows


@router.patch("/events/{event_id}/teams/{team_id}/selection")
async def update_team_institution_selection(
    event_id: str,
    team_id: str,
    body: dict,
    user: dict = Depends(get_auth_user),
):
    await assert_institution_owns_event(event_id, user)
    st = body.get("status", "Pending")
    
    # Robust event_id variants
    ev_id_variants = [event_id, str(event_id)]
    try:
        if len(str(event_id)) == 24:
            ev_id_variants.append(ObjectId(event_id))
    except:
        pass

    # 1. Try Teams collection
    team = await teams_col.find_one({"_id": ObjectId(team_id), "event_id": {"$in": ev_id_variants}})
    
    if team:
        await teams_col.update_one(
            {"_id": ObjectId(team_id)},
            {"$set": {
                "institution_selection": st,
                "institution_selection_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        return {"status": "ok", "team_id": team_id, "institution_selection": st}
        
    # 2. Try Submission Data (for Solo assets)
    sub = await submissions_col.find_one({"_id": ObjectId(team_id), "event_id": {"$in": ev_id_variants}})
    if sub:
        await submissions_col.update_one(
            {"_id": ObjectId(team_id)},
            {"$set": {
                "institution_selection": st,
                "institution_selection_at": datetime.now(timezone.utc).isoformat(),
                "evaluation_recommendation": st # Sync with recommendation for bundle visibility
            }}
        )
        return {"status": "ok", "submission_id": team_id, "institution_selection": st}

    raise HTTPException(status_code=404, detail="Candidate (Team or Solo) not found for this event")


@router.patch("/events/{event_id}/submissions/{submission_id}/assign-judges")
async def assign_judges_to_submission_route(
    event_id: str,
    submission_id: str,
    body: dict,
    user: dict = Depends(get_auth_user),
):
    """Restrict which panel judges may score a given submission (emails must exist on the event)."""
    ev = await assert_institution_owns_event(event_id, user)
    sub = await submissions_col.find_one({"_id": ObjectId(submission_id), "event_id": str(event_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found for this event")
    raw = body.get("judge_emails") or body.get("emails") or []
    if isinstance(raw, str):
        raw = [raw]
    emails = [str(e).strip().lower() for e in raw if e]
    judge_pool = {str(j.get("email") or "").strip().lower() for j in (ev.get("judges") or [])}
    invalid = [e for e in emails if e not in judge_pool]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail="These emails are not on the event judge panel: " + ", ".join(invalid),
        )
    await submissions_col.update_one(
        {"_id": ObjectId(submission_id)},
        {
            "$set": {
                "assigned_judge_emails": emails,
                "judge_assignment_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    title = ev.get("title") or "Event"
    for em in emails:
        subj = f"Assigned to review a submission — {title}"
        html = f"""<html><body style="font-family: 'Poppins', sans-serif;color:#111827">
        <p>You were assigned to evaluate a submission for <strong>{title}</strong>.</p>
        <p>Open the Studlyf judge workflow for this event.</p></body></html>"""
        asyncio.create_task(send_notification_email(em, subj, html))
    return {"status": "ok", "assigned_judge_emails": emails}


@router.get("/events/public")
async def get_public_events():
    """PUBLIC: Retrieves live events for student registration."""
    cursor = events_col.find({"status": "Live"})
    events_list = []
    async for event in cursor:
        event["_id"] = str(event["_id"])
        events_list.append(event)
    return events_list

@router.post("/leaderboard/{event_id}/refresh")
async def refresh_leaderboard(event_id: str):
    """Triggers dynamic recalculation of rankings based on latest scores."""
    return await leaderboard_service.calculate_event_leaderboard(event_id)

@router.get("/leaderboard/{event_id}")
async def fetch_leaderboard(event_id: str):
    """Retrieves live event standings based on dynamic judge scoring."""
    if event_id == "active_event":
        # Resolve to latest event
        event = await events_col.find_one({"status": "Live"}, sort=[("created_at", -1)])
        if not event: event = await events_col.find_one({}, sort=[("created_at", -1)])
        if event: event_id = str(event["_id"])

    rankings = await leaderboard_col.find({"event_id": event_id}).sort("rank", 1).to_list(None)
    for r in rankings: r["_id"] = str(r["_id"])
    return rankings

@router.get("/results/{event_id}")
async def fetch_event_results(event_id: str):
    """Returns leaderboard enriched with team member details for the results page."""
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rankings = await leaderboard_col.find({"event_id": event_id}).sort("rank", 1).to_list(None)
    for r in rankings:
        r["_id"] = str(r["_id"])

    from db import teams_col, users_col
    enriched = []
    for entry in rankings:
        team_id = entry.get("team_id")
        members = []
        org = ""
        if team_id:
            try:
                team = await teams_col.find_one({"_id": ObjectId(team_id)})
                if team:
                    raw_members = team.get("members", [])
                    member_user_ids = [str(m.get("user_id")) for m in raw_members if m.get("user_id")]
                    user_map = {}
                    if member_user_ids:
                        u_cursor = users_col.find({"user_id": {"$in": member_user_ids}})
                        async for u in u_cursor:
                            uid = str(u["user_id"])
                            user_map[uid] = {
                                "name": u.get("full_name") or u.get("name") or "Student",
                                "email": u.get("email", ""),
                                "college": u.get("college_name") or u.get("college", "") or u.get("organization", "") or u.get("institution_name", ""),
                            }
                    for m in raw_members:
                        uid = str(m.get("user_id", ""))
                        info = user_map.get(uid, {})
                        members.append({
                            "user_id": uid,
                            "name": info.get("name") or m.get("name") or "Member",
                            "email": info.get("email") or m.get("email", ""),
                            "college": info.get("college", ""),
                            "is_leader": uid == str(team.get("team_leader_id") or team.get("leader_id")),
                        })
                    if members:
                        leader = next((m for m in members if m.get("is_leader")), members[0])
                        org = leader.get("college", "")
            except Exception:
                pass
        enriched.append({
            "rank": entry.get("rank"),
            "team_id": team_id,
            "team_name": entry.get("team_name", "Team"),
            "lead_name": entry.get("recipient_name", "Participant"),
            "organization": org,
            "total_score": entry.get("total_score", 0),
            "project_name": entry.get("project_name", ""),
            "members": members,
            "participation_type": entry.get("participation_type", "TEAM"),
        })

    return {
        "event": {
            "title": event.get("title") or event.get("name", ""),
            "logo_url": event.get("logo_url") or event.get("logoUrl", ""),
            "banner_url": event.get("banner_url") or event.get("bannerUrl", ""),
        },
        "results": enriched,
    }

@router.get("/leaderboard/{event_id}/export-pdf")
async def export_leaderboard_pdf(event_id: str):
    """
    Generates a professional PDF report with ranked results 
    and detailed dimension-based breakdowns.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from io import BytesIO
    from db import leaderboard_col, events_col
    
    if event_id == "active_event":
        event = await events_col.find_one({"status": "Live"}, sort=[("created_at", -1)])
        if not event: event = await events_col.find_one({}, sort=[("created_at", -1)])
        if event: event_id = str(event["_id"])

    # 1. Fetch Data
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    rankings = await leaderboard_col.find({"event_id": event_id}).sort("rank", 1).to_list(None)
    
    # 2. Create PDF Buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    
    # 3. Header
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6C3BFF'),
        spaceAfter=20,
        alignment=1 # Center
    )
    elements.append(Paragraph(f"{event.get('title', 'Event Results')}", title_style))
    elements.append(Paragraph(f"Official Leaderboard & Performance Report", styles['Heading3']))
    elements.append(Spacer(1, 20))
    
    # 4. Table Data
    data = [["Rank", "Team Name", "Score Breakdown", "Final Score"]]
    for r in rankings:
        # Format criteria breakdown as a string
        breakdown_str = ""
        if r.get("criteria_scores"):
            breakdown_str = "\n".join([f"{k}: {v}" for k, v in r["criteria_scores"].items()])
        else:
            breakdown_str = "Verified Overall Score"
        
        data.append([
            f"#{r['rank']}",
            r['team_name'],
            breakdown_str,
            str(r['total_score'])
        ])
    
    # 5. Table Styling
    t = Table(data, colWidths=[50, 150, 200, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6C3BFF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(t)
    
    # 6. Build
    doc.build(elements)
    
    # 7. Return PDF
    buffer.seek(0)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=results.pdf"}
    )

@router.post("/finalize-event/{event_id}")
async def finalize_event(event_id: str, template_id: str | None = None):
    """
    Triggers final results processing and bulk leaderboard generation.
    Transitions event status from LIVE to ENDED.
    """
    from db import scores_col, leaderboard_col, submissions_col
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event: raise HTTPException(status_code=404, detail="Event not found")
    
    # 1. Aggregate scores to calculate rankings
    pipeline = [
        {"$match": {"event_id": event_id}},
        {"$group": {
            "_id": "$submission_id",
            "total_score": {"$avg": {"$add": ["$innovation", "$technicality", "$impact", "$presentation"]}}
        }},
        {"$sort": {"total_score": -1}}
    ]
    
    rankings = await scores_col.aggregate(pipeline).to_list(None)
    
    # 2. Save rankings to Leaderboard
    for idx, rank in enumerate(rankings):
        submission = await submissions_col.find_one({"_id": ObjectId(rank["_id"])})
        leaderboard_entry = {
            "event_id": event_id,
            "team_name": submission.get("team_name", "Unknown"),
            "project_title": submission.get("project_title", "Untitled"),
            "total_score": round(rank["total_score"], 2),
            "rank": idx + 1,
            "finalized_at": datetime.utcnow()
        }
        await leaderboard_col.update_one(
            {"event_id": event_id, "team_name": leaderboard_entry["team_name"]},
            {"$set": leaderboard_entry},
            upsert=True
        )

    # [INTEGRATION ENHANCEMENT]
    from services.leaderboard_service import leaderboard_service
    from db import results_col
    # Resolving undefined variable 'final_rankings' from original code by using the dynamic service
    final_rankings = await leaderboard_service.calculate_event_leaderboard(event_id)
    winner_ids = [r.get("team_id") or r.get("participant_id") for r in final_rankings[:3]]
    await results_col.update_one({"event_id": event_id}, {"$set": {"winner_ids": winner_ids, "final_rankings": final_rankings}}, upsert=True)

    # 3. Mark event as ended
    await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"status": "ENDED", "finalized_at": datetime.utcnow()}}
    )

    # 4. Generate rank-based certificates for all qualified participants
    issued_certificates = await certificate_service.issue_ranked_event_certificates(event_id, final_rankings, send_email=True, template_id=template_id)

    await log_admin_action("admin@institution.com", "EVENT_FINALIZED", f"Finalized event {event_id} and generated {len(issued_certificates)} certificates.")
    return {"status": "success", "results": final_rankings, "certificates_issued": len(issued_certificates)}


@router.post("/events/{event_id}/certificates/issue-ranked")
async def issue_ranked_certificates(
    event_id: str,
    payload: dict = Body(default_factory=dict),
    user: dict = Depends(get_auth_user),
):
    """Issue certificates from a saved leaderboard snapshot using a production award policy.

    Supported payload fields:
    - template_id: optional certificate template id
    - limit: optional top-N cutoff
    - min_score: optional minimum score cutoff
    - bands: optional list of { label, achievement_type, min_score, max_score }
    - send_email: optional boolean, defaults to true
    """
    await assert_institution_owns_event(event_id, user)

    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    template_id = payload.get("template_id")
    limit = payload.get("limit")
    min_score = payload.get("min_score")
    bands = payload.get("bands") or []
    send_email = bool(payload.get("send_email", True))

    final_rankings = await leaderboard_service.calculate_event_leaderboard(event_id)
    if not final_rankings:
        raise HTTPException(status_code=404, detail="No rankings found for this event")

    issued_certificates = []

    if isinstance(bands, list) and bands:
        seen_user_ids: set[str] = set()
        for band in bands:
            if not isinstance(band, dict):
                continue
            band_label = str(band.get("label") or band.get("name") or "Award").strip() or "Award"
            achievement_type = str(band.get("achievement_type") or "top_performer").strip() or "top_performer"
            band_min = band.get("min_score")
            band_max = band.get("max_score")
            band_limit = band.get("limit")
            band_template_id = band.get("template_id") or template_id

            band_rows = final_rankings
            if isinstance(band_min, (int, float)):
                band_rows = [row for row in band_rows if float(row.get("total_score") or 0) >= float(band_min)]
            if isinstance(band_max, (int, float)):
                band_rows = [row for row in band_rows if float(row.get("total_score") or 0) <= float(band_max)]
            if isinstance(band_limit, int) and band_limit > 0:
                band_rows = band_rows[:band_limit]

            for row in band_rows:
                team_id = row.get("team_id")
                participant_id = row.get("participant_id")
                user_key = str(team_id or participant_id or row.get("user_id") or row.get("submission_id") or row.get("_id") or "")
                if not user_key or user_key in seen_user_ids:
                    continue
                seen_user_ids.add(user_key)
                row_copy = dict(row)
                row_copy["achievement_type"] = achievement_type
                row_copy["award_label"] = band_label
                row_copy["_issued_from_band"] = band_label
                if isinstance(band_min, (int, float)):
                    row_copy["min_score"] = band_min
                if isinstance(band_max, (int, float)):
                    row_copy["max_score"] = band_max
                result = await certificate_service.issue_ranked_event_certificates(
                    event_id,
                    [row_copy],
                    send_email=send_email,
                    template_id=band_template_id,
                )
                issued_certificates.extend(result)
    else:
        if isinstance(limit, int) and limit > 0:
            final_rankings = final_rankings[:limit]
        elif isinstance(min_score, (int, float)):
            final_rankings = [row for row in final_rankings if float(row.get("total_score") or 0) >= float(min_score)]

        issued_certificates = await certificate_service.issue_ranked_event_certificates(
            event_id,
            final_rankings,
            send_email=send_email,
            template_id=template_id,
        )

    return {
        "status": "success",
        "award_policy": "bands" if isinstance(bands, list) and bands else "top_n" if isinstance(limit, int) and limit > 0 else "min_score" if isinstance(min_score, (int, float)) else "all_ranked",
        "limit": limit,
        "min_score": min_score,
        "bands": bands,
        "results": final_rankings,
        "certificates_issued": len(issued_certificates),
    }

async def generate_event_certificates(event_id: str, rankings: list):
    """Backward-compatible wrapper for rank-based certificate issuance."""
    return await certificate_service.issue_ranked_event_certificates(event_id, rankings, send_email=True)


@router.get("/cert-templates")
async def list_cert_templates_for_institution(user: dict = Depends(get_auth_user)):
    """Institution-scoped: list all certificate templates (built-in + custom).
    Unlike /api/admin/cert-templates, this uses institution JWT auth instead of super-admin."""
    cert_templates_col = db["cert_templates"]
    results = []
    async for doc in cert_templates_col.find({}):
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    builtins = [
        {"template_id": "standard", "name": "Standard (Default)", "description": "Studlyf default certificate", "is_builtin": True},
        {"template_id": "honors",   "name": "Elite Honors",        "description": "Purple honours certificate",  "is_builtin": True},
    ]
    return builtins + results


@router.post("/cert-templates")
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

@router.get("/institution/certificates/{institution_id}")
async def list_institution_certificates(institution_id: str, user: dict = Depends(get_auth_user)):
    """Return all event certificates issued for an institution."""
    assert_institution_scope(institution_id, user)

    results = []

    legacy_certs = await certificates_col.find({"institution_id": str(institution_id)}).sort("issue_date", -1).to_list(length=None)
    for cert in legacy_certs:
        issue_value = cert.get("issue_date") or cert.get("issued_date")
        if isinstance(issue_value, datetime):
            issue_value = issue_value.isoformat()
        results.append({
            "_id": str(cert.get("_id", "")),
            "student_name": cert.get("student_name") or cert.get("recipient_name") or cert.get("full_name") or "Participant",
            "event_title": cert.get("event_title") or "Event",
            "certificate_id": cert.get("certificate_id"),
            "issue_date": issue_value or datetime.utcnow().isoformat(),
            "category": cert.get("category") or cert.get("achievement_type") or "Participation",
            "event_id": cert.get("event_id"),
            "verification_url": cert.get("verification_url"),
        })

    event_ids = []
    async for event in events_col.find({"institution_id": str(institution_id)}, {"_id": 1}):
        event_ids.append(str(event["_id"]))

    if event_ids:
        certs = await event_certificates_col.find({"event_id": {"$in": event_ids}}).sort("issued_at", -1).to_list(length=None)
        for cert in certs:
            issued_value = cert.get("issued_date") or cert.get("issued_at")
            if isinstance(issued_value, datetime):
                issued_value = issued_value.isoformat()
            results.append({
                "_id": str(cert.get("_id", "")),
                "student_name": cert.get("participant_name") or cert.get("student_name") or cert.get("recipient_name") or "Participant",
                "event_title": cert.get("event_title") or "Event",
                "certificate_id": cert.get("certificate_id"),
                "issue_date": issued_value or datetime.utcnow().isoformat(),
                "category": cert.get("achievement_type") or cert.get("category") or "Participation",
                "event_id": cert.get("event_id"),
                "verification_url": cert.get("verification_url"),
            })

    if not results:
        return []

    results.sort(key=lambda item: item.get("issue_date") or "", reverse=True)
    return results

@router.get("/export-summary/{institution_id}")
async def export_institution_summary_csv(institution_id: str, user: dict = Depends(get_auth_user)):
    """Generates a CSV export of the institutional performance summary."""
    assert_institution_scope(institution_id, user)
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from services.institutional_analytics_service import analytics_service
    
    data = await analytics_service.get_kpi_summary(institution_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Metric", "Value"])
    for key, value in data.items():
        writer.writerow([key.replace('_', ' ').title(), value])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=institution_report_{institution_id}.csv"}
    )

@router.get("/verify-certificate/{certificate_id}")
async def verify_certificate(certificate_id: str):
    """
    PUBLIC ENDPOINT: Validates a certificate and returns its details.
    Used by the public verification page.
    """
    cert = await certificates_col.find_one({"certificate_id": certificate_id})
    if not cert:
        cert = await event_certificates_col.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid.")
    
    return {
        "recipient": cert.get("recipient_name") or cert.get("participant_name") or "",
        "recipient_name": cert.get("recipient_name") or cert.get("participant_name") or "",
        "event": cert.get("event_title") or cert.get("event_name") or "Studlyf Event",
        "event_title": cert.get("event_title") or cert.get("event_name") or "Studlyf Event",
        "rank": cert.get("rank") or cert.get("achievement_label") or "",
        "issued_date": str(cert.get("issued_at") or cert.get("issued_date") or ""),
        "date": str(cert.get("issued_at") or cert.get("issued_date") or ""),
        "status": "VALIDATED",
        "institution": cert.get("organization_name") or cert.get("organization") or "Studlyf",
        "organization_name": cert.get("organization_name") or cert.get("organization") or "Studlyf",
    }


@router.get("/download-certificate/{certificate_id}")
async def download_certificate(certificate_id: str):
    """Generate and download a certificate PDF for a verified certificate."""
    cert = await certificates_col.find_one({"certificate_id": certificate_id})
    if not cert:
        cert = await event_certificates_col.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid.")

    from fastapi.responses import FileResponse
    from services.certificate_service import certificate_service as pdf_certificate_service

    issued_at = cert.get("issued_at") or cert.get("issued_date") or datetime.utcnow()
    issued_date = issued_at.strftime("%B %d, %Y") if hasattr(issued_at, "strftime") else str(issued_at)
    cert_data = {
        "participant_name": cert.get("recipient_name") or cert.get("student_name") or "Participant",
        "event_name": cert.get("event_name") or cert.get("event_title") or "Studlyf Event",
        "organization_name": cert.get("organization_name") or cert.get("organization") or "Studlyf",
        "event_date": issued_date,
        "issued_date": issued_date,
        "certificate_id": certificate_id,
        "verification_url": cert.get("verification_url") or f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/verify/{certificate_id}",
        "achievement_type": cert.get("achievement_type") or cert.get("category") or "Participation",
        "organizer_signature": cert.get("organization_name") or cert.get("organization") or "Studlyf",
        "studlyf_signature": "Studlyf Authorized Signature",
    }
    pdf_path = await pdf_certificate_service.generate_certificate_pdf(cert_data)
    media_type = "application/pdf" if str(pdf_path).lower().endswith(".pdf") else "text/html"
    download_name = f"certificate_{certificate_id}.pdf" if media_type == "application/pdf" else f"certificate_{certificate_id}.html"
    return FileResponse(pdf_path, media_type=media_type, filename=download_name)

@router.options("/notifications/{institution_id}")
async def options_notifications(institution_id: str):
    """Handle CORS preflight for notifications endpoint."""
    return {"status": "ok"}

@router.get("/notifications/{institution_id}")
async def get_notifications(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves real-time institutional activity alerts from persistent storage."""
    assert_institution_scope(institution_id, user)
    try:
        # Fetch latest 10 unread notifications
        cursor = notifications_col.find({
            "institution_id": institution_id,
            "user_id": {"$exists": False},
            "is_read": {"$ne": True}
        }).sort("created_at", -1).limit(10)
        
        notifs = []
        async for n in cursor:
            n["_id"] = str(n["_id"])
            notifs.append(n)
        return notifs
    except Exception as e:
        logger.error(f"[NOTIF ERROR] {str(e)}")
        return []


@router.get("/notifications/me")
async def get_my_institution_notifications(user: dict = Depends(get_auth_user)):
    """Fallback-safe notification fetch for institution users without client-side institution_id."""
    institution_id = str(user.get("institution_id") or "").strip()
    if not institution_id:
        # Resolve and persist missing institution scope for older users.
        inst = None
        try:
            if user.get("institution_name"):
                inst = await institutions_col.find_one({"name": user.get("institution_name")})
            if not inst:
                inst = await institutions_col.find_one({"admin_email": str(user.get("email") or "").strip().lower()})
            if inst:
                institution_id = str(inst.get("institution_id") or "")
                await users_col.update_one(
                    {"user_id": str(user.get("user_id") or "")},
                    {"$set": {"institution_id": institution_id}},
                )
        except Exception:
            institution_id = ""
    if not institution_id:
        return []
    try:
        cursor = notifications_col.find(
            {"institution_id": institution_id, "user_id": {"$exists": False}, "is_read": {"$ne": True}}
        ).sort("created_at", -1).limit(10)
        notifs = []
        async for n in cursor:
            n["_id"] = str(n["_id"])
            notifs.append(n)
        return notifs
    except Exception as e:
        logger.error(f"[NOTIF ERROR] {str(e)}")
        return []

@router.post("/notifications/{institution_id}/mark-read")
async def mark_notifications_read(institution_id: str, user: dict = Depends(get_auth_user)):
    """Permanently marks all unread notifications for an institution as read in DB."""
    assert_institution_scope(institution_id, user)
    try:
        await notifications_col.update_many(
            {"institution_id": institution_id, "user_id": {"$exists": False}, "is_read": {"$ne": True}},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "success", "message": "All notifications marked as read"}
    except Exception as e:
        logger.error(f"[NOTIF ERROR] Mark read failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update notifications")


@router.post("/notifications/me/mark-read")
async def mark_my_notifications_read(user: dict = Depends(get_auth_user)):
    """Fallback-safe notification mark-read for institution users without client institution_id."""
    institution_id = str(user.get("institution_id") or "").strip()
    if not institution_id:
        inst = None
        try:
            if user.get("institution_name"):
                inst = await institutions_col.find_one({"name": user.get("institution_name")})
            if not inst:
                inst = await institutions_col.find_one({"admin_email": str(user.get("email") or "").strip().lower()})
            institution_id = str((inst or {}).get("institution_id") or "")
        except Exception:
            institution_id = ""
    if not institution_id:
        return {"status": "success", "message": "No institution scope found"}
    try:
        await notifications_col.update_many(
            {"institution_id": institution_id, "user_id": {"$exists": False}, "is_read": {"$ne": True}},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "success", "message": "All notifications marked as read"}
    except Exception as e:
        logger.error(f"[NOTIF ERROR] Mark read failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update notifications")

@router.get("/submissions/all-deliverables")
async def get_all_deliverables(institution_id: str, user: dict = Depends(get_auth_user)):
    """
    Global fetch for all phase-specific deliverables across all events of an institution.
    Used for the 'Phase Deliverables' tab in the global command center.
    """
    assert_institution_scope(institution_id, user)
    
    inst_variants = [institution_id, str(institution_id)]
    try:
        if len(str(institution_id)) == 24:
            inst_variants.append(ObjectId(institution_id))
    except:
        pass

    # 1. Get all events for this institution to scope the search
    events = await events_col.find({"institution_id": {"$in": inst_variants}}).to_list(length=None)
    event_ids = [str(e["_id"]) for e in events]
    event_titles = {str(e["_id"]): (e.get("title") or e.get("name") or "Event") for e in events}
    
    # 2. Fetch all teams/submissions to get global status
    teams = await teams_col.find({"event_id": {"$in": event_ids}}).to_list(length=None)
    team_status_map = {str(t["_id"]): t.get("institution_selection") or t.get("status") for t in teams}
    
    submissions = await submissions_col.find({"event_id": {"$in": event_ids}}).to_list(length=None)
    sub_status_map = {str(s["user_id"]): s.get("status") for s in submissions if s.get("user_id")}

    # 3. Fetch all submission_data (deliverables) for these events
    cursor = submission_data_col.find({"event_id": {"$in": event_ids}})
    deliverables = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        eid = str(doc.get("event_id") or "")
        doc["event_title"] = event_titles.get(eid, "Unknown Event")
        
        # Cross-reference global status
        tid = str(doc.get("team_id") or "")
        uid = str(doc.get("user_id") or "")
        
        global_status = team_status_map.get(tid) or sub_status_map.get(uid) or doc.get("status") or "Received"
        doc["status"] = global_status
        
        # Ensure name consistency for frontend
        doc["team_name"] = doc.get("team_name") or doc.get("user_name") or doc.get("title") or "Participant"
        deliverables.append(doc)
        
    return deliverables

@router.get("/submissions/{institution_id}")
async def get_all_submissions(institution_id: str, user: dict = Depends(get_auth_user)):
    """
    Retrieves all project bundles filtered by institution, categorized by lifecycle status.
    Parity with get_qualified_bundle for global institutional visibility.
    """
    assert_institution_scope(institution_id, user)
    
    inst_variants = [institution_id, str(institution_id)]
    try:
        if len(str(institution_id)) == 24:
            inst_variants.append(ObjectId(institution_id))
    except:
        pass

    # 1. Get all events
    events = await events_col.find({"institution_id": {"$in": inst_variants}}).to_list(length=None)
    event_ids = [str(e["_id"]) for e in events]
    event_titles = {str(e["_id"]): (e.get("title") or e.get("name") or "Event") for e in events}
    event_judges = {str(e["_id"]): len(e.get("judges") or []) for e in events}

    team_member_emails: dict[str, list[str]] = {}

    async def _collect_team_member_emails(team_doc: dict | None, fallback_user_id: str | None = None) -> list[str]:
        emails: list[str] = []

        def _push(value: str | None):
            if not value:
                return
            email = str(value).strip().lower()
            if email and email not in emails:
                emails.append(email)

        if team_doc:
            for member in team_doc.get("members", []) or []:
                if isinstance(member, dict):
                    _push(member.get("email"))
                    member_uid = member.get("user_id")
                    if member_uid:
                        member_user = await users_col.find_one({"user_id": str(member_uid)})
                        if not member_user and ObjectId.is_valid(str(member_uid)):
                            try:
                                member_user = await users_col.find_one({"_id": ObjectId(str(member_uid))})
                            except Exception:
                                member_user = None
                        if member_user:
                            _push(member_user.get("email"))
                else:
                    _push(member)

        if not emails and fallback_user_id:
            user_doc = await users_col.find_one({"user_id": str(fallback_user_id)})
            if not user_doc and ObjectId.is_valid(str(fallback_user_id)):
                try:
                    user_doc = await users_col.find_one({"_id": ObjectId(str(fallback_user_id))})
                except Exception:
                    user_doc = None
            if user_doc:
                _push(user_doc.get("email"))

        return emails

    # 2. Aggregate all teams and solo submissions
    all_items = {} # key: team_id or solo:user_id
    
    # Fetch Teams
    t_cursor = teams_col.find({"event_id": {"$in": event_ids}})
    async for t in t_cursor:
        tid = str(t["_id"])
        eid = str(t.get("event_id") or "")
        team_member_emails[tid] = await _collect_team_member_emails(t)
        all_items[tid] = {
            "type": "team",
            "team_id": tid,
            "team_name": t.get("name") or t.get("team_name") or "",
            "project_title": t.get("project_title") or t.get("name") or "",
            "event_id": eid,
            "event_title": event_titles.get(eid, ""),
            "score": 0,
            "judges_completed": 0,
            "total_judges": event_judges.get(eid, 0),
            "status": t.get("institution_selection") or "",
            "assigned_judges": [],
            "member_emails": team_member_emails.get(tid, []),
            "source": "team_registry"
        }

    # Fetch Solo Submissions
    s_cursor = submissions_col.find({
        "event_id": {"$in": event_ids},
        "team_id": {"$exists": False}
    })
    async for s in s_cursor:
        uid = str(s.get("user_id") or "")
        if not uid: continue
        sid = str(s["_id"])
        eid = str(s.get("event_id") or "")
        all_items[f"solo:{uid}"] = {
            "type": "solo",
            "user_id": uid,
            "team_name": s.get("user_name") or s.get("full_name") or "",
            "project_title": s.get("project_title") or "",
            "event_id": eid,
            "event_title": event_titles.get(eid, ""),
            "score": 0,
            "judges_completed": 0,
            "total_judges": event_judges.get(eid, 0),
            "status": s.get("status") or "",
            "assigned_judges": [],
            "submission_id": sid,
            "member_emails": await _collect_team_member_emails(None, uid),
            "source": "solo_registry"
        }

    # 3. Sync with Submission Data
    sd_cursor = submission_data_col.find({"event_id": {"$in": event_ids}})
    async for sd in sd_cursor:
        sid = str(sd.get("_id"))
        tid = sd.get("team_id")
        uid = sd.get("user_id")
        stage_name = sd.get("stage_name") or sd.get("stage_type") or ""
        stage_key = f"stage:{sid}"

        stage_item = {
            "type": "stage",
            "submission_id": sid,
            "stage_id": sd.get("stage_id"),
            "stage_name": stage_name,
            "stage_type": sd.get("stage_type") or "",
            "team_id": str(tid) if tid else None,
            "user_id": str(uid) if uid else None,
            "team_name": sd.get("team_name") or sd.get("user_name") or sd.get("name") or "",
            "project_title": stage_name,
            "project_description": sd.get("project_description") or sd.get("description", ""),
            "event_id": str(sd.get("event_id") or ""),
            "event_title": event_titles.get(str(sd.get("event_id") or ""), ""),
            "score": 0,
            "judges_completed": len(sd.get("assigned_judges", []) or []),
            "total_judges": len(sd.get("assigned_judges", []) or []) or event_judges.get(str(sd.get("event_id") or ""), 0),
            "status": sd.get("status") or "",
            "assigned_judges": sd.get("assigned_judges", []),
            "member_emails": team_member_emails.get(str(tid), []) if tid else await _collect_team_member_emails(None, str(uid) if uid else None),
            "source": "stage_deliverable",
            "submitted_at": sd.get("submitted_at"),
        }

        rec = str(sd.get("evaluation_recommendation") or "").lower()
        if "shortlist" in rec:
            stage_item["status"] = "Shortlisted"
        elif "reject" in rec:
            stage_item["status"] = "Rejected"
        elif "approve" in rec or "accept" in rec:
            stage_item["status"] = "Approved"

        all_items[stage_key] = stage_item

    # 4. Sync Scores
    event_ids_variants = list(event_ids)
    for eid in event_ids:
        try:
            event_ids_variants.append(ObjectId(eid))
        except Exception:
            pass
    sc_cursor = scores_col.find({"event_id": {"$in": event_ids_variants}})
    async for sc in sc_cursor:
        tid = sc.get("team_id")
        sid = sc.get("submission_id")
        target = all_items.get(str(tid)) if tid else None
        if not target:
            for it in all_items.values():
                if it.get("submission_id") == str(sid):
                    target = it
                    break
        if target:
            scores_list = target.setdefault("_score_values", [])
            scores_list.append(_score_sum(sc))
            target["judges_completed"] += 1

    # Average scores across all judges
    for item in all_items.values():
        score_list = item.pop("_score_values", [])
        if score_list:
            item["score"] = round(sum(score_list) / len(score_list), 1)

    # 5. Categorization
    shortlisted = []
    approved = []
    rejected = []
    pending = []
    
    for item in all_items.values():
        st = str(item["status"]).lower()
        if "shortlist" in st: shortlisted.append(item)
        elif "approve" in st or "accept" in st: approved.append(item)
        elif "reject" in st: rejected.append(item)
        else: pending.append(item)

    return {
        "summary": {
            "shortlisted": len(shortlisted),
            "approved": len(approved),
            "rejected": len(rejected),
            "pending": len(pending),
            "total": len(all_items)
        },
        "shortlisted": shortlisted,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "all": list(all_items.values())
    }

@router.post("/submissions")
async def create_submission(submission_data: dict):
    """
    Creates a new project submission record.
    Fulfills Nithya's core backend responsibility.
    """
    from db import submissions_col
    from datetime import datetime
    
    # 1. Prevent Duplicates (Search by team_name and event_id)
    team_name = submission_data.get("team_name")
    event_id = submission_data.get("event_id")
    
    if team_name and event_id:
        query = {"team_name": team_name, "event_id": event_id}
        # If it's a manual entry without specific user_id, we just update the record
        submission_data["updated_at"] = datetime.utcnow()
        await submissions_col.update_one(
            query,
            {"$set": submission_data},
            upsert=True
        )
        return {"status": "success", "message": "Submission recorded (updated if existed)"}
    
    # Fallback for legacy or partial data
    submission_data["submitted_at"] = datetime.utcnow()
    result = await submissions_col.insert_one(submission_data)
    
    # Notify Institution
    try:
        inst_id = str(submission_data.get("institution_id") or "").strip()
        if inst_id:
            asyncio.create_task(notify_institution(
                institution_id=inst_id,
                title="New Submission",
                message=f"A new project submission has been received for {submission_data.get('event_title', 'an event')}.",
                ntype="success"
            ))
    except Exception as ne:
        pass
    
    # [REAL-TIME NOTIFICATION] Notify Institution
    inst_id = submission_data.get("institution_id")
    if inst_id:
        institution = await institutions_col.find_one({"institution_id": inst_id})
        if institution:
            notif_settings = institution.get("notifications", {})
            admin_alerts = notif_settings.get("admin_alerts", {})
            if admin_alerts.get("new_submissions", False):
                inst_email = institution.get("email")
                if inst_email:
                    event = await events_col.find_one({"_id": ObjectId(submission_data.get("event_id"))})
                    event_title = event.get("title", "Event") if event else "Event"
                    
                    inst_subject = f"New Submission: {event_title}"
                    inst_body = f"""
                    <html>
                        <body style="font-family: 'Poppins', sans-serif; color: #333;">
                            <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                                <h2 style="color: #10B981;">New Project Submitted!</h2>
                                <p>Hello Admin,</p>
                                <p>A team has just submitted their project for <strong>{event_title}</strong>.</p>
                                <p><strong>Team Name:</strong> {submission_data.get('team_name', 'N/A')}</p>
                                <p><strong>Project Title:</strong> {submission_data.get('project_title', 'N/A')}</p>
                                <br>
                                <p>You can review the submission in your dashboard.</p>
                                <br>
                                <p>Best Regards,<br>Studlyf Institution Network</p>
                            </div>
                        </body>
                    </html>
                    """
                    asyncio.create_task(send_notification_email(inst_email, inst_subject, inst_body))

    return {"status": "success", "id": str(result.inserted_id)}

@router.get("/judge/assigned/{judge_id}")
async def get_assigned_projects(
    judge_id: str,
    event_id: Optional[str] = Query(None),
    user: dict = Depends(get_auth_user),
):
    """Submissions the logged-in user may judge (path segment is legacy; identity comes from JWT email)."""
    return await _list_submissions_for_judge_user(user, event_id)


@router.get("/judge/my-assignments")
async def judge_my_assignments(
    event_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_auth_user),
):
    """Explicit alias for assignment list (authenticated)."""
    return await _list_submissions_for_judge_user(user, event_id, limit=limit, offset=offset)


@router.get("/judge/criteria/{event_id}")
async def get_judge_event_criteria(event_id: str, user: dict = Depends(get_auth_user)):
    """Return rubric criteria for a judge to score assigned submissions."""
    event = await events_col.find_one(_event_id_query(event_id), {"judging_criteria": 1, "title": 1})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    criteria = event.get("judging_criteria") or []
    if not isinstance(criteria, list):
        criteria = []
    return [
        {
            "id": c.get("id") or c.get("name") or f"criterion_{i}",
            "name": c.get("name") or c.get("label") or f"Criterion {i + 1}",
            "max_points": float(c.get("max_points") or c.get("max_score") or 10),
            "description": c.get("description") or "",
        }
        for i, c in enumerate(criteria)
        if isinstance(c, dict)
    ]


@router.get("/judge/my-invitations")
async def judge_my_invitations(user: dict = Depends(get_auth_user)):
    """Pending judge invitations for the logged-in account email."""
    from services.judge_service import get_pending_invitations_for_email

    email = (user.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Account email required")
    return await get_pending_invitations_for_email(email)


@router.post("/judge/respond-invitation")
async def judge_respond_invitation(body: dict, user: dict = Depends(get_auth_user)):
    """Judge accepts or declines (matched by logged-in account email, not institution admin)."""
    from services.judge_service import respond_judge_invitation

    accept = bool(body.get("accept", True))
    email = (user.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Account email required")

    token = str(body.get("token") or "").strip()
    event_id = body.get("event_id")
    try:
        if token:
            return await respond_judge_invitation(token=token, accept=accept)
        if event_id:
            from db import judges_col
            judge_doc = await judges_col.find_one({
                "email": email,
                "event_id": str(event_id),
            })
            if judge_doc and judge_doc.get("invitation_token"):
                return await respond_judge_invitation(token=judge_doc["invitation_token"], accept=accept)
            return await respond_judge_invitation(judge_email=email, event_id=str(event_id), accept=accept)
        return await respond_judge_invitation(judge_email=email, accept=accept)
    except LookupError:
        raise HTTPException(status_code=404, detail="No invitation found for your email")


@router.post("/judge/score")
async def save_judge_score(score_data: dict, user: dict = Depends(get_auth_user)):
    """
    Saves a judge's evaluation with support for multiple criteria 
    (Innovation, UI, etc.) and auto-calculates total.
    """
    from db import scores_col, submissions_col, teams_col
    from datetime import datetime

    ue = (user.get("email") or "").strip().lower()
    if not ue:
        raise HTTPException(status_code=400, detail="Account email required for scoring")
    criteria_scores = score_data.get("criteria_scores") or score_data.get("scores") or {}
    if isinstance(criteria_scores, dict):
        try:
            criteria_scores = {k: float(v) for k, v in criteria_scores.items()}
        except (TypeError, ValueError):
            criteria_scores = {}
    total_score = sum(criteria_scores.values()) if criteria_scores else float(score_data.get("total_score", 0))

    submission_id = score_data.get("submission_id")
    event_id = score_data.get("event_id")
    team_id = score_data.get("team_id")
    if not submission_id or not event_id:
        raise HTTPException(status_code=400, detail="submission_id and event_id are required")

    sub = await submissions_col.find_one({"_id": ObjectId(str(submission_id))})
    source_col = submissions_col
    if not sub:
        try:
            sub = await submission_data_col.find_one({"_id": ObjectId(str(submission_id))})
            source_col = submission_data_col
        except Exception:
            sub = None
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not team_id and sub.get("team_id"):
        team_id = str(sub["team_id"])
    assigned = sub.get("assigned_judge_emails") or []
    if assigned:
        norm = {str(a).strip().lower() for a in assigned if a}
        if ue not in norm:
            raise HTTPException(status_code=403, detail="You are not assigned to review this submission")
    else:
        judge_match = any(
            str(aj.get("email") or "").strip().lower() == ue
            for aj in (sub.get("assigned_judges") or [])
            if isinstance(aj, dict)
        )
        if not judge_match:
            raise HTTPException(status_code=403, detail="You are not assigned to review this submission")

    je = (score_data.get("judge_email") or "").strip().lower()
    if je and je != ue:
        raise HTTPException(status_code=403, detail="judge_email must match the authenticated account")

    judge_id = score_data.get("judge_id") or user.get("id") or ""
    upsert_filter = {"submission_id": submission_id}
    if judge_id:
        upsert_filter["judge_id"] = judge_id
    else:
        upsert_filter["judge_email"] = ue

    now = datetime.utcnow()
    await scores_col.update_one(
        upsert_filter,
        {"$set": {
            "event_id": event_id,
            "team_id": team_id,
            "submission_id": submission_id,
            "judge_email": ue,
            "judge_id": judge_id,
            "scores": criteria_scores,
            "criteria_scores": criteria_scores,
            "total_score": total_score,
            "feedback": score_data.get("feedback") or score_data.get("comments") or "",
            "evaluated_at": now,
            "updated_at": now,
        }, "$setOnInsert": {
            "created_at": now,
        }},
        upsert=True
    )

    await source_col.update_one(
        {"_id": ObjectId(str(submission_id))},
        {"$set": {
            "status": "Scored",
            "total_score": total_score,
            "evaluation_score": total_score,
            "last_evaluated_at": now,
        }},
    )

    event = await events_col.find_one({"_id": ObjectId(str(event_id))})
    if event:
        inst_id = event.get("institution_id")
        team_name = "a team"
        if team_id:
            team = await teams_col.find_one({"_id": ObjectId(str(team_id))})
            if team:
                team_name = team.get("name") or team_name
        if inst_id:
            await notify_institution(
                str(inst_id),
                f"Judge {ue} submitted a score ({total_score}/100) for {team_name} on \"{event.get('title', 'event')}\".",
                ntype="judge_scored",
                title="Submission scored",
                meta={"event_id": str(event_id), "submission_id": str(submission_id), "judge_email": ue},
            )
        institution = await institutions_col.find_one({"institution_id": event["institution_id"]})
        if institution:
            notif_settings = institution.get("notifications", {}).get("admin_alerts", {})
            if notif_settings.get("judge_evaluations", True):
                inst_email = institution.get("email")
                if inst_email:
                    subject = f"Judge Action: {team_name} Scored ({total_score}/100)"
                    body = f"""
                    <html>
                        <body style="font-family: 'Poppins', sans-serif; color: #333;">
                            <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
                                <h2 style="color: #6C3BFF;">Evaluation Complete</h2>
                                <p>Hello Admin,</p>
                                <p>A judge has finished evaluating <strong>{team_name}</strong> for the event: <strong>{event['title']}</strong>.</p>
                                <div style="background: #f8f9ff; padding: 15px; border-radius: 10px; border-left: 4px solid #6C3BFF;">
                                    <p style="margin: 0;"><strong>Final Score:</strong> {total_score} / 100</p>
                                </div>
                                <br>
                                <p>The team has been updated in your <strong>Selection Command Center</strong>.</p>
                                <br>
                                <p>Best Regards,<br>Studlyf Evaluation Network</p>
                            </div>
                        </body>
                    </html>
                    """
                    asyncio.create_task(send_notification_email(inst_email, subject, body))

    await log_admin_action(ue, "SUBMISSION_SCORED", f"Scored team {team_id}")
    return {"status": "success", "total_score": total_score}

@router.get("/analytics/{institution_id}/timeline")
async def get_analytics_timeline(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves the 30-day registration timeline for a specific institution."""
    assert_institution_scope(institution_id, user)
    return await analytics_service.get_registration_timeline(institution_id)

@router.get("/analytics/{institution_id}/departments")
async def get_analytics_departments(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves the departmental participation breakdown."""
    assert_institution_scope(institution_id, user)
    return await analytics_service.get_departmental_breakdown(institution_id)

@router.get("/analytics/{institution_id}/score-distribution")
async def get_score_distribution(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves score frequency distribution from real data."""
    assert_institution_scope(institution_id, user)
    from db import scores_col, submissions_col
    
    # Simple aggregation to count scores in buckets
    pipeline = [
        # Match scores for submissions belonging to this institution
        {"$lookup": {
            "from": "submissions",
            "localField": "submission_id",
            "foreignField": "_id",
            "as": "submission"
        }},
        {"$unwind": "$submission"},
        {"$match": {"submission.institution_id": institution_id}},
        {"$project": {
            "bucket": {
                "$switch": {
                    "branches": [
                        {"case": {"$lte": ["$total_score", 20]}, "then": "0-20"},
                        {"case": {"$lte": ["$total_score", 40]}, "then": "21-40"},
                        {"case": {"$lte": ["$total_score", 60]}, "then": "41-60"},
                        {"case": {"$lte": ["$total_score", 80]}, "then": "61-80"}
                    ],
                    "default": "81-100"
                }
            }
        }},
        {"$group": {"_id": "$bucket", "count": {"$sum": 1}}},
        {"$project": {"range": "$_id", "count": 1, "_id": 0}}
    ]
    
    results = await scores_col.aggregate(pipeline).to_list(None)
    
    # Ensure all ranges are present even if count is 0
    ranges = ["0-20", "21-40", "41-60", "61-80", "81-100"]
    final_results = []
    for r in ranges:
        match = next((item for item in results if item["range"] == r), None)
        final_results.append(match if match else {"range": r, "count": 0})
        
    return final_results

@router.get("/analytics/{institution_id}/submission-distribution")
async def get_submission_distribution(institution_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves submissions per event from real data."""
    assert_institution_scope(institution_id, user)
    from db import submissions_col
    
    pipeline = [
        {"$match": {"institution_id": institution_id}},
        {"$lookup": {
            "from": "events",
            "localField": "event_id",
            "foreignField": "_id",
            "as": "event_info"
        }},
        {"$unwind": "$event_info"},
        {"$group": {"_id": "$event_info.title", "count": {"$sum": 1}}},
        {"$project": {"event": "$_id", "count": 1, "_id": 0}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    
    return await submissions_col.aggregate(pipeline).to_list(None)

@router.get("/export-summary/{institution_id}")
async def export_institution_summary(institution_id: str, user: dict = Depends(get_auth_user)):
    """Generates and returns an executive summary report for the institution."""
    assert_institution_scope(institution_id, user)
    return {"message": "Export feature coming soon", "institution_id": institution_id}

@router.patch("/submissions/{submission_id}/status")
async def update_submission_status(submission_id: str, status_update: dict, user: dict = Depends(get_auth_user)):
    """Updates the review status and records internal processing notes (PRs, Venue, etc)."""
    from db import submissions_col
    sub = await submissions_col.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    eid = str(sub.get("event_id") or "")
    if eid:
        await assert_institution_owns_event(eid, user)
    else:
        assert_institution_scope(str(sub.get("institution_id") or ""), user)
    
    # Validate status value
    valid_statuses = ["Pending", "Under Review", "Evaluated", "Shortlisted", "Accepted", "Rejected", "Assigned"]
    new_status = status_update.get("status", "")
    if new_status and new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}")
    
    update_fields = {
        "status": new_status,
        "internal_notes": status_update.get("notes", status_update.get("internal_notes", "")),
        "pr_links": status_update.get("pr_links", []),
        "processed_at": datetime.utcnow().isoformat()
    }
    await submissions_col.update_one({"_id": ObjectId(submission_id)}, {"$set": update_fields})
    await log_admin_action("admin@institution.com", "SUBMISSION_PROCESSED", f"Processed submission {submission_id} with status {status_update['status']}")
    return {"status": "success"}


@router.patch("/events/{event_id}/submission-data/{submission_id}/status")
async def update_submission_data_status(event_id: str, submission_id: str, status_update: dict, user: dict = Depends(get_auth_user)):
    """Updates stage-deliverable review status stored in submission_data_col."""
    from db import submission_data_col

    await assert_institution_owns_event(event_id, user)

    try:
        sub_id_variants = [submission_id]
        if ObjectId.is_valid(submission_id):
            sub_id_variants.append(ObjectId(submission_id))
    except Exception:
        sub_id_variants = [submission_id]

    doc = await submission_data_col.find_one({"_id": {"$in": sub_id_variants}})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission data not found")

    valid_statuses = ["Pending", "Under Review", "Evaluated", "Shortlisted", "Accepted", "Rejected", "Assigned"]
    new_status = str(status_update.get("status", "")).strip()
    if new_status and new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}")

    recommendation_map = {
        "Shortlisted": "shortlist",
        "Accepted": "approve",
        "Rejected": "reject",
        "Pending": "pending",
        "Under Review": "under review",
        "Evaluated": "evaluated",
        "Assigned": "assigned",
    }

    update_fields = {
        "status": new_status,
        "evaluation_recommendation": recommendation_map.get(new_status, status_update.get("evaluation_recommendation", "")),
        "review_status": str(status_update.get("review_status") or new_status).strip().lower().replace(" ", "_"),
        "internal_notes": status_update.get("notes", status_update.get("internal_notes", "")),
        "pr_links": status_update.get("pr_links", []),
        "processed_at": datetime.utcnow().isoformat(),
    }

    await submission_data_col.update_one({"_id": doc["_id"]}, {"$set": update_fields})
    await log_admin_action("admin@institution.com", "STAGE_SUBMISSION_PROCESSED", f"Processed stage submission data {submission_id} with status {new_status}")
    return {"status": "success"}

def _next_stage_after_team_formation(event_doc: dict) -> Optional[str]:
    stages = event_doc.get("stages") or []
    team_stage_idx = None
    for idx, s in enumerate(stages):
        stype = str(s.get("type") or "").upper()
        sname = str(s.get("name") or "").lower()
        if stype == "TEAM_FORMATION" or "team formation" in sname or (stype == "REGISTRATION" and "team" in sname):
            team_stage_idx = idx
    if team_stage_idx is None:
        return None
    for s in stages[team_stage_idx + 1:]:
        stype = str(s.get("type") or "").upper()
        if stype not in ("REGISTRATION", "TEAM_FORMATION"):
            return s.get("name")
    return None


@router.patch("/events/{event_id}/teams/{team_id}/status")
async def update_team_status(event_id: str, team_id: str, status_update: dict, user: dict = Depends(get_auth_user)):
    """Updates team status, syncs all members, advances stage on approval, sends unlock email."""
    await assert_institution_owns_event(event_id, user)
    from db import participants_col, teams_col, notifications_col, users_col, opportunity_applications_col, opportunities_col
    from services.email_service import send_notification_email
    from services.email_template_service import get_active_template, render_template, render_stage_custom_email

    raw_status = str(status_update.get("status") or "").lower().strip()
    participant_status = "shortlisted" if raw_status in ("approved", "shortlisted", "accepted") else raw_status

    team_doc = None
    try:
        team_doc = await teams_col.find_one({"_id": ObjectId(team_id)})
    except Exception:
        team_doc = await teams_col.find_one({"team_id": team_id})
    if not team_doc:
        raise HTTPException(status_code=404, detail="Team not found")

    event_doc = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        event_doc = await events_col.find_one({"event_id": event_id})

    await teams_col.update_one(
        {"_id": team_doc["_id"]},
        {"$set": {"status": raw_status, "updated_at": datetime.utcnow()}},
    )

    member_ids = [str(m.get("user_id")) for m in (team_doc.get("members") or []) if m.get("user_id")]
    team_id_str = str(team_doc["_id"])
    event_id_str = str(event_id)

    next_stage_name = _next_stage_after_team_formation(event_doc or {}) if raw_status in ("approved", "shortlisted", "accepted") else None
    next_stage_doc = None
    if next_stage_name and event_doc:
        for s in event_doc.get("stages", []):
            if s.get("name") == next_stage_name:
                next_stage_doc = s
                break

    participant_update: dict = {"status": participant_status, "team_id": team_id_str, "updated_at": datetime.utcnow()}
    if next_stage_name:
        participant_update["current_stage"] = next_stage_name

    updated = 0
    for uid in member_ids:
        prev = await participants_col.find_one({
            "$or": [{"event_id": event_id_str}, {"event_id": ObjectId(event_id_str) if ObjectId.is_valid(event_id_str) else event_id_str}],
            "user_id": uid,
        })
        push_completed = {}
        if prev and next_stage_name:
            prev_stage = prev.get("current_stage")
            if prev_stage and prev_stage != next_stage_name:
                push_completed = {"$push": {"completed_stages": prev_stage}}

        res = await participants_col.update_one(
            {
                "$or": [{"event_id": event_id_str}, {"event_id": ObjectId(event_id_str) if ObjectId.is_valid(event_id_str) else event_id_str}],
                "user_id": uid,
            },
            {"$set": participant_update, **push_completed},
            upsert=False,
        )
        updated += res.modified_count

        opp = await opportunities_col.find_one({"event_link_id": event_id_str})
        if not opp and event_doc:
            opp = await opportunities_col.find_one({"event_link_id": str(event_doc.get("event_id") or "")})
        if opp:
            await opportunity_applications_col.update_one(
                {"opportunity_id": str(opp["_id"]), "user_id": uid},
                {"$set": {"status": participant_status, "current_stage": next_stage_name or prev.get("current_stage") if prev else None}},
            )

    if raw_status in ("approved", "shortlisted", "accepted") and next_stage_doc and event_doc:
        comm = next_stage_doc.get("communication") or {}
        if comm.get("send_email_on_unlock", True):
            for uid in member_ids:
                try:
                    p_doc = await participants_col.find_one({"event_id": event_id_str, "user_id": uid}) or await participants_col.find_one({"user_id": uid, "team_id": team_id_str})
                    email = (p_doc or {}).get("email")
                    if not email:
                        u = await users_col.find_one({"user_id": uid})
                        email = (u or {}).get("email")
                    if not email:
                        continue
                    p_name = (p_doc or {}).get("name") or "Participant"
                    team_name = team_doc.get("team_name") or team_doc.get("name") or "Your Team"
                    end_raw = next_stage_doc.get("end_date") or next_stage_doc.get("endDate") or next_stage_doc.get("deadline")
                    deadline_str = str(end_raw) if end_raw else "See event portal"
                    ctx = {
                        "team_name": team_name,
                        "participant_name": p_name,
                        "event_name": event_doc.get("title", "Event"),
                        "stage_name": next_stage_name,
                        "deadline": deadline_str,
                    }
                    subj_override = comm.get("email_subject_override")
                    body_md = comm.get("email_body_markdown")
                    if subj_override or body_md:
                        subject, body_html = render_stage_custom_email(subj_override, body_md, ctx)
                    else:
                        tmpl = await get_active_template(event_id_str, str(event_doc.get("institution_id") or ""), "stage_advancement")
                        subject, body_html = render_template(tmpl, ctx) if tmpl else (
                            f"Next stage unlocked — {next_stage_name}",
                            f"<p>Hi {p_name},</p><p>Your team <strong>{team_name}</strong> has been approved. "
                            f"<strong>{next_stage_name}</strong> is now open. Deadline: {deadline_str}.</p>",
                        )
                    await send_notification_email(email, subject, body_html)
                except Exception as e:
                    logger.error(f"Team approval email failed for {uid}: {e}")

    try:
        if team_doc and event_doc:
            for m in team_doc.get("members", []):
                m_uid = m.get("user_id")
                if m_uid:
                    asyncio.create_task(notifications_col.insert_one({
                        "user_id": str(m_uid),
                        "title": f"Team Update: {event_doc.get('title')}",
                        "message": f"Your team '{team_doc.get('team_name') or team_doc.get('name')}' was {raw_status}."
                        + (f" {next_stage_name} is now open." if next_stage_name else ""),
                        "type": "stage_advancement",
                        "is_read": False,
                        "created_at": datetime.utcnow(),
                    }))
    except Exception as e:
        logger.error(f"Failed to create team in-app notification: {e}")

    return {"status": "success", "updated_count": updated, "next_stage": next_stage_name}

@router.post("/events/{event_id}/send-status-email")
async def send_status_email(event_id: str, email_data: dict, user: dict = Depends(get_auth_user)):
    """Sends status update email to team members."""
    await assert_institution_owns_event(event_id, user)
    from db import events_col, participants_col, teams_col, users_col
    
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    team_name = email_data.get("team_name", "Team")
    status = email_data.get("status", "Updated")
    team_id = email_data.get("team_id")
    emails = email_data.get("emails", [])
    
    print(f"[EMAIL DEBUG] Team ID: {team_id}, Status: {status}, Provided emails: {emails}")

    def _add_email(value: str | None, bucket: list[str]):
        if not value:
            return
        email_value = str(value).strip().lower()
        if email_value and email_value not in bucket:
            bucket.append(email_value)
    
    # If no emails provided, try to fetch from the team roster first
    if not emails and team_id:
        team_doc = None
        try:
            if ObjectId.is_valid(team_id):
                team_doc = await teams_col.find_one({"_id": ObjectId(team_id)})
        except Exception:
            team_doc = None
        if not team_doc:
            team_doc = await teams_col.find_one({"team_id": team_id})

        if team_doc:
            for member in team_doc.get("members", []) or []:
                if member.get("email"):
                    _add_email(member.get("email"), emails)
                    continue
                member_user_id = member.get("user_id")
                if not member_user_id:
                    continue
                user_doc = await users_col.find_one({"user_id": str(member_user_id)})
                if not user_doc and ObjectId.is_valid(str(member_user_id)):
                    try:
                        user_doc = await users_col.find_one({"_id": ObjectId(str(member_user_id))})
                    except Exception:
                        user_doc = None
                if user_doc and user_doc.get("email"):
                    _add_email(user_doc.get("email"), emails)

    # Fallback: participants collection may still carry user emails for legacy records
    if not emails and team_id:
        participants = await participants_col.find({
            "event_id": event_id,
            "team_id": team_id
        }).to_list(None)
        for participant in participants:
            _add_email(participant.get("email"), emails)
            if participant.get("user_id"):
                user_doc = await users_col.find_one({"user_id": str(participant.get("user_id"))})
                if not user_doc and ObjectId.is_valid(str(participant.get("user_id"))):
                    try:
                        user_doc = await users_col.find_one({"_id": ObjectId(str(participant.get("user_id")))})
                    except Exception:
                        user_doc = None
                if user_doc and user_doc.get("email"):
                    _add_email(user_doc.get("email"), emails)
        print(f"[EMAIL DEBUG] Fetched {len(emails)} emails from participants: {emails}")
    
    if not emails:
        print(f"[EMAIL DEBUG] No email addresses found for team {team_id}")
        return {"status": "no_emails", "message": "No email addresses provided", "emails_found": emails}
    
    # Stage context from frontend
    stage_context = email_data.get("stage_context", {})
    stage_number = stage_context.get("stage_number", 1)
    total_stages = stage_context.get("total_stages", 1)
    stage_name = stage_context.get("stage_name", "")
    next_stage_name = stage_context.get("next_stage_name", "")
    is_final_stage = stage_context.get("is_final_stage", False)
    
    # Build dynamic messages using actual stage names from event data
    if is_final_stage:
        # Final stage messages - mention "Winner" or "Finalist"
        status_messages = {
            "Approved": f"Congratulations! Your team has been selected as a WINNER of {event.get('title', 'the event')}! You excelled in the final {stage_name}. Well done!",
            "Rejected": f"We regret to inform you that your team has not been selected for the final {stage_name} of {event.get('title', 'the event')}. We appreciate your participation throughout the competition.",
            "Shortlisted": f"Great news! Your team has been shortlisted for the final {stage_name} of {event.get('title', 'the event')}. The final results will be announced soon!",
            "Winner": f"Congratulations! Your team has been declared a WINNER of {event.get('title', 'the event')}! You excelled in the final {stage_name}. Well done!"
        }
        subject = f"Final Round Result - {event.get('title', 'Event')}"
    else:
        # Regular stage messages - use actual stage names from frontend
        if total_stages > 1:
            # Multi-stage event - mention the actual next stage name for approvals
            next_stage_display = next_stage_name if next_stage_name else f"Round {stage_number + 1}"
            current_stage_display = stage_name if stage_name else f"Round {stage_number}"
            
            status_messages = {
                "Approved": f"Congratulations! Your team has been selected and approved to advance to {next_stage_display}. Keep up the great work!",
                "Rejected": f"We regret to inform you that your team has not been selected for {current_stage_display}. We encourage you to participate in future events.",
                "Shortlisted": f"Great news! Your team has been shortlisted for {current_stage_display}. We will notify you of the final decision soon.",
                "Winner": f"Congratulations! Your team has been declared a WINNER of {event.get('title', 'the event')}!"
            }
            subject = f"{current_stage_display} Result - {event.get('title', 'Event')}"
        else:
            # Single stage event
            status_messages = {
                "Approved": "Congratulations! Your team has been selected and approved.",
                "Rejected": "We regret to inform you that your team has not been selected.",
                "Shortlisted": "Great news! Your team has been shortlisted for further consideration.",
                "Winner": f"Congratulations! Your team has been declared a WINNER of {event.get('title', 'the event')}!"
            }
            subject = f"Application Status Update - {event.get('title', 'Event')}"
    
    message = status_messages.get(status, f"Your team status has been updated to: {status}")
    
    body_html = f"""
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #6C3BFF; margin-top: 0;">{subject}</h2>
            <p style="font-size: 16px; color: #333;">Dear Team,</p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">{message}</p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">This is an automated message regarding your application for <strong>{event.get('title', 'the event')}</strong>.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Best regards,</p>
            <p style="font-size: 14px; color: #333; font-weight: bold; margin-top: 0;">{event.get('title', 'Event Team')}</p>
        </div>
    </div>
    """
    
    # Send emails to all team members
    from services.email_service import send_notification_email
    sent_count = 0
    for email in emails:
        try:
            print(f"[EMAIL DEBUG] Attempting to send email to {email}")
            result = await send_notification_email(email, subject, body_html)
            print(f"[EMAIL DEBUG] Email sent to {email}, result: {result}")
            sent_count += 1
        except Exception as e:
            print(f"[EMAIL DEBUG] Failed to send email to {email}: {e}")
    
    print(f"[EMAIL DEBUG] Email sending complete. Sent: {sent_count}/{len(emails)}")

    submission_id = email_data.get("submission_id")
    if sent_count > 0 and submission_id:
        from db import submission_data_col
        sid_variants = [submission_id]
        if ObjectId.is_valid(str(submission_id)):
            sid_variants.append(ObjectId(str(submission_id)))
        await submission_data_col.update_one(
            {"_id": {"$in": sid_variants}},
            {"$set": {"notified_at": datetime.now(timezone.utc).isoformat(), "last_notified_status": status}},
        )

    return {"status": "success", "sent_count": sent_count, "total_emails": len(emails)}

@router.patch("/participants/{participant_id}/verify")
async def verify_internal_process(participant_id: str, verification_data: dict):
    """Handles internal verification: Payment (NIT) and Venue Assignment (SIRT)."""
    from db import participants_col
    update_fields = {
        "payment_verified": verification_data.get("payment_verified", False),
        "venue_assignment": verification_data.get("venue_assignment", "N/A"),
        "is_eligible": verification_data.get("is_eligible", True)
    }
    await participants_col.update_one({"_id": ObjectId(participant_id)}, {"$set": update_fields})
    return {"status": "success"}

@router.get("/events/{event_id}/details")
async def get_complex_event_details(event_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves full event details including stages, fees, and rules."""
    ev = await assert_institution_owns_event(event_id, user)
    # Re-use the already-fetched event doc from the auth check
    event = dict(ev)
    event["_id"] = str(event["_id"])
    # Ensure stages is always a list
    if "stages" not in event or event["stages"] is None:
        event["stages"] = []
    # Ensure each stage has a stable id (persist back to DB so UI edits/delete are correct)
    if isinstance(event.get("stages"), list):
        mutated = False
        for s in event["stages"]:
            if isinstance(s, dict) and not s.get("id"):
                s["id"] = str(uuid.uuid4())
                mutated = True
        if mutated:
            await events_col.update_one(_event_id_query(event_id), {"$set": {"stages": event["stages"]}})

    # Backfill image fields from the mirrored opportunity row when the event record does not carry them.
    try:
        if not event.get("logo_url") or not event.get("banner_url"):
            from db import opportunities_col
            opp = await opportunities_col.find_one({"event_link_id": str(event_id)})
            if opp:
                if not event.get("logo_url"):
                    event["logo_url"] = opp.get("logo_url") or opp.get("image_url") or opp.get("logoUrl") or ""
                if not event.get("banner_url"):
                    event["banner_url"] = opp.get("banner_url") or opp.get("bannerUrl") or ""
        # Normalize common aliases for frontend consumers that still read legacy keys.
        if event.get("logo_url"):
            event["logoUrl"] = event.get("logo_url")
            event["image_url"] = event.get("image_url") or event.get("logo_url")
        if event.get("banner_url"):
            event["bannerUrl"] = event.get("banner_url")
    except Exception:
        logger.exception("Failed to backfill event image URLs")

    return _strip_event_payload_bloat(event)

def _format_deadline(dl: str) -> str:
    """Convert ISO deadline string to human-readable format (e.g. 'May 28, 2026 11:59 PM')."""
    try:
        dt = datetime.fromisoformat(dl.replace('Z', '+00:00'))
        return dt.strftime('%B %d, %Y %I:%M %p')
    except Exception:
        return dl

async def _notify_deadline_extensions(event_id: str, changed_deadlines: list):
    """Send deadline extension notifications to all participants."""
    from services.email_template_service import get_active_template, render_template
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        return
    event_title = event.get("title", "")
    institution_id = event.get("institution_id", "")
    tmpl = await get_active_template(event_id, institution_id, "deadline_extension")
    async for p in participants_col.find({"event_id": event_id}):
        uid = p.get("user_id")
        p_name = p.get("name") or p.get("full_name") or ""
        p_email = p.get("email")
        if not p_email and uid:
            u_doc = await users_col.find_one({"user_id": uid})
            if u_doc:
                p_email = u_doc.get("email")
        team_name = p_name
        team_id = p.get("team_id")
        if team_id:
            try:
                from db import teams_col
                team_doc = await teams_col.find_one({"_id": ObjectId(str(team_id))})
                if team_doc:
                    team_name = team_doc.get("team_name") or p_name
            except Exception:
                pass
        for cd in changed_deadlines:
            human_dl = _format_deadline(cd["new_deadline"])
            context = {
                "team_name": team_name,
                "event_name": event_title,
                "stage_name": cd["stage_name"],
                "participant_name": p_name,
                "new_deadline": human_dl,
            }
            if tmpl:
                subject, body = render_template(tmpl, context)
            else:
                subject = f"Deadline Extended: {event_title} - {cd['stage_name']}"
                body = f"<p>The deadline for <strong>{cd['stage_name']}</strong> in <strong>{event_title}</strong> has been extended to <strong>{human_dl}</strong>.</p>"
            await notifications_col.insert_one({
                "user_id": uid or p_email,
                "type": "deadline_extension",
                "title": subject,
                "message": f"Deadline for '{cd['stage_name']}' extended to {human_dl}",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "meta": {"event_id": event_id, "stage_name": cd["stage_name"]}
            })
            if p_email:
                asyncio.create_task(send_notification_email(p_email, subject, body))


async def _notify_new_opportunity(event_id: str):
    """Send new opportunity alert to students and notify institution admin."""
    from db import opportunities_col

    opp = await opportunities_col.find_one({"event_link_id": event_id})
    if not opp:
        return
    # Fetch source event for richer template context
    from db import events_col as _ev_col
    source_event = None
    try:
        source_event = await _ev_col.find_one({"_id": ObjectId(event_id)})
    except Exception:
        pass
    from services.opportunity_notification_service import send_new_opportunity_email
    await send_new_opportunity_email(opp, event=source_event)

    # Also notify institution admin via template system
    try:
        from db import events_col, users_col
        from services.platform_notification_service import notify_event_published
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if event:
            iid = event.get("institution_id")
            if iid:
                admins = await users_col.find({
                    "institution_id": str(iid),
                    "role": {"$in": ["admin", "institution", "super_admin"]}
                }).to_list(length=None)
                title = event.get("title", "New Event")
                for admin in admins:
                    email = admin.get("email", "").strip()
                    if not email:
                        continue
                    await notify_event_published(
                        recipient_email=email,
                        organizer_name=admin.get("full_name") or admin.get("name") or "Organizer",
                        event_title=title,
                        event_link=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/#/events/{event_id}",
                    )
    except Exception as e:
        logger.error(f"[ADMIN NOTIFY] Failed: {str(e)}")


@router.patch("/events/{event_id}")
async def update_event_details(event_id: str, update_data: dict, user: dict = Depends(get_auth_user)):
    """Updates general event information."""
    await assert_institution_owns_event(event_id, user)
    from db import events_col

    # ── Detect changes before applying update ──
    changed_deadlines = []
    old_event = await events_col.find_one({"_id": ObjectId(event_id)})
    old_status = (old_event or {}).get("status", "")
    old_stages = {}
    if isinstance(update_data.get("stages"), list) and old_event:
        for s in (old_event.get("stages") or []):
            if isinstance(s, dict) and s.get("id"):
                old_stages[s["id"]] = s
        for new_s in update_data["stages"]:
            if not isinstance(new_s, dict):
                continue
            sid = new_s.get("id")
            if not sid:
                continue
            old_s = old_stages.get(sid, {})
            old_dl = str(old_s.get("end_date") or old_s.get("endDate") or old_s.get("deadline") or "")
            new_dl = str(new_s.get("end_date") or new_s.get("endDate") or new_s.get("deadline") or "")
            if old_dl and new_dl and old_dl != new_dl:
                changed_deadlines.append({
                    "stage_name": new_s.get("name") or old_s.get("name") or "",
                    "new_deadline": new_dl,
                    "old_deadline": old_dl,
                })
    new_status = update_data.get("status", old_status)
    just_published = old_status != "LIVE" and new_status == "LIVE"

    if "_id" in update_data: del update_data["_id"]

    # Persist certificate award setup as part of the event document.
    cert_award_config = update_data.pop("certificate_award_config", None)
    if cert_award_config is not None:
        update_data["certificate_award_config"] = cert_award_config

    # Normalize stages: ensure stable ids are persisted.
    if isinstance(update_data.get("stages"), list):
        for s in update_data["stages"]:
            if isinstance(s, dict):
                if not s.get("id"):
                    s["id"] = str(uuid.uuid4())
                
                # Strip judgeIds from non-REVIEW stages (defense-in-depth)
                if str(s.get("type", "")).upper() != "REVIEW":
                    if isinstance(s.get("config"), dict) and "judgeIds" in s["config"]:
                        del s["config"]["judgeIds"]
                
                # Validate stage dates — only for stages whose dates actually changed
                today = datetime.now(timezone.utc)
                start_str = (s.get("start_date") or "").strip()
                end_str = (s.get("end_date") or "").strip()
                old_s = old_stages.get(s.get("id"), {})
                old_start = str(old_s.get("start_date") or "").strip()
                old_end = str(old_s.get("end_date") or "").strip()
                is_new = s.get("id") not in old_stages
                if is_new or start_str != old_start:
                    if start_str:
                        try:
                            start_dt = datetime.fromisoformat(start_str)
                            if start_dt.tzinfo is None:
                                start_dt = start_dt.replace(tzinfo=timezone.utc)
                        except Exception:
                            start_dt = None
                        if start_dt and start_dt < today:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Stage '{s.get('name', 'Untitled')}' start date ({start_str}) cannot be in the past."
                            )
                if (is_new or start_str != old_start or end_str != old_end) and start_str and end_str and end_str < start_str:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stage '{s.get('name', 'Untitled')}' end date ({end_str}) cannot be before start date ({start_str})."
                    )
                
                # Synchronize registration deadline from stages
                if str(s.get("type", "")).upper() == "REGISTRATION":
                    reg_end = s.get("end_date") or s.get("endDate") or s.get("deadline")
                    if reg_end:
                        update_data["registrationDeadline"] = reg_end

    # Self-Healing Media Preservation Guard: preserve existing logo/banner if missing or empty in payload
    ev_in_db = await events_col.find_one(_event_id_query(event_id))
    if ev_in_db:
        # Determine if payload has a valid logo
        payload_logo = update_data.get("logo_url") or update_data.get("logoUrl") or update_data.get("logo") or update_data.get("image_url")
        db_logo = ev_in_db.get("logo_url") or ev_in_db.get("logoUrl") or ev_in_db.get("logo") or ev_in_db.get("image_url")
        if not payload_logo and db_logo:
            update_data["logo_url"] = db_logo
            update_data["logoUrl"] = db_logo
            update_data["image_url"] = db_logo
        elif payload_logo:
            update_data["logo_url"] = payload_logo
            update_data["logoUrl"] = payload_logo
            update_data["image_url"] = payload_logo

        # Determine if payload has a valid banner
        payload_banner = update_data.get("banner_url") or update_data.get("bannerUrl") or update_data.get("banner")
        db_banner = ev_in_db.get("banner_url") or ev_in_db.get("bannerUrl") or ev_in_db.get("banner")
        if not payload_banner and db_banner:
            update_data["banner_url"] = db_banner
            update_data["bannerUrl"] = db_banner
        elif payload_banner:
            update_data["banner_url"] = payload_banner
            update_data["bannerUrl"] = payload_banner

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await events_col.update_one(_event_id_query(event_id), {"$set": update_data})
    
    # Sync stage config pass_mark to linked quiz documents
    if isinstance(update_data.get("stages"), list):
        from db import quizzes_col
        for s in update_data["stages"]:
            if str(s.get("type", "")).upper() == "QUIZ":
                cfg = s.get("config") or {}
                qid = cfg.get("quiz_id")
                pm = cfg.get("pass_mark")
                if qid and pm is not None:
                    try:
                        await quizzes_col.update_one(
                            {"_id": ObjectId(qid)},
                            {"$set": {"pass_mark": int(pm)}}
                        )
                    except Exception:
                        pass
    
    # Synchronize with linked opportunity portal
    try:
        from db import opportunities_col
        opp_update = {}
        if "stages" in update_data:
            opp_update["stages"] = update_data["stages"]
        if "registrationDeadline" in update_data:
            opp_update["deadline"] = update_data["registrationDeadline"]
        if "title" in update_data:
            opp_update["title"] = update_data["title"]
        if "description" in update_data:
            opp_update["description"] = update_data["description"]
        if update_data.get("logo_url"):
            opp_update["logo_url"] = update_data["logo_url"]
        if update_data.get("banner_url"):
            opp_update["banner_url"] = update_data["banner_url"]
            
        if opp_update:
            await opportunities_col.update_many({"event_link_id": str(event_id)}, {"$set": opp_update})
    except Exception as e:
        print(f"[ERROR] Failed to sync opportunity: {e}")

    # ── Trigger notifications for changes ──
    if changed_deadlines:
        asyncio.create_task(_notify_deadline_extensions(event_id, changed_deadlines))
    if just_published:
        asyncio.create_task(_notify_new_opportunity(event_id))

    return {"status": "success"}

@router.post("/events/{event_id}/upload-media")
async def upload_event_media(
    event_id: str,
    file: UploadFile = File(...),
    field: str = Form(...),
    user: dict = Depends(get_auth_user)
):
    """Uploads a logo or banner image for an existing event stored as base64 in MongoDB."""
    await assert_institution_owns_event(event_id, user)
    from db import events_col, opportunities_col

    if field not in ("logo_url", "banner_url"):
        raise HTTPException(status_code=400, detail="field must be 'logo_url' or 'banner_url'")

    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

    import base64
    mime = "image/png"
    if ext in [".jpg", ".jpeg"]:
        mime = "image/jpeg"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".gif":
        mime = "image/gif"
    b64 = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"

    await events_col.update_one(_event_id_query(event_id), {"$set": {field: data_url}})

    # Sync to linked opportunity
    try:
        await opportunities_col.update_many(
            {"event_link_id": str(event_id)},
            {"$set": {field: data_url}}
        )
    except Exception as e:
        logger.warning(f"[SYNC] Failed to update opportunity media: {e}")

    return {"url": data_url, "field": field}


@router.post("/upload-media")
async def upload_institution_media(
    file: UploadFile = File(...),
    field: str = Form(...),
    user: dict = Depends(get_auth_user)
):
    """Uploads a logo or banner image for the institution profile stored as base64 in MongoDB."""
    inst_id = user.get("institution_id", "").strip()
    if not inst_id:
        raise HTTPException(status_code=400, detail="User has no institution_id")

    if field not in ("logo_url", "banner_url"):
        raise HTTPException(status_code=400, detail="field must be 'logo_url' or 'banner_url'")

    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

    import base64
    mime = "image/png"
    if ext in [".jpg", ".jpeg"]:
        mime = "image/jpeg"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".gif":
        mime = "image/gif"
    asset = "logo" if field == "logo_url" else "banner"
    inst_dir = os.path.join(INSTITUTIONS_UPLOAD_DIR, inst_id)
    os.makedirs(inst_dir, exist_ok=True)
    for old in os.listdir(inst_dir):
        if old.startswith(f"{asset}."):
            try:
                os.remove(os.path.join(inst_dir, old))
            except Exception:
                pass
    dest_name = f"{asset}{ext}"
    dest_path = os.path.join(inst_dir, dest_name)
    with open(dest_path, "wb") as fh:
        fh.write(content)
    public_url = f"/api/v1/institution/profile/{inst_id}/media/{asset}"

    from db import institutions_col
    await institutions_col.update_one(
        {"institution_id": inst_id},
        {"$set": {field: public_url, asset: public_url}}
    )

    return {"url": public_url, "field": field}


@router.post("/events/{event_id}/stages")
async def add_event_stage(event_id: str, stage: dict, user: dict = Depends(get_auth_user)):
    """Adds a new stage to an event's workflow."""
    await assert_institution_owns_event(event_id, user)
    
    comm = stage.get("communication") or {}
    if comm:
        subject_ovr = comm.get("email_subject_override") or ""
        body_md = comm.get("email_body_markdown") or ""
        from services.email_template_service import validate_stage_email_placeholders
        invalid_vars = validate_stage_email_placeholders(subject_ovr, body_md)
        if invalid_vars:
            raise HTTPException(
                status_code=400,
                detail=f"Template contains invalid placeholders: {', '.join([f'{{{{{v}}}}}' for v in invalid_vars])}. "
                       f"Allowed variables: {{{{participant_name}}}}, {{{{team_name}}}}, {{{{stage_name}}}}, {{{{event_name}}}}, {{{{deadline}}}}, {{{{event_link}}}}"
            )

    from db import events_col
    import uuid
    stage["id"] = str(uuid.uuid4())
    stage["created_at"] = datetime.utcnow()
    await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {"$push": {"stages": stage}}
    )
    
    # Audit log recording
    from services.audit_service import log_admin_action
    admin_email = user.get("email") or "admin@institution.com"
    await log_admin_action(
        admin_email,
        "STAGE_CREATED",
        f"Created stage '{stage.get('name')}' (ID: {stage['id']}) in event {event_id}."
    )
    return {"status": "success", "stage_id": stage["id"]}

@router.put("/events/{event_id}/stages/{stage_id}")
async def update_event_stage(event_id: str, stage_id: str, stage_update: dict, user: dict = Depends(get_auth_user)):
    """Updates a specific stage within an event."""
    await assert_institution_owns_event(event_id, user)
    
    comm = stage_update.get("communication") or {}
    if comm:
        subject_ovr = comm.get("email_subject_override") or ""
        body_md = comm.get("email_body_markdown") or ""
        from services.email_template_service import validate_stage_email_placeholders
        invalid_vars = validate_stage_email_placeholders(subject_ovr, body_md)
        if invalid_vars:
            raise HTTPException(
                status_code=400,
                detail=f"Template contains invalid placeholders: {', '.join([f'{{{{{v}}}}}' for v in invalid_vars])}. "
                       f"Allowed variables: {{{{participant_name}}}}, {{{{team_name}}}}, {{{{stage_name}}}}, {{{{event_name}}}}, {{{{deadline}}}}, {{{{event_link}}}}"
            )

    from db import events_col
    # Merge update with existing stage to preserve fields not sent (communication, config, etc.)
    event = await events_col.find_one(
        {"_id": ObjectId(event_id), "stages.id": stage_id},
        {"stages.$": 1}
    )
    existing_stage = event["stages"][0] if event and event.get("stages") else {}
    merged_stage = {**existing_stage, **stage_update}
    
    # [FIX] Validate stage separation
    new_type = str(merged_stage.get("type", "")).upper()
    if new_type in ["REGISTRATION", "TEAM_FORMATION"]:
        # Check if other stages already have this type
        event_full = await events_col.find_one({"_id": ObjectId(event_id)})
        for s in (event_full.get("stages") or []):
            if s.get("id") != stage_id and str(s.get("type", "")).upper() == new_type:
                raise HTTPException(status_code=400, detail=f"An event can only have one {new_type} stage.")
    
    await events_col.update_one(
        {"_id": ObjectId(event_id), "stages.id": stage_id},
        {"$set": {"stages.$": merged_stage}}
    )
    
    # Audit log recording
    from services.audit_service import log_admin_action
    admin_email = user.get("email") or "admin@institution.com"
    details = f"Updated stage '{stage_update.get('name')}' (ID: {stage_id}) in event {event_id}."
    if comm:
        details += f" Subject: {comm.get('email_subject_override')}. Draft overrides: {comm.get('draft_email_subject_override')}. Unpublished changes: {comm.get('has_unpublished_changes')}."
    await log_admin_action(
        admin_email,
        "STAGE_UPDATED",
        details
    )
    return {"status": "success"}

@router.delete("/events/{event_id}/stages/{stage_id}")
async def delete_event_stage(event_id: str, stage_id: str, user: dict = Depends(get_auth_user)):
    """Removes a specific stage from an event's workflow and updates remaining stages' order."""
    await assert_institution_owns_event(event_id, user)
    from db import events_col
    
    # Get current event to check if stage exists
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    stages = event.get("stages", [])
    stage_to_delete = None
    
    # Find the stage to delete
    for stage in stages:
        if stage.get("id") == stage_id:
            stage_to_delete = stage
            break
    
    if not stage_to_delete:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Check if this is the last stage (prevent deletion if it would break workflow)
    if len(stages) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last stage")
    
    # Remove the stage and reorder remaining stages
    remaining_stages = [stage for stage in stages if stage.get("id") != stage_id]
    
    # Update order indices for remaining stages
    for i, stage in enumerate(remaining_stages):
        stage["order"] = i + 1
        stage["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update event with new stages list
    result = await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {
            "$set": {
                "stages": remaining_stages,
                "stages_updated_at": datetime.now(timezone.utc).isoformat(),
                "last_stage_deleted": {
                    "stage_id": stage_id,
                    "stage_name": stage_to_delete.get("name", "Unknown"),
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                    "deleted_by": user.get("user_id")
                }
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete stage")
    
    # Create notification for institution
    await notify_institution(
        user.get("institution_id"),
        f"Stage '{stage_to_delete.get('name', 'Unknown')}' deleted from event",
        ntype="stage_deleted",
        title="Stage Deleted",
        meta={
            "event_id": event_id,
            "stage_id": stage_id,
            "stage_name": stage_to_delete.get("name", "Unknown"),
            "remaining_stages": len(remaining_stages)
        }
    )
    
    # Audit log recording
    from services.audit_service import log_admin_action
    admin_email = user.get("email") or "admin@institution.com"
    await log_admin_action(
        admin_email,
        "STAGE_DELETED",
        f"Deleted stage '{stage_to_delete.get('name', 'Unknown')}' (ID: {stage_id}) in event {event_id}. Remaining stages: {len(remaining_stages)}."
    )
    
    return {
        "status": "success",
        "deleted_stage": {
            "id": stage_id,
            "name": stage_to_delete.get("name", "Unknown")
        },
        "remaining_stages": len(remaining_stages)
    }

@router.patch("/events/{event_id}/advance-stage")
async def advance_participants(
    event_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Advances participants to next stage and triggers notifications."""
    participant_ids = data.get("participant_ids", [])
    next_stage = data.get("next_stage", "")
    if not participant_ids or not next_stage:
        raise HTTPException(status_code=400, detail="participant_ids and next_stage are required")
    
    await assert_institution_owns_event(event_id, user)
    from db import notifications_col, events_col
    from services.event_workflow_service import workflow_service
    
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    event_title = event.get("title", "Event")

    # 1. Run internal business rules for this specific phase
    try:
        await workflow_service.process_phase_transition(event_id, participant_ids, next_stage)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Update database - push previous stage to completed_stages, set new stage
    from db import participants_col
    for pid in participant_ids:
        try:
            p_obj = ObjectId(pid)
        except Exception:
            continue
        p_doc = await participants_col.find_one({"_id": p_obj, "event_id": event_id})
        if not p_doc:
            continue
        prev_stage = p_doc.get("current_stage")
        update = {
            "current_stage": next_stage,
            "last_updated": datetime.utcnow(),
            "status": "shortlisted",
        }
        if prev_stage:
            update["last_stage_submitted"] = prev_stage
            await participants_col.update_one(
                {"_id": p_obj},
                {
                    "$set": update,
                    "$push": {"completed_stages": prev_stage}
                }
            )
        else:
            await participants_col.update_one(
                {"_id": p_obj},
                {"$set": update}
            )

        uid = p_doc.get("user_id")
        if uid:
            from db import opportunity_applications_col, opportunities_col
            opp = await opportunities_col.find_one({
                "$or": [
                    {"event_link_id": str(event_id)},
                    {"event_link_id": event.get("event_id") if event else None},
                ]
            })
            if opp:
                await opportunity_applications_col.update_one(
                    {"opportunity_id": str(opp["_id"]), "user_id": str(uid)},
                    {"$set": {"status": "shortlisted", "current_stage": next_stage, "reviewed_at": datetime.utcnow()}},
                )

    # 3. Trigger Dynamic Notifications/Emails for each participant
    from services.email_service import send_notification_email
    from services.email_template_service import get_active_template, render_template, render_stage_custom_email
    from db import users_col, teams_col

    # Find the stage matching the name next_stage
    next_stage_doc = None
    stages = event.get("stages", []) if event else []
    for s in stages:
        if s.get("name") == next_stage:
            next_stage_doc = s
            break

    comm = next_stage_doc.get("communication", {}) if next_stage_doc else {}
    send_email = comm.get("send_email_on_unlock", True)
    
    subject_override = comm.get("email_subject_override")
    body_markdown = comm.get("email_body_markdown")
    has_override = bool(subject_override or body_markdown)

    # Load the active stage_advancement template if no custom override
    tmpl = None
    if not has_override and send_email:
        institution_id = event.get("institution_id", "")
        tmpl = await get_active_template(event_id, institution_id, "stage_advancement")

    notifs = []
    notified_count = 0
    if send_email:
        for pid in participant_ids:
            try:
                p_obj = ObjectId(pid)
            except Exception:
                continue
            p_doc = await participants_col.find_one({"_id": p_obj, "event_id": event_id})
            if not p_doc:
                continue

            uid = p_doc.get("user_id")
            p_name = p_doc.get("name") or p_doc.get("full_name") or "Participant"
            p_email = p_doc.get("email")

            # Look up user email if not on participant doc
            if not p_email and uid:
                u_doc = await users_col.find_one({"user_id": uid})
                if u_doc:
                    p_email = u_doc.get("email")

            # Look up team info for personalized messaging
            team_name = None
            team_members = []
            team_id = p_doc.get("team_id")
            if team_id:
                try:
                    team_doc = await teams_col.find_one({"_id": ObjectId(str(team_id))})
                    if team_doc:
                        team_name = team_doc.get("team_name")
                        team_members = team_doc.get("members", [])
                except Exception:
                    pass

            recipient_name = team_name or p_name

            # Render template with context
            context = {
                "team_name": recipient_name,
                "event_name": event_title,
                "stage_name": next_stage,
                "participant_name": p_name,
            }
            if has_override:
                subject, html_body = render_stage_custom_email(subject_override, body_markdown, context)
            elif tmpl:
                subject, html_body = render_template(tmpl, context)
            else:
                subject = f"Congratulations! You've advanced to {next_stage} in {event_title}"
                html_body = f"<p>Team <strong>'{recipient_name}'</strong> has qualified for <strong>{next_stage}</strong> in <strong>{event_title}</strong>.</p>"

            # Send email to participant via persistent background queue
            from services.email_queue_service import enqueue_email
            if p_email:
                try:
                    await enqueue_email(
                        p_email, 
                        subject, 
                        html_body, 
                        metadata={"event_id": event_id, "stage_name": next_stage, "type": "stage_advancement", "recipient_type": "participant"}
                    )
                except Exception as e:
                    logger.error(f"[ADVANCE-STAGE] Failed to enqueue email to {p_email}: {e}")

            # Also send to all team members (if any) via persistent background queue
            for member in team_members:
                m_uid = member.get("user_id")
                m_email = member.get("email")
                if not m_email and m_uid:
                    m_doc = await users_col.find_one({"user_id": m_uid})
                    if m_doc:
                        m_email = m_doc.get("email")
                if m_email and m_email != p_email:
                    try:
                        m_context = {**context, "participant_name": member.get("name") or "Team Member"}
                        if has_override:
                            m_subject, m_html = render_stage_custom_email(subject_override, body_markdown, m_context)
                        elif tmpl:
                            m_subject, m_html = render_template(tmpl, m_context)
                        else:
                            m_subject = subject
                            m_html = html_body
                        await enqueue_email(
                            m_email, 
                            m_subject, 
                            m_html, 
                            metadata={"event_id": event_id, "stage_name": next_stage, "type": "stage_advancement", "recipient_type": "team_member"}
                        )
                    except Exception as e:
                        logger.error(f"[ADVANCE-STAGE] Failed to enqueue email to {m_email}: {e}")

        # Create in-app notification
        notif_user_id = uid or pid
        notif_msg = f"Congratulations! You've advanced to the '{next_stage}' stage of {event_title}."
        if team_name:
            notif_msg = f"Team '{team_name}' has advanced to the '{next_stage}' stage of {event_title}."

        notifs.append({
            "user_id": notif_user_id,
            "event_id": event_id,
            "message": notif_msg,
            "type": "PHASE_ADVANCEMENT",
            "timestamp": datetime.utcnow().isoformat(),
            "is_read": False
        })
        notified_count += 1

    if notifs:
        await notifications_col.insert_many(notifs)

    await log_admin_action("admin@institution.com", "STAGE_ADVANCED", f"Advanced {len(participant_ids)} users to {next_stage} in {event_title}")
    return {"status": "success", "notified_count": notified_count, "emails_sent": notified_count}

@router.post("/events/{event_id}/judges")
async def add_event_judge(event_id: str, judge_data: dict, user: dict = Depends(get_auth_user)):
    """
    Adds a judge to an event and sends an invitation email.
    """
    await assert_institution_owns_event(event_id, user)
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event: raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if judge already exists
    current_judges = event.get("judges", [])
    if any(j.get("email") == judge_data.get("email") for j in current_judges):
        return {"status": "exists", "message": "Judge already assigned"}
    
    from services.judge_service import create_judge
    from services.email_service import send_notification_email

    judge_record = {
        "event_id": event_id,
        "institution_id": user.get("institution_id"),
        "name": judge_data.get("name"),
        "email": judge_data.get("email"),
        "expertise": judge_data.get("expertise"),
        "status": "INVITED",
        "invitation_token": uuid.uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    from services.judge_service import _judge_invitation_url
    evaluation_url = _judge_invitation_url(judge_record["invitation_token"])

    result = await create_judge(judge_record)

    from db import judges_col
    judge_doc = await judges_col.find_one({"_id": ObjectId(result["_id"])})

    # Also push to the event['judges'] array for backwards compatibility with the frontend EventDetails page
    judge_entry = {
        "id": str(result["_id"]),
        "name": judge_data.get("name"),
        "email": judge_data.get("email"),
        "expertise": judge_data.get("expertise"),
        "status": "INVITED",
        "invitation_token": judge_doc.get("invitation_token") if judge_doc else None,
        "evaluation_url": evaluation_url,
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    
    await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {"$push": {"judges": judge_entry}}
    )

    judge_name = judge_data.get("name") or judge_data.get("email") or "Judge"
    event_title = event.get("title") or "Event"
    accept_url = f"{evaluation_url}&action=accept"
    decline_url = f"{evaluation_url}&action=decline"
    judge_email = str(judge_data.get("email") or "").strip().lower()
    email_html = f"""
    <html>
    <body style="font-family: 'Poppins', sans-serif; background:#f8fafc; color:#0f172a; padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;">
            <p style="margin:0 0 12px 0;font-size:18px;font-weight:800;">Hello {judge_name},</p>
            <p style="margin:0 0 18px 0;line-height:1.7;color:#475569;">You have been invited to evaluate submissions for <strong>{event_title}</strong>. Use <strong>{judge_email}</strong> when signing in.</p>
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:16px;padding:16px;margin:20px 0;">
                <p style="margin:0;color:#6C3BFF;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Invitation Link</p>
                <p style="margin:8px 0 0 0;font-size:14px;color:#0f172a;word-break:break-all;">{evaluation_url}</p>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin:24px 0;">
                <a href="{accept_url}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;">Accept Invitation</a>
                <a href="{decline_url}" style="display:inline-block;background:#f1f5f9;color:#475569;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;">Decline</a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">After accepting, sign in at the judge portal to review assigned submissions.</p>
        </div>
    </body>
    </html>
    """

    email_ok = await send_notification_email(judge_data.get("email"), f"Judge Invitation: {event_title}", email_html)

    return {
        "status": "success",
        "judge": judge_entry,
        "email_sent": email_ok,
        "message": "Judge invitation saved."
        + (" Email sent successfully." if email_ok else " Email could not be sent — share the evaluation link manually."),
    }

@router.delete("/events/{event_id}/judges/{judge_email}")
async def remove_event_judge(event_id: str, judge_email: str, user: dict = Depends(get_auth_user)):
    """Removes a judge from an event."""
    await assert_institution_owns_event(event_id, user)
    await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {"$pull": {"judges": {"email": judge_email}}}
    )
    return {"status": "success"}

@router.post("/events/{event_id}/criteria")
async def update_judging_criteria(event_id: str, request: Request, user: dict = Depends(get_auth_user)):
    """Updates scoring rubrics and optional evaluation thresholds for an event."""
    await assert_institution_owns_event(event_id, user)
    body = await request.json()
    if isinstance(body, list):
        criteria_data = body
        thresholds = None
    elif isinstance(body, dict):
        criteria_data = body.get("criteria", [])
        thresholds = body.get("evaluation_thresholds")
    else:
        raise HTTPException(status_code=400, detail="Invalid criteria payload")
    update_doc = {"judging_criteria": criteria_data, "updated_at": datetime.utcnow()}
    if isinstance(thresholds, dict):
        update_doc["evaluation_thresholds"] = thresholds
    await events_col.update_one({"_id": ObjectId(event_id)}, {"$set": update_doc})

    # ── Auto-classify submissions based on thresholds ──
    if isinstance(thresholds, dict) and criteria_data:
        try:
            shortlist_min = float(thresholds.get("shortlist_min", 80))
            waitlist_min = float(thresholds.get("waitlist_min", max(shortlist_min * 0.75, shortlist_min - 15)))
            reject_below = float(thresholds.get("reject_below", waitlist_min))
            max_possible = sum(float(c.get("max_points") or 10) for c in criteria_data) or 100.0

            event_id_variants = await collect_event_id_variants(event_id)
            event_id_in: list = list(event_id_variants)
            for vid in list(event_id_variants):
                if ObjectId.is_valid(vid):
                    try:
                        event_id_in.append(ObjectId(vid))
                    except Exception:
                        pass

            raw_scores = await scores_col.find({"event_id": {"$in": event_id_in}}).to_list(length=10000)

            # Average scores per submission
            scores_by_sub: dict[str, list[float]] = {}
            for sc in raw_scores:
                sid = str(sc.get("submission_id") or "")
                if not sid:
                    continue
                scores_by_sub.setdefault(sid, []).append(_score_sum(sc))

            now = datetime.utcnow()

            def _classify_and_update(coll, query_filter, sub_doc):
                sid = str(sub_doc["_id"])
                score_list = scores_by_sub.get(sid, [])
                if not score_list:
                    return
                avg_score = sum(score_list) / len(score_list)
                if avg_score <= 0:
                    return
                pct = round((avg_score / max_possible) * 100, 1) if max_possible > 0 else avg_score

                if pct >= shortlist_min:
                    new_status = "Shortlisted"
                elif pct >= waitlist_min:
                    new_status = "Waitlisted"
                elif pct < reject_below:
                    new_status = "Rejected"
                else:
                    new_status = "Pending Review"

                if str(sub_doc.get("status") or "") != new_status:
                    return coll.update_one(
                        query_filter,
                        {"$set": {"status": new_status, "auto_classified": True, "classified_at": now}},
                    )

            # Classify submissions_col
            raw_subs = await submissions_col.find({"event_id": {"$in": event_id_in}}).to_list(length=10000)
            for sub in raw_subs:
                await _classify_and_update(submissions_col, {"_id": sub["_id"]}, sub)

            # Classify submission_data_col
            raw_sd = await submission_data_col.find({"event_id": {"$in": event_id_in}}).to_list(length=10000)
            for sd in raw_sd:
                await _classify_and_update(submission_data_col, {"_id": sd["_id"]}, sd)

        except Exception as e:
            print(f"[ERROR] Auto-classification failed for event {event_id}: {e}")

    return {"status": "success"}


@router.get("/events/{event_id}/stage-submissions/{submission_id}/file/{field_id}")
async def download_stage_submission_file(
    event_id: str,
    submission_id: str,
    field_id: str,
    user: dict = Depends(get_auth_user),
):
    """Admin download of an uploaded stage file (avoids multi-MB JSON payloads)."""
    from fastapi.responses import Response
    from services.submission_file_io import load_submission_field_file

    await assert_institution_owns_event(event_id, user)
    sub = await submission_data_col.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    variants = await collect_event_id_variants(event_id)
    if str(sub.get("event_id")) not in {str(v) for v in variants}:
        raise HTTPException(status_code=404, detail="Submission not found for this event")

    value = (sub.get("data") or {}).get(field_id)
    raw, mime, filename = load_submission_field_file(value, field_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="File not found for this field")
    return Response(
        content=raw,
        media_type=mime,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )

@router.get("/events/{event_id}/quizzes")
async def get_event_quizzes(event_id: str, user: dict = Depends(get_auth_user)):
    """Retrieves all assessments/quizzes linked to a specific event."""
    await assert_institution_owns_event(event_id, user)
    from db import quizzes_col
    cursor = quizzes_col.find({"event_id": event_id})
    quizzes = await cursor.to_list(length=100)
    for q in quizzes:
        q["_id"] = str(q["_id"])
    return quizzes

@router.post("/events/{event_id}/quizzes")
async def create_event_quiz(event_id: str, quiz_data: dict, user: dict = Depends(get_auth_user)):
    """Creates a new assessment round with questions and timing."""
    await assert_institution_owns_event(event_id, user)
    from db import quizzes_col
    # Validation: only allow supported question protocols
    try:
        title = str(quiz_data.get("title") or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="Quiz title is required")
        duration = int(quiz_data.get("duration") or 0)
        if duration <= 0:
            raise HTTPException(status_code=400, detail="Time limit must be > 0 minutes")
        questions = quiz_data.get("questions") or []
        if not isinstance(questions, list) or len(questions) == 0:
            raise HTTPException(status_code=400, detail="At least one question is required")
        for i, q in enumerate(questions):
            if not isinstance(q, dict):
                raise HTTPException(status_code=400, detail=f"Invalid question payload at #{i+1}")
            qtype = str(q.get("type") or "").strip().upper()
            text = str(q.get("text") or "").strip()
            if not text:
                raise HTTPException(status_code=400, detail=f"Question #{i+1}: problem statement is required")
            if qtype == "SINGLE_CHOICE":
                opts = q.get("options")
                if not isinstance(opts, list) or len(opts) < 2:
                    raise HTTPException(status_code=400, detail=f"Question #{i+1}: at least 2 options are required")
                if any(not str(o or "").strip() for o in opts):
                    raise HTTPException(status_code=400, detail=f"Question #{i+1}: options cannot be empty")
                coi = q.get("correctOptionIndex")
                if not isinstance(coi, int) or coi < 0 or coi >= len(opts):
                    raise HTTPException(status_code=400, detail=f"Question #{i+1}: select exactly one correct answer")
            elif qtype == "CODING":
                lang = str(q.get("language") or "").strip().lower()
                if not lang:
                    raise HTTPException(status_code=400, detail=f"Question #{i+1}: coding language is required")
            else:
                raise HTTPException(status_code=400, detail=f"Question #{i+1}: unsupported type '{qtype}'")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz payload")
    existing_quiz_id = quiz_data.get("quiz_id")
    if existing_quiz_id:
        if "_id" in quiz_data: del quiz_data["_id"]
        if "quiz_id" in quiz_data: del quiz_data["quiz_id"]
        quiz_data["updated_at"] = datetime.utcnow().isoformat()
        await quizzes_col.update_one({"_id": ObjectId(existing_quiz_id), "event_id": event_id}, {"$set": quiz_data})
        return {"quiz_id": existing_quiz_id}

    quiz_data["event_id"] = event_id
    quiz_data["created_at"] = datetime.utcnow().isoformat()
    result = await quizzes_col.insert_one(quiz_data)
    return {"quiz_id": str(result.inserted_id)}


@router.post("/events/{event_id}/quizzes/{quiz_id}/submit")
async def submit_event_quiz(event_id: str, quiz_id: str, payload: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Learner submits an event quiz attempt (auto-evaluates single-choice)."""
    from db import quizzes_col, participants_col, events_col, opportunity_applications_col
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

    # Enforce unlock rules: find which stage owns this quiz
    from stage_access_control import check_stage_unlock_rules
    target_stage = None
    for stg in (ev.get("stages") or []):
        if isinstance(stg, dict) and (stg.get("config") or {}).get("quiz_id") == quiz_id:
            target_stage = stg
            await check_stage_unlock_rules(resolved_eid, uid, stg)
            break

    # Stage visibility check (same as learner GET endpoint)
    if target_stage:
        vis = str(target_stage.get("visibility") or "Public").lower()
        if vis == "private":
            raise HTTPException(status_code=403, detail="This round is private")
        if vis == "shortlisted only":
            participants_query = {"$and": [{"user_id": uid}, {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}]}
            p = await participants_col.find_one(participants_query)
            if p:
                st = str(p.get("status") or "").lower()
                if st not in ("shortlisted", "accepted"):
                    raise HTTPException(status_code=403, detail="This round is only for shortlisted participants")

    participants_query = {"$and": [{"user_id": uid}, {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}]}
    p = await participants_col.find_one(participants_query)
    if not p:
        raise HTTPException(status_code=400, detail="You must register/apply before attempting the assessment")

    # Prevent multiple attempts
    existing_attempts = [a for a in (p.get("quiz_attempts") or []) if str(a.get("quiz_id") or "") == str(quiz_id)]
    if existing_attempts:
        raise HTTPException(status_code=400, detail="You have already submitted this assessment")

    answers = payload.get("answers") or []
    if not isinstance(answers, list):
        raise HTTPException(status_code=400, detail="answers must be a list")

    questions = quiz.get("questions") or []
    total = 0
    correct = 0
    coding_pending = False
    coding_answers = []
    
    max_possible_score = 0.0
    total_mcqs = 0
    total_earned_score = 0.0

    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        qtype = str(q.get("type") or "").upper()
        if qtype == "SINGLE_CHOICE":
            total += 1
            total_mcqs += 1
            # Retrieve dynamic positive marks and negative mark penalty
            q_marks = float(q.get("marks") if q.get("marks") is not None else 1.0)
            q_neg = float(q.get("negative_marks") if q.get("negative_marks") is not None else q.get("negativeMarks") if q.get("negativeMarks") is not None else 0.0)
            
            max_possible_score += q_marks
            
            expected = q.get("correctOptionIndex")
            got = None
            if i < len(answers) and isinstance(answers[i], dict):
                got = answers[i].get("selectedIndex")
                
            if got is not None and got != "":
                if isinstance(expected, int) and int(expected) == int(got):
                    correct += 1
                    total_earned_score += q_marks
                else:
                    total_earned_score -= q_neg
            else:
                # Unattempted MCQ -> no marks, no penalty
                pass
        elif qtype == "CODING":
            coding_pending = True
            if i < len(answers) and isinstance(answers[i], dict):
                coding_answers.append(
                    {
                        "q_index": i,
                        "code": answers[i].get("code") or "",
                        "language": answers[i].get("language") or q.get("language") or "",
                    }
                )

    # If the assessment round only contains MCQs, compute dynamic score using weights and penalty
    if total_mcqs > 0 and max_possible_score > 0.0:
        score = int(round(max(0.0, total_earned_score) / max_possible_score * 100))
    else:
        score = int(round((correct / total) * 100)) if total > 0 else 0

    pass_mark = int(quiz.get("pass_mark") or payload.get("pass_mark") or 70)
    passed = (total > 0 and score >= pass_mark) and (not coding_pending)

    attempt = {
        "quiz_id": str(quiz_id),
        "answers": answers,
        "score": score,
        "pass_mark": pass_mark,
        "passed": passed,
        "correct": correct,
        "total": total,
        "coding_pending_review": coding_pending,
        "coding_answers": coding_answers,
        "submitted_at": datetime.utcnow().isoformat(),
    }
    await participants_col.update_one(
        {"_id": p["_id"]},
        {"$push": {"quiz_attempts": attempt}, "$set": {"updated_at": datetime.utcnow()}},
    )

    return {
        "status": "success",
        "score": score,
        "passed": passed,
        "pass_mark": pass_mark,
        "total_scored": total,
        "coding_pending_review": coding_pending,
    }


@router.get("/events/{event_id}/quizzes/{quiz_id}/results")
async def get_quiz_results(event_id: str, quiz_id: str, user: dict = Depends(get_auth_user)):
    """Admin view: all quiz attempts with participant details."""
    await assert_institution_owns_event(event_id, user)
    from db import quizzes_col
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)

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
    stage_name = ""
    stage_index = -1
    for idx, s in enumerate(ev.get("stages") or []):
        if isinstance(s, dict) and (s.get("config") or {}).get("quiz_id") == quiz_id:
            stage_name = s.get("name", "")
            stage_index = idx
            break

    results = []
    participants_query = {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}
    cursor = participants_col.find(participants_query)
    async for p in cursor:
        uid = str(p.get("user_id") or "")
        attempts = p.get("quiz_attempts") or []
        matching = [a for a in attempts if str(a.get("quiz_id") or "") == str(quiz_id)]
        if not matching:
            continue
        last = matching[-1]
        correct = last.get("correct")
        total_q = last.get("total")
        if correct is None or total_q is None:
            total_questions_list = quiz.get("questions") or []
            total_q = len(total_questions_list)
            score = last.get("score") or 0
            correct = int(round((score / 100) * total_q)) if total_q > 0 else 0

        results.append({
            "user_id": uid,
            "name": p.get("name") or p.get("full_name") or "Unknown",
            "email": p.get("email") or "",
            "team_id": str(p["_id"]) if p.get("team_id") else None,
            "team_name": p.get("team_name"),
            "score": last.get("score"),
            "correct": correct,
            "total": total_q,
            "pass_mark": last.get("pass_mark"),
            "passed": last.get("passed", False),
            "submitted_at": last.get("submitted_at"),
            "participant_status": p.get("status", "registered"),
            "coding_pending_review": last.get("coding_pending_review", False),
            "answers": last.get("answers", []),
            "coding_answers": last.get("coding_answers", []),
        })

    return {
        "quiz_title": quiz.get("title", ""),
        "duration": quiz.get("duration", 0),
        "total_questions": len(quiz.get("questions") or []),
        "stage_name": stage_name,
        "stage_index": stage_index,
        "results": results,
        "total_attempts": len(results),
        "questions": [
            {
                "text": q.get("text"),
                "type": q.get("type"),
                "options": q.get("options"),
                "correctOptionIndex": q.get("correctOptionIndex"),
            }
            for q in (quiz.get("questions") or [])
        ],
    }


@router.post("/events/{event_id}/quizzes/{quiz_id}/shortlist")
async def bulk_shortlist_quiz(
    event_id: str, quiz_id: str,
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    """Admin marks selected participants as shortlisted (no email — use notify endpoint for email)."""
    await assert_institution_owns_event(event_id, user)
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    from services.email_queue_service import enqueue_email
    from services.email_template_service import render_stage_custom_email, get_active_template, render_template

    user_ids = payload.get("user_ids") or []
    if not isinstance(user_ids, list) or not user_ids:
        raise HTTPException(status_code=400, detail="user_ids list is required")

    ev = await events_col.find_one({"_id": ObjectId(resolved_eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    org_name = ev.get("organization_name") or ev.get("institution_name") or "Organization"
    event_title = ev.get("title", "Event")
    frontend_url = os.getenv("FRONTEND_URL", "")
    shortlisted_count = 0
    errors = []

    for uid in user_ids:
        try:
            participants_query = {"$and": [{"user_id": uid}, {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}]}
            p = await participants_col.find_one(participants_query)
            if not p:
                errors.append({"user_id": uid, "error": "Participant not found"})
                continue

            # Mark as shortlisted
            await participants_col.update_many(
                {"$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}], "user_id": uid},
                {"$set": {"status": "shortlisted", "updated_at": datetime.utcnow()}},
            )

            # Also update opportunity application if exists
            opp = await opportunities_col.find_one({"event_link_id": str(resolved_eid)})
            if opp:
                await opportunity_applications_col.update_many(
                    {"opportunity_id": str(opp["_id"]), "user_id": uid},
                    {"$set": {"status": "shortlisted", "reviewed_at": datetime.utcnow()}},
                )

            # In-app notification
            try:
                await notifications_col.insert_one({
                    "user_id": uid,
                    "type": "stage_shortlisted",
                    "message": f'You qualified for the next stage in "{event_title}".',
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat(),
                    "meta": {"event_id": resolved_eid, "quiz_id": quiz_id},
                })
            except Exception:
                pass

            shortlisted_count += 1
        except Exception as e:
            errors.append({"user_id": uid, "error": str(e)})

    return {
        "status": "success",
        "shortlisted_count": shortlisted_count,
        "errors": errors,
    }


@router.post("/events/{event_id}/quizzes/{quiz_id}/notify-shortlisted")
async def notify_shortlisted_participants(
    event_id: str, quiz_id: str,
    user: dict = Depends(get_auth_user),
):
    """Send email notification to all currently shortlisted participants with next-stage info."""
    await assert_institution_owns_event(event_id, user)
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    from services.email_queue_service import enqueue_email
    from services.email_template_service import get_active_template, render_template
    from db import institutions_col

    ev = await events_col.find_one({"_id": ObjectId(resolved_eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Find stage owning this quiz
    stage_name = ""
    for s in (ev.get("stages") or []):
        if not isinstance(s, dict):
            continue
        cfg = s.get("config") if isinstance(s.get("config"), dict) else {}
        if str(cfg.get("quiz_id") or "") == str(quiz_id):
            stage_name = s.get("name", "")
            break

    org_name = ev.get("organization_name") or ev.get("institution_name") or "Organization"
    event_title = ev.get("title", "Event")
    frontend_url = os.getenv("FRONTEND_URL", "")
    institution_id = str(ev.get("institution_id", ""))

    # Studlyf platform logo for email
    app_logo_url = f"{frontend_url}/images/studlyf.png" if frontend_url else ""

    # Find next upcoming stage (skip REGISTRATION)
    now = datetime.now(timezone.utc)
    upcoming_stages = []
    for stg in (ev.get("stages") or []):
        if not isinstance(stg, dict):
            continue
        stg_type = str(stg.get("type", "")).upper()
        if stg_type == "REGISTRATION":
            continue
        s = stg.get("start_date") or stg.get("startDate") or ""
        if s:
            try:
                start_dt = datetime.fromisoformat(s)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
                upcoming_stages.append((start_dt, stg.get("name", ""), s, stg_type))
            except Exception:
                pass
    upcoming_stages.sort(key=lambda x: x[0])
    next_stage_name = upcoming_stages[0][1] if upcoming_stages else ""
    next_stage_start = upcoming_stages[0][2] if upcoming_stages else ""
    next_stage_active = now >= upcoming_stages[0][0] if upcoming_stages else False

    # Gather all shortlisted participants
    participants_query = {"status": "shortlisted", "$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}
    shortlisted = await participants_col.find(participants_query).to_list(length=1000)

    sent_count = 0
    errors = []

    for p in shortlisted:
        try:
            email = str(p.get("email") or "").strip()
            if not email:
                continue

            p_name = p.get("name") or p.get("full_name") or "Participant"

            # Build email content based on next stage status
            if next_stage_active:
                status_msg = f"You have been shortlisted for <strong>{next_stage_name}</strong> which is now <strong>active</strong>. Please proceed to submit your work."
            elif next_stage_name:
                status_msg = f"You have been shortlisted for <strong>{next_stage_name}</strong>. The stage opens on <strong>{datetime.fromisoformat(next_stage_start).strftime('%B %d, %Y at %I:%M %p') if next_stage_start else 'soon'}</strong>. You will be notified when it is ready."
            else:
                status_msg = f"Congratulations! You have been shortlisted for <strong>{event_title}</strong>."

            stage_label = next_stage_name or stage_name or "Next Stage"
            subj = f"Shortlisted for {stage_label} — {event_title}"
            logo_html = f'<img src="{app_logo_url}" alt="Studlyf" style="max-height:32px;margin-bottom:24px;" />' if app_logo_url else ""
            body_html = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0 24px;">
                {logo_html}
                <div style="background: #f8f7ff; border-radius: 16px; padding: 32px; border: 1px solid #e8e5ff;">
                    <p style="font-size: 13px; color: #6C3BFF; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Stage Update</p>
                    <p style="font-size: 20px; color: #0f172a; font-weight: 700; margin: 0 0 16px 0;">Hi {p_name},</p>
                    <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 20px 0;">{status_msg}</p>
                    <table style="width:100%; margin-bottom: 24px;">
                        <tr>
                            <td style="padding: 12px 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Event</p>
                                <p style="font-size: 15px; color: #0f172a; font-weight: 600; margin: 0;">{event_title}</p>
                            </td>
                        </tr>
                        <tr><td style="height: 8px;"></td></tr>
                        <tr>
                            <td style="padding: 12px 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Stage</p>
                                <p style="font-size: 15px; color: #0f172a; font-weight: 600; margin: 0;">{stage_label}</p>
                            </td>
                        </tr>
                    </table>
                    <a href="{frontend_url}/events/{resolved_eid}" style="display: block; text-align: center; padding: 14px 28px; background-color: #6C3BFF; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">Go to Event</a>
                </div>
                <div style="text-align: center; padding: 24px 0 0 0;">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent by <strong style="color: #64748b;">Studlyf</strong> on behalf of {org_name}</p>
                </div>
            </div>"""

            # Dispatch in-app notification
            from db import notifications_col
            await notifications_col.insert_one({
                "user_id": str(p.get("user_id")),
                "title": f"Shortlisted for {stage_label}",
                "content": f"Congratulations! You have been shortlisted for {stage_label} in {event_title}.",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat(),
                "type": "stage_advancement",
                "event_id": resolved_eid,
            })

            await enqueue_email(
                email, subj, body_html,
                idempotency_key=f"notify_shortlisted_{p['_id']}",
                metadata={"event_id": resolved_eid, "quiz_id": quiz_id, "type": "stage_advancement"},
            )
            sent_count += 1
        except Exception as e:
            errors.append({"user_id": p.get("user_id"), "error": str(e)})

    return {
        "status": "success",
        "sent_count": sent_count,
        "errors": errors,
    }


@router.post("/events/{event_id}/stages/{stage_index}/extend-deadline")
async def extend_participant_deadline(
    event_id: str, stage_index: int,
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    """Extend stage deadline for a specific participant + send notification email."""
    await assert_institution_owns_event(event_id, user)
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    from services.email_queue_service import enqueue_email

    user_id = payload.get("user_id", "").strip()
    new_deadline_str = payload.get("new_deadline", "").strip()
    reason = payload.get("reason", "Deadline extension granted").strip()

    if not user_id or not new_deadline_str:
        raise HTTPException(status_code=400, detail="user_id and new_deadline are required")

    try:
        new_deadline = datetime.fromisoformat(new_deadline_str.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid new_deadline format (use ISO8601)")

    ev = await events_col.find_one({"_id": ObjectId(resolved_eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    stages = ev.get("stages") or []
    if stage_index < 0 or stage_index >= len(stages):
        raise HTTPException(status_code=404, detail="Stage not found")

    stage = stages[stage_index]

    participants_query = {"user_id": user_id, "$or": [{"event_id": resolved_eid}, {"event_id": ObjectId(resolved_eid)}]}
    p = await participants_col.find_one(participants_query)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Store extension on participant document
    extension_key = f"deadline_extensions.stage_{stage_index}"
    await participants_col.update_one(
        {"_id": p["_id"]},
        {
            "$set": {
                extension_key: new_deadline.isoformat(),
                "updated_at": datetime.utcnow(),
            },
        },
    )

    # Send email notification
    email = str(p.get("email") or "").strip()
    if email:
        p_name = p.get("name") or p.get("full_name") or "Participant"
        org_name = ev.get("organization_name") or ev.get("institution_name") or "Organization"
        stage_name = stage.get("name", f"Stage {stage_index + 1}")
        frontend_url = os.getenv("FRONTEND_URL", "")
        try:
            from services.email_template_service import render_stage_custom_email, get_active_template, render_template
            context = {
                "team_name": p_name,
                "event_title": ev.get("title", "Event"),
                "event_name": ev.get("title", "Event"),
                "organization_name": org_name,
                "stage_name": stage_name,
                "participant_name": p_name,
                "event_link": f"{frontend_url}/events/{resolved_eid}",
                "stage_link": f"{frontend_url}/events/{resolved_eid}",
                "stage_unlock_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
                "stage_deadline": new_deadline.strftime("%Y-%m-%d %H:%M UTC"),
                "extension_reason": reason,
            }
            institution_id = ev.get("institution_id", "")
            tmpl = await get_active_template(resolved_eid, institution_id, "stage_advancement")
            if tmpl:
                subj, html_body = render_template(tmpl, context)
            else:
                subj = f"Deadline Extended: {stage_name} — {ev.get('title')}"
                html_body = f"""<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2>Deadline Extension Granted</h2>
<p>Hi {p_name},</p>
<p>Your deadline for <strong>{stage_name}</strong> has been extended to <strong>{new_deadline.strftime('%Y-%m-%d %H:%M UTC')}</strong>.</p>
<p>Reason: {reason}</p>
<p>Access your event hub: <a href="{frontend_url}/events/{resolved_eid}">{frontend_url}/events/{resolved_eid}</a></p>
<br><p style="color:#666;font-size:12px">Team Studlyf / On behalf of {org_name}</p></div>"""
            await enqueue_email(email, subj, html_body, metadata={
                "event_id": resolved_eid, "type": "deadline_extension", "stage_index": stage_index,
            })
        except Exception as e:
            logger.error(f"[DEADLINE-EXTEND] Email error: {e}")

    await notify_institution(
        str(ev.get("institution_id") or ""),
        f"Deadline extended for {p_name} on {stage_name} until {new_deadline.strftime('%Y-%m-%d %H:%M UTC')}.",
        ntype="info",
        title="Deadline Extended",
        meta={"event_id": resolved_eid, "stage_index": stage_index, "user_id": user_id},
    )

    return {
        "status": "success",
        "user_id": user_id,
        "new_deadline": new_deadline.isoformat(),
        "stage_name": stage_name,
    }


# ── FAQ Priority Engine ──────────────────────────────────────────
FAQ_PRIORITY_KEYWORDS = [
    "registration", "deadline", "fee", "last date", "team size",
    "eligibility", "certificate", "free", "prize", "online",
    "offline", "submission", "participate", "individual", "team",
]

def compute_faq_priority(question: str, answer: str) -> int:
    """Score a FAQ based on important keywords in question/answer."""
    text = (question + " " + answer).lower()
    score = 0
    for kw in FAQ_PRIORITY_KEYWORDS:
        if kw in text:
            score += 10
    return score


@router.get("/events/{event_id}/faqs")
async def get_event_faqs(event_id: str, user: dict = Depends(get_auth_user_optional)):
    """Get all published FAQs for an event. Auth optional — public can see published ones."""
    from db import faqs_col
    query = {"event_id": event_id}
    if not user or not user.get("role") in ("admin", "super_admin", "institution"):
        query["is_published"] = True
    cursor = faqs_col.find(query).sort("order", 1)
    faqs = await cursor.to_list(length=200)
    for f in faqs:
        f["id"] = str(f.pop("_id"))
    # Server-side sort: featured first, then priority desc, helpful desc, views desc, order asc
    faqs.sort(key=lambda f: (
        not f.get("is_featured", False),
        -(f.get("priority_score", 0) or 0),
        -(f.get("helpful_count", 0) or 0),
        -(f.get("views", 0) or 0),
        f.get("order", 0) or 0,
    ))
    return {"faqs": faqs}

@router.post("/events/{event_id}/faqs")
async def create_event_faq(event_id: str, faq_data: dict, user: dict = Depends(get_auth_user)):
    """Create a new FAQ for an event. Institution/admin only."""
    from db import faqs_col
    await assert_institution_owns_event(event_id, user)
    question = faq_data.get("question", "")
    answer = faq_data.get("answer", "")
    auto_pin = faq_data.get("auto_pin_enabled", True)
    priority_score = faq_data.get("priority_score") if faq_data.get("priority_score") is not None else (compute_faq_priority(question, answer) if auto_pin else 0)
    doc = {
        "event_id": event_id,
        "question": question,
        "answer": answer,
        "category": faq_data.get("category", "General"),
        "order": faq_data.get("order", 0),
        "is_published": faq_data.get("is_published", True),
        "is_featured": faq_data.get("is_featured", False),
        "priority_score": priority_score,
        "views": faq_data.get("views", 0),
        "helpful_count": faq_data.get("helpful_count", 0),
        "tags": faq_data.get("tags", []),
        "auto_pin_enabled": auto_pin,
        "created_by": user.get("user_id", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await faqs_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"faq": doc}

@router.put("/events/{event_id}/faqs/{faq_id}")
async def update_event_faq(event_id: str, faq_id: str, faq_data: dict, user: dict = Depends(get_auth_user)):
    """Update an FAQ. Institution/admin only."""
    from db import faqs_col
    from bson import ObjectId
    await assert_institution_owns_event(event_id, user)
    set_fields = {}
    for key in ("question", "answer", "category", "order", "is_published", "is_featured", "priority_score", "views", "helpful_count", "tags", "auto_pin_enabled"):
        if key in faq_data:
            set_fields[key] = faq_data[key]
    set_fields["updated_at"] = datetime.utcnow()
    # Auto-compute priority if question/answer changed and auto_pin is enabled
    question = faq_data.get("question")
    answer = faq_data.get("answer")
    auto_pin = faq_data.get("auto_pin_enabled")
    if question is not None and answer is not None and auto_pin is not False:
        set_fields["priority_score"] = compute_faq_priority(question, answer)
    await faqs_col.update_one({"_id": ObjectId(faq_id), "event_id": event_id}, {"$set": set_fields})
    return {"success": True}

@router.delete("/events/{event_id}/faqs/{faq_id}")
async def delete_event_faq(event_id: str, faq_id: str, user: dict = Depends(get_auth_user)):
    """Delete an FAQ. Institution/admin only."""
    from db import faqs_col
    from bson import ObjectId
    await assert_institution_owns_event(event_id, user)
    await faqs_col.delete_one({"_id": ObjectId(faq_id), "event_id": event_id})
    return {"success": True}

@router.post("/events/{event_id}/faqs/bulk")
async def bulk_update_faqs(event_id: str, faqs_data: list, user: dict = Depends(get_auth_user)):
    """Replace all FAQs for an event in bulk. Institution/admin only."""
    from db import faqs_col
    await assert_institution_owns_event(event_id, user)
    await faqs_col.delete_many({"event_id": event_id})
    if faqs_data:
        docs = []
        for f in faqs_data:
            question = f.get("question", "")
            answer = f.get("answer", "")
            auto_pin = f.get("auto_pin_enabled", True)
            priority_score = f.get("priority_score") if f.get("priority_score") is not None else (compute_faq_priority(question, answer) if auto_pin else 0)
            docs.append({
                "event_id": event_id,
                "question": question,
                "answer": answer,
                "category": f.get("category", "General"),
                "order": f.get("order", 0),
                "is_published": f.get("is_published", True),
                "is_featured": f.get("is_featured", False),
                "priority_score": priority_score,
                "views": f.get("views", 0),
                "helpful_count": f.get("helpful_count", 0),
                "tags": f.get("tags", []),
                "auto_pin_enabled": auto_pin,
                "created_by": user.get("user_id", ""),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })
        await faqs_col.insert_many(docs)
    return {"success": True, "count": len(faqs_data) if faqs_data else 0}


@router.get("/events/{event_id}/quizzes/{quiz_id}/coding-attempts")
async def list_coding_attempts(event_id: str, quiz_id: str, user: dict = Depends(get_auth_user)):
    """Institution view: pending coding evaluations for a quiz."""
    await assert_institution_owns_event(event_id, user)
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    rows = []
    participants_query = {
        "$or": [{"event_id": str(resolved_eid)}, {"event_id": ObjectId(resolved_eid)}],
        "quiz_attempts": {
            "$elemMatch": {
                "quiz_id": str(quiz_id),
                "coding_pending_review": True,
            }
        },
    }
    cursor = participants_col.find(participants_query)
    async for p in cursor:
        attempts = p.get("quiz_attempts") or []
        latest = None
        for a in reversed(attempts):
            if str(a.get("quiz_id")) == str(quiz_id) and a.get("coding_pending_review"):
                latest = a
                break
        if not latest:
            continue
        rows.append(
            {
                "participant_id": str(p.get("_id")),
                "user_id": str(p.get("user_id") or ""),
                "status": p.get("status"),
                "current_stage": p.get("current_stage"),
                "submitted_at": latest.get("submitted_at"),
                "coding_answers": latest.get("coding_answers") or [],
                "auto_score": latest.get("score", 0),
                "pass_mark": latest.get("pass_mark", 0),
            }
        )
    return {"items": rows}


@router.post("/events/{event_id}/quizzes/{quiz_id}/coding-attempts/{participant_user_id}/evaluate")
async def evaluate_coding_attempt(
    event_id: str,
    quiz_id: str,
    participant_user_id: str,
    payload: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    """Institution action: manually score coding attempt and decide shortlist outcome."""
    await assert_institution_owns_event(event_id, user)
    from routes.registration_flow_routes import resolve_event_id
    resolved_eid = await resolve_event_id(event_id)
    score = int(payload.get("score", 0))
    passed = bool(payload.get("passed", False))
    remarks = str(payload.get("remarks") or "").strip()
    participants_query = {"user_id": str(participant_user_id), "$or": [{"event_id": str(resolved_eid)}, {"event_id": ObjectId(resolved_eid)}]}
    participant = await participants_col.find_one(participants_query)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    attempts = participant.get("quiz_attempts") or []
    idx = -1
    for i in range(len(attempts) - 1, -1, -1):
        a = attempts[i]
        if str(a.get("quiz_id")) == str(quiz_id) and a.get("coding_pending_review"):
            idx = i
            break
    if idx < 0:
        raise HTTPException(status_code=404, detail="Pending coding attempt not found")

    attempts[idx]["coding_pending_review"] = False
    attempts[idx]["manual_reviewed"] = True
    attempts[idx]["manual_score"] = score
    attempts[idx]["manual_passed"] = passed
    attempts[idx]["manual_remarks"] = remarks
    attempts[idx]["reviewed_at"] = datetime.utcnow().isoformat()
    attempts[idx]["reviewed_by"] = str(user.get("user_id") or "")
    attempts[idx]["passed"] = passed

    await participants_col.update_one(
        {"_id": participant["_id"]},
        {"$set": {"quiz_attempts": attempts, "updated_at": datetime.utcnow(), **({"status": "shortlisted"} if passed else {})}},
    )

    if passed:
        opp = await opportunities_col.find_one({"event_link_id": str(resolved_eid)})
        if opp:
            await opportunity_applications_col.update_many(
                {"opportunity_id": str(opp["_id"]), "user_id": str(participant_user_id)},
                {"$set": {"status": "shortlisted", "reviewed_at": datetime.utcnow()}},
            )
    await notifications_col.insert_one(
        {
            "user_id": str(participant_user_id),
            "type": "coding_review_result",
            "message": f"Your coding round was reviewed. Result: {'Qualified' if passed else 'Not qualified'}",
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
            "meta": {"event_id": str(resolved_eid), "quiz_id": str(quiz_id), "manual_score": score, "passed": passed},
        }
    )
    return {"status": "success", "passed": passed, "score": score}

@router.post("/events/create-professional")
async def create_pro_event(request: Request, user: dict = Depends(get_auth_user)):
    """Creates a high-end event with stages, fees, and prizes, supporting multipart images."""
    from db import events_col
    
    # 1. Parse Form Data
    form = await request.form()
    event_data = {}
    
    # Extract all string/json fields
    for key, value in form.items():
        if key in ['logo_file', 'banner_file', 'festival_logo_file', 'festival_banner_file']:
            continue
            
        try:
            # Try to parse as JSON if it looks like an object/array
            if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                event_data[key] = json.loads(value)
            else:
                # Handle numeric strings
                if isinstance(value, str) and value.isdigit():
                    event_data[key] = int(value)
                elif value.lower() == 'true':
                    event_data[key] = True
                elif value.lower() == 'false':
                    event_data[key] = False
                else:
                    event_data[key] = value
        except:
            event_data[key] = value

    # 2. Handle Image Uploads
    async def save_image(upload_file: UploadFile, prefix: str):
        if not upload_file or not upload_file.filename:
            return None
        ext = os.path.splitext(upload_file.filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            return None
            
        content = await upload_file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")
            
        import base64
        from io import BytesIO
        from PIL import Image
        
        mime = "image/png"
        if ext in [".jpg", ".jpeg"]: mime = "image/jpeg"
        elif ext == ".webp": mime = "image/webp"
        elif ext == ".gif": mime = "image/gif"
        
        try:
            img = Image.open(BytesIO(content))
            max_dim = 1920
            if max(img.size) > max_dim:
                ratio = max_dim / max(img.size)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)
            out = BytesIO()
            save_ext = ext.replace(".", "")
            if save_ext in ("jpg", "jpeg"):
                img.save(out, format="JPEG", quality=75, optimize=True)
            elif save_ext == "png":
                img.save(out, format="PNG", optimize=True)
            elif save_ext == "webp":
                img.save(out, format="WEBP", quality=75)
            elif save_ext == "gif":
                out = BytesIO(content)
            else:
                out = BytesIO(content)
            compressed = out.getvalue()
        except Exception:
            compressed = content
        
        b64 = base64.b64encode(compressed).decode("utf-8")
        return f"data:{mime};base64,{b64}"

    # Process files
    logo_file = form.get('logo_file')
    banner_file = form.get('banner_file')
    fest_logo_file = form.get('festival_logo_file')
    fest_banner_file = form.get('festival_banner_file')
    
    print("=== DEBUG CREATE PRO EVENT ===")
    print("Form keys:", list(form.keys()))
    print("logo_file:", logo_file, "type:", type(logo_file))
    print("banner_file:", banner_file, "type:", type(banner_file))
    
    if logo_file and hasattr(logo_file, "filename") and logo_file.filename:
        url = await save_image(logo_file, "logo")
        print("Saved logo URL:", url)
        if url: event_data["logo_url"] = url
        
    if banner_file and hasattr(banner_file, "filename") and banner_file.filename:
        url = await save_image(banner_file, "banner")
        if url: event_data["banner_url"] = url

    # Handle festival images if present
    if "festivalData" in event_data:
        fest_data = event_data["festivalData"]
        if fest_logo_file and hasattr(fest_logo_file, "filename") and fest_logo_file.filename:
            url = await save_image(fest_logo_file, "fest_logo")
            if url: fest_data["logo_url"] = url
        if fest_banner_file and hasattr(fest_banner_file, "filename") and fest_banner_file.filename:
            url = await save_image(fest_banner_file, "fest_banner")
            if url: fest_data["banner_url"] = url
        event_data["festivalData"] = fest_data

    # 3. Finalize Event Data
    if "opportunityType" in event_data:
        event_data["category"] = event_data["opportunityType"]
    event_data["created_at"] = datetime.utcnow()
    status_val = form.get("status")
    if status_val:
        event_data["status"] = str(status_val).upper()
    else:
        event_data["status"] = "DRAFT"

    _rd = event_data.get("registrationDeadline")
    fd = event_data.get("festivalData") if isinstance(event_data.get("festivalData"), dict) else {}
    if not event_data.get("start_date") and not event_data.get("startDate"):
        event_data["start_date"] = fd.get("startDate") or _rd
    if not event_data.get("end_date") and not event_data.get("endDate"):
        event_data["end_date"] = fd.get("endDate") or fd.get("startDate") or _rd
    
    # Stages should be defined by the institution UI.
    # If not provided, keep it empty (avoid auto/hardcoded stages).
    if "stages" not in event_data or event_data.get("stages") is None:
        event_data["stages"] = []

    if not event_data.get("title"):
        raise HTTPException(status_code=400, detail="Event title is required")

    if not event_data.get("opportunityType"):
        raise HTTPException(status_code=400, detail="Event type (opportunityType) is required")

    if not event_data.get("start_date") and not event_data.get("startDate"):
        raise HTTPException(status_code=400, detail="Event start date is required")

    iid = event_data.get("institution_id")
    if not iid:
        raise HTTPException(status_code=400, detail="institution_id is required")
    assert_institution_scope(str(iid), user)

    if _is_live_like_status(event_data.get("status")):
        try:
            await validate_new_listing_against_plan(
                str(iid),
                deadline_value=event_data.get("registrationDeadline"),
                deadline_label="registration window",
                start_date_value=event_data.get("registrationStartDate"),
            )
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        participation_type = str(event_data.get("participationType") or event_data.get("participation_type") or "").lower().strip()
        if participation_type in ("team", "both") and _strict_team_size_bounds(event_data) is None:
            raise HTTPException(status_code=400, detail="Team size must be configured before making this event live")
        
    print("=== FINAL EVENT DATA ===")
    print("logo_url in event_data:", event_data.get("logo_url", "MISSING"))
    print("banner_url in event_data:", event_data.get("banner_url", "MISSING"))
    print("festivalData keys:", list(event_data.get("festivalData", {}).keys()) if isinstance(event_data.get("festivalData"), dict) else "N/A")
    
    result = await events_col.insert_one(event_data)
    
    # 4. Production Trigger: Create a notification record
    from db import notifications_col
    try:
        await notifications_col.insert_one({
            "institution_id": str(iid),
            "title": "Event Published",
            "message": f"'{event_data.get('title')}' is now live on the portal.",
            "type": "info",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"[NOTIF ERROR] Trigger failed: {str(e)}")

    # [SYNC] Centralized Opportunity Pipeline
    # Mirror high-level event metadata to the centralized 'opportunities' collection 
    # for student dashboard integration.
    try:
        # Use admin-defined type verbatim — no normalization
        opp_type = event_data.get("opportunityType") or event_data.get("category") or ""

        reg_fields = event_data.get("registrationFields") or []
        if isinstance(reg_fields, str):
            try:
                reg_fields = json.loads(reg_fields)
            except Exception:
                reg_fields = []

        _city = (event_data.get("city") or event_data.get("venueAddress") or "").strip()
        _mode = (event_data.get("opportunityMode") or "online").strip()
        if _city:
            _location = f"{_city}, {_mode}"
        else:
            _location = _mode or ""

        opp_data = {
            "title": event_data.get("title", ""),
            "organization": event_data.get("organisation", ""),
            "type": opp_type,
            "description": event_data.get("description", ""),
            "skills": event_data.get("skills", ""),
            "location": _location,
            "deadline": event_data.get("registrationDeadline", datetime.now(timezone.utc)),
            "applicantsCount": 0,
            "createdAt": datetime.utcnow(),
            "createdBy": str(iid),
            "institution_id": str(iid),
            "status": "active" if _is_live_like_status(event_data.get("status")) else "draft",
            "event_link_id": str(result.inserted_id),  # link back to full event
            "registrationFields": reg_fields,
            "logo_url": event_data.get("logo_url", ""),
            "banner_url": event_data.get("banner_url", ""),
            "external_registration_link": event_data.get("external_registration_link", "") or event_data.get("externalRegistrationLink", ""),
        }
        # Normalize eligibility fields from event_data into opp_data
        def _norm_list(v):
            if v is None:
                return []
            if isinstance(v, list):
                return v
            if isinstance(v, str):
                try:
                    parsed = json.loads(v)
                    return parsed if isinstance(parsed, list) else [parsed]
                except:
                    return [v]
            return [v]

        opp_data["candidateTypes"] = _norm_list(event_data.get("candidateTypes") or event_data.get("candidate_types") or ['Everyone'])
        opp_data["eligibleOrganizations"] = _norm_list(event_data.get("eligibleOrganizations") or event_data.get("eligible_organizations") or [])
        opp_data["eligibleGenders"] = _norm_list(event_data.get("eligibleGenders") or event_data.get("eligible_genders") or [])
        opp_data["participationType"] = str(event_data.get("participationType") or event_data.get("participation_type") or "both")
        team_bounds = _strict_team_size_bounds(event_data)
        if team_bounds is None and str(opp_data["participationType"]).lower().strip() in ("team", "both"):
            raise HTTPException(status_code=400, detail="Team size must be configured before making this event live")
        if team_bounds is not None:
            opp_data["minTeamSize"], opp_data["maxTeamSize"] = team_bounds
        if team_bounds is not None and opp_data["minTeamSize"] > opp_data["maxTeamSize"]:
            raise HTTPException(status_code=400, detail="Minimum team size cannot be greater than maximum team size")
        
        # Ensure deadline is datetime
        if isinstance(opp_data["deadline"], str):
            try:
                opp_data["deadline"] = datetime.fromisoformat(opp_data["deadline"].replace("Z", "+00:00"))
            except:
                opp_data["deadline"] = datetime.now(timezone.utc)

        await opportunities_col.insert_one(opp_data)
        logger.info(f"[SYNC] Event {result.inserted_id} mirrored to opportunities collection.")
    except Exception as e:
        logger.error(f"[SYNC ERROR] Failed to mirror event to opportunities: {str(e)}")

    # Seed default email templates in background
    try:
        from services.email_template_service import seed_default_templates
        asyncio.create_task(seed_default_templates(str(result.inserted_id), str(iid)))
    except Exception as e:
        logger.error(f"[TEMPLATE SEED] Failed: {str(e)}")

    # Notify opted-in users if event is immediately live
    if event_data.get("status") == "LIVE":
        asyncio.create_task(_notify_new_opportunity(str(result.inserted_id)))

    return {"event_id": str(result.inserted_id), "status": "success"}


@router.patch("/events/{event_id}/professional")
async def update_pro_event(event_id: str, request: Request, user: dict = Depends(get_auth_user)):
    """Updates a high-end event with stages, fees, and prizes, supporting multipart images."""
    await assert_institution_owns_event(event_id, user)
    from db import events_col, opportunities_col
    
    # 1. Parse Form Data
    form = await request.form()
    event_data = {}
    
    # Extract all string/json fields
    for key, value in form.items():
        if key in ['logo_file', 'banner_file', 'festival_logo_file', 'festival_banner_file']:
            continue
            
        try:
            # Try to parse as JSON if it looks like an object/array
            if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                event_data[key] = json.loads(value)
            else:
                # Handle numeric strings
                if isinstance(value, str) and value.isdigit():
                    event_data[key] = int(value)
                elif value.lower() == 'true':
                    event_data[key] = True
                elif value.lower() == 'false':
                    event_data[key] = False
                else:
                    event_data[key] = value
        except:
            event_data[key] = value

    # 2. Handle Image Uploads
    async def save_image(upload_file: UploadFile, prefix: str):
        if not upload_file or not upload_file.filename:
            return None
        ext = os.path.splitext(upload_file.filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            return None
            
        content = await upload_file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")
            
        import base64
        from io import BytesIO
        from PIL import Image
        
        mime = "image/png"
        if ext in [".jpg", ".jpeg"]: mime = "image/jpeg"
        elif ext == ".webp": mime = "image/webp"
        elif ext == ".gif": mime = "image/gif"
        
        try:
            img = Image.open(BytesIO(content))
            max_dim = 1920
            if max(img.size) > max_dim:
                ratio = max_dim / max(img.size)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)
            out = BytesIO()
            save_ext = ext.replace(".", "")
            if save_ext in ("jpg", "jpeg"):
                img.save(out, format="JPEG", quality=75, optimize=True)
            elif save_ext == "png":
                img.save(out, format="PNG", optimize=True)
            elif save_ext == "webp":
                img.save(out, format="WEBP", quality=75)
            elif save_ext == "gif":
                out = BytesIO(content)
            else:
                out = BytesIO(content)
            compressed = out.getvalue()
        except Exception:
            compressed = content
        
        b64 = base64.b64encode(compressed).decode("utf-8")
        return f"data:{mime};base64,{b64}"

    # Process files
    logo_file = form.get('logo_file')
    banner_file = form.get('banner_file')
    fest_logo_file = form.get('festival_logo_file')
    fest_banner_file = form.get('festival_banner_file')
    
    print("=== DEBUG UPDATE PRO EVENT ===")
    print("Form keys:", list(form.keys()))
    print("logo_file:", logo_file, "type:", type(logo_file))
    print("banner_file:", banner_file, "type:", type(banner_file))
    
    if logo_file and hasattr(logo_file, "filename") and logo_file.filename:
        url = await save_image(logo_file, "logo")
        print("Saved logo URL:", url)
        if url: event_data["logo_url"] = url
        
    if banner_file and hasattr(banner_file, "filename") and banner_file.filename:
        url = await save_image(banner_file, "banner")
        if url: event_data["banner_url"] = url

    # Handle festival images if present
    if "festivalData" in event_data:
        fest_data = event_data["festivalData"]
        if fest_logo_file and hasattr(fest_logo_file, "filename") and fest_logo_file.filename:
            url = await save_image(fest_logo_file, "fest_logo")
            if url: fest_data["logo_url"] = url
        if fest_banner_file and hasattr(fest_banner_file, "filename") and fest_banner_file.filename:
            url = await save_image(fest_banner_file, "fest_banner")
            if url: fest_data["banner_url"] = url
        event_data["festivalData"] = fest_data

    # Remove fields we shouldn't overwrite in update unless desired
    if "_id" in event_data: del event_data["_id"]
    if "opportunityType" in event_data:
        event_data["category"] = event_data["opportunityType"]
    event_data["updated_at"] = datetime.utcnow()

    # Read status from form field (sent by frontend as 'status'), default to existing status
    status_val = form.get('status')
    if status_val:
        event_data["status"] = str(status_val).upper()

    _rd = event_data.get("registrationDeadline")
    fd = event_data.get("festivalData") if isinstance(event_data.get("festivalData"), dict) else {}
    if _rd:
        if not event_data.get("start_date") and not event_data.get("startDate"):
            event_data["start_date"] = fd.get("startDate") or _rd
        if not event_data.get("end_date") and not event_data.get("endDate"):
            event_data["end_date"] = fd.get("endDate") or fd.get("startDate") or _rd

    # Synchronize registration Deadline from stages if provided
    if isinstance(event_data.get("stages"), list):
        for s in event_data["stages"]:
            if isinstance(s, dict) and not s.get("id"):
                s["id"] = str(uuid.uuid4())
            if isinstance(s, dict) and str(s.get("type", "")).upper() == "REGISTRATION":
                reg_end = s.get("end_date") or s.get("endDate") or s.get("deadline")
                if reg_end:
                    event_data["registrationDeadline"] = reg_end

    existing_event = await events_col.find_one({"_id": ObjectId(event_id)})
    existing_opp = await opportunities_col.find_one({"event_link_id": str(event_id)})
    existing_iid = str((existing_event or {}).get("institution_id") or user.get("institution_id") or "")

    target_status = str(event_data.get("status") or (existing_event or {}).get("status") or "DRAFT").upper()
    if _is_live_like_status(target_status):
        should_count_as_new_active = not existing_opp or str(existing_opp.get("status") or "").lower() != "active"
        if should_count_as_new_active:
            try:
                await validate_new_listing_against_plan(
                    existing_iid,
                    deadline_value=event_data.get("registrationDeadline") or (existing_event or {}).get("registrationDeadline"),
                    deadline_label="registration window",
                    start_date_value=event_data.get("registrationStartDate") or (existing_event or {}).get("registrationStartDate"),
                )
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))

    # Perform update in events collection
    await events_col.update_one({"_id": ObjectId(event_id)}, {"$set": event_data})
    
    # Retrieve updated event to sync with opportunities
    updated_event = await events_col.find_one({"_id": ObjectId(event_id)})
    if updated_event:
        # [SYNC] Centralized Opportunity Pipeline
        try:
            opp_type = updated_event.get("opportunityType") or updated_event.get("category") or ""

            reg_fields = updated_event.get("registrationFields") or []
            if isinstance(reg_fields, str):
                try:
                    reg_fields = json.loads(reg_fields)
                except:
                    reg_fields = []

            _city = (updated_event.get("city") or updated_event.get("venueAddress") or "").strip()
            _mode = (updated_event.get("opportunityMode") or "online").strip()
            if _city:
                _location = f"{_city}, {_mode}"
            else:
                _location = _mode or "online"

            opp_data = {
                "title": updated_event.get("title", ""),
                "organization": updated_event.get("organisation", ""),
                "type": opp_type,
                "description": updated_event.get("description", ""),
                "skills": updated_event.get("skills", ""),
                "location": _location,
                "deadline": updated_event.get("registrationDeadline", datetime.now(timezone.utc)),
                "registrationFields": reg_fields,
                "logo_url": updated_event.get("logo_url", ""),
                "banner_url": updated_event.get("banner_url", ""),
                "external_registration_link": updated_event.get("external_registration_link", "") or updated_event.get("externalRegistrationLink", ""),
            }

            # Normalize eligibility fields from updated_event into opp_data
            def _norm_list(v):
                if v is None:
                    return []
                if isinstance(v, list):
                    return v
                if isinstance(v, str):
                    try:
                        parsed = json.loads(v)
                        return parsed if isinstance(parsed, list) else [parsed]
                    except:
                        return [v]
                return [v]

            opp_data["candidateTypes"] = _norm_list(updated_event.get("candidateTypes") or updated_event.get("candidate_types") or ['Everyone'])
            opp_data["eligibleOrganizations"] = _norm_list(updated_event.get("eligibleOrganizations") or updated_event.get("eligible_organizations") or [])
            opp_data["eligibleGenders"] = _norm_list(updated_event.get("eligibleGenders") or updated_event.get("eligible_genders") or [])
            opp_data["participationType"] = str(updated_event.get("participationType") or updated_event.get("participation_type") or "both")
            team_bounds = _strict_team_size_bounds(updated_event)
            if team_bounds is None and str(opp_data["participationType"]).lower().strip() in ("team", "both"):
                raise HTTPException(status_code=400, detail="Team size must be configured before making this event live")
            if team_bounds is not None:
                opp_data["minTeamSize"], opp_data["maxTeamSize"] = team_bounds
            if team_bounds is not None and opp_data["minTeamSize"] > opp_data["maxTeamSize"]:
                raise HTTPException(status_code=400, detail="Minimum team size cannot be greater than maximum team size")

            opp_data["status"] = "active" if _is_live_like_status(updated_event.get("status")) else "draft"
            
            # Ensure deadline is datetime
            if isinstance(opp_data["deadline"], str):
                try:
                    opp_data["deadline"] = datetime.fromisoformat(opp_data["deadline"].replace("Z", "+00:00"))
                except:
                    opp_data["deadline"] = datetime.now(timezone.utc)

            await opportunities_col.update_many({"event_link_id": str(event_id)}, {"$set": opp_data})
            logger.info(f"[SYNC] Event {event_id} updates mirrored to opportunities collection.")
        except Exception as e:
            logger.error(f"[SYNC ERROR] Failed to mirror event update to opportunities: {str(e)}")

    # Notify students if event was just published (DRAFT → LIVE)
    old_status = (existing_event or {}).get("status", "DRAFT").upper() if existing_event else "DRAFT"
    new_status = target_status
    if old_status != "LIVE" and new_status == "LIVE":
        asyncio.create_task(_notify_new_opportunity(event_id))

    return {"status": "success"}

# ============================================================
# EXPORT & DISTRIBUTION ENDPOINTS (Blueprint Requirements)
# ============================================================

# Removed duplicate unscoped export route

@router.get("/leaderboard/{event_id}/export-pdf")
async def export_leaderboard_pdf(event_id: str):
    """Generates a PDF export of the leaderboard for a specific event."""
    from fastapi.responses import FileResponse
    from db import scores_col, submissions_col, teams_col
    import os

    # Resolve placeholders
    if event_id in ["active_event", "ALL"]:
        event = await events_col.find_one({"status": "Live"}, sort=[("created_at", -1)])
        if not event: event = await events_col.find_one({}, sort=[("created_at", -1)])
        if event: 
            event_id = str(event["_id"])
            event_title = event.get("title", "Event") if event_id != "ALL" else "All Events Master Leaderboard"
        else: 
            raise HTTPException(status_code=404, detail="No events found to export.")
    else:
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        event_title = event.get("title", "Event")
    
    # Aggregate scores (if ALL, we match all scores, otherwise just the specific event)
    match_query = {} if event_id == "ALL" else {"event_id": event_id}
    pipeline = [
        {"$match": match_query},
        {"$group": {"_id": "$submission_id", "avg_score": {"$avg": "$total_score"}}},
        {"$sort": {"avg_score": -1}}
    ]
    results = await scores_col.aggregate(pipeline).to_list(100)

    # Build simple HTML table for PDF
    rows_html = ""
    for rank, r in enumerate(results, 1):
        sub = await submissions_col.find_one({"_id": ObjectId(r["_id"])}) if r.get("_id") else None
        team_name = "Individual"
        if sub and sub.get("team_id"):
            team = await teams_col.find_one({"_id": ObjectId(sub["team_id"])})
            team_name = team.get("team_name", "Team") if team else "Team"
        project = sub.get("project_title", "N/A") if sub else "N/A"
        rows_html += f"<tr><td>{rank}</td><td>{team_name}</td><td>{project}</td><td>{round(r['avg_score'], 2)}</td></tr>"

    html_content = f"""
    <html><head><style>
        body {{ font-family: 'Poppins', sans-serif; padding: 40px; }}
        h1 {{ color: #1e293b; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ border: 1px solid #e2e8f0; padding: 12px; text-align: left; }}
        th {{ background: #1e293b; color: white; }}
        tr:nth-child(even) {{ background: #f8fafc; }}
    </style></head><body>
        <h1>{event_title} — Final Leaderboard</h1>
        <p>Generated: {datetime.utcnow().strftime('%B %d, %Y')}</p>
        <table><tr><th>Rank</th><th>Team</th><th>Project</th><th>Score</th></tr>{rows_html}</table>
    </body></html>"""

    os.makedirs("artifacts/exports", exist_ok=True)
    pdf_path = f"artifacts/exports/leaderboard_{event_id}.pdf"
    try:
        from weasyprint import HTML as WPHTML
        WPHTML(string=html_content).write_pdf(pdf_path)
    except ImportError:
        # Fallback: return HTML if weasyprint not available
        html_path = f"artifacts/exports/leaderboard_{event_id}.html"
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        return FileResponse(html_path, media_type="text/html", filename=f"leaderboard_{event_title}.html")

    return FileResponse(pdf_path, media_type="application/pdf", filename=f"leaderboard_{event_title}.pdf")

# Removed duplicate unscoped analytics routes
@router.get("/export-participants/{institution_id}")
async def export_institution_participants(institution_id: str, user: dict = Depends(get_auth_user)):
    """Generates a CSV export of all registered participants for the institution."""
    assert_institution_scope(institution_id, user)
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    cursor = participants_col.find({"institution_id": institution_id})
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Event ID", "Status", "Joined Date"])
    
    async for p in cursor:
        writer.writerow([
            p.get("full_name") or p.get("name", "N/A"),
            p.get("email", "N/A"),
            p.get("phone", "N/A"),
            p.get("event_id", "N/A"),
            p.get("status", "N/A"),
            p.get("created_at", "N/A")
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=participants_{institution_id}.csv"}
    )

@router.post("/members/bulk")
async def bulk_onboard_members(data: dict):
    """
    Professional Bulk Onboarding Engine.
    Handles bulk insertion of Judges or Participants with automated duplicate detection.
    """
    from db import users_col
    members = data.get("members", [])
    inst_id = data.get("institution_id")
    role = data.get("role", "student") # judge or student
    
    if not inst_id:
        raise HTTPException(status_code=400, detail="Institution ID required")
        
    results = {"added": 0, "skipped": 0, "errors": []}
    
    for member in members:
        email = member.get("email", "").strip().lower()
        if not email: continue
        
        # 1. Check if they already exist in this institution
        existing = await participants_col.find_one({"email": email, "institution_id": inst_id})
        if existing:
            results["skipped"] += 1
            continue
            
        try:
            # 2. Create the member record
            new_member = {
                "full_name": member.get("name", "New Member"),
                "email": email,
                "phone": member.get("phone", ""),
                "institution_id": inst_id,
                "role": role,
                "status": "invited",
                "created_at": datetime.utcnow()
            }
            
            await participants_col.insert_one(new_member)
            
            # 3. Trigger High-End Production Invitation Email
            subject = f"Invitation: Authorized {role.capitalize()} Access for {inst_id}"
            body = f"""
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
                    .email-container {{
                        font-family: 'Outfit', 'Segoe UI', Tahoma, sans-serif;
                        max-width: 650px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border: 1px solid #f1f5f9;
                        border-radius: 32px;
                        overflow: hidden;
                        box-shadow: 0 20px 50px rgba(0,0,0,0.05);
                    }}
                    .hero-section {{
                        background: linear-gradient(135deg, #6C3BFF 0%, #8B5CF6 100%);
                        padding: 60px 40px;
                        text-align: center;
                        color: white;
                    }}
                    .content-section {{
                        padding: 50px;
                        color: #334155;
                        line-height: 1.8;
                    }}
                    .badge {{
                        background: rgba(255,255,255,0.2);
                        padding: 6px 16px;
                        border-radius: 100px;
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        display: inline-block;
                        margin-bottom: 20px;
                    }}
                    .btn-primary {{
                        background: #6C3BFF;
                        color: white !important;
                        padding: 18px 45px;
                        border-radius: 16px;
                        text-decoration: none;
                        font-weight: 800;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        display: inline-block;
                        box-shadow: 0 10px 25px rgba(108, 59, 255, 0.3);
                        margin: 30px 0;
                    }}
                    .step-card {{
                        background: #f8fafc;
                        border-radius: 24px;
                        padding: 25px;
                        margin-top: 20px;
                        border: 1px solid #f1f5f9;
                    }}
                    .footer {{
                        background: #f8fafc;
                        padding: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #94a3b8;
                    }}
                </style>
            </head>
            <body style="background-color: #f1f5f9; padding: 40px 0;">
                <div class="email-container">
                    <div class="hero-section">
                        <div class="badge">Official Onboarding</div>
                        <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Welcome to the Future.</h1>
                    </div>
                    <div class="content-section">
                        <p style="font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 0;">Hello {new_member['full_name']},</p>
                        <p>You have been selected by <strong>{inst_id}</strong> to join the <strong>Studlyf Institutional Network</strong> as a verified <strong>{role.capitalize()}</strong>.</p>
                        
                        <div class="step-card">
                            <p style="margin: 0; font-weight: 800; color: #6C3BFF; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Your Next Steps</p>
                            <ul style="margin: 15px 0 0 0; padding-left: 20px; font-size: 14px; font-weight: 500;">
                                <li style="margin-bottom: 10px;">Click the activation button below to verify your identity.</li>
                                <li style="margin-bottom: 10px;">Set up your profile and areas of expertise.</li>
                                <li style="margin-bottom: 0;">Access assigned submissions and start your evaluation journey.</li>
                            </ul>
                        </div>

                        <div style="text-align: center;">
                            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login" class="btn-primary">Initialize Dashboard Access</a>
                        </div>

                        <p style="font-size: 14px; font-weight: 500; text-align: center;">Need assistance? Our team is available 24/7 to help you settle in.</p>
                    </div>
                    <div class="footer">
                        <p style="margin-bottom: 10px;">&copy; 2026 Studlyf Technologies Inc. All Rights Reserved.</p>
                        <p>You received this because an authorized administrator at {inst_id} invited you to their private network.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            asyncio.create_task(send_notification_email(email, subject, body))
            
            results["added"] += 1
        except Exception as e:
            results["errors"].append(f"Error adding {email}: {str(e)}")
            
    return results

@router.get("/institution/stats/{institution_id}")
async def get_institution_stats(institution_id: str):
    """
    Production-ready statistics for the Institutional Dashboard.
    Aggregates real data from events, teams, and participants.
    """
    try:
        # 1. Active Events
        active_events_count = await db.events.count_documents({
            "institution_id": institution_id,
            "status": "live"
        })

        # 2. Total Teams
        # We find all events for this institution first
        inst_events = await db.events.find({"institution_id": institution_id}).to_list(length=None)
        event_ids = [str(e["_id"]) for e in inst_events]
        
        total_teams_count = 0
        total_participants = 0
        
        if event_ids:
            total_teams_count = await db.teams.count_documents({
                "event_id": {"$in": event_ids}
            })

            # 3. Total Participants
            # Count unique user_ids across all teams in those events
            pipeline = [
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$unwind": "$members"},
                {"$group": {"_id": "$members.user_id"}},
                {"$count": "total"}
            ]
            participants_res = await db.teams.aggregate(pipeline).to_list(length=1)
            total_participants = participants_res[0]["total"] if participants_res else 0

        # 4. Average Score (Calculated from evaluations)
        avg_score = 0
        if event_ids:
            evals = await db.evaluations.find({"event_id": {"$in": event_ids}}).to_list(length=None)
            if evals:
                total_points = sum(e.get("total_score", 0) for e in evals)
                avg_score = round(total_points / len(evals), 1)

        return {
            "total_participants": total_participants,
            "active_events": active_events_count,
            "total_teams": total_teams_count,
            "average_score": f"{avg_score}%" if avg_score > 0 else "0%"
        }
    except Exception as e:
        print(f"Error fetching stats: {str(e)}")
        return {
            "total_participants": 0,
            "active_events": 0,
            "total_teams": 0,
            "average_score": "0%"
        }

@router.patch("/institution/submissions/{submission_id}/assign-judge")
async def assign_judge_to_submission(
    submission_id: str,
    payload: dict,
    user: dict = Depends(get_auth_user),
):
    """
    Assigns a judge to a specific submission (sets ``assigned_judge_emails`` for scoped judge access).
    Body: ``judge_email`` (preferred, must match event panel) and/or ``judge_id`` (user_id; email resolved from users).
    """
    judge_id = str(payload.get("judge_id") or "").strip()
    email_raw = payload.get("judge_email") or payload.get("email")
    email = str(email_raw).strip().lower() if email_raw else ""

    sub = await submissions_col.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    event_id = str(sub.get("event_id") or "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Submission has no event_id")

    ev = await assert_institution_owns_event(event_id, user)

    resolved_uid = judge_id
    if not email and judge_id:
        judge_user = await users_col.find_one({"user_id": judge_id})
        if not judge_user and ObjectId.is_valid(judge_id):
            judge_user = await users_col.find_one({"_id": ObjectId(judge_id)})
        email = str((judge_user or {}).get("email") or "").strip().lower()
        if judge_user and not resolved_uid:
            resolved_uid = str(judge_user.get("user_id") or "")

    if email and not resolved_uid:
        acct = await users_col.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if acct:
            resolved_uid = str(acct.get("user_id") or "")

    if not email:
        raise HTTPException(status_code=400, detail="judge_email or judge_id (with account email) is required")

    judge_pool = {str(j.get("email") or "").strip().lower() for j in (ev.get("judges") or [])}
    if judge_pool and email not in judge_pool:
        raise HTTPException(
            status_code=400,
            detail="Judge email is not on this event's panel; add the judge to the event first.",
        )

    set_fields = {
        "assigned_judge_emails": [email],
        "status": "Under Review",
        "assigned_at": datetime.now(timezone.utc),
        "judge_assignment_at": datetime.now(timezone.utc).isoformat(),
    }
    if resolved_uid:
        set_fields["judge_id"] = resolved_uid

    res = await submissions_col.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": set_fields},
    )

    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Submission not found")

    inst_id = ev.get("institution_id")
    if inst_id:
        await notify_institution(
            str(inst_id),
            f"A submission was assigned to judge {email} for \"{ev.get('title', 'event')}\".",
            ntype="judge_assigned",
            title="Judge assigned to submission",
            meta={"event_id": event_id, "submission_id": submission_id, "judge_email": email},
        )

    return {"success": True, "message": "Judge assigned successfully", "assigned_judge_emails": [email]}

@router.post("/judge/evaluate")
async def submit_evaluation(payload: dict):
    """
    Submits a judge evaluation for a submission.
    Expects: {"submission_id": "...", "judge_id": "...", "scores": {...}, "feedback": "..."}
    """
    try:
        sub_id = payload.get("submission_id")
        judge_id = payload.get("judge_id")
        scores = payload.get("scores", {})
        feedback = payload.get("feedback", "")
        
        if not sub_id or not judge_id:
            return {"error": "submission_id and judge_id are required"}, 400
            
        # 1. Calculate total score
        total_score = sum(scores.values())
        
        # 2. Update Submission status
        await db.submissions.update_one(
            {"_id": ObjectId(sub_id)},
            {"$set": {
                "status": "Evaluated",
                "score": total_score,
                "feedback": feedback,
                "evaluated_at": datetime.utcnow()
            }}
        )
        
        # 3. Save detailed evaluation record
        evaluation_record = {
            "submission_id": sub_id,
            "judge_id": judge_id,
            "scores": scores,
            "total_score": total_score,
            "feedback": feedback,
            "created_at": datetime.utcnow()
        }
        await db.evaluations.insert_one(evaluation_record)
        
        # 4. Update Team's Global Score for Leaderboard
        submission = await db.submissions.find_one({"_id": ObjectId(sub_id)})
        if submission and "team_id" in submission:
            await db.teams.update_one(
                {"_id": ObjectId(submission["team_id"])},
                {"$set": {"total_score": total_score}}
            )
            
        return {"success": True, "message": "Evaluation submitted and leaderboard updated"}
        
    except Exception as e:
        print(f"Error submitting evaluation: {str(e)}")
        return {"error": str(e)}, 500

@router.get("/institution/leaderboard/active_event")
async def get_leaderboard(event_id: Optional[str] = None):
    """
    Fetches the rankings for a specific event (or the most recent one).
    """
    from db import leaderboard_col, events_col
    try:
        query = {}
        if event_id:
            query["event_id"] = str(event_id)
        else:
            # Try to find the most recent event
            latest_event = await events_col.find_one({}, sort=[("created_at", -1)])
            if latest_event:
                query["event_id"] = str(latest_event["_id"])
            else:
                return []

        cursor = leaderboard_col.find(query).sort("rank", 1)
        rankings = await cursor.to_list(length=100)
        
        # Format for frontend
        formatted = []
        for r in rankings:
            formatted.append({
                "rank": r.get("rank", 0),
                "team_name": r.get("team_name"),
                "project_title": r.get("project_name", "Innovation Project"),
                "total_score": r.get("total_score", 0),
                "college": r.get("college", "Institution Network"),
                "criteria_scores": r.get("criteria_scores", {
                    "Innovation": min(r.get("total_score", 0), 25),
                    "Technical": min(r.get("total_score", 0), 25),
                    "UI/UX": min(r.get("total_score", 0), 25),
                    "Completeness": min(r.get("total_score", 0), 25),
                })
            })
            
        return formatted
        
    except Exception as e:
        print(f"Error fetching leaderboard: {str(e)}")
        return {"error": str(e)}, 500

@router.post("/institution/certificates/generate")
async def generate_certificates(payload: dict):
    """
    Generates certificates for the top 3 teams in the active event.
    """
    try:
        institution_id = payload.get("institution_id")
        
        # 1. Get Top 3 from leaderboard
        cursor = db.teams.find({"total_score": {"$exists": True}}).sort("total_score", -1).limit(3)
        winners = await cursor.to_list(length=3)
        
        certificates_issued = 0
        for i, team in enumerate(winners):
            category = ["Winner", "Runner Up", "Second Runner Up"][i]
            
            # Create certificate for each student in the team
            members = team.get("members", [])
            for member in members:
                cert_id = f"CERT-{datetime.utcnow().year}-{ObjectId()}"
                cert_record = {
                    "institution_id": institution_id,
                    "student_name": member.get("name"),
                    "student_email": member.get("email"),
                    "event_title": "Spring Innovation Hackathon 2026",
                    "category": category,
                    "certificate_id": cert_id,
                    "issue_date": datetime.utcnow(),
                    "verification_code": str(ObjectId())[:8].upper()
                }
                await db.certificates.insert_one(cert_record)
                certificates_issued += 1
                
        return {"success": True, "issued_count": certificates_issued}
        
    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
        return {"error": str(e)}, 500

@router.get("/search")
async def global_search(q: str, institution_id: str, user: dict = Depends(get_auth_user)):
    """
    Real-time global search across events, teams, and students.
    """
    assert_institution_scope(institution_id, user)
    try:
        results = []
        query = q.lower()
        
        # 1. Smart Keyword Navigation
        if "analytic" in query or "report" in query:
            results.append({"id": "nav-analytics", "type": "Page", "title": "Reports & Analytics", "link": "/reports"})
        if "setting" in query or "profile" in query:
            results.append({"id": "nav-settings", "type": "Page", "title": "Institution Settings", "link": "/settings"})
        if "board" in query or "home" in query:
            results.append({"id": "nav-dash", "type": "Page", "title": "Main Dashboard", "link": "/"})

        # 2. Search Real Events
        event_cursor = db.events.find({"title": {"$regex": q, "$options": "i"}}).limit(3)
        async for event in event_cursor:
            results.append({
                "id": str(event["_id"]),
                "type": "Event",
                "title": event["title"],
                "link": f"/events/{event['_id']}"
            })
            
        # 3. Search Real Teams
        team_cursor = db.teams.find({"team_name": {"$regex": q, "$options": "i"}}).limit(3)
        async for team in team_cursor:
            results.append({
                "id": str(team["_id"]),
                "type": "Team",
                "title": team["team_name"],
                "link": f"/teams/{team['_id']}"
            })
            
        return results
        
    except Exception as e:
        print(f"Search API Error: {str(e)}")
        return {"error": str(e)}, 500

@router.get("/stats/{institution_id}")
async def get_institution_stats(institution_id: str, user: dict = Depends(get_auth_user)):
    """
    Fetch real-time stats for the institution dashboard.
    """
    assert_institution_scope(institution_id, user)
    try:
        # 1. Total Participants
        total_participants = await db.participants.count_documents({"institution_id": institution_id})
        
        # 2. Active Events
        active_events = await db.events.count_documents({"institution_id": institution_id, "status": "published"})
        
        # 3. Total Teams
        total_teams = await db.teams.count_documents({"institution_id": institution_id})
        
        # 4. Average Score (from evaluations)
        avg_score = 0
        pipeline = [
            {"$match": {"institution_id": institution_id}},
            {"$group": {"_id": None, "avg": {"$avg": "$total_score"}}}
        ]
        cursor = db.submissions.aggregate(pipeline)
        async for result in cursor:
            avg_score = round(result.get("avg", 0), 1)

        return {
            "total_participants": total_participants,
            "active_events": active_events,
            "total_teams": total_teams,
            "avg_score": f"{avg_score}%"
        }
    except Exception as e:
        print(f"Stats API Error: {str(e)}")
        return {"error": str(e)}, 500

# ─── Avatar Management ────────────────────────────────────────────────────────

@router.get("/avatars")
async def list_avatars():
    """Get all active avatars sorted by order."""
    try:
        cursor = avatars_col.find({"is_active": True}).sort("order", 1)
        avatars = await cursor.to_list(length=200)
        for a in avatars:
            a["_id"] = str(a["_id"])
        return {"avatars": avatars}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/avatars", dependencies=[Depends(assert_institution_scope)])
async def create_avatar(
    label: str = Form(...),
    image_url: str = Form(...),
    category: Optional[str] = Form(None),
    order: int = Form(0),
    user: dict = Depends(get_auth_user)
):
    """Add a new avatar."""
    try:
        doc = {
            "label": label,
            "image_url": image_url,
            "category": category or "default",
            "is_active": True,
            "order": order,
            "created_at": datetime.utcnow(),
        }
        result = await avatars_col.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return {"success": True, "avatar": doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/avatars/{avatar_id}", dependencies=[Depends(assert_institution_scope)])
async def delete_avatar(
    avatar_id: str,
    user: dict = Depends(get_auth_user)
):
    """Remove an avatar (soft delete by setting is_active=false)."""
    try:
        await avatars_col.update_one(
            {"_id": ObjectId(avatar_id)},
            {"$set": {"is_active": False}}
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/avatars/seed")
async def seed_avatars():
    """Seed default avatars (64 from catalog.png) into the database."""
    try:
        existing = await avatars_col.count_documents({})
        if existing > 0:
            return {"message": f"Avatars already seeded ({existing} exist)", "count": existing}

        CATALOG_URL = "/avatars/catalog.png"
        crops = [
            (20, 15, 115, 112), (141, 15, 115, 112), (262, 15, 117, 112), (385, 15, 116, 112),
            (508, 15, 116, 112), (631, 15, 117, 112), (754, 15, 117, 112), (878, 15, 119, 112),
            (20, 136, 115, 114), (141, 136, 115, 114), (262, 136, 117, 114), (385, 136, 116, 114),
            (508, 136, 116, 114), (631, 136, 117, 114), (754, 136, 117, 114), (878, 136, 119, 114),
            (20, 261, 115, 114), (141, 261, 115, 114), (262, 261, 117, 114), (385, 261, 116, 114),
            (508, 261, 116, 114), (631, 261, 117, 114), (754, 261, 117, 114), (878, 261, 119, 114),
            (20, 383, 115, 117), (141, 383, 115, 117), (262, 383, 117, 117), (385, 383, 116, 117),
            (508, 383, 116, 117), (631, 383, 117, 117), (754, 383, 117, 117), (878, 383, 119, 117),
            (20, 508, 115, 118), (141, 508, 115, 118), (262, 508, 117, 118), (385, 508, 116, 118),
            (508, 508, 116, 118), (631, 508, 117, 118), (754, 508, 117, 118), (878, 508, 119, 118),
            (20, 632, 115, 119), (141, 632, 115, 119), (262, 632, 117, 119), (385, 632, 116, 119),
            (508, 632, 116, 119), (631, 632, 117, 119), (754, 632, 117, 119), (878, 632, 119, 119),
            (20, 758, 115, 119), (141, 758, 115, 119), (262, 758, 117, 119), (385, 758, 116, 119),
            (508, 758, 116, 119), (631, 758, 117, 119), (754, 758, 117, 119), (878, 758, 119, 119),
            (20, 884, 115, 117), (141, 884, 115, 117), (262, 884, 117, 117), (385, 884, 116, 117),
            (508, 884, 116, 117), (631, 884, 117, 117), (754, 884, 117, 117), (878, 884, 119, 117),
        ]
        seeds = []
        for idx, (cx, cy, cw, ch) in enumerate(crops):
            seeds.append({
                "label": f"Avatar {idx + 1}",
                "image_url": CATALOG_URL,
                "crop_x": cx,
                "crop_y": cy,
                "crop_w": cw,
                "crop_h": ch,
                "category": "default",
                "order": idx,
                "is_active": True,
                "created_at": datetime.utcnow(),
            })
        await avatars_col.insert_many(seeds)
        return {"message": f"Seeded {len(seeds)} avatars", "count": len(seeds)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}/email-templates")
async def list_email_templates(
    event_id: str,
    template_type: Optional[str] = Query(None),
    user: dict = Depends(get_auth_user)
):
    """List all email templates for an event (including institution and defaults fallback)."""
    await assert_institution_owns_event(event_id, user)
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    institution_id = event.get("institution_id", "")
    from services.email_template_service import get_templates_for_event
    templates = await get_templates_for_event(event_id, institution_id, template_type)
    return templates

@router.post("/events/{event_id}/email-templates")
async def create_email_template(
    event_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """Create or update an email template for an event."""
    await assert_institution_owns_event(event_id, user)
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    data["event_id"] = event_id
    data["institution_id"] = event.get("institution_id", "")

    from services.email_template_service import upsert_template
    result = await upsert_template(data)
    await log_admin_action("admin@institution.com", "EMAIL_TEMPLATE_UPSERT",
                           f"Updated email template {data.get('type')} for event {event_id}")
    return result

@router.delete("/events/{event_id}/email-templates/{template_id}")
async def delete_email_template(
    event_id: str,
    template_id: str,
    user: dict = Depends(get_auth_user)
):
    """Delete an email template."""
    await assert_institution_owns_event(event_id, user)
    from services.email_template_service import delete_template
    deleted = await delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    await log_admin_action("admin@institution.com", "EMAIL_TEMPLATE_DELETE",
                           f"Deleted email template {template_id}")
    return {"status": "success"}

@router.get("/events/{event_id}/email-templates/active/{template_type}")
async def get_active_email_template(
    event_id: str,
    template_type: str,
    user: dict = Depends(get_auth_user)
):
    """Get the active template for a specific type (event-level, institution, or default)."""
    await assert_institution_owns_event(event_id, user)
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    institution_id = event.get("institution_id", "")
    from services.email_template_service import get_active_template
    template = await get_active_template(event_id, institution_id, template_type)
    if not template:
        raise HTTPException(status_code=404, detail="No active template found for this type")
    return template

@router.patch("/events/{event_id}/email-templates/{template_id}/activate")
async def activate_email_template(
    event_id: str,
    template_id: str,
    user: dict = Depends(get_auth_user)
):
    """Set a specific template as the active one for its type (deactivates others)."""
    await assert_institution_owns_event(event_id, user)
    from db import email_templates_col

    template = await email_templates_col.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template_type = template.get("type")

    # Deactivate all templates of this type for this event
    await email_templates_col.update_many(
        {"event_id": event_id, "type": template_type},
        {"$set": {"is_active": False}}
    )

    # Activate the selected one
    await email_templates_col.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": {"is_active": True, "updated_at": datetime.utcnow()}}
    )

    await log_admin_action("admin@institution.com", "EMAIL_TEMPLATE_ACTIVATE",
                           f"Activated template {template_id} for {template_type} in event {event_id}")
    return {"status": "success", "template_id": template_id}

@router.post("/events/{event_id}/email-templates/reset-defaults")
async def reset_email_templates_to_default(
    event_id: str,
    user: dict = Depends(get_auth_user)
):
    """Reset all email templates to default for an event."""
    await assert_institution_owns_event(event_id, user)
    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    from db import email_templates_col
    await email_templates_col.delete_many({"event_id": event_id})

    from services.email_template_service import seed_default_templates
    await seed_default_templates(event_id, event.get("institution_id", ""))

    await log_admin_action("admin@institution.com", "EMAIL_TEMPLATES_RESET",
                           f"Reset templates to defaults for event {event_id}")
    return {"status": "success", "message": "Templates reset to defaults"}

@router.get("/events-db-only/{institution_id}")
async def get_institution_events_db_only(institution_id: str, user: dict = Depends(get_auth_user)):
    """Raw `events` collection rows only."""
    from db import events_col
    assert_institution_scope(institution_id, user)
    try:
        # Use events_col instead of db.events for consistency
        cursor = events_col.find({"institution_id": institution_id})
        # Simplified async list comprehension
        events = []
        async for e in cursor:
            # Handle MongoDB _id conversion manually
            e["_id"] = str(e["_id"])
            events.append(e)
        return events
    except Exception as e:
        print(f"Error fetching events for {institution_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _stage_unlock_email_html(participant_name: str, event_title: str, org_name: str, stage_name: str, unlock_time: str, stage_link: str) -> str:
    from html import escape
    pn = escape(participant_name)
    et = escape(event_title)
    on = escape(org_name)
    sn = escape(stage_name)
    ut = escape(unlock_time)
    sl = escape(stage_link)
    return f"""<html><body style="font-family: 'Poppins', sans-serif;background:#f8fafc;margin:0;padding:0;">
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

@router.patch("/events/{event_id}/teams/{team_id}/advance")
async def advance_team_status(
    event_id: str,
    team_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    """
    Update team status and advance all members to the next stage if approved.
    """
    await assert_institution_owns_event(event_id, user)
    new_status = data.get("status")
    
    from db import teams_col, participants_col, events_col
    
    team = await teams_col.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Update team status
    await teams_col.update_one({"_id": ObjectId(team_id)}, {"$set": {"status": new_status}})
    
    # If approved, advance all members
    if new_status in ('approved', 'shortlisted', 'accepted'):
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        next_stage = _next_stage_after_team_formation(event or {}) if event else None
        member_ids = [str(m.get("user_id")) for m in team.get("members", []) if m.get("user_id")]
        upd = {"status": "shortlisted", "team_id": str(team_id)}
        if next_stage:
            upd["current_stage"] = next_stage
        await participants_col.update_many(
            {"event_id": str(event_id), "user_id": {"$in": member_ids}},
            {"$set": upd},
        )
        
    return {"status": "success", "message": f"Team status updated to {new_status}"}

@router.post("/events/{event_id}/teams/{team_id}/notify")
async def notify_team_manually(
    event_id: str,
    team_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user)
):
    """
    Admin endpoint: Manually trigger a notification email to all members of a team.
    """
    from db import teams_col, events_col, users_col, hackathon_submissions_col
    from services.email_service import send_notification_email
    
    team_doc = await teams_col.find_one({"_id": ObjectId(team_id)})
    event_doc = await events_col.find_one({"_id": ObjectId(event_id)})
    
    if not team_doc:
        raise HTTPException(status_code=404, detail="Team not found")
    
    subject = data.get("subject", f"Update regarding {event_doc.get('title', 'your event')}")
    message = data.get("message", "An update regarding your team status has been posted.")
    
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Status Update for Team: {team_doc.get("team_name", "Your Team")}</h2>
        <p>{message}</p>
        <hr>
        <p style="font-size: 12px; color: #888;">Sent by {event_doc.get("title", "Event Admin")}</p>
    </div>
    """
    
    sent_emails = []
    for member in team_doc.get("members", []):
        m_uid = member.get("user_id")
        email = member.get("email")
        if not email and m_uid:
            user_doc = await users_col.find_one({"user_id": str(m_uid)})
            if user_doc:
                email = user_doc.get("email")
                
        if email:
            await send_notification_email(email, subject, html_body)
            sent_emails.append(email)
            
    return {"status": "success", "sent_to": sent_emails}


@router.post("/events/{event_id}/teams/notify-by-status")
async def notify_teams_by_status(
    event_id: str,
    data: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    """Bulk email teams filtered by status (e.g. approved / shortlisted)."""
    from auth_institution import assert_institution_owns_event
    from services.email_queue_service import enqueue_email

    event = await assert_institution_owns_event(event_id, user)
    resolved = str(event.get("_id") or event_id)
    status_filter = str(data.get("status") or "approved").lower().strip()
    subject = data.get("subject") or f"Update — {event.get('title', 'Event')}"
    message = data.get("message") or "Your team has progressed to the next round. Please check the event portal for details."

    teams = await teams_col.find({
        "event_id": {"$in": [str(event_id), resolved, str(event.get("event_id", ""))]},
        "status": status_filter,
    }).to_list(length=2000)

    sent = 0
    for team_doc in teams:
        for member in team_doc.get("members", []) or []:
            email = member.get("email")
            if not email and member.get("user_id"):
                user_doc = await users_col.find_one({"user_id": str(member.get("user_id"))})
                email = (user_doc or {}).get("email")
            if not email:
                continue
            body = (
                f"<p>Hi {member.get('name') or 'Team member'},</p>"
                f"<p>{message}</p>"
                f"<p><strong>Team:</strong> {team_doc.get('team_name', 'Your team')}</p>"
            )
            await enqueue_email(email, subject, body, idempotency_key=f"team_status_{team_doc['_id']}_{member.get('user_id')}")
            sent += 1

    return {"status": "success", "sent": sent, "teams": len(teams)}

