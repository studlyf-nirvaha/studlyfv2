"""
JWT helpers for institution-scoped routes. Hydrates institution_id from users collection.
"""
from typing import Optional
import logging

from fastapi import Depends, Header, HTTPException, Query
from auth_utils import decode_access_token
from bson import ObjectId
from db import users_col, events_col, opportunities_col

logger = logging.getLogger("auth_institution")


async def get_auth_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
) -> dict:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    payload = decode_access_token(token) or {}
    uid = payload.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Try to get user data, but don't fail if database is unavailable
    try:
        user = await users_col.find_one({"user_id": uid})
        if user:
            payload["institution_id"] = user.get("institution_id")
            payload["role"] = user.get("role") or payload.get("role")
            payload["email"] = user.get("email") or payload.get("sub")
            
            # Auto-assign institution_id for institution users if missing
            if payload.get("role") == "institution" and not payload.get("institution_id"):
                from db import institutions_col
                
                # Find the first institution linked to this user
                institution = await institutions_col.find_one({"created_by": uid})
                if institution:
                    await users_col.update_one(
                        {"user_id": uid},
                        {"$set": {"institution_id": institution.get("institution_id")}}
                    )
                    payload["institution_id"] = institution.get("institution_id")
                    logger.info(f"Auto-linked institution user {uid} to institution {institution.get('institution_id')}")
        else:
            # User not found in database, but token is valid
            logger.warning(f"User {uid} not found in database")
    except Exception as e:
        # Database error, but token is still valid
        logger.error(f"Database error in get_auth_user: {e}")
    
    return payload


def _is_admin(role: Optional[str]) -> bool:
    return str(role or "").lower() in ("admin", "super_admin")


def assert_institution_scope(institution_id: Optional[str], user: dict) -> None:
    """Caller must hold institution role and matching institution_id (or be admin)."""
    if not institution_id:
        logger.warning("assert_institution_scope failed: institution_id is missing")
        raise HTTPException(status_code=400, detail="institution_id is required")

    role = user.get("role") or ""
    if _is_admin(role):
        return

    if str(role).lower() != "institution":
        logger.warning(f"assert_institution_scope failed: user role is '{role}', expected 'institution'")
        raise HTTPException(status_code=403, detail="Institution access required")

    user_inst_id = str(user.get("institution_id") or "")
    if user_inst_id != str(institution_id):
        logger.warning(f"assert_institution_scope failed: user institution_id '{user_inst_id}' does not match requested '{institution_id}'")
        raise HTTPException(status_code=403, detail="Not authorized for this institution")


async def assert_institution_owns_event(event_id: str, user: dict) -> dict:
    """Return event doc if the caller may manage it. Falls back to opportunities_col when the ID is
    a standalone opportunity (not linked to an events_col document)."""
    from bson.errors import InvalidId

    # Build a resilient query that works for both ObjectId (24-char hex) and UUID/string IDs
    id_query: list = [{"event_id": event_id}]  # custom string field fallback
    try:
        id_query.append({"_id": ObjectId(event_id)})
    except (InvalidId, ValueError):
        pass
    id_query.append({"_id": event_id})  # string _id fallback

    ev = await events_col.find_one({"$or": id_query})
    if not ev:
        # Fallback: the ID might belong to a standalone opportunity
        ev = await opportunities_col.find_one({"$or": id_query})
    if not ev:
        logger.warning(f"assert_institution_owns_event failed: Event/Opportunity '{event_id}' not found")
        raise HTTPException(status_code=404, detail="Event not found")

    role = user.get("role") or ""
    if _is_admin(role):
        return ev

    if str(role).lower() != "institution":
        logger.warning(f"assert_institution_owns_event failed: user role is '{role}', expected 'institution'")
        raise HTTPException(status_code=403, detail="Institution access required")

    user_inst_id = str(user.get("institution_id") or "")
    ev_inst_id = str(ev.get("institution_id") or str(ev.get("createdBy") or ""))

    if user_inst_id != ev_inst_id:
        logger.warning(f"assert_institution_owns_event failed: user institution_id '{user_inst_id}' does not match event institution_id '{ev_inst_id}'")
        raise HTTPException(status_code=403, detail="Not authorized for this event")

    return ev


async def get_auth_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token) or {}
    if not payload.get("user_id"):
        return None
    user = await users_col.find_one({"user_id": payload["user_id"]})
    if user:
        payload["institution_id"] = user.get("institution_id")
        payload["role"] = user.get("role") or payload.get("role")
        payload["email"] = user.get("email") or payload.get("sub")
    return payload
