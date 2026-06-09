"""Helpers for submission API responses and timestamps."""
from datetime import datetime, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

from services.field_validation import sanitize_submission_data_for_client

DISPLAY_TZ = ZoneInfo("Asia/Kolkata")


def build_frontend_url(path: str) -> str:
    """Build a HashRouter-safe frontend URL (e.g. https://app.com/#/opportunities/...)."""
    import os

    base = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
    if "/#" in base:
        base = base.split("/#")[0].rstrip("/")
    clean = path if path.startswith("/") else f"/{path}"
    return f"{base}/#{clean}"


def format_submission_timestamp(value: Any) -> str:
    """Human-readable submission time in IST for emails and UI."""
    if value is None:
        dt = datetime.now(timezone.utc)
    elif isinstance(value, datetime):
        dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    elif isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            return value
    else:
        return str(value)
    local = dt.astimezone(DISPLAY_TZ)
    return local.strftime("%d %b %Y, %I:%M %p IST")


async def resolve_notification_action_url(
    event_id: Optional[str],
    metadata: Optional[dict] = None,
) -> str:
    """Build a frontend URL that exists for submission/event notifications."""
    from db import opportunities_col, events_col
    from bson import ObjectId

    meta = metadata or {}
    stage_id = meta.get("stage_id")
    opportunity_id = meta.get("opportunity_id")

    if not opportunity_id and event_id:
        try:
            opp = await opportunities_col.find_one({"event_link_id": str(event_id)})
            if not opp:
                try:
                    opp = await opportunities_col.find_one({"event_link_id": str(ObjectId(event_id))})
                except Exception:
                    pass
            if not opp:
                ev = None
                try:
                    ev = await events_col.find_one({"_id": ObjectId(event_id)})
                except Exception:
                    ev = await events_col.find_one({"event_id": event_id})
                if ev:
                    opp = await opportunities_col.find_one({
                        "event_link_id": {"$in": [str(ev.get("_id")), ev.get("event_id")]}
                    })
            if opp:
                opportunity_id = str(opp.get("_id"))
        except Exception:
            pass

    if opportunity_id:
        tab = "submissions" if stage_id else "details"
        return build_frontend_url(f"/opportunities/{opportunity_id}?tab={tab}")

    if event_id:
        return build_frontend_url(f"/events/{event_id}/hub")

    return build_frontend_url("/opportunities/my-applications")


def summarize_submission_data(data: Any) -> dict:
    """Lightweight field summary for admin lists (no file blobs)."""
    if not isinstance(data, dict):
        return {}
    summary = {}
    for key, val in data.items():
        if key == "team_display_name":
            continue
        if isinstance(val, str) and val.startswith("data:"):
            mime = val[5:val.find(";")] if ";" in val else "file"
            summary[key] = {"_stored_file": True, "mime": mime, "size": len(val)}
        elif isinstance(val, dict) and val.get("_stored_file"):
            summary[key] = val
        elif val is not None and val != "":
            text = str(val)
            summary[key] = text[:200] + ("…" if len(text) > 200 else "")
    return summary
