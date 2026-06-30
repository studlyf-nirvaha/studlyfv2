from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Optional, Tuple, Any, Dict
from bson import ObjectId
from datetime import datetime, timezone
from auth_institution import get_auth_user_optional
import logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])


_META_PROJECTION = {"data": 0}


async def _find_submission_by_token(token: str, *, include_data: bool = True) -> Tuple[Optional[dict], Optional[dict]]:
    from db import submission_data_col

    query = {"$or": [{"evaluation_token": token}, {"assigned_judges.evaluation_token": token}]}
    projection = None if include_data else _META_PROJECTION
    sub = await submission_data_col.find_one(query, projection)
    if not sub:
        return None, None

    judges = sub.get("assigned_judges") or []
    judge_entry = next(
        (j for j in judges if isinstance(j, dict) and j.get("evaluation_token") == token),
        judges[0] if judges else None,
    )

    if not include_data:
        data_row = await submission_data_col.find_one({"_id": sub["_id"]}, {"data": 1})
        sub["data"] = _sanitize_submission_data((data_row or {}).get("data") or {})
    return sub, judge_entry if isinstance(judge_entry, dict) else None


async def _resolve_event(event_id: str):
    from db import events_col

    if not event_id:
        return None
    try:
        return await events_col.find_one({"_id": ObjectId(str(event_id))})
    except Exception:
        return await events_col.find_one({"event_id": str(event_id)}) or await events_col.find_one({"event_link_id": str(event_id)})


def _event_criteria(event: Optional[dict], stage_id: str = None) -> list:
    if not event:
        return []
    if stage_id and event.get("stages"):
        for s in event.get("stages"):
            if str(s.get("id")) == str(stage_id):
                criteria = s.get("judging_criteria") or s.get("evaluation_criteria")
                if not criteria and s.get("rubric"):
                    rubric = s.get("rubric")
                    if isinstance(rubric, dict):
                        criteria = rubric.get("criteria")
                if criteria:
                    return criteria
    criteria = event.get("judging_criteria") or event.get("evaluation_criteria") or []
    if criteria:
        return criteria
    rubric = event.get("rubric") or {}
    if isinstance(rubric, dict) and rubric.get("criteria"):
        return rubric["criteria"]
    return []


def _sanitize_submission_data(data: dict) -> dict:
    from services.submission_format import summarize_submission_data

    sanitized = summarize_submission_data(data or {})
    for field in ("user_email", "user_name", "email", "contact", "phone"):
        sanitized.pop(field, None)
    return sanitized


async def _resolve_team_name(submission: dict) -> str:
    from db import teams_col, users_col

    data = submission.get("data") or {}
    for candidate in (
        submission.get("team_name"),
        data.get("team_display_name"),
        data.get("team_name"),
        submission.get("user_name"),
        submission.get("title"),
    ):
        if candidate and str(candidate).strip():
            return str(candidate).strip()

    tid = submission.get("team_id")
    if tid:
        try:
            team = await teams_col.find_one({"_id": ObjectId(str(tid))})
        except Exception:
            team = await teams_col.find_one({"team_id": str(tid)})
        if team:
            return str(team.get("team_name") or team.get("name") or team.get("title") or "").strip() or "Team"

    uid = submission.get("user_id")
    if uid:
        user_doc = await users_col.find_one({"user_id": str(uid)})
        if not user_doc:
            try:
                user_doc = await users_col.find_one({"_id": ObjectId(str(uid))})
            except Exception:
                user_doc = None
        if user_doc:
            return str(user_doc.get("full_name") or user_doc.get("name") or user_doc.get("email") or "").strip() or "Solo Participant"

    return "Solo Participant"


def _format_submitted_at(raw) -> str:
    if not raw:
        return ""
    if isinstance(raw, datetime):
        return raw.isoformat()
    return str(raw)


def _thresholds_from_event(event: Optional[dict], stage_id: str = None) -> dict:
    t = None
    if stage_id and event and event.get("stages"):
        for s in event.get("stages"):
            if str(s.get("id")) == str(stage_id):
                t = s.get("evaluation_thresholds")
                break
    if not t:
        t = (event or {}).get("evaluation_thresholds") or {}
    shortlist = float(t.get("shortlist_min") or 80)
    waitlist = float(t.get("waitlist_min") or max(shortlist - 15, shortlist * 0.75))
    reject = float(t.get("reject_below") or waitlist)
    criteria = _event_criteria(event, stage_id)
    max_pts = sum(float(c.get("max_points") or 10) for c in criteria) or 100.0
    return {"shortlist_min": shortlist, "waitlist_min": waitlist, "reject_below": reject, "max_possible": max_pts}


def _recommendation_from_score(total_pts: float, thresholds: dict) -> str:
    max_pts = thresholds.get("max_possible") or 100.0
    pct = (total_pts / max_pts * 100) if max_pts > 0 else total_pts
    if pct >= thresholds.get("shortlist_min", 80):
        return "shortlist"
    if pct >= thresholds.get("waitlist_min", 65):
        return "waitlist"
    if pct < thresholds.get("reject_below", 50):
        return "reject"
    return "hold"


