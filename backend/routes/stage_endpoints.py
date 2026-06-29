"""
Stage Configuration & Registration Management Endpoints
"""

from fastapi import APIRouter, HTTPException, Body, Depends, Query
from bson import ObjectId
from db import events_col, submissions_col, users_col, participants_col
from auth_institution import get_auth_user, get_auth_user_optional
from datetime import datetime
import logging

logger = logging.getLogger("stage_endpoints")
router = APIRouter(prefix="/api/v1/events", tags=["Event Stages"])

# ============================================================================
# STAGE CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/{event_id}/stages")
async def get_event_stages(event_id: str, user: any = Depends(get_auth_user_optional)):
    """Get all stages for an event with their configurations."""
    try:
        event_id_obj = ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id
    except Exception as e:
        logger.warning(f"Handled exception at line 24: {e}")
        event_id_obj = event_id
    
    try:
        event = await events_col.find_one({"_id": event_id_obj})
    except Exception as e:
        logger.warning(f"Handled exception at line 29: {e}")
        event = await events_col.find_one({"event_id": event_id})
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    stages = event.get("stages", [])
    return {
        "status": "success",
        "event_id": str(event_id),
        "total_stages": len(stages),
        "stages": stages
    }


@router.get("/{event_id}/stages/{stage_id}/config")
async def get_stage_config(event_id: str, stage_id: str, user: any = Depends(get_auth_user_optional)):
    """Get stage configuration including fields."""
    try:
        event_id_obj = ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id
    except Exception as e:
        logger.warning(f"Handled exception at line 49: {e}")
        event_id_obj = event_id
    
    try:
        event = await events_col.find_one({"_id": event_id_obj})
    except Exception as e:
        logger.warning(f"Handled exception at line 54: {e}")
        event = await events_col.find_one({"event_id": event_id})
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    stages = event.get("stages", [])
    stage = next((s for s in stages if s.get("id") == stage_id or s.get("_id") == stage_id), None)
    
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    return {
        "status": "success",
        "event_id": str(event_id),
        "stage_id": stage_id,
        "stage_name": stage.get("name"),
        "stage_type": stage.get("type"),
        "stage_description": stage.get("description"),
        "stage_deadline": stage.get("end_date"),
        "config": stage.get("config", {}),
        "fields": stage.get("config", {}).get("fields", [])
    }


# ============================================================================
# ADMIN REGISTRATIONS VIEWING ENDPOINT
# ============================================================================

@router.get("/{event_id}/stage/{stage_id}/registrations")
async def admin_view_stage_registrations(
    event_id: str,
    stage_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=10, le=100),
    user: dict = Depends(get_auth_user)
):
    """
    Admin endpoint: View all registration submissions for a stage.
    Returns: List of participants with their submitted registration data.
    """
    # Verify event ownership
    try:
        event_id_obj = ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id
    except Exception as e:
        logger.warning(f"Handled exception at line 98: {e}")
        event_id_obj = event_id
    
    try:
        event = await events_col.find_one({"_id": event_id_obj})
    except Exception as e:
        logger.warning(f"Handled exception at line 103: {e}")
        event = await events_col.find_one({"event_id": event_id})
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
    calling_inst_id = str(user.get("institution_id") or "")
    if inst_id != calling_inst_id:
        raise HTTPException(status_code=403, detail="Only event hosts can view registrations")
    
    # Find registrations for this stage
    query = {
        "event_id": str(event_id),
        "stage_id": stage_id
    }
    
    # Count total
    total = await submissions_col.count_documents(query)
    
    # Pagination
    skip = (page - 1) * limit
    cursor = submissions_col.find(query).sort("submitted_at", -1).skip(skip).limit(limit)
    registrations = []
    
    async for reg in cursor:
        user_id = reg.get("user_id")
        usr = None
        if user_id:
            usr = await users_col.find_one({"user_id": user_id})
        
        registrations.append({
            "_id": str(reg.get("_id")),
            "user_id": user_id,
            "user_name": usr.get("full_name") or usr.get("name") if usr else "Unknown",
            "user_email": usr.get("email") if usr else "",
            "user_college": usr.get("college") or usr.get("institution") if usr else "",
            "submitted_at": reg.get("submitted_at"),
            "data": reg.get("data") or {},
            "status": reg.get("status", "submitted")
        })
    
    logger.info(f"Admin viewed {len(registrations)} registrations for event {event_id} stage {stage_id}")
    
    return {
        "status": "success",
        "event_id": str(event_id),
        "stage_id": stage_id,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "registrations": registrations
    }
