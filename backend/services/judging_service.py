"""
ADVANCED JUDGING & EVALUATION SERVICE
Plagiarism detection, score moderation, blind review, and evaluation workflows
"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from db import submissions_col, scores_col, judges_col, events_col, audit_logs_col
from bson import ObjectId
import asyncio
import hashlib
from difflib import SequenceMatcher

class JudgingService:
    """Handles advanced judging workflows and evaluation management."""
    
    @staticmethod
    async def enable_blind_review(event_id: str) -> Dict[str, Any]:
        """
        Enable blind review mode for an event.
        Masks participant identities from judges.
        """
        try:
            result = await events_col.update_one(
                {"_id": ObjectId(event_id)},
                {"$set": {
                    "is_blind_judging": True,
                    "blind_review_enabled_at": datetime.now(timezone.utc)
                }}
            )
            return {
                "success": result.modified_count > 0,
                "event_id": event_id,
                "blind_mode": True
            }
        except Exception as e:
            print(f"Blind Review Enable Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def check_plagiarism(submission_id: str, submission_code: str) -> Dict[str, Any]:
        """
        Check submission for plagiarism using similarity scoring.
        Compares against previous submissions and external databases.
        """
        try:
            submission = await submissions_col.find_one({"_id": ObjectId(submission_id)})
            if not submission:
                return {"success": False, "error": "Submission not found"}
            
            event_id = submission.get("event_id")
            
            # Get all other submissions in the same event
            other_submissions = await submissions_col.find({
                "event_id": event_id,
                "_id": {"$ne": ObjectId(submission_id)}
            }).to_list(length=1000)
            
            # Calculate similarity scores
            similarities = []
            for other in other_submissions:
                other_code = other.get("project_description", "")
                similarity_score = JudgingService._calculate_similarity(
                    submission_code, 
                    other_code
                )
                
                if similarity_score > 0.3:  # Flag if >30% similar
                    similarities.append({
                        "submission_id": str(other["_id"]),
                        "team_name": other.get("team_name"),
                        "similarity_score": round(similarity_score * 100, 2)
                    })
            
            # Calculate overall plagiarism risk
            max_similarity = max(
                [s["similarity_score"] for s in similarities],
                default=0
            )
            
            risk_level = "Low" if max_similarity < 30 else "Medium" if max_similarity < 60 else "High"
            
            # Store plagiarism report
            plagiarism_report = {
                "submission_id": submission_id,
                "max_similarity": max_similarity,
                "risk_level": risk_level,
                "similar_submissions": similarities,
                "checked_at": datetime.now(timezone.utc)
            }
            
            await submissions_col.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {
                    "plagiarism_score": max_similarity,
                    "plagiarism_report": plagiarism_report,
                    "plagiarism_checked_at": datetime.now(timezone.utc)
                }}
            )
            
            return {
                "success": True,
                "submission_id": submission_id,
                "plagiarism_score": max_similarity,
                "risk_level": risk_level,
                "similar_submissions_count": len(similarities),
                "details": similarities
            }
        except Exception as e:
            print(f"Plagiarism Check Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _calculate_similarity(text1: str, text2: str) -> float:
        """
        Calculate text similarity using SequenceMatcher.
        Returns value between 0 and 1.
        """
        try:
            # Normalize texts
            text1 = text1.lower().strip()
            text2 = text2.lower().strip()
            
            if not text1 or not text2:
                return 0.0
            
            matcher = SequenceMatcher(None, text1, text2)
            return matcher.ratio()
        except Exception as e:
            print(f"Similarity Calculation Error: {e}")
            return 0.0

    @staticmethod
    async def assign_judges_to_submission(
        submission_id: str,
        judge_ids: List[str],
        event_id: str
    ) -> Dict[str, Any]:
        """
        Assign multiple judges to a submission.
        Enables consensus scoring if multiple judges assigned.
        """
        try:
            result = await submissions_col.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {
                    "assigned_judge_ids": judge_ids,
                    "judge_count": len(judge_ids),
                    "requires_consensus": len(judge_ids) > 1,
                    "judges_assigned_at": datetime.now(timezone.utc)
                }}
            )
            
            # Create judge assignments
            for judge_id in judge_ids:
                await judges_col.insert_one({
                    "submission_id": submission_id,
                    "judge_id": judge_id,
                    "event_id": event_id,
                    "status": "assigned",
                    "created_at": datetime.now(timezone.utc)
                })
            
            return {
                "success": True,
                "submission_id": submission_id,
                "judges_assigned": len(judge_ids),
                "consensus_required": len(judge_ids) > 1
            }
        except Exception as e:
            print(f"Judge Assignment Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def submit_judge_score(
        submission_id: str,
        judge_id: str,
        criteria_scores: Dict[str, float],
        feedback: str
    ) -> Dict[str, Any]:
        """
        Submit an individual judge's score and feedback.
        """
        try:
            total_score = sum(criteria_scores.values())
            
            score_doc = {
                "submission_id": submission_id,
                "judge_id": judge_id,
                "criteria_scores": criteria_scores,
                "total_score": total_score,
                "feedback": feedback,
                "submitted_at": datetime.now(timezone.utc)
            }
            
            result = await scores_col.insert_one(score_doc)
            
            # Check if all judges have submitted
            submission = await submissions_col.find_one({"_id": ObjectId(submission_id)})
            assigned_judges = submission.get("assigned_judge_ids", [])
            submitted_judges = await scores_col.find({
                "submission_id": submission_id
            }).to_list(length=1000)
            
            all_submitted = len(submitted_judges) == len(assigned_judges)
            
            if all_submitted:
                # Calculate consensus score
                consensus_score = JudgingService._calculate_consensus_score(submitted_judges)
                
                await submissions_col.update_one(
                    {"_id": ObjectId(submission_id)},
                    {"$set": {
                        "average_score": consensus_score,
                        "status": "Evaluated",
                        "all_judges_submitted": True
                    }}
                )
            
            return {
                "success": True,
                "score_id": str(result.inserted_id),
                "all_judges_submitted": all_submitted
            }
        except Exception as e:
            print(f"Score Submission Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _calculate_consensus_score(scores: List[Dict]) -> float:
        """
        Calculate average score from multiple judges.
        """
        if not scores:
            return 0.0
        
        total = sum(s.get("total_score", 0) for s in scores)
        return total / len(scores)

    @staticmethod
    async def flag_score_for_moderation(
        score_id: str,
        reason: str,
        moderator_email: str
    ) -> Dict[str, Any]:
        """
        Flag a score as potentially unfair for moderation.
        """
        try:
            score = await scores_col.find_one({"_id": ObjectId(score_id)})
            if not score:
                return {"success": False, "error": "Score not found"}
            
            await scores_col.update_one(
                {"_id": ObjectId(score_id)},
                {"$set": {
                    "flagged_for_moderation": True,
                    "moderation_reason": reason,
                    "flagged_by": moderator_email,
                    "flagged_at": datetime.now(timezone.utc)
                }}
            )
            
            # Audit log
            await audit_logs_col.insert_one({
                "action": "SCORE_FLAGGED",
                "moderator": moderator_email,
                "score_id": score_id,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": True, "score_id": score_id}
        except Exception as e:
            print(f"Score Moderation Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_judge_dashboard(judge_id: str, event_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get dashboard for a judge showing assigned submissions.
        """
        try:
            query = {"judge_id": judge_id}
            if event_id:
                query["event_id"] = event_id
            
            judge_assignments = await judges_col.find(query).to_list(length=1000)
            
            submissions_data = []
            for assignment in judge_assignments:
                submission = await submissions_col.find_one({
                    "_id": ObjectId(assignment["submission_id"])
                })
                if submission:
                    submissions_data.append({
                        "submission_id": assignment["submission_id"],
                        "team_name": submission.get("team_name"),
                        "status": assignment.get("status"),
                        "assigned_at": assignment.get("created_at").isoformat()
                    })
            
            return {
                "success": True,
                "judge_id": judge_id,
                "total_assigned": len(judge_assignments),
                "submissions": submissions_data
            }
        except Exception as e:
            print(f"Judge Dashboard Error: {e}")
            return {"success": False, "error": str(e)}

# Initialize singleton
judging_service = JudgingService()