@router.get("/{token_or_id}")
async def get_evaluation_submission(token_or_id: str, user: Optional[dict] = Depends(get_auth_user_optional)):
    """Load submission for judge evaluation via secure token link or authenticated id."""
    from db import submission_data_col, scores_col
    import traceback

    try:
        submission = None
        judge_entry = None
        submission_id = None

        is_object_id = len(token_or_id) == 24
        if is_object_id:
            try:
                ObjectId(token_or_id)
            except Exception:
                is_object_id = False

        if is_object_id and user:
            judge_id = str(user.get("user_id") or user.get("id") or "")
            submission = await submission_data_col.find_one({
                "_id": ObjectId(token_or_id),
                "assigned_judges.judge_id": judge_id,
            })
            submission_id = token_or_id
            if submission and isinstance(submission.get("data"), dict):
                submission["data"] = _sanitize_submission_data(submission["data"])
        else:
            submission, judge_entry = await _find_submission_by_token(token_or_id, include_data=False)
            if submission:
                submission_id = str(submission["_id"])

        if not submission or not submission_id:
            raise HTTPException(status_code=404, detail="Invalid or expired evaluation link")

        expires = submission.get("evaluation_token_expires")
        if expires and isinstance(expires, datetime):
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires:
                raise HTTPException(status_code=410, detail="This evaluation link has expired")

        event = await _resolve_event(submission.get("event_id"))
        stage_id = submission.get("stage_id")
        criteria = _event_criteria(event, stage_id)
        thresholds = _thresholds_from_event(event, stage_id)
        team_name = await _resolve_team_name(submission)
        title = (
            submission.get("title")
            or submission.get("project_name")
            or submission.get("stage_name")
            or team_name
            or "Submission"
        )

        judge_id = (judge_entry or {}).get("judge_id") or ""
        judge_email = (judge_entry or {}).get("email") or ""
        score_filter: Dict[str, Any] = {"submission_id": submission_id}
        if judge_id:
            score_filter["judge_id"] = judge_id
        elif judge_email:
            score_filter["judge_email"] = judge_email
        existing_evaluation = await scores_col.find_one(score_filter)

        return {
            "_id": submission_id,
            "event_id": submission.get("event_id"),
            "stage_id": submission.get("stage_id"),
            "title": title,
            "team_name": team_name,
            "submitted_at": _format_submitted_at(submission.get("submitted_at") or submission.get("created_at")),
            "data": _sanitize_submission_data(submission.get("data") or {}),
            "criteria": criteria,
            "thresholds": thresholds,
            "judge_name": (judge_entry or {}).get("name") or "",
            "existing_evaluation": {
                "score": existing_evaluation.get("total_score"),
                "criteria_scores": existing_evaluation.get("criteria_scores") or existing_evaluation.get("scores") or {},
                "recommendation": existing_evaluation.get("recommendation"),
                "comments": existing_evaluation.get("comments") or existing_evaluation.get("feedback"),
            } if existing_evaluation else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR in get_evaluation_submission: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to load evaluation data")


@router.post("/{token_or_id}")
async def submit_evaluation(
    token_or_id: str,
    evaluation_data: dict = Body(...),
    user: Optional[dict] = Depends(get_auth_user_optional),
):
    """Submit rubric evaluation via token link (no login) or authenticated submission id."""
    from db import submission_data_col, scores_col

    submission = None
    judge_entry = None
    submission_id = None

    is_object_id = len(token_or_id) == 24
    if is_object_id:
        try:
            ObjectId(token_or_id)
        except Exception:
            is_object_id = False

    if is_object_id and user:
        judge_id = str(user.get("user_id") or user.get("id") or "")
        submission = await submission_data_col.find_one({
            "_id": ObjectId(token_or_id),
            "assigned_judges.judge_id": judge_id,
        })
        submission_id = token_or_id
    else:
        submission, judge_entry = await _find_submission_by_token(token_or_id)
        if submission:
            submission_id = str(submission["_id"])

    if not submission or not submission_id:
        raise HTTPException(status_code=404, detail="Invalid or expired evaluation link")

    criteria_scores = evaluation_data.get("criteria_scores") or {}
    if isinstance(criteria_scores, dict) and criteria_scores:
        try:
            total = sum(float(v) for v in criteria_scores.values())
        except (TypeError, ValueError):
            total = 0.0
        score = evaluation_data.get("score")
        if score is None:
            score = total
    else:
        score = evaluation_data.get("score")
        total = float(score or 0)

    event = await _resolve_event(submission.get("event_id"))
    stage_id = submission.get("stage_id")
    thresholds = _thresholds_from_event(event, stage_id)
    max_pts = thresholds.get("max_possible") or 100.0
    recommendation = _recommendation_from_score(float(score), thresholds)
    if score is None:
        raise HTTPException(status_code=400, detail="Invalid score.")
    if float(score) > max_pts * 1.05:
        raise HTTPException(status_code=400, detail=f"Score exceeds rubric maximum ({max_pts}).")

    comments = evaluation_data.get("comments", "")
    status_label = {
        "shortlist": "Shortlisted",
        "waitlist": "Waitlisted",
        "reject": "Rejected",
        "hold": "Pending Review",
    }.get(recommendation, "Scored")
    judge_id = (judge_entry or {}).get("judge_id") or (user or {}).get("user_id") or (user or {}).get("id") or ""
    judge_email = (judge_entry or {}).get("email") or (user or {}).get("email") or ""

    score_data = {
        "submission_id": submission_id,
        "team_id": submission.get("team_id"),
        "judge_id": str(judge_id) if judge_id else "",
        "judge_email": str(judge_email).strip().lower() if judge_email else "",
        "judge_name": (judge_entry or {}).get("name") or (user or {}).get("full_name") or (user or {}).get("name") or "",
        "event_id": submission.get("event_id"),
        "stage_id": submission.get("stage_id"),
        "total_score": float(score),
        "criteria_scores": criteria_scores,
        "scores": criteria_scores,
        "recommendation": recommendation,
        "comments": comments,
        "feedback": comments,
        "evaluated_at": datetime.now(timezone.utc),
        "status": "completed",
    }

    # Find existing score entry by judge_id OR judge_email to avoid duplicates
    existing_score = None
    if judge_id:
        existing_score = await scores_col.find_one({"submission_id": submission_id, "judge_id": str(judge_id)})
    if not existing_score and judge_email:
        existing_score = await scores_col.find_one({"submission_id": submission_id, "judge_email": str(judge_email).strip().lower()})
    if not existing_score:
        existing_score = await scores_col.find_one({"submission_id": submission_id, "evaluation_token": token_or_id})

    if existing_score:
        await scores_col.update_one({"_id": existing_score["_id"]}, {"$set": score_data})
    else:
        upsert_filter: Dict[str, Any] = {"submission_id": submission_id}
        if judge_id:
            upsert_filter["judge_id"] = str(judge_id)
        elif judge_email:
            upsert_filter["judge_email"] = str(judge_email).strip().lower()
        else:
            upsert_filter["evaluation_token"] = token_or_id
        await scores_col.update_one(upsert_filter, {"$set": score_data}, upsert=True)

    # pct = round((float(score) / max_pts * 100), 1) if max_pts > 0 else float(score)
    await submission_data_col.update_one(
        {"_id": submission["_id"]},
        {"$set": {
            "evaluation_status": "completed",
            "evaluation_score": float(score),
            "total_score": float(score),
            "evaluation_recommendation": recommendation,
            "status": status_label,
            # "score_percent": pct,
        }},
    )

    # Auto-advance participant if score meets shortlist threshold
    from stage_access_control import auto_advance_participant_on_score
    await auto_advance_participant_on_score(
        str(submission.get("event_id", "")),
        str(submission["_id"]),
        float(score),
    )

    # Also update hackathon_submissions_col if this submission exists there
    try:
        from db import hackathon_submissions_col
        await hackathon_submissions_col.update_one(
            {"_id": (ObjectId(submission_id) if ObjectId.is_valid(submission_id) else submission_id)},
            {"$set": {
                "totalScore": float(score),
                "rubricScores": criteria_scores,
                "status": "Evaluated",
                "updatedAt": datetime.now(timezone.utc),
            }},
        )
    except Exception:
        pass

    # Also update legacy submissions_col if this submission exists there
    try:
        from db import submissions_col
        await submissions_col.update_one(
            {"_id": (ObjectId(submission_id) if ObjectId.is_valid(submission_id) else submission_id)},
            {"$set": {
                "total_score": float(score),
                "evaluation_score": float(score),
                "status": "Reviewed",
            }},
        )
    except Exception:
        pass

    # Refresh leaderboard in background
    import asyncio
    from services.leaderboard_service import leaderboard_service
    async def _refresh_lb():
        try:
            await leaderboard_service.calculate_event_leaderboard(str(submission.get("event_id", "")))
        except Exception:
            pass
    asyncio.create_task(_refresh_lb())

    return {
        "success": True,
        "message": "Evaluation submitted successfully",
        "total_score": float(score),
        # "score_percent": pct,
        "recommendation": recommendation,
        "status": status_label,
    }


@router.get("/{token_or_id}/file/{field_id}")
async def download_evaluation_file(token_or_id: str, field_id: str):
    """Download a submission file for judges using their evaluation token (no login)."""
    from fastapi.responses import Response

    from db import submission_data_col

    sub = await submission_data_col.find_one(
        {"$or": [{"evaluation_token": token_or_id}, {"assigned_judges.evaluation_token": token_or_id}]},
        {f"data.{field_id}": 1},
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Invalid or expired evaluation link")

    from services.submission_file_io import load_submission_field_file

    value = (sub.get("data") or {}).get(field_id)
    if isinstance(value, str) and value.startswith("http"):
        raise HTTPException(status_code=400, detail="External URL — open link in browser")
    raw, mime, filename = load_submission_field_file(value, field_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="File not found")

    return Response(
        content=raw,
        media_type=mime,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "private, max-age=3600",
        },
    )
