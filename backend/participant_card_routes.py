import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Body
from bson import ObjectId

from db import participants_col, users_col, events_col, teams_col, institutions_col

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Participant Card"])


@router.get("/participant-card")
async def get_participant_card(
    event_id: str = Query(...),
    participant_id: str = Query(...),
):
    participant = await participants_col.find_one({"event_id": event_id, "user_id": participant_id})
    if not participant:
        try:
            p_obj = ObjectId(participant_id)
            participant = await participants_col.find_one({"_id": p_obj, "event_id": event_id})
        except:
            pass

    if not participant:
        raise HTTPException(404, "Participant not found for this event")

    user_id = participant.get("user_id", "")

    user = None
    if user_id:
        user = await users_col.find_one({"user_id": user_id})

    try:
        e_obj = ObjectId(event_id)
        event = await events_col.find_one({"_id": e_obj})
    except:
        event = None

    team_name = None
    team_id = participant.get("team_id")
    if team_id:
        try:
            team = await teams_col.find_one({"_id": ObjectId(team_id)})
        except:
            team = await teams_col.find_one({"team_id": team_id})
        if team:
            team_name = team.get("name") or team.get("team_name") or None

    institution_name = None
    institution_id = event.get("institution_id") if event else participant.get("institution_id")
    if institution_id:
        inst = await institutions_col.find_one({"institution_id": institution_id})
        if inst:
            institution_name = inst.get("name") or inst.get("institution_name") or None

    college = None
    if user:
        college = user.get("college") or user.get("institution") or institution_name
    elif institution_name:
        college = institution_name

    profile_image = None
    if user:
        profile_image = user.get("profile_image") or user.get("avatar") or user.get("photo") or None

    card_data = {
        "participantName": participant.get("name", "Participant"),
        "email": participant.get("email", ""),
        "college": college or "",
        "profileImage": profile_image,
        "eventName": event.get("title") or event.get("name") or "Event",
        "eventCategory": event.get("category") or "Hackathon",
        "eventDates": "",
        "eventVenue": "",
        "teamName": team_name,
        "role": participant.get("status", "participant").title(),
        "regId": participant.get("reg_id") or participant.get("registration_id") or "",
        "bulletPoints": participant.get("bullet_points") or [],
        "linkedinPost": participant.get("linkedin_post") or "",
    }

    if event:
        sd = event.get("start_date") or event.get("startDate") or ""
        ed = event.get("end_date") or event.get("endDate") or ""
        if sd and ed:
            card_data["eventDates"] = f"{sd} - {ed}"
        elif sd:
            card_data["eventDates"] = sd
        card_data["eventVenue"] = event.get("venue") or event.get("location") or event.get("city") or ""

    return card_data


@router.patch("/participant-card")
async def update_participant_card(body: dict = Body(...)):
    event_id = body.get("event_id")
    participant_id = body.get("participant_id")
    if not event_id or not participant_id:
        raise HTTPException(400, "event_id and participant_id are required")

    try:
        p_obj = ObjectId(participant_id)
    except Exception:
        p_obj = None

    query = {"event_id": event_id}
    if p_obj:
        query["_id"] = p_obj
    else:
        query["user_id"] = participant_id

    updates = {}
    for key in ["reg_id", "bullet_points", "linkedin_post"]:
        if key in body:
            updates[key] = body.get(key)
    if not updates:
        return {"success": True}

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await participants_col.update_one(query, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Participant not found")
    return {"success": True}
