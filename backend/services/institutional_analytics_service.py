
from db import events_col, participants_col, teams_col, submissions_col, leaderboard_col
from bson import ObjectId
from datetime import datetime, timedelta

class InstitutionalAnalyticsService:
    """
    Professional Analytics Engine for event tracking and performance reporting.
    Exclusively uses dynamic database aggregations.
    """
    async def get_kpi_summary(self, institution_id: str):
        # Count Live vs Draft events
        active_events = await events_col.count_documents({
            "institution_id": institution_id, 
            "status": {"$in": ["Live", "published", "active"]}
        })
        
        # J&I specifically
        active_ji = await events_col.count_documents({
            "institution_id": institution_id, 
            "category": {"$in": ["Job", "Internship"]},
            "status": {"$in": ["Live", "published", "active"]}
        })

        # Registrations are total participants
        total_participants = await participants_col.count_documents({"institution_id": institution_id})
        
        # Calculate Average Score across all events for this institution
        pipeline = [
            {"$lookup": {
                "from": "events",
                "localField": "event_id",
                "foreignField": "_id",
                "as": "event"
            }},
            {"$unwind": "$event"},
            {"$match": {"event.institution_id": institution_id}},
            {"$group": {"_id": None, "avg": {"$avg": "$total_score"}}}
        ]
        score_res = await leaderboard_col.aggregate(pipeline).to_list(1)
        avg_score = score_res[0]["avg"] if score_res else 0

        return {
            "total_participants": total_participants,
            "active_events": active_events,
            "active_ji": active_ji,
            "opp_registrations": total_participants, # Simplified for now
            "ji_registrations": 0, # Placeholder if separate tracking needed
            "average_score": round(avg_score, 2),
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_registration_timeline(self, institution_id: str):
        # 30-day dynamic window filtered by institution
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        pipeline = [
            {"$match": {
                "institution_id": institution_id,
                "registered_at": {"$gte": thirty_days_ago}
            }},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$registered_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        results = await participants_col.aggregate(pipeline).to_list(length=1000)
        return [{"date": r["_id"], "count": r["count"]} for r in results]

    async def get_departmental_breakdown(self, institution_id: str):
        pipeline = [
            {"$match": {"institution_id": institution_id}},
            {"$group": {"_id": "$department", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        results = await participants_col.aggregate(pipeline).to_list(length=1000)
        return [{"label": r["_id"] or "", "value": r["count"]} for r in results]

analytics_service = InstitutionalAnalyticsService()
