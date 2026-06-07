"""
Manual Evaluation Service for Coding Submissions
Handles manual evaluation workflow for coding challenges and programming assignments
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from db import submissions_col, scores_col, judges_col, events_col, users_col, notifications_col
from services.email_service import send_notification_email
from notification_helpers import notify_institution

class ManualEvaluationService:
    """Service for manual evaluation of coding submissions"""
    
    async def create_manual_evaluation_task(
        self,
        submission_id: str,
        judge_id: str,
        evaluation_criteria: List[dict],
        user: dict
    ):
        """Create a manual evaluation task for a coding submission"""
        
        # Validate submission exists
        submission = await submissions_col.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            raise ValueError("Submission not found")
        
        # Validate judge
        judge = await judges_col.find_one({"_id": ObjectId(judge_id)})
        if not judge:
            raise ValueError("Judge not found")
        
        # Check if submission is a coding submission
        submission_type = submission.get("submission_type", "")
        if submission_type not in ["coding", "programming", "code"]:
            raise ValueError("This submission is not a coding submission")
        
        # Create evaluation task
        evaluation_task = {
            "submission_id": submission_id,
            "judge_id": judge_id,
            "evaluation_type": "manual",
            "status": "pending",  # pending, in_progress, completed
            "evaluation_criteria": evaluation_criteria,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("user_id"),
            "deadline": None,  # Can be set later
            "instructions": self._generate_evaluation_instructions(submission, evaluation_criteria),
            "submission_files": submission.get("files", []),
            "submission_data": submission.get("submission_data", {})
        }
        
        # Update submission with manual evaluation flag
        await submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "manual_evaluation_required": True,
                    "manual_evaluation_status": "pending",
                    "assigned_judge_id": judge_id,
                    "evaluation_created_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Send notification to judge
        await self._notify_judge_of_evaluation(judge, submission, evaluation_task)
        
        return {
            "status": "evaluation_task_created",
            "submission_id": submission_id,
            "judge_id": judge_id,
            "evaluation_type": "manual"
        }
    
    async def submit_manual_evaluation(
        self,
        submission_id: str,
        judge_id: str,
        evaluation_results: List[dict],
        overall_comments: str,
        score_breakdown: Dict[str, float],
        user: dict
    ):
        """Submit manual evaluation results for a coding submission"""
        
        # Validate submission and judge
        submission = await submissions_col.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            raise ValueError("Submission not found")
        
        judge = await judges_col.find_one({"_id": ObjectId(judge_id)})
        if not judge:
            raise ValueError("Judge not found")
        
        # Validate evaluation results
        if not evaluation_results:
            raise ValueError("Evaluation results are required")
        
        # Calculate total score
        total_score = sum(score_breakdown.values())
        
        # Create evaluation record
        evaluation_record = {
            "submission_id": submission_id,
            "judge_id": judge_id,
            "judge_email": judge.get("email", ""),
            "evaluation_type": "manual",
            "evaluation_results": evaluation_results,
            "score_breakdown": score_breakdown,
            "total_score": total_score,
            "overall_comments": overall_comments,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "evaluation_duration": self._calculate_evaluation_duration(submission_id, judge_id)
        }
        
        # Save evaluation to scores collection
        await scores_col.insert_one(evaluation_record)
        
        # Update submission status
        await submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "manual_evaluation_status": "completed",
                    "evaluation_completed_at": datetime.now(timezone.utc).isoformat(),
                    "total_score": total_score,
                    "status": "Evaluation Complete"
                }
            }
        )
        
        # Send notification to participant
        await self._notify_participant_of_evaluation(submission, evaluation_record)
        
        # Update leaderboard
        from services.leaderboard_service import leaderboard_service
        await leaderboard_service.calculate_event_leaderboard(submission.get("event_id"))
        
        return {
            "status": "evaluation_submitted",
            "total_score": total_score,
            "submission_id": submission_id
        }
    
    async def get_evaluation_templates(self, institution_id: str, user: dict):
        """Get predefined evaluation templates for coding submissions"""
        
        # Validate institution access
        from auth_institution import assert_institution_scope
        assert_institution_scope(institution_id, user)
        
        templates = {
            "code_quality": {
                "name": "Code Quality Assessment",
                "description": "Comprehensive evaluation of code quality, structure, and best practices",
                "criteria": [
                    {
                        "id": "code_structure",
                        "name": "Code Structure & Organization",
                        "description": "How well the code is organized and structured",
                        "max_points": 20,
                        "type": "rating",
                        "scale": 5,
                        "weight": 2.0
                    },
                    {
                        "id": "readability",
                        "name": "Code Readability",
                        "description": "Clarity and maintainability of the code",
                        "max_points": 15,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.5
                    },
                    {
                        "id": "best_practices",
                        "name": "Best Practices",
                        "description": "Following coding standards and best practices",
                        "max_points": 20,
                        "type": "rating",
                        "scale": 5,
                        "weight": 2.0
                    },
                    {
                        "id": "documentation",
                        "name": "Documentation & Comments",
                        "description": "Quality of code documentation and comments",
                        "max_points": 10,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.0
                    }
                ]
            },
            "algorithm_efficiency": {
                "name": "Algorithm Efficiency Analysis",
                "description": "Evaluation of algorithmic efficiency and optimization",
                "criteria": [
                    {
                        "id": "time_complexity",
                        "name": "Time Complexity",
                        "description": "Efficiency of time complexity",
                        "max_points": 25,
                        "type": "rating",
                        "scale": 5,
                        "weight": 2.5
                    },
                    {
                        "id": "space_complexity",
                        "name": "Space Complexity",
                        "description": "Efficiency of space complexity",
                        "max_points": 20,
                        "type": "rating",
                        "scale": 5,
                        "weight": 2.0
                    },
                    {
                        "id": "optimization",
                        "name": "Optimization Techniques",
                        "description": "Use of optimization techniques",
                        "max_points": 15,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.5
                    }
                ]
            },
            "functionality_testing": {
                "name": "Functionality & Testing",
                "description": "Evaluation of functionality correctness and testing",
                "criteria": [
                    {
                        "id": "correctness",
                        "name": "Correctness",
                        "description": "Does the solution work correctly?",
                        "max_points": 30,
                        "type": "rating",
                        "scale": 5,
                        "weight": 3.0
                    },
                    {
                        "id": "edge_cases",
                        "name": "Edge Cases Handling",
                        "description": "How well edge cases are handled",
                        "max_points": 15,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.5
                    },
                    {
                        "id": "error_handling",
                        "name": "Error Handling",
                        "description": "Quality of error handling",
                        "max_points": 10,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.0
                    },
                    {
                        "id": "test_coverage",
                        "name": "Test Coverage",
                        "description": "Quality and coverage of tests",
                        "max_points": 15,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.5
                    }
                ]
            },
            "problem_solving": {
                "name": "Problem Solving Approach",
                "description": "Evaluation of problem-solving methodology and approach",
                "criteria": [
                    {
                        "id": "approach",
                        "name": "Problem Approach",
                        "description": "Quality of problem-solving approach",
                        "max_points": 20,
                        "type": "rating",
                        "scale": 5,
                        "weight": 2.0
                    },
                    {
                        "id": "logic",
                        "name": "Logical Thinking",
                        "description": "Quality of logical reasoning",
                        "max_points": 20,
                        "type": "rating",
                        "scale": 5,
                        "weight": 2.0
                    },
                    {
                        "id": "creativity",
                        "name": "Creativity & Innovation",
                        "description": "Creative and innovative solutions",
                        "max_points": 15,
                        "type": "rating",
                        "scale": 5,
                        "weight": 1.5
                    }
                ]
            }
        }
        
        return templates
    
    async def get_pending_evaluations(self, judge_id: str, user: dict):
        """Get pending manual evaluations for a judge"""
        
        # Validate judge access
        judge_email = user.get("email", "").lower().strip()
        judge = await judges_col.find_one({
            "_id": ObjectId(judge_id),
            "email": judge_email,
            "status": "ACCEPTED"
        })
        
        if not judge:
            raise ValueError("Judge not found or not accepted")
        
        # Get pending submissions
        pending_submissions = []
        async for submission in submissions_col.find({
            "manual_evaluation_required": True,
            "manual_evaluation_status": "pending",
            "assigned_judge_id": judge_id
        }):
            # Get event details
            event = await events_col.find_one({"_id": ObjectId(submission.get("event_id"))})
            
            # Get participant info
            participant_info = await self._get_participant_info(submission)
            
            submission_info = {
                "_id": str(submission["_id"]),
                "event_id": submission.get("event_id"),
                "event_name": event.get("name", "Unknown Event") if event else "Unknown Event",
                "title": submission.get("title", "Untitled Submission"),
                "description": submission.get("description", ""),
                "submitted_at": submission.get("submitted_at", ""),
                "participant_info": participant_info,
                "files": submission.get("files", []),
                "submission_type": submission.get("submission_type", ""),
                "programming_language": submission.get("programming_language", ""),
                "evaluation_deadline": submission.get("evaluation_deadline", "")
            }
            pending_submissions.append(submission_info)
        
        return {
            "pending_evaluations": pending_submissions,
            "total_count": len(pending_submissions)
        }
    
    async def _generate_evaluation_instructions(self, submission: dict, criteria: List[dict]) -> str:
        """Generate detailed evaluation instructions for the judge"""
        
        instructions = f"""
