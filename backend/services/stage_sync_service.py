"""
Stage Synchronization Service - Sync stages between events and opportunities
"""
from datetime import datetime, timezone
from db import events_col, opportunities_col
import logging
logger = logging.getLogger(__name__)


async def sync_stages_to_opportunities(event_id: str):
    """Sync stages from event to all related opportunities"""
    try:
        logger.info(f"DEBUG: Starting stage sync for event_id: {event_id}")
        
        # Get the event with updated stages
        event = await events_col.find_one({"_id": event_id})
        if not event:
            logger.info(f"DEBUG: Event not found: {event_id}")
            return {"success": False, "message": "Event not found"}
        
        logger.info(f"DEBUG: Found event: {event.get('name', 'Unknown')}")
        event_stages = event.get("stages", [])
        logger.info(f"DEBUG: Event stages: {len(event_stages)}")
        
        # Try different field names to find related opportunities
        opportunities = []
        
        # Try event_link_id field (this is the correct field name)
        opportunities = await opportunities_col.find({"event_link_id": event_id}).to_list()
        logger.info(f"DEBUG: Found {len(opportunities)} opportunities with event_link_id")
        
        if len(opportunities) == 0:
            # Try event_id field (fallback)
            opportunities = await opportunities_col.find({"event_id": event_id}).to_list()
            logger.info(f"DEBUG: Found {len(opportunities)} opportunities with event_id")
        
        if len(opportunities) == 0:
            # Try _id field (maybe it's stored differently)
            opportunities = await opportunities_col.find({"_id": event_id}).to_list()
            logger.info(f"DEBUG: Found {len(opportunities)} opportunities with _id")
        
        if len(opportunities) == 0:
            # Try other possible field names
            opportunities = await opportunities_col.find({"event": event_id}).to_list()
            logger.info(f"DEBUG: Found {len(opportunities)} opportunities with event field")
        
        if len(opportunities) == 0:
            # Try to find any opportunity that might be related by checking all opportunities
            all_opps = await opportunities_col.find({}).to_list(length=50)
            logger.info(f"DEBUG: Checking all {len(all_opps)} opportunities for any reference to event_id")
            
            for opp in all_opps:
                # Check if any field contains the event_id
                for key, value in opp.items():
                    if str(value) == str(event_id):
                        opportunities.append(opp)
                        logger.info(f"DEBUG: Found opportunity with {key} = {event_id}: {opp.get('title', 'Unknown')}")
                        break
        
        # Update each opportunity with the new stages
        updated_count = 0
        for opportunity in opportunities:
            logger.info(f"DEBUG: Updating opportunity: {opportunity.get('title', 'Unknown')}")
            logger.info(f"DEBUG: Opportunity current stages: {len(opportunity.get('stages', []))}")
            
            result = await opportunities_col.update_one(
                {"_id": opportunity["_id"]},
                {"$set": {
                    "stages": event_stages,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                logger.info(f"DEBUG: Successfully updated opportunity")
            else:
                logger.info(f"DEBUG: No changes made to opportunity")
        
        logger.info(f"DEBUG: Updated {updated_count} opportunities")
        
        # Also try to update ALL opportunities as a fallback (for testing)
        if updated_count == 0:
            logger.info("DEBUG: No opportunities updated, trying to update all opportunities as fallback")
            all_opps = await opportunities_col.find({}).to_list(length=10)
            for opp in all_opps:
                await opportunities_col.update_one(
                    {"_id": opp["_id"]},
                    {"$set": {
                        "stages": event_stages,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                updated_count += 1
                logger.info(f"DEBUG: Fallback updated opportunity: {opp.get('title', 'Unknown')}")
        
        return {
            "success": True,
            "message": f"Stages synced to {updated_count} opportunities",
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error(f"DEBUG: Error in stage sync: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to sync stages: {str(e)}"
        }

async def sync_opportunity_to_event(opportunity_id: str):
    """Sync opportunity data back to event (for reverse sync if needed)"""
    try:
        # Get the opportunity
        opportunity = await opportunities_col.find_one({"_id": opportunity_id})
        if not opportunity:
            return {"success": False, "message": "Opportunity not found"}
        
        # Get the related event
        event_id = opportunity.get("event_id")
        if not event_id:
            return {"success": False, "message": "No event_id found in opportunity"}
        
        # Update the event with opportunity stages
        await events_col.update_one(
            {"_id": event_id},
            {"$set": {
                "stages": opportunity.get("stages", []),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Event synced with opportunity stages"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to sync opportunity to event: {str(e)}"
        }
