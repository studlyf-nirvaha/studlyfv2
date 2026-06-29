from db import events_col
from domain_models import Event
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import asyncio
import logging
logger = logging.getLogger(__name__)



def _strict_team_size_limits(event_data: dict) -> Optional[tuple[int, int]]:
    min_raw = event_data.get("min_team_size") if event_data else None
    if min_raw is None and event_data:
        min_raw = event_data.get("minTeamSize")
    max_raw = event_data.get("max_team_size") if event_data else None
    if max_raw is None and event_data:
        max_raw = event_data.get("maxTeamSize")
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

async def _create_opportunity_for_event(event_data: dict, opportunities_col):
    """Helper: Create or update opportunity mirror for an event."""
    try:
        event_id = event_data.get("_id") or ObjectId()
        if isinstance(event_id, ObjectId):
            event_id_str = str(event_id)
        else:
            event_id_str = str(event_id)
        
        # Check if opportunity already exists
        existing_opp = await opportunities_col.find_one({"event_link_id": event_id_str})
        
        # Use the admin-defined type verbatim — no normalization, no collapse
        opp_type = event_data.get("opportunityType") or event_data.get("category") or ""
        
        # Build opportunity data
        _city = event_data.get('city', '')
        _mode = event_data.get('opportunityMode', '')
        _loc_parts = [p for p in [_city, _mode] if p]
        opp_data = {
            "title": event_data.get("title", ""),
            "organization": event_data.get("organisation") or event_data.get("organization") or "",
            "type": opp_type,
            "description": event_data.get("description", ""),
            "location": ", ".join(_loc_parts),
            "deadline": event_data.get("registrationDeadline") or event_data.get("registration_deadline") or datetime.utcnow(),
            "eventStartDate": event_data.get("eventStartDate") or event_data.get("startDate") or event_data.get("start_date") or "",
            "eventEndDate": event_data.get("eventEndDate") or event_data.get("endDate") or event_data.get("end_date") or "",
            "applicantsCount": 0,
            "createdBy": str(event_data.get("institution_id", "")),
            "institution_id": str(event_data.get("institution_id", "")),
            "status": "active",
            "event_link_id": event_id_str,
            "logo_url": event_data.get("logo_url") or event_data.get("logo") or "",
            "banner_url": event_data.get("banner_url") or event_data.get("banner") or "",
            "updated_at": datetime.utcnow()
        }
        
        if "stages" in event_data:
            opp_data["stages"] = event_data["stages"]
        
        if existing_opp:
            # Update existing opportunity
            await opportunities_col.update_one(
                {"_id": existing_opp["_id"]},
                {"$set": opp_data}
            )
            logger.info(f"[SYNC] Updated opportunity for event {event_id_str}")
        else:
            # Create new opportunity
            opp_data["createdAt"] = datetime.utcnow()
            result = await opportunities_col.insert_one(opp_data)
            logger.info(f"[SYNC] Created opportunity {result.inserted_id} for event {event_id_str}")
    except Exception as e:
        logger.error(f"[WARNING] Failed to create opportunity mirror: {e}")
        # Don't fail event creation if opportunity sync fails
        pass

async def _seed_default_email_templates(event_data: dict):
    """Helper: Seed default email templates for a new event."""
    try:
        from services.email_template_service import seed_default_templates
        event_id = str(event_data.get("_id", ""))
        institution_id = str(event_data.get("institution_id", ""))
        if event_id and institution_id:
            await seed_default_templates(event_id, institution_id)
    except Exception as e:
        logger.error(f"[WARNING] Failed to seed email templates: {e}")
        pass

