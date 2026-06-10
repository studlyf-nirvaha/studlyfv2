import os
import json
import uuid
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Dict, Optional
from groq import Groq

router = APIRouter()

# Instantiate Groq specifically for this service to ensure isolation
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
GROQ_MODEL = os.getenv("GROQ_INTERVIEW_MODEL", "llama-3.3-70b-versatile")

class SimulatorStartRequest(BaseModel):
    company_name: str

class SimulatorChatRequest(BaseModel):
    company_name: str
    user_message: str
    chat_history: List[Dict[str, str]]

class SimulatorFeedbackRequest(BaseModel):
    company_name: str
    chat_history: List[Dict[str, str]]

def get_company_prompt(company: str) -> str:
    company = company.lower()
    if company == "google":
        return (
            "You are a Google technical recruiter and behavioral interviewer. "
            "Your focus is on Googleyness, collaboration, ambiguity handling, structured thinking, communication, and problem solving. "
            "Act professional, analytical, and curious. Ask questions that feel like an actual Google behavioral screening. "
            "IMPORTANT: Do not ask disconnected questions. ALWAYS generate a contextual follow-up based on the user's previous answer. "
            "If the answer is weak, probe deeper. If strong, increase difficulty. If vague, request specifics."
        )
    elif company == "amazon":
        return (
            "You are an Amazon Bar Raiser and interviewer. "
            "Your strong focus is on the Leadership Principles: Ownership, Customer Obsession, Dive Deep, Bias for Action, Deliver Results, Learn and Be Curious, Disagree and Commit. "
            "Be intense, probing, and strict. Weak or vague answers must be challenged. Ask things like 'What tradeoff did you make?', 'How did this impact the customer?'. "
            "IMPORTANT: Do not ask disconnected questions. ALWAYS generate a contextual follow-up. Do not accept vague metrics."
        )
    elif company == "microsoft":
        return (
            "You are a Microsoft interviewer. "
            "Your focus is on Growth Mindset, teamwork, collaboration, communication, learning ability, and engineering maturity. "
            "Be slightly more conversational but still technical. Encourage reflection and learning. Ask things like 'What changed in your approach after that mistake?'. "
            "IMPORTANT: Do not ask disconnected questions. ALWAYS generate a contextual follow-up based on the user's previous answer."
        )
    else:
        return (
            f"You are a hiring manager at {company}. Ask strict behavioral and technical questions. "
            "ALWAYS generate a contextual follow-up based on the user's answer."
        )

@router.post("/start")
async def start_simulator(req: SimulatorStartRequest, x_groq_api_key: Optional[str] = Header(None)):
    current_client = Groq(api_key=x_groq_api_key) if x_groq_api_key else client
    if not current_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
        
    system_prompt = get_company_prompt(req.company_name)
    instruction = f"Start the interview by welcoming the candidate to the {req.company_name} placement simulator and asking your first behavioral or situational question."
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": instruction}
    ]
    
    try:
        response = current_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=256
        )
        ai_msg = response.choices[0].message.content.strip()
        return {"response": ai_msg, "session_id": str(uuid.uuid4())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat_simulator(req: SimulatorChatRequest, x_groq_api_key: Optional[str] = Header(None)):
    current_client = Groq(api_key=x_groq_api_key) if x_groq_api_key else client
    if not current_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
        
    system_prompt = get_company_prompt(req.company_name)
    
    # Reconstruct history
    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.chat_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": req.user_message})
    
    try:
        response = current_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=300
        )
        ai_msg = response.choices[0].message.content.strip()
        return {"response": ai_msg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def feedback_simulator(req: SimulatorFeedbackRequest, x_groq_api_key: Optional[str] = Header(None)):
    current_client = Groq(api_key=x_groq_api_key) if x_groq_api_key else client
    if not current_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
        
    system_prompt = (
        f"You are an expert technical recruiter at {req.company_name}. "
        "Review the following interview transcript and provide a highly critical, realistic evaluation. "
        "Respond ONLY with a JSON object. No markdown formatting, just raw JSON. The JSON must have the following keys: "
        "'strengths' (array of strings), 'weaknesses' (array of strings), and 'improvements' (array of strings)."
    )
    
    transcript = "Transcript:\n"
    for msg in req.chat_history:
        role = "Interviewer" if msg["role"] == "assistant" else "Candidate"
        transcript += f"{role}: {msg['content']}\n"
        
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": transcript}
    ]
    
    try:
        response = current_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.4,
            response_format={"type": "json_object"}
        )
        raw_json = response.choices[0].message.content.strip()
        parsed = json.loads(raw_json)
        return {"feedback": parsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
