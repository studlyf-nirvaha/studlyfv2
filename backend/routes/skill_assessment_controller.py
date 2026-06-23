import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from pymongo import DESCENDING

from domain_models import (
    SaveAssessmentRequest,
    AssessmentResponse,
    QuestionResult,
    MistakeAnalysis,
)

def _get_skill_assessments_col():
    from db import skill_assessments_col
    return skill_assessments_col

logger = logging.getLogger("skill_assessment_controller")
router = APIRouter(prefix="/api/skill-assessment", tags=["Skill Assessment"])


def _serialize(doc: dict) -> dict:
    raw_id = doc.pop("_id", None)
    doc["assessmentId"] = str(doc.get("assessmentId") or raw_id or "unknown")
    doc.setdefault("questionResults", [])
    doc.setdefault("mistakeAnalysis", [])
    doc.setdefault("weakAreas", [])
    doc.setdefault("icon", None)
    doc.setdefault("createdAt", doc.get("completedAt"))
    return doc


@router.post("/save", status_code=status.HTTP_201_CREATED)
async def save_assessment(payload: SaveAssessmentRequest):
    try:
        assessment_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        doc = {
            "_id":               assessment_id,
            "assessmentId":      assessment_id,
            "userId":            payload.userId,
            "skillId":           payload.skillId,
            "skillName":         payload.skillName,
            "score":             payload.score,
            "interviewReadiness": payload.interviewReadiness,
            "level":             payload.level,
            "strengths":         payload.strengths,
            "weaknesses":        payload.weaknesses,
            "weakAreas":         payload.weakAreas,
            "questionResults":   [qr.model_dump() for qr in payload.questionResults],
            "mistakeAnalysis":   [ma.model_dump() for ma in payload.mistakeAnalysis],
            "completedAt":       payload.completedAt.isoformat(),
            "createdAt":         now.isoformat(),
        }

        await _get_skill_assessments_col().insert_one(doc)
        logger.info(
            f"Skill assessment saved: userId={payload.userId} "
            f"skill={payload.skillId} score={payload.score}"
        )

        return {
            "success":      True,
            "assessmentId": assessment_id,
            "message":      "Assessment saved successfully",
        }

    except Exception as e:
        logger.error(f"Failed to save skill assessment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save assessment: {str(e)}",
        )


@router.get("/history/{user_id}")
async def get_assessment_history(user_id: str):
    try:
        cursor = _get_skill_assessments_col().find(
            {"userId": user_id},
            sort=[("completedAt", DESCENDING)],
        )
        docs = await cursor.to_list(length=200)
        serialized = [_serialize(doc) for doc in docs]

        return {
            "success":     True,
            "userId":      user_id,
            "count":       len(serialized),
            "assessments": serialized,
        }

    except Exception as e:
        logger.error(f"Failed to fetch history for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assessment history: {str(e)}",
        )


@router.get("/{assessment_id}")
async def get_assessment(assessment_id: str):
    try:
        doc = await _get_skill_assessments_col().find_one({"_id": assessment_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment {assessment_id} not found",
            )
        return {"success": True, "assessment": _serialize(doc)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch assessment {assessment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assessment: {str(e)}",
        )

# ─── Gemini Proxy Router Endpoints ───────────────────────────────────────────
import httpx
from pydantic import BaseModel

class VerifyKeyPayload(BaseModel):
    apiKey: str

@router.post("/verify-key")
async def verify_key(payload: VerifyKeyPayload):
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={payload.apiKey}"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": "Reply with OK"}]}]
                },
                timeout=10.0
            )
            try:
                res_data = response.json()
            except Exception:
                res_data = {"error_text": response.text}
            
            return {
                "status": response.status_code,
                "data": res_data
            }
    except Exception as e:
        logger.error(f"Gemini API Key validation error: {e}")
        return {
            "status": 500,
            "error": str(e)
        }

class GenerateQuestionsPayload(BaseModel):
    skill: str
    apiKey: str

@router.post("/generate-questions")
async def generate_questions(payload: GenerateQuestionsPayload):
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={payload.apiKey}"
        prompt = f"""Generate exactly 10 interview-style assessment questions for the skill: "{payload.skill}".
Distribution: 3 MCQ, 3 Coding, 2 Scenario, 2 Real World.
Return ONLY valid JSON with this exact shape, no markdown, no explanation:
{{
  "questions": [
    {{
      "id": 1,
      "type": "MCQ",
      "topic": "topic name",
      "difficulty": "EASY",
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "option A",
      "expectedConcepts": ["concept 1", "concept 2"]
    }}
  ]
}}
For MCQ, correctAnswer must be exactly one of the options.
For Coding/Scenario/Real World types, set options to [] and correctAnswer to a brief model answer string.
Difficulty must be one of: EASY, MEDIUM, HARD.
Question type must be exactly one of: MCQ, CODING, SCENARIO, REAL_WORLD."""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}]
                },
                timeout=30.0
            )
            try:
                res_data = response.json()
            except Exception:
                res_data = {"error_text": response.text}
            
            return {
                "status": response.status_code,
                "data": res_data
            }
    except Exception as e:
        logger.error(f"Gemini Question Generation error: {e}")
        return {
            "status": 500,
            "error": str(e)
        }

class EvaluateAnswerPayload(BaseModel):
    skill: str
    question: dict
    userAnswer: str
    apiKey: str

@router.post("/evaluate-answer")
async def evaluate_answer(payload: EvaluateAnswerPayload):
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={payload.apiKey}"
        prompt = f"""You are an expert {payload.skill} interviewer. Evaluate this answer.
Question: {payload.question.get("question")}
Type: {payload.question.get("type")}
Expected Concepts: {", ".join(payload.question.get("expectedConcepts", []))}
Model/Correct Answer: {payload.question.get("correctAnswer")}
User's Answer: {payload.userAnswer}

Return ONLY valid JSON, no markdown, no backticks:
{{
  "score": <number from 0 to 100>,
  "verdict": "STRONG PASS" | "PASS" | "BORDERLINE" | "FAIL",
  "strengths": ["specific strength 1", "specific strength 2"],
  "gaps": ["specific weakness/gap 1", "specific weakness/gap 2"],
  "correctAnswer": "the model correct answer or expected outcome",
  "betterApproach": "advice on how to write a better solution",
  "interviewReadiness": <number from 0 to 100>
}}"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}]
                },
                timeout=30.0
            )
            try:
                res_data = response.json()
            except Exception:
                res_data = {"error_text": response.text}
            
            return {
                "status": response.status_code,
                "data": res_data
            }
    except Exception as e:
        logger.error(f"Gemini Answer Evaluation error: {e}")
        return {
            "status": 500,
            "error": str(e)
        }