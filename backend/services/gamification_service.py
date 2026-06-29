"""
GAMIFICATION & ACHIEVEMENTS SYSTEM
Badges, leaderboards, achievements, and performance tracking
"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from db import (
    users_col, achievements_col, badges_col, 
    leaderboard_col, participants_col, submissions_col
)
from bson import ObjectId
import logging
logger = logging.getLogger(__name__)


class Badge:
    """Badge definition."""
    def __init__(
        self, 
        badge_id: str, 
        name: str, 
        description: str, 
        icon: str,
        criteria: Dict[str, Any]
    ):
        self.badge_id = badge_id
        self.name = name
        self.description = description
        self.icon = icon
        self.criteria = criteria

# Predefined badges
BADGES = {
    "first_submission": Badge(
        "first_submission",
        "First Step",
        "Submitted your first project",
        "🚀",
        {"type": "submission_count", "value": 1}
    ),
    "high_scorer": Badge(
        "high_scorer",
        "High Scorer",
        "Achieved a score above 80%",
        "⭐",
        {"type": "score", "value": 80}
    ),
    "top_5_rank": Badge(
        "top_5_rank",
        "Top Performer",
        "Ranked in top 5 of an event",
        "🏆",
        {"type": "leaderboard_rank", "value": 5}
    ),
    "consistency_king": Badge(
        "consistency_king",
        "Consistency King",
        "Participated in 5+ events",
        "👑",
        {"type": "participation_count", "value": 5}
    ),
    "quick_submitter": Badge(
        "quick_submitter",
        "Quick Submitter",
        "Submitted within 24 hours of registration",
        "⚡",
        {"type": "submission_speed", "hours": 24}
    ),
    "feedback_collector": Badge(
        "feedback_collector",
        "Feedback Collector",
        "Received 100+ points in feedback",
        "💬",
        {"type": "feedback_points", "value": 100}
    ),
    "skill_builder": Badge(
        "skill_builder",
        "Skill Builder",
        "Developed 5+ distinct skills",
        "🎓",
        {"type": "skill_count", "value": 5}
    ),
    "collaboration_master": Badge(
        "collaboration_master",
        "Collaboration Master",
        "Led or participated in 10+ team projects",
        "🤝",
        {"type": "team_participation", "value": 10}
    )
}

class GamificationService:
    """Manages gamification features including badges and achievements."""
    
    @staticmethod
    async def check_and_award_badges(user_id: str) -> List[Dict[str, Any]]:
        """
        Check all badge criteria and award earned badges to a user.
        """
        try:
            newly_earned = []
            
            # Get user participation data
            participations = await participants_col.find({
                "user_id": user_id
            }).to_list(None)
            
            submissions = await submissions_col.find({
                "user_id": user_id
            }).to_list(None)
            
            # Check each badge
            
            # Badge: First Submission
            if len(submissions) >= 1:
                awarded = await GamificationService._award_badge_if_not_exists(
                    user_id, BADGES["first_submission"]
                )
                if awarded:
                    newly_earned.append(awarded)
            
            # Badge: High Scorer
            high_score_subs = [s for s in submissions if s.get("average_score", 0) >= 80]
            if high_score_subs:
                awarded = await GamificationService._award_badge_if_not_exists(
                    user_id, BADGES["high_scorer"]
                )
                if awarded:
                    newly_earned.append(awarded)
            
            # Badge: Consistency King
            if len(participations) >= 5:
                awarded = await GamificationService._award_badge_if_not_exists(
                    user_id, BADGES["consistency_king"]
                )
                if awarded:
                    newly_earned.append(awarded)
            
            # Badge: Quick Submitter
            for sub in submissions:
                if GamificationService._is_quick_submission(sub):
                    awarded = await GamificationService._award_badge_if_not_exists(
                        user_id, BADGES["quick_submitter"]
                    )
                    if awarded:
                        newly_earned.append(awarded)
                    break
            
            # Badge: Collaboration Master
            team_subs = [s for s in submissions if s.get("team_id")]
            if len(participations) + len(team_subs) >= 10:
                awarded = await GamificationService._award_badge_if_not_exists(
                    user_id, BADGES["collaboration_master"]
                )
                if awarded:
                    newly_earned.append(awarded)
            
            return newly_earned
        except Exception as e:
            logger.error(f"Badge Check Error: {e}")
            return []

    @staticmethod
    async def _award_badge_if_not_exists(user_id: str, badge: Badge) -> Optional[Dict[str, Any]]:
        """Award a badge if the user doesn't already have it."""
        try:
            existing = await badges_col.find_one({
                "user_id": user_id,
                "badge_id": badge.badge_id
            })
            
            if existing:
                return None
            
            badge_doc = {
                "user_id": user_id,
                "badge_id": badge.badge_id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
                "awarded_at": datetime.now(timezone.utc)
            }
            
            result = await badges_col.insert_one(badge_doc)
            badge_doc["_id"] = str(result.inserted_id)
            return badge_doc
        except Exception as e:
            logger.error(f"Award Badge Error: {e}")
            return None

    @staticmethod
    def _is_quick_submission(submission: Dict) -> bool:
        """Check if submission was made quickly after registration."""
        try:
            reg_time = submission.get("registered_at")
            sub_time = submission.get("submitted_at")
            
            if not reg_time or not sub_time:
                return False
            
            time_diff = (sub_time - reg_time).total_seconds() / 3600  # hours
            return time_diff <= 24
        except Exception as e:
            logger.warning(f"Handled exception at line 200: {e}")
            return False

    @staticmethod
    async def create_leaderboard(
        event_id: str,
        dimension: str = "overall"  # "overall", "by_department", "by_college"
    ) -> Dict[str, Any]:
        """
        Create or update a leaderboard for an event.
        Dimension specifies how scores are grouped.
        """
        try:
            # Get all ranked participants
            rankings = await leaderboard_col.find({
                "event_id": event_id
            }).sort("rank", 1).to_list(None)
            
            leaderboard_data = {
                "event_id": event_id,
                "dimension": dimension,
                "generated_at": datetime.now(timezone.utc),
                "rankings": [
                    {
                        "rank": r.get("rank"),
                        "name": r.get("team_name") or r.get("recipient_name"),
                        "score": r.get("total_score"),
                        "status": r.get("final_status"),
                        "medal": GamificationService._get_medal_for_rank(r.get("rank"))
                    } for r in rankings
                ]
            }
            
            return {
                "success": True,
                "leaderboard": leaderboard_data
            }
        except Exception as e:
            logger.error(f"Leaderboard Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _get_medal_for_rank(rank: int) -> Optional[str]:
        """Get medal emoji for rank."""
        medals = {
            1: "🥇",
            2: "🥈",
            3: "🥉"
        }
        return medals.get(rank)

    @staticmethod
    async def get_user_achievements(user_id: str) -> Dict[str, Any]:
        """Get all achievements and badges for a user."""
        try:
            badges = await badges_col.find({
                "user_id": user_id
            }).to_list(None)
            
            achievements = await achievements_col.find({
                "user_id": user_id
            }).to_list(None)
            
            # Calculate stats
            total_points = sum(a.get("points", 0) for a in achievements)
            
            return {
                "user_id": user_id,
                "badges": [
                    {
                        "id": str(b["_id"]),
                        "badge_id": b.get("badge_id"),
                        "name": b.get("name"),
                        "icon": b.get("icon"),
                        "awarded_at": b.get("awarded_at").isoformat()
                    } for b in badges
                ],
                "achievements": [
                    {
                        "id": str(a["_id"]),
                        "title": a.get("title"),
                        "description": a.get("description"),
                        "points": a.get("points"),
                        "completed_at": a.get("completed_at", "").isoformat() if isinstance(a.get("completed_at"), datetime) else a.get("completed_at")
                    } for a in achievements
                ],
                "total_badges": len(badges),
                "total_achievements": len(achievements),
                "total_points": total_points
            }
        except Exception as e:
            logger.error(f"Achievements Fetch Error: {e}")
            return {"error": str(e)}

    @staticmethod
    async def create_leaderboard_entry(
        event_id: str,
        team_name: str,
        total_score: float,
        rank: int,
        team_id: Optional[str] = None,
        participant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a leaderboard entry."""
        try:
            entry = {
                "event_id": event_id,
                "team_name": team_name,
                "team_id": team_id,
                "participant_id": participant_id,
                "total_score": total_score,
                "rank": rank,
                "final_status": "Winner" if rank <= 3 else "Participant",
                "medal": GamificationService._get_medal_for_rank(rank),
                "created_at": datetime.now(timezone.utc)
            }
            
            result = await leaderboard_col.insert_one(entry)
            return {
                "success": True,
                "entry_id": str(result.inserted_id),
                "rank": rank
            }
        except Exception as e:
            logger.error(f"Leaderboard Entry Error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_institution_gamification_stats(institution_id: str) -> Dict[str, Any]:
        """Get gamification metrics for an institution."""
        try:
            # Count badges awarded
            total_badges_awarded = await badges_col.count_documents({})
            
            # Count achievements
            total_achievements = await achievements_col.count_documents({})
            
            # Most earned badges
            top_badges = await badges_col.aggregate([
                {"$group": {"_id": "$badge_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ]).to_list(5)
            
            return {
                "total_badges_awarded": total_badges_awarded,
                "total_achievements": total_achievements,
                "top_badges": top_badges
            }
        except Exception as e:
            logger.error(f"Stats Error: {e}")
            return {}

# Initialize singleton
gamification_service = GamificationService()
