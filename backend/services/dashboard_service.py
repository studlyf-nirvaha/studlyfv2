from db import db, events_col, participants_col, opportunities_col, opportunity_applications_col
from datetime import datetime
import logging
logger = logging.getLogger(__name__)


async def get_institution_stats(institution_id: str):
    try:
        # Define statuses that indicate an event/opp is closed
        _FINAL = ["ENDED", "COMPLETED", "CANCELLED", "REJECTED"]
        
        # 1. Get Event IDs for the institution
        event_cursor = events_col.find({"institution_id": institution_id}, {"_id": 1})
        event_ids = [str(e["_id"]) async for e in event_cursor]
        
        # 2. Get Opportunities linked to the institution
        opp_cursor = opportunities_col.find(
            {"$or": [{"institution_id": institution_id}, {"createdBy": institution_id}]},
            {"_id": 1, "type": 1, "event_link_id": 1}
        )
        all_opps = await opp_cursor.to_list(length=None)
        
        hack_opp_ids = [str(o["_id"]) for o in all_opps if o.get("event_link_id")]
        ji_opp_ids = [str(o["_id"]) for o in all_opps if not o.get("event_link_id") and str(o.get("type", "")).strip().lower() in ("job", "internship")]
        
        # 3. Direct Counts (Efficient)
        active_events = await events_col.count_documents({
            "institution_id": institution_id,
            "status": {"$nin": _FINAL}
        })
        
        active_ji = await opportunities_col.count_documents({
            "_id": {"$in": [ObjectId(oid) for oid in ji_opp_ids]},
            "status": {"$in": ["active", "live", "published"]}
        }) if ji_opp_ids else 0

        portal_hack_regs = await opportunity_applications_col.count_documents(
            {"opportunity_id": {"$in": hack_opp_ids}}
        ) if hack_opp_ids else 0
        
        event_booth_regs = await participants_col.count_documents(
            {"event_id": {"$in": event_ids}}
        ) if event_ids else 0
        
        opp_registrations = portal_hack_regs + event_booth_regs
        
        ji_registrations = await opportunity_applications_col.count_documents(
            {"opportunity_id": {"$in": ji_opp_ids}}
        ) if ji_opp_ids else 0
        
        total_candidates = opp_registrations + ji_registrations
        
        # Engagement rate
        total_active_listings = active_events + active_ji
        expected_participants = total_active_listings * 50
        raw_engagement = (total_candidates / expected_participants * 100) if expected_participants > 0 else 0
        engagement_rate = round(min(100.0, max(12.5, raw_engagement)), 1) if total_candidates > 0 else 0.0

        return {
            "total_participants": total_candidates,
            "active_ji": active_ji,
            "ji_registrations": ji_registrations,
            "active_events": active_events,
            "opp_registrations": opp_registrations,
            "active_assessments": total_active_listings,
            "engagement_rate": engagement_rate
        }
    except Exception as e:
        logger.error(f"STATS ERROR: {e}")
        return {
            "total_participants": 0,
            "active_ji": 0,
            "ji_registrations": 0,
            "active_events": 0,
            "opp_registrations": 0,
            "active_assessments": 0,
            "engagement_rate": 0
        }
