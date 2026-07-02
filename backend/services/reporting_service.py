"""
COMPREHENSIVE REPORTING ENGINE
Custom reports, scheduled exports, and multi-format output
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
from db import (
    events_col, submissions_col, participants_col,
    leaderboard_col, audit_logs_col, reports_col
)
from bson import ObjectId
import json
import csv
import io

class ReportFormat(str, Enum):
    PDF = "pdf"
    CSV = "csv"
    JSON = "json"
    EXCEL = "excel"

class ReportType(str, Enum):
    LEADERBOARD = "leaderboard"
    PARTICIPANT_ANALYTICS = "participant_analytics"
    SUBMISSION_ANALYTICS = "submission_analytics"
    JUDGE_PERFORMANCE = "judge_performance"
    EVENT_SUMMARY = "event_summary"
    FINANCIAL = "financial"
    COMPLIANCE = "compliance"

class ReportingService:
    """Generates comprehensive reports with customizable parameters."""
    
    @staticmethod
    async def create_custom_report(
        event_id: str,
        report_type: ReportType,
        filters: Dict[str, Any],
        format: ReportFormat = ReportFormat.JSON
    ) -> Dict[str, Any]:
        """
        Generate a custom report with specified filters and format.
        """
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
            if not event:
                return {"success": False, "error": "Event not found"}
            
            report_data = {}
            
            if report_type == ReportType.LEADERBOARD:
                report_data = await ReportingService._generate_leaderboard_report(
                    event_id, filters
                )
            elif report_type == ReportType.PARTICIPANT_ANALYTICS:
                report_data = await ReportingService._generate_participant_report(
                    event_id, filters
                )
            elif report_type == ReportType.SUBMISSION_ANALYTICS:
                report_data = await ReportingService._generate_submission_report(
                    event_id, filters
                )
            elif report_type == ReportType.JUDGE_PERFORMANCE:
                report_data = await ReportingService._generate_judge_report(
                    event_id, filters
                )
            elif report_type == ReportType.EVENT_SUMMARY:
                report_data = await ReportingService._generate_event_summary(
                    event_id, filters
                )
            
            # Convert to requested format
            formatted_output = await ReportingService._format_report(
                report_data, format
            )
            
            # Store report metadata
            report_record = {
                "event_id": event_id,
                "report_type": report_type.value,
                "filters": filters,
                "format": format.value,
                "generated_at": datetime.now(timezone.utc),
                "file_size": len(str(formatted_output))
            }
            result = await reports_col.insert_one(report_record)
            
            return {
                "success": True,
                "report_id": str(result.inserted_id),
                "report_type": report_type.value,
                "format": format.value,
                "data": report_data,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            print(f"Report Generation Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def _generate_leaderboard_report(
        event_id: str,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate leaderboard report with rankings."""
        try:
            entries = await leaderboard_col.find({
                "event_id": event_id
            }).sort("rank", 1).to_list(length=1000)
            
            return {
                "title": "Event Leaderboard",
                "total_entries": len(entries),
                "rankings": [
                    {
                        "rank": e.get("rank"),
                        "team_name": e.get("team_name") or e.get("recipient_name"),
                        "total_score": e.get("total_score"),
                        "final_status": e.get("final_status")
                    } for e in entries
                ]
            }
        except Exception as e:
            print(f"Leaderboard Report Error: {e}")
            return {}

    @staticmethod
    async def _generate_participant_report(
        event_id: str,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate participant analytics report."""
        try:
            participants = await participants_col.find({
                "event_id": event_id
            }).to_list(length=1000)
            
            # Analyze demographics
            by_department = {}
            by_year = {}
            by_college = {}
            
            for p in participants:
                dept = p.get("department", "Unknown")
                year = p.get("year", "Unknown")
                college = p.get("college_name", "Unknown")
                
                by_department[dept] = by_department.get(dept, 0) + 1
                by_year[year] = by_year.get(year, 0) + 1
                by_college[college] = by_college.get(college, 0) + 1
            
            return {
                "title": "Participant Analytics",
                "total_participants": len(participants),
                "by_department": by_department,
                "by_year": by_year,
                "by_college": by_college
            }
        except Exception as e:
            print(f"Participant Report Error: {e}")
            return {}

    @staticmethod
    async def _generate_submission_report(
        event_id: str,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate submission analytics report."""
        try:
            submissions = await submissions_col.find({
                "event_id": event_id
            }).to_list(length=1000)
            
            total = len(submissions)
            evaluated = len([s for s in submissions if s.get("status") == "Evaluated"])
            pending = total - evaluated
            
            avg_score = sum(
                s.get("average_score", 0) for s in submissions
            ) / total if total > 0 else 0
            
            return {
                "title": "Submission Analytics",
                "total_submissions": total,
                "evaluated": evaluated,
                "pending": pending,
                "average_score": round(avg_score, 2),
                "completion_percentage": round((evaluated / total * 100), 2) if total > 0 else 0
            }
        except Exception as e:
            print(f"Submission Report Error: {e}")
            return {}

    @staticmethod
    async def _generate_judge_report(
        event_id: str,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate judge performance report."""
        try:
            from db import scores_col
            
            judge_stats = await scores_col.aggregate([
                {"$match": {"event_id": event_id}},
                {"$group": {
                    "_id": "$judge_id",
                    "submissions_evaluated": {"$sum": 1},
                    "avg_score": {"$avg": "$total_score"}
                }},
                {"$sort": {"submissions_evaluated": -1}}
            ]).to_list(20)
            
            return {
                "title": "Judge Performance Report",
                "total_judges": len(judge_stats),
                "judges": judge_stats
            }
        except Exception as e:
            print(f"Judge Report Error: {e}")
            return {}

    @staticmethod
    async def _generate_event_summary(
        event_id: str,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive event summary."""
        try:
            event = await events_col.find_one({"_id": ObjectId(event_id)})
            participants_count = await participants_col.count_documents({"event_id": event_id})
            submissions_count = await submissions_col.count_documents({"event_id": event_id})
            
            return {
                "title": event.get("title", "Event Summary"),
                "event_id": event_id,
                "status": event.get("status"),
                "total_participants": participants_count,
                "total_submissions": submissions_count,
                "created_at": event.get("created_at").isoformat(),
                "updated_at": event.get("updated_at").isoformat()
            }
        except Exception as e:
            print(f"Event Summary Error: {e}")
            return {}

    @staticmethod
    async def _format_report(
        report_data: Dict[str, Any],
        format: ReportFormat
    ) -> str:
        """Format report data into specified output format."""
        try:
            if format == ReportFormat.JSON:
                return json.dumps(report_data, indent=2, default=str)
            
            elif format == ReportFormat.CSV:
                if not report_data:
                    return ""
                
                # Simple CSV conversion for dict data
                output = io.StringIO()
                if "rankings" in report_data:
                    writer = csv.DictWriter(output, fieldnames=report_data["rankings"][0].keys())
                    writer.writeheader()
                    writer.writerows(report_data["rankings"])
                
                return output.getvalue()
            
            else:
                return json.dumps(report_data, default=str)
        except Exception as e:
            print(f"Format Error: {e}")
            return "{}"

    @staticmethod
    async def schedule_report_export(
        institution_id: str,
        event_id: str,
        report_type: ReportType,
        schedule: str,  # "daily", "weekly", "monthly"
        recipient_emails: List[str]
    ) -> Dict[str, Any]:
        """
        Schedule automated report generation and email delivery.
        """
        try:
            schedule_config = {
                "institution_id": institution_id,
                "event_id": event_id,
                "report_type": report_type.value,
                "schedule": schedule,
                "recipient_emails": recipient_emails,
                "status": "active",
                "created_at": datetime.now(timezone.utc),
                "next_run": ReportingService._calculate_next_run(schedule)
            }
            
            result = await reports_col.insert_one(schedule_config)
            
            return {
                "success": True,
                "schedule_id": str(result.inserted_id),
                "schedule": schedule,
                "next_run": schedule_config["next_run"].isoformat()
            }
        except Exception as e:
            print(f"Schedule Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _calculate_next_run(schedule: str) -> datetime:
        """Calculate next scheduled run time."""
        now = datetime.now(timezone.utc)
        
        if schedule == "daily":
            return now + timedelta(days=1)
        elif schedule == "weekly":
            return now + timedelta(weeks=1)
        elif schedule == "monthly":
            return now + timedelta(days=30)
        
        return now + timedelta(days=1)

    @staticmethod
    async def get_report_history(
        event_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieve report generation history for an event."""
        try:
            reports = await reports_col.find({
                "event_id": event_id
            }).sort("generated_at", -1).to_list(limit)
            
            return [
                {
                    "id": str(r["_id"]),
                    "type": r.get("report_type"),
                    "format": r.get("format"),
                    "generated_at": r.get("generated_at").isoformat(),
                    "file_size": r.get("file_size")
                } for r in reports
            ]
        except Exception as e:
            print(f"History Error: {e}")
            return []

# Initialize singleton
reporting_service = ReportingService()
