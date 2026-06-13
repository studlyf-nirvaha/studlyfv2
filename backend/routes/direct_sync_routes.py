"""
Direct Sync Routes - Simple, direct stage synchronization
"""
from fastapi import APIRouter
from datetime import datetime
from db import events_col, opportunities_col

router = APIRouter(prefix="/api/direct-sync", tags=["Direct Sync"])

@router.post("/force-update/{event_id}")
async def force_update_all_opportunities(event_id: str):
    """Force update all opportunities with event stages - optimized bulk approach"""
    from bson import ObjectId
    from pymongo import UpdateOne
    try:
        print(f"DIRECT SYNC: Force updating all opportunities for event: {event_id}")
        
        # Get the event
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        event_stages = event.get("stages", [])
        print(f"DIRECT SYNC: Event has {len(event_stages)} stages")
        
        # Determine registration deadline
        deadline = event.get("registration_deadline") or event.get("registrationDeadline")
        for s in event_stages:
            if isinstance(s, dict) and str(s.get("type", "")).upper() == "REGISTRATION":
                deadline = s.get("end_date") or s.get("endDate") or s.get("deadline") or deadline

        # Update opportunities LINKED to this event
        all_opportunities = await opportunities_col.find({"event_link_id": event_id}).to_list(length=1000)
        
        if not all_opportunities:
            return {"success": True, "message": "No opportunities to update", "updated_count": 0}

        bulk_operations = []
        for opportunity in all_opportunities:
            update_data = {
                "stages": event_stages,
                "updated_at": datetime.utcnow().isoformat(),
                "stages_last_updated": str(datetime.utcnow())
            }
            if deadline:
                update_data["deadline"] = deadline
            if event.get("logo_url"):
                update_data["logo_url"] = event["logo_url"]
            if event.get("banner_url"):
                update_data["banner_url"] = event["banner_url"]

            bulk_operations.append(
                UpdateOne(
                    {"_id": opportunity["_id"]},
                    {"$set": update_data}
                )
            )
            
        result = await opportunities_col.bulk_write(bulk_operations)
        updated_count = result.modified_count
        print(f"DIRECT SYNC: Updated {updated_count} opportunities via bulk write")
        
        return {
            "success": True,
            "message": f"Force updated {updated_count} opportunities",
            "updated_count": updated_count,
            "event_stages": event_stages
        }
        
    except Exception as e:
        print(f"DIRECT SYNC ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"Error: {str(e)}"}

@router.get("/check-opportunities")
async def check_all_opportunities():
    """Check all opportunities and their stages"""
    try:
        all_opps = await opportunities_col.find({}).to_list(length=10)
        
        result = []
        for opp in all_opps:
            result.append({
                "id": str(opp["_id"]),
                "title": opp.get("title", "Unknown"),
                "stages_count": len(opp.get("stages", [])),
                "stages": opp.get("stages", [])
            })
        
        return {"opportunities": result}
        
    except Exception as e:
        return {"error": str(e)}