# Manual Evaluation Instructions

## Submission Details
- **Title**: {submission.get('title', 'Untitled')}
- **Submitted**: {submission.get('submitted_at', 'Unknown')}
- **Programming Language**: {submission.get('programming_language', 'Not specified')}
- **Files**: {len(submission.get('files', []))} files submitted

## Evaluation Criteria
"""
        
        for i, criterion in enumerate(criteria, 1):
            instructions += f"""
### {i}. {criterion.get('name', 'Unnamed Criterion')}
- **Description**: {criterion.get('description', 'No description')}
- **Maximum Points**: {criterion.get('max_points', 0)}
- **Type**: {criterion.get('type', 'rating')}
- **Weight**: {criterion.get('weight', 1.0)}
"""
        
        instructions += """

## Evaluation Process
1. Review all submitted files carefully
2. Test the code if possible (run test cases)
3. Evaluate against each criterion
4. Provide detailed comments for each criterion
5. Calculate total score based on weights
6. Add overall comments about the submission

## Scoring Guidelines
- Use the full range of points (0 to max_points)
- Consider the weight of each criterion in final scoring
- Be objective and consistent in your evaluation
- Provide constructive feedback in comments

## Files to Evaluate
"""
        
        for file in submission.get("files", []):
            instructions += f"- {file.get('name', 'Unknown file')} ({file.get('size', 0)} bytes)\n"
        
        return instructions
    
    async def _notify_judge_of_evaluation(self, judge: dict, submission: dict, evaluation_task: dict):
        """Send notification to judge about new evaluation task"""
        
        subject = f"New Manual Evaluation Assignment: {submission.get('title', 'Untitled')}"
        
        body_html = f"""
        <html>
        <body style="font-family: 'Poppins', sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6B46C1;">Manual Evaluation Assignment</h2>
                <p>Hello {judge.get('name', 'Judge')},</p>
                <p>You have been assigned to manually evaluate a coding submission:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>{submission.get('title', 'Untitled Submission')}</h4>
                    <p><strong>Submitted:</strong> {submission.get('submitted_at', 'Unknown')}</p>
                    <p><strong>Programming Language:</strong> {submission.get('programming_language', 'Not specified')}</p>
                    <p><strong>Files:</strong> {len(submission.get('files', []))} files</p>
                </div>
                <p>Please log in to the judge portal to review and evaluate this submission.</p>
                <p>
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/judge-portal" 
                       style="background-color: #6B46C1; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Go to Judge Portal
                    </a>
                </p>
                <p>Best Regards,<br>Studlyf Team</p>
            </div>
        </body>
        </html>
        """
        
        try:
            await send_notification_email(judge.get("email", ""), subject, body_html)
        except Exception as e:
            print(f"Failed to send evaluation notification email: {e}")
    
    async def _notify_participant_of_evaluation(self, submission: dict, evaluation_record: dict):
        """Send notification to participant about evaluation completion"""
        
        # Get participant info
        participant_info = await self._get_participant_info(submission)
        participant_email = participant_info.get("email", "")
        
        if not participant_email:
            return
        
        subject = f"Your Submission Has Been Evaluated: {submission.get('title', 'Untitled')}"
        
        body_html = f"""
        <html>
        <body style="font-family: 'Poppins', sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6B46C1;">Evaluation Completed</h2>
                <p>Hello {participant_info.get('name', 'Participant')},</p>
                <p>Your coding submission has been manually evaluated:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>{submission.get('title', 'Untitled Submission')}</h4>
                    <p><strong>Total Score:</strong> {evaluation_record.get('total_score', 0)}/100</p>
                    <p><strong>Evaluated by:</strong> {evaluation_record.get('judge_email', 'Judge')}</p>
                    <p><strong>Evaluated on:</strong> {evaluation_record.get('evaluated_at', 'Unknown')}</p>
                </div>
                <p>You can view the detailed evaluation and feedback in your dashboard.</p>
                <p>
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard" 
                       style="background-color: #6B46C1; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        View Evaluation
                    </a>
                </p>
                <p>Best Regards,<br>Studlyf Team</p>
            </div>
        </body>
        </html>
        """
        
        try:
            await send_notification_email(participant_email, subject, body_html)
        except Exception as e:
            print(f"Failed to send evaluation completion email: {e}")
    
    async def _get_participant_info(self, submission: dict) -> dict:
        """Get participant information for a submission"""
        
        participant_id = submission.get("participant_id")
        if participant_id:
            from db import participants_col
            participant = await participants_col.find_one({"_id": ObjectId(participant_id)})
            if participant:
                user = await users_col.find_one({"user_id": participant.get("user_id")})
                if user:
                    return {
                        "name": user.get("name", "Unknown"),
                        "email": user.get("email", ""),
                        "user_id": participant.get("user_id", "")
                    }
        
        return {"name": "Unknown", "email": "", "user_id": ""}
    
    async def _calculate_evaluation_duration(self, submission_id: str, judge_id: str) -> Optional[str]:
        """Calculate evaluation duration (placeholder implementation)"""
        
        # This would track when evaluation was assigned vs completed
        # For now, return None as duration tracking
        return None

# Global instance
manual_evaluation_service = ManualEvaluationService()

