from fastapi import APIRouter, HTTPException, Depends, Query, Body
from bson import ObjectId
from db import events_col
from auth_institution import get_auth_user
import logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/v1/institution/events", tags=["Participant Card Admin"])

DEFAULT_CARD_CONFIG = {
    "cardStyle": {
        "backgroundFrom": "#2A1758",
        "backgroundTo": "#7c154b",
        "textColor": "#ffffff",
        "accentColor": "#6C3BFF",
    },
    "posterStyle": {
        "background": "#fdfae7",
        "accentColor": "#ea580c",
        "headerText": "India's Largest Summer AI Hackathon",
    },
    "sponsors": [],
    "links": [],
}


@router.get("/{event_id}/card-config")
async def get_card_config(
    event_id: str,
    user: dict = Depends(get_auth_user),
):
    try:
        event = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    except Exception as e:
        logger.warning(f"Handled exception at line 32: {e}")
        event = None
    if not event:
        raise HTTPException(404, "Event not found")

    config = event.get("participant_card_config") or DEFAULT_CARD_CONFIG
    sponsors = event.get("sponsors") or []
    if not config.get("sponsors"):
        config["sponsors"] = sponsors
    return config


@router.put("/{event_id}/card-config")
async def update_card_config(
    event_id: str,
    config: dict = Body(...),
    user: dict = Depends(get_auth_user),
):
    role = str(user.get("role") or "").lower()
    if role not in ("institution", "admin", "super_admin"):
        raise HTTPException(403, "Institution access required")

    try:
        event = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
    except Exception as e:
        logger.warning(f"Handled exception at line 56: {e}")
        event = None
    if not event:
        raise HTTPException(404, "Event not found")

    card_style = config.get("cardStyle", {})
    poster_style = config.get("posterStyle", {})
    sponsors = config.get("sponsors", [])
    links = config.get("links", [])

    await events_col.update_one(
        {"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)},
        {
            "$set": {
                "participant_card_config.cardStyle.backgroundFrom": card_style.get("backgroundFrom", DEFAULT_CARD_CONFIG["cardStyle"]["backgroundFrom"]),
                "participant_card_config.cardStyle.backgroundTo": card_style.get("backgroundTo", DEFAULT_CARD_CONFIG["cardStyle"]["backgroundTo"]),
                "participant_card_config.cardStyle.textColor": card_style.get("textColor", DEFAULT_CARD_CONFIG["cardStyle"]["textColor"]),
                "participant_card_config.cardStyle.accentColor": card_style.get("accentColor", DEFAULT_CARD_CONFIG["cardStyle"]["accentColor"]),
                "participant_card_config.posterStyle.background": poster_style.get("background", DEFAULT_CARD_CONFIG["posterStyle"]["background"]),
                "participant_card_config.posterStyle.accentColor": poster_style.get("accentColor", DEFAULT_CARD_CONFIG["posterStyle"]["accentColor"]),
                "participant_card_config.posterStyle.headerText": poster_style.get("headerText", DEFAULT_CARD_CONFIG["posterStyle"]["headerText"]),
                "participant_card_config.links": links,
                "sponsors": sponsors,
            }
        },
    )

    return {
        "cardStyle": card_style,
        "posterStyle": poster_style,
        "sponsors": sponsors,
        "links": links,
    }