async def create_event(event_data: dict):
    """Create event and auto-sync to opportunities if status is LIVE."""
    from db import opportunities_col
    
    event_data["created_at"] = datetime.utcnow()
    event_data["updated_at"] = datetime.utcnow()
    
    # Default status to LIVE if not specified (for production)
    if "status" not in event_data or not event_data.get("status"):
        event_data["status"] = "LIVE"

    if str(event_data.get("status", "")).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        participation_type = str(event_data.get("participationType") or event_data.get("participation_type") or "").lower().strip()
        if participation_type in ("team", "both") and _strict_team_size_limits(event_data) is None:
            raise ValueError("Team size must be configured before making this event live")
    
    result = await events_col.insert_one(event_data)
    event_data["_id"] = str(result.inserted_id)
    
    # Auto-create opportunity mirror if event is LIVE
    if str(event_data.get("status", "")).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        asyncio.create_task(_create_opportunity_for_event(event_data, opportunities_col))
    
    # Seed default email templates in background
    asyncio.create_task(_seed_default_email_templates(event_data))
    
    return event_data

async def get_all_events(filters: dict = {}):
    """Get all events and auto-sync any LIVE events to opportunities."""
    from db import opportunities_col
    
    cursor = events_col.find(filters)
    events = []
    event_ids = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        events.append(doc)
        if str(doc.get("status", "")).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
            event_ids.append(doc["_id"])
            
    # Bulk check for existing opportunities to fix N+1 query issue
    existing_link_ids = set()
    if event_ids:
        async for opp in opportunities_col.find({"event_link_id": {"$in": event_ids}}, {"event_link_id": 1}):
            existing_link_ids.add(opp["event_link_id"])
            
    # Queue sync for events that don't have a linked opportunity
    for doc in events:
        eid = doc["_id"]
        if eid in event_ids and eid not in existing_link_ids:
            asyncio.create_task(_create_opportunity_for_event(doc, opportunities_col))
    
    return events

async def get_event_by_id(event_id: str):
    """Get event by ID and auto-sync to opportunities if LIVE."""
    from db import opportunities_col
    
    try:
        doc = await events_col.find_one({"_id": ObjectId(event_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            
            # Auto-sync LIVE events to opportunities
            if str(doc.get("status", "")).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
                try:
                    existing = await opportunities_col.find_one({"event_link_id": str(doc["_id"])})
                    if not existing:
                        asyncio.create_task(_create_opportunity_for_event(doc, opportunities_col))
                except Exception as e:
                    logger.warning(f"Handled exception at line 168: {e}")
                    pass
        
        return doc
    except Exception:
        return None

async def update_event(event_id: str, update_data: dict):
    update_data["updated_at"] = datetime.utcnow()
    await events_col.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": update_data}
    )
    updated_event = await get_event_by_id(event_id)
    if updated_event and str(updated_event.get("status", "")).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        from db import opportunities_col
        asyncio.create_task(_create_opportunity_for_event(updated_event, opportunities_col))
    return updated_event

async def delete_event(event_id: str):
    # Soft-delete: mark event as DELETED and hide from students/institution views
    update = {
        "status": "DELETED",
        "visible_to_students": False,
        "updated_at": datetime.utcnow()
    }
    await events_col.update_one({"_id": ObjectId(event_id)}, {"$set": update})
    return {"message": "Event soft-deleted (status=DELETED)"}

async def update_event_status(event_id: str, status: str):
    """Update event status and auto-sync to opportunities if LIVE."""
    from db import opportunities_col
    
    # Auto-normalize status for visibility
    status_normalized = str(status).upper()
    if status_normalized in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        status = "LIVE"
    elif status_normalized in ("DRAFT", "PENDING"):
        status = "DRAFT"
    elif status_normalized in ("CLOSED", "ENDED"):
        status = "CLOSED"
    
    # Update event status
    if status and str(status).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if event:
            participation_type = str(event.get("participationType") or event.get("participation_type") or "").lower().strip()
            if participation_type in ("team", "both") and _strict_team_size_limits(event) is None:
                raise ValueError("Team size must be configured before making this event live")

    updated_event = await update_event(event_id, {"status": status})
    
    # If status is being set to LIVE, create or update opportunity
    if status and str(status).upper() in ("LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"):
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if event:
            asyncio.create_task(_create_opportunity_for_event(event, opportunities_col))
    
    return updated_event
