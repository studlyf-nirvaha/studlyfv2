"""
ADVANCED ANALYTICS DASHBOARD SERVICE
Provides comprehensive KPI calculations, engagement metrics, and conversion funnels
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from db import (
    events_col, participants_col, submissions_col, 
    judges_col, certificates_col, users_col, notifications_col,
    leaderboard_col, audit_logs_col
)
from bson import ObjectId

class AnalyticsService:
    """Handles comprehensive institution analytics and KPI tracking."""
    
    @staticmethod
    async def get_dashboard_kpis(institution_id: str) -> Dict[str, Any]:
        """
        Calculate and return key performance indicators for dashboard.
        """
        try:
            # Get all events for this institution
            events = await events_col.find({"institution_id": institution_id}).to_list(length=1000)
            event_ids = [str(e["_id"]) for e in events]
            
            # KPI 1: Total Registrations
            total_registrations = await participants_col.count_documents({
                "event_id": {"$in": event_ids}
            })
            
            # KPI 2: Total Submissions
            total_submissions = await submissions_col.count_documents({
                "event_id": {"$in": event_ids}
            })
            
            # KPI 3: Completion Rate
            completed = await submissions_col.count_documents({
                "event_id": {"$in": event_ids},
                "status": "Evaluated"
            })
            completion_rate = (completed / total_submissions * 100) if total_submissions > 0 else 0
            
            # KPI 4: Average Scoring
            scores = await submissions_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}, "average_score": {"$exists": True}}},
                {"$group": {"_id": None, "avg_score": {"$avg": "$average_score"}}}
            ]).to_list(1)
            average_score = scores[0]["avg_score"] if scores else 0
            
            # KPI 5: Judge Participation Rate
            judge_count = len([e for e in events if e.get("judges")])
            judge_participation_rate = (judge_count / len(events) * 100) if events else 0
            
            # KPI 6: Certificate Distribution
            certificates_issued = await certificates_col.count_documents({
                "event_id": {"$in": event_ids}
            })
            
            # KPI 7: Trend Analysis (Last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            recent_registrations = await participants_col.count_documents({
                "event_id": {"$in": event_ids},
                "registered_at": {"$gte": thirty_days_ago}
            })
            
            # KPI 8: Top Performers
            top_performers = await submissions_col.find({
                "event_id": {"$in": event_ids}
            }).sort("average_score", -1).to_list(5)
            
            return {
                "total_registrations": total_registrations,
                "total_submissions": total_submissions,
                "completion_rate": round(completion_rate, 2),
                "average_score": round(average_score, 2),
                "judge_participation_rate": round(judge_participation_rate, 2),
                "certificates_issued": certificates_issued,
                "recent_registrations": recent_registrations,
                "top_performers": [
                    {
                        "project_title": p.get("project_title"),
                        "score": p.get("average_score", 0),
                        "team_name": p.get("team_name")
                    } for p in top_performers
                ],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            print(f"Analytics KPI Error: {e}")
            return {}

    @staticmethod
    async def get_conversion_funnel(institution_id: str) -> Dict[str, Any]:
        """
        Calculate multi-stage conversion funnel metrics.
        Stages: Registered → Submitted → Evaluated → Ranked
        """
        try:
            events = await events_col.find({"institution_id": institution_id}).to_list(length=1000)
            event_ids = [str(e["_id"]) for e in events]
            
            stage1_registered = await participants_col.count_documents({
                "event_id": {"$in": event_ids}
            })
            
            stage2_submitted = await submissions_col.count_documents({
                "event_id": {"$in": event_ids}
            })
            
            stage3_evaluated = await submissions_col.count_documents({
                "event_id": {"$in": event_ids},
                "status": "Evaluated"
            })
            
            stage4_ranked = await leaderboard_col.count_documents({
                "event_id": {"$in": event_ids}
            })
            
            return {
                "funnel_stages": [
                    {"stage": "Registered", "count": stage1_registered, "percentage": 100},
                    {"stage": "Submitted", "count": stage2_submitted, "percentage": round((stage2_submitted/stage1_registered)*100, 2) if stage1_registered else 0},
                    {"stage": "Evaluated", "count": stage3_evaluated, "percentage": round((stage3_evaluated/stage2_submitted)*100, 2) if stage2_submitted else 0},
                    {"stage": "Ranked", "count": stage4_ranked, "percentage": round((stage4_ranked/stage3_evaluated)*100, 2) if stage3_evaluated else 0}
                ]
            }
        except Exception as e:
            print(f"Conversion Funnel Error: {e}")
            return {"funnel_stages": []}

    @staticmethod
    async def get_engagement_metrics(institution_id: str) -> Dict[str, Any]:
        """
        Return detailed engagement metrics and timelines.
        """
        try:
            events = await events_col.find({"institution_id": institution_id}).to_list(length=1000)
            event_ids = [str(e["_id"]) for e in events]
            
            # Registration Timeline (by day)
            registration_timeline = await participants_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$registered_at"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}},
                {"$limit": 30}
            ]).to_list(30)
            
            # Submission Timeline
            submission_timeline = await submissions_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$submitted_at"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}},
                {"$limit": 30}
            ]).to_list(30)
            
            # Hourly Distribution
            hourly_activity = await participants_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$project": {"hour": {"$hour": "$registered_at"}}},
                {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}}
            ]).to_list(24)
            
            return {
                "registration_timeline": registration_timeline,
                "submission_timeline": submission_timeline,
                "hourly_distribution": hourly_activity
            }
        except Exception as e:
            print(f"Engagement Metrics Error: {e}")
            return {"registration_timeline": [], "submission_timeline": [], "hourly_distribution": []}

    @staticmethod
    async def get_demographic_insights(institution_id: str) -> Dict[str, Any]:
        """
        Analyze participant demographics by department, year, and location.
        """
        try:
            events = await events_col.find({"institution_id": institution_id}).to_list(length=1000)
            event_ids = [str(e["_id"]) for e in events]
            
            # By Department
            by_department = await participants_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$group": {"_id": "$department", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]).to_list(20)
            
            # By Year
            by_year = await participants_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$group": {"_id": "$year", "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}}
            ]).to_list(10)
            
            # By College
            by_college = await participants_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$group": {"_id": "$college_name", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]).to_list(10)
            
            return {
                "by_department": by_department,
                "by_year": by_year,
                "by_college": by_college
            }
        except Exception as e:
            print(f"Demographics Error: {e}")
            return {"by_department": [], "by_year": [], "by_college": []}

    @staticmethod
    async def get_judge_performance_metrics(institution_id: str) -> Dict[str, Any]:
        """
        Calculate judge participation, scoring fairness, and performance metrics.
        """
        try:
            events = await events_col.find({"institution_id": institution_id}).to_list(length=1000)
            event_ids = [str(e["_id"]) for e in events]
            
            # Judge participation and submission counts
            judge_stats = await submissions_col.aggregate([
                {"$match": {"event_id": {"$in": event_ids}}},
                {"$group": {
                    "_id": "$assigned_judge_id",
                    "submissions_evaluated": {"$sum": 1},
                    "avg_score": {"$avg": "$average_score"}
                }},
                {"$sort": {"submissions_evaluated": -1}}
            ]).to_list(20)
            
            return {
                "judge_stats": judge_stats,
                "total_judges": len(judge_stats),
                "avg_evaluations_per_judge": sum(j["submissions_evaluated"] for j in judge_stats) / len(judge_stats) if judge_stats else 0
            }
        except Exception as e:
            print(f"Judge Performance Error: {e}")
            return {"judge_stats": [], "total_judges": 0, "avg_evaluations_per_judge": 0}

# Initialize singleton
analytics_service = AnalyticsService()
