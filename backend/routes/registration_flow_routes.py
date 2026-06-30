"""
Decoupled Onboarding & Registration Engine Router
"""
import os
import uuid
from stage_access_control import check_stage_deadline
import traceback
import json
import csv
import io
import logging
from fastapi import APIRouter, HTTPException, Depends, Body, File, UploadFile, status, Query
from fastapi.responses import StreamingResponse
from auth_institution import get_auth_user
from db import db, user_profiles_col, registrations_col, events_col, participants_col, users_col, opportunities_col, announcements_col, announcement_audit_col
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import shutil
import asyncio
from services.registration_service import validate_event_restrictions
from services.email_service import send_notification_email

async def resolve_event_id(event_id: str) -> str:
    """
    Given an event_id, check if it is a valid event ID in events_col.
    If not found, attempt to resolve it by looking up an opportunity
    where _id == event_id or event_link_id == event_id.
    Returns the resolved event_id as a string.
    """
    try:
        ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        ev = await events_col.find_one({"_id": ev_id})
        if ev:
            return str(ev["_id"])
    except Exception as e:
        logger.warning(f"Handled exception at line 37: {e}")
        pass
        
    ev = await events_col.find_one({"event_id": event_id})
    if ev:
        return str(ev["_id"])
        
    # Attempt resolving via opportunities collection
    opp = None
    try:
        opp_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        opp = await opportunities_col.find_one({"_id": opp_id})
    except Exception as e:
        logger.warning(f"Handled exception at line 49: {e}")
        pass
        
    if not opp:
        opp = await opportunities_col.find_one({"event_link_id": event_id})
        
    if opp and opp.get("event_link_id"):
        link_val = str(opp["event_link_id"])
        # Recursively resolve the linked ID to an events_col ObjectId if possible
        try:
            ev = await events_col.find_one({"event_id": link_val})
            if ev:
                return str(ev["_id"])
            ev_id = ObjectId(link_val)
            ev = await events_col.find_one({"_id": ev_id})
            if ev:
                return str(ev["_id"])
        except Exception as e:
            logger.warning(f"Handled exception at line 66: {e}")
            pass
        return link_val
        
    return event_id

router = APIRouter(prefix="/api/v1/registration", tags=["Registration System"])
logger = logging.getLogger("registration_flow")

# Base URL for static file paths
BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "https://api.studlyf.in")
REG_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "registrations")
os.makedirs(REG_UPLOAD_DIR, exist_ok=True)

# ─── DEFAULT PROFILE FIELDS CONFIGURATION ──────────────────────────────────────
DEFAULT_FIELDS_METADATA = {
    "profile_type": {"label": "Profile Type", "category": "Identity", "default": "REQUIRED", "type": "text"},
    "full_name": {"label": "Full Name", "category": "Identity", "default": "REQUIRED", "type": "text"},
    "email": {"label": "Email", "category": "Identity", "default": "REQUIRED", "type": "text"},
    "phone": {"label": "Phone Number", "category": "Identity", "default": "REQUIRED", "type": "text"},
    "location": {"label": "Location", "category": "Identity", "default": "OPTIONAL", "type": "text"},
    "gender": {"label": "Gender", "category": "Identity", "default": "OPTIONAL", "type": "text"},
    "dob": {"label": "Date of Birth", "category": "Identity", "default": "HIDDEN", "type": "date"},
    
    "college": {"label": "College Name", "category": "Education", "default": "REQUIRED", "type": "text"},
    "degree": {"label": "Degree", "category": "Education", "default": "OPTIONAL", "type": "text"},
    "branch": {"label": "Branch / Department", "category": "Education", "default": "OPTIONAL", "type": "text"},
    "graduation_year": {"label": "Graduation Year", "category": "Education", "default": "OPTIONAL", "type": "number"},
    "cgpa": {"label": "CGPA", "category": "Education", "default": "OPTIONAL", "type": "text"},

    "company": {"label": "Company", "category": "Professional", "default": "OPTIONAL", "type": "text"},
    "job_title": {"label": "Job Title", "category": "Professional", "default": "OPTIONAL", "type": "text"},
    "years_of_experience": {"label": "Years of Experience", "category": "Professional", "default": "OPTIONAL", "type": "number"},
    "industry": {"label": "Industry", "category": "Professional", "default": "OPTIONAL", "type": "text"},
    "organization_name": {"label": "Organization Name", "category": "Professional", "default": "OPTIONAL", "type": "text"},
    "website_url": {"label": "Website URL", "category": "Professional", "default": "OPTIONAL", "type": "url"},
    
    "resume_url": {"label": "Resume", "category": "Professional", "default": "OPTIONAL", "type": "file"},
    "linkedin_url": {"label": "LinkedIn URL", "category": "Professional", "default": "OPTIONAL", "type": "url"},
    "github_url": {"label": "GitHub URL", "category": "Professional", "default": "OPTIONAL", "type": "url"},
    "portfolio_url": {"label": "Portfolio URL", "category": "Professional", "default": "HIDDEN", "type": "url"},
    "skills": {"label": "Skills", "category": "Professional", "default": "OPTIONAL", "type": "text"}
}

LEGACY_FIELD_KEY_ALIASES = {
    "1": "full_name",
    "2": "email",
    "3": "phone",
    "4": "college",
    "5": "degree",
    "6": "branch",
    "7": "graduation_year",
    "8": "cgpa",
    "9": "resume_url",
    "10": "linkedin_url",
    "11": "github_url",
    "12": "portfolio_url",
    "13": "skills",
    "name": "full_name",
    "fullname": "full_name",
    "full_name": "full_name",
    "mail": "email",
    "email": "email",
    "phone": "phone",
    "phone_number": "phone",
    "mobile": "phone",
    "profile_type": "profile_type",
    "college": "college",
    "college_name": "college",
    "degree": "degree",
    "branch": "branch",
    "department": "branch",
    "graduation_year": "graduation_year",
    "grad_year": "graduation_year",
    "cgpa": "cgpa",
    "gender": "gender",
    "dob": "dob",
    "location": "location",
    "resume": "resume_url",
    "resume_url": "resume_url",
    "linkedin": "linkedin_url",
    "linkedin_url": "linkedin_url",
    "github": "github_url",
    "github_url": "github_url",
    "portfolio": "portfolio_url",
    "portfolio_url": "portfolio_url",
    "skills": "skills",
    "company": "company",
    "job_title": "job_title",
    "experience": "years_of_experience",
    "years_of_experience": "years_of_experience",
    "industry": "industry",
    "organization_name": "organization_name",
    "website": "website_url",
    "website_url": "website_url"
}

PROFILE_DEFAULTS_BASE = {
    "profile_type": "REQUIRED",
    "full_name": "REQUIRED",
    "email": "REQUIRED",
    "phone": "REQUIRED",
    "location": "OPTIONAL",
    "gender": "OPTIONAL",
    "dob": "HIDDEN",
    "college": "REQUIRED",
    "degree": "OPTIONAL",
    "branch": "OPTIONAL",
    "graduation_year": "OPTIONAL",
    "cgpa": "OPTIONAL",
    "company": "HIDDEN",
    "job_title": "HIDDEN",
    "years_of_experience": "HIDDEN",
    "industry": "HIDDEN",
    "organization_name": "HIDDEN",
    "website_url": "HIDDEN",
    "resume_url": "OPTIONAL",
    "linkedin_url": "OPTIONAL",
    "github_url": "OPTIONAL",
    "portfolio_url": "HIDDEN",
    "skills": "OPTIONAL"
}

PROFILE_TYPE_DEFAULT_OVERRIDES = {
    "student": {
        "college": "REQUIRED",
        "degree": "OPTIONAL",
        "branch": "OPTIONAL",
        "graduation_year": "OPTIONAL",
        "cgpa": "OPTIONAL",
        "company": "HIDDEN",
        "job_title": "HIDDEN",
        "years_of_experience": "HIDDEN",
        "industry": "HIDDEN",
        "organization_name": "HIDDEN",
        "website_url": "HIDDEN"
    },
    "professional": {
        "college": "HIDDEN",
        "degree": "HIDDEN",
        "branch": "HIDDEN",
        "graduation_year": "HIDDEN",
        "cgpa": "HIDDEN",
        "company": "OPTIONAL",
        "job_title": "OPTIONAL",
        "years_of_experience": "OPTIONAL",
        "industry": "OPTIONAL",
        "website_url": "OPTIONAL"
    },
    "freelancer": {
        "college": "HIDDEN",
        "degree": "HIDDEN",
        "branch": "HIDDEN",
        "graduation_year": "HIDDEN",
        "cgpa": "HIDDEN",
        "company": "HIDDEN",
        "job_title": "HIDDEN",
        "years_of_experience": "OPTIONAL",
        "industry": "OPTIONAL",
        "website_url": "OPTIONAL",
        "portfolio_url": "OPTIONAL",
        "skills": "OPTIONAL"
    },
    "organization": {
        "college": "HIDDEN",
        "degree": "HIDDEN",
        "branch": "HIDDEN",
        "graduation_year": "HIDDEN",
        "cgpa": "HIDDEN",
        "organization_name": "REQUIRED",
        "company": "OPTIONAL",
        "job_title": "OPTIONAL",
        "years_of_experience": "HIDDEN",
        "industry": "OPTIONAL",
        "website_url": "OPTIONAL"
    },
    "recruiter": {
        "college": "HIDDEN",
        "degree": "HIDDEN",
        "branch": "HIDDEN",
        "graduation_year": "HIDDEN",
        "cgpa": "HIDDEN",
        "organization_name": "REQUIRED",
        "company": "OPTIONAL",
        "job_title": "OPTIONAL",
        "years_of_experience": "HIDDEN",
        "industry": "OPTIONAL",
        "website_url": "OPTIONAL"
    },
    "fresher": {
        "college": "OPTIONAL",
        "degree": "OPTIONAL",
        "branch": "OPTIONAL",
        "graduation_year": "OPTIONAL",
        "cgpa": "OPTIONAL",
        "company": "HIDDEN",
        "job_title": "HIDDEN",
        "years_of_experience": "HIDDEN",
        "industry": "HIDDEN",
        "organization_name": "HIDDEN",
        "website_url": "OPTIONAL",
        "resume_url": "OPTIONAL",
        "linkedin_url": "OPTIONAL",
        "github_url": "OPTIONAL",
        "portfolio_url": "OPTIONAL",
        "skills": "OPTIONAL"
    }
}


def normalize_profile_type(value: Any) -> str:
    v = str(value or "").strip().lower()
    if v in ("working professional", "working_professional"):
        return "professional"
    if v in ("student", "professional", "freelancer", "organization", "recruiter", "fresher"):
        return v
    return "student"


def normalize_profile_field_key(key: Any) -> Optional[str]:
    raw = str(key or "").strip().lower().replace(" ", "_")
    normalized = LEGACY_FIELD_KEY_ALIASES.get(raw, raw)
    if normalized in DEFAULT_FIELDS_METADATA:
        return normalized
    return None


def build_profile_fields_config_from_legacy(legacy_rf: Any) -> Dict[str, str]:
    legacy_map: Dict[str, str] = {}
    if not isinstance(legacy_rf, list):
        return legacy_map

    for f in legacy_rf:
        if not isinstance(f, dict):
            continue
        raw_key = f.get("id") or f.get("key") or f.get("name") or f.get("field")
        key = normalize_profile_field_key(raw_key)
        if not key:
            continue
        required = f.get("required") in (True, "true", "True", 1) or f.get("isFixed") is True
        legacy_map[key] = "REQUIRED" if required else "OPTIONAL"
    return legacy_map


def normalize_profile_fields_config(config: Any) -> Dict[str, str]:
    # Baseline defaults - these will be overridden by admin config if present
    # Force include core fields by default
    out: Dict[str, str] = {
        "full_name": "REQUIRED",
        "email": "REQUIRED",
        "phone": "REQUIRED",
        "college": "REQUIRED"
    }
    
    if isinstance(config, dict):
        for key, value in config.items():
            nk = normalize_profile_field_key(key)
            if not nk:
                continue
            state = str(value or "").strip().upper()
            if state not in ("REQUIRED", "OPTIONAL", "HIDDEN"):
                state = "OPTIONAL"
            # Apply admin override
            out[nk] = state
            
    return out


def compute_default_profile_config(profile_type: str) -> Dict[str, str]:
    defaults = dict(PROFILE_DEFAULTS_BASE)
    defaults.update(PROFILE_TYPE_DEFAULT_OVERRIDES.get(normalize_profile_type(profile_type), {}))
    return defaults
 
class UserProfileSchema(BaseModel):
    profile_type: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    years_of_experience: Optional[int] = None
    industry: Optional[str] = None
    organization_name: Optional[str] = None
    website_url: Optional[str] = None
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None

class ApplyRegistrationRequest(BaseModel):
    profile_data: Dict[str, Any]
    custom_answers: Dict[str, Any]
    team_action: Optional[str] = None
    team_payload: Optional[str] = None

async def fetch_legacy_profile(user_id: str) -> dict:
    """Helper to fetch profile from legacy users_col and learner_profiles."""
    try:
        user = await users_col.find_one({"user_id": str(user_id)})
        if not user:
            return {}
        
        full_name = user.get("full_name", "") or user.get("name", "")
        college = user.get("college", "") or user.get("institution", "")
        
        profile = {
            "user_id": str(user_id),
            "profile_type": user.get("profile_type", ""),
            "full_name": full_name,
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "location": user.get("location", ""),
            "gender": user.get("gender", ""),
            "dob": user.get("dob", ""),
            "college": college,
            "degree": user.get("degree", ""),
            "branch": user.get("branch", ""),
            "graduation_year": user.get("graduation_year") or user.get("endYear"),
            "cgpa": user.get("cgpa", ""),
            "company": user.get("company", ""),
            "job_title": user.get("job_title", ""),
            "years_of_experience": user.get("years_of_experience"),
            "industry": user.get("industry", ""),
            "organization_name": user.get("organization_name", ""),
            "website_url": user.get("website_url", ""),
            "resume_url": user.get("resume_url", ""),
            "linkedin_url": user.get("linkedin_url", ""),
            "github_url": user.get("github_url", ""),
            "portfolio_url": user.get("portfolio_url", ""),
            "skills": user.get("skills", []),
            "location": user.get("location", "")
        }
        
        # Fallback to learner_profiles for education history
        try:
            learner = await db["learner_profiles"].find_one({"user_id": str(user_id)})
            if learner:
                edu_list = learner.get("educationList", [])
                edu = edu_list[0] if isinstance(edu_list, list) and len(edu_list) > 0 else learner.get("education", {})
                if isinstance(edu, dict):
                    profile["degree"] = profile["degree"] or edu.get("degree", "")
                    profile["branch"] = profile["branch"] or edu.get("specialization", "")
                    profile["graduation_year"] = profile["graduation_year"] or edu.get("endYear") or edu.get("graduationYear")
                    profile["cgpa"] = profile["cgpa"] or edu.get("cgpa", "")
                    edu_institution = edu.get("institution", "")
                    if edu_institution and not profile["college"]:
                        profile["college"] = edu_institution
                
                profile["skills"] = profile["skills"] or learner.get("skills", [])
                profile["resume_url"] = profile["resume_url"] or learner.get("resume_url", "")
        except Exception:
            pass
            
        return profile
    except Exception as e:
        logger.warning(f"fetch_legacy_profile error: {e}")
        return {}

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL PROFILE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_global_profile(user: dict = Depends(get_auth_user)):
    """Fetch user's global profile with legacy database fallback."""
    profile = await user_profiles_col.find_one({"user_id": user["user_id"]})
    if not profile:
        profile = await fetch_legacy_profile(user["user_id"])
        # Seed user_profiles collection for this user
        if profile:
            profile["updated_at"] = datetime.now(timezone.utc)
            await user_profiles_col.update_one(
                {"user_id": user["user_id"]},
                {"$set": profile},
                upsert=True
            )
    
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    return profile

@router.put("/profile")
async def update_global_profile(data: UserProfileSchema, user: dict = Depends(get_auth_user)):
    """Create/update global profile and synchronize core fields with users and learners collections."""
    update_data = data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update global user profile
    await user_profiles_col.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    # Sync core fields to users collection to maintain standard integrations
    sync_users = {}
    if "full_name" in update_data:
        sync_users["full_name"] = update_data["full_name"]
        sync_users["name"] = update_data["full_name"]
    if "email" in update_data:
        sync_users["email"] = update_data["email"]
    if "phone" in update_data:
        sync_users["phone"] = update_data["phone"]
    if "location" in update_data:
        sync_users["location"] = update_data["location"]
    if "college" in update_data:
        sync_users["college"] = update_data["college"]
        sync_users["college_name"] = update_data["college"]
        sync_users["institution"] = update_data["college"]
    if "company" in update_data:
        sync_users["company"] = update_data["company"]
    if "job_title" in update_data:
        sync_users["job_title"] = update_data["job_title"]
    if "years_of_experience" in update_data:
        sync_users["years_of_experience"] = update_data["years_of_experience"]
    if "industry" in update_data:
        sync_users["industry"] = update_data["industry"]
    if "organization_name" in update_data:
        sync_users["organization_name"] = update_data["organization_name"]
    if "website_url" in update_data:
        sync_users["website_url"] = update_data["website_url"]
    if "gender" in update_data:
        sync_users["gender"] = update_data["gender"]
    if "skills" in update_data:
        sync_users["skills"] = update_data["skills"]
        
    if sync_users:
        await users_col.update_one(
            {"user_id": user["user_id"]},
            {"$set": sync_users}
        )
        
    # Sync core fields to learner_profiles collection
    try:
        learner_set = {}
        if "skills" in update_data:
            learner_set["skills"] = update_data["skills"]
        if "resume_url" in update_data:
            learner_set["resume_url"] = update_data["resume_url"]
            
        edu_set = {}
        if "college" in update_data:
            edu_set["institution"] = update_data["college"]
        if "degree" in update_data:
            edu_set["degree"] = update_data["degree"]
        if "branch" in update_data:
            edu_set["specialization"] = update_data["branch"]
        if "graduation_year" in update_data:
            edu_set["endYear"] = update_data["graduation_year"]
        if "cgpa" in update_data:
            edu_set["cgpa"] = update_data["cgpa"]
            
        if edu_set:
            learner_set["education"] = edu_set
            learner_set["educationList"] = [edu_set]
            
        if learner_set:
            await db["learner_profiles"].update_one(
                {"user_id": user["user_id"]},
                {"$set": learner_set},
                upsert=True
            )
    except Exception as e:
        logger.warning(f"Failed to sync learner profiles: {e}")
        
    return {"status": "success", "message": "Global profile updated successfully"}

# ─────────────────────────────────────────────────────────────────────────────
# FILE UPLOAD decpouled layer
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_registration_file(file: UploadFile = File(...), user: dict = Depends(get_auth_user)):
    """Decoupled asset upload layer for resumes and dynamic file custom answers."""
    try:
        file_ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".zip"}
        if file_ext not in allowed_exts:
            raise HTTPException(status_code=400, detail=f"File extension {file_ext} not allowed.")
            
        filename = f"{user['user_id']}_{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(REG_UPLOAD_DIR, filename)
        
        file_content = await file.read()
        if len(file_content) > 15 * 1024 * 1024:  # 15MB limit
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 15MB.")
            
        with open(filepath, "wb") as f:
            f.write(file_content)
            
        url = f"{BASE_URL}/uploads/registrations/{filename}"
        return {"status": "success", "url": url, "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# APPLICATION / REGISTRATION FLOW ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/form")
async def get_registration_form_config(event_id: str, user: dict = Depends(get_auth_user)):
    """Get the profile config and custom questions for the event registration form, pre-filled."""
    try:
        event_id = await resolve_event_id(event_id)
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id
        
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        legacy, new_profile, reg, participant = await asyncio.gather(
            fetch_legacy_profile(user["user_id"]),
            user_profiles_col.find_one({"user_id": user["user_id"]}),
            registrations_col.find_one({"event_id": str(event_id), "user_id": user["user_id"]}),
            participants_col.find_one({"event_id": str(event_id), "user_id": user["user_id"]}),
        )
        
        settings = event.get("registration_settings") or {}
        raw_profile_config = settings.get("profile_fields_config")
        profile_fields_config = normalize_profile_fields_config(raw_profile_config or {})
        
        # If no profile fields are configured at all (missing key), provide a sensible baseline
        if raw_profile_config is None:
            profile_fields_config = {
                "full_name": "REQUIRED",
                "email": "REQUIRED",
                "phone": "REQUIRED",
                "college": "REQUIRED"
            }
        
        profile = {**legacy, **(new_profile or {})}

        custom_questions = event.get("custom_questions") or []
            
        reg_status = reg.get("status", "NOT_REGISTERED") if reg else "NOT_REGISTERED"
        
        if reg_status == "NOT_REGISTERED" and participant:
            ps = (participant.get("status") or "").lower()
            if ps in ("shortlisted", "registered", "approved", "accepted"):
                reg_status = "REGISTERED"
                reg = participant
        
        # Cross-check: if registration says registered but participant was deleted,
        # reset to NOT_REGISTERED so the user can re-register
        if reg_status in ("REGISTERED", "APPROVED") and not participant:
            reg_status = "NOT_REGISTERED"
            reg = None

        if reg and reg.get("_id"):
            reg["_id"] = str(reg["_id"])
        if "_id" in profile:
            profile["_id"] = str(profile["_id"])
        
        # Get user role for conditional filtering
        user_role = user.get("profile_type", "STUDENT").upper()
        
        # Filter fields based on role
        # E.g., if professional, hide college/degree; if student, hide company/years_of_experience
        final_config = {}
        for field, state in profile_fields_config.items():
            if user_role == "PROFESSIONAL" and field in ["college", "degree", "branch", "graduation_year", "cgpa"]:
                final_config[field] = "HIDDEN"
            elif user_role == "STUDENT" and field in ["company", "job_title", "years_of_experience", "industry"]:
                final_config[field] = "HIDDEN"
            else:
                final_config[field] = state

        # Parse fields definitions to return to frontend
        allowed_prefill_fields = {"full_name", "email", "phone"}
        fields_definitions = []
        for field, status_str in final_config.items():
            if status_str != "HIDDEN":
                meta = DEFAULT_FIELDS_METADATA.get(field)
                if not meta:
                    continue
                fields_definitions.append({
                    "id": field,
                    "label": meta["label"],
                    "category": meta["category"],
                    "required": status_str == "REQUIRED",
                    "type": meta["type"],
                    "prefilled_value": profile.get(field, "") if field in allowed_prefill_fields else ""
                })
        
        # Safety net: any admin-configured non-HIDDEN field still missing
        # from fields_definitions gets injected (detectable via server log).
        fields_definitions_ids = {fd["id"] for fd in fields_definitions}
        for field, status_str in profile_fields_config.items():
            if status_str == "HIDDEN" or field in fields_definitions_ids:
                continue
            meta = DEFAULT_FIELDS_METADATA.get(field)
            if not meta:
                continue
            logger.warning("Safety net: field '%s' (%s) missing from fields_definitions, injecting now", field, status_str)
            fields_definitions.append({
                "id": field,
                "label": meta["label"],
                "category": meta["category"],
                "required": status_str == "REQUIRED",
                "type": meta["type"],
                "prefilled_value": profile.get(field, "") if field in allowed_prefill_fields else ""
            })
        
        return {
            "event_id": str(event_id),
            "event_title": event.get("title", ""),
            "profile_fields_config": profile_fields_config,
            "fields_definitions": fields_definitions,
            "custom_questions": custom_questions,
            "approval_mode": settings.get("approval_mode", "AUTO_APPROVE"),
            "status": reg_status,
            "registration": reg,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/{event_id}/eligibility")
async def check_event_eligibility(event_id: str, user: dict = Depends(get_auth_user)):
    """Return whether the authenticated user is eligible to register for the event and why."""
    try:
        event_id = await resolve_event_id(event_id)
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id

        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Reuse centralized validation logic in registration_service
        msg = await validate_event_restrictions(event, user.get("user_id"))
        if msg:
            return {"eligible": False, "reason": msg}
        return {"eligible": True, "reason": ""}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/{event_id}/eligible-recipients")
async def preview_eligible_recipients(event_id: str, limit: int = 50, user: dict = Depends(get_auth_user)):
    """Admin helper: return a sample list of eligible recipient users for this event and an estimated count.
    This is intentionally limited; for full sends use the messaging job APIs.
    """
    try:
        # Resolve event
        event_id = await resolve_event_id(event_id)
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id

        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Verify caller is institution owner of event
        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        if not inst_id or str(user.get("institution_id")) != inst_id:
            raise HTTPException(status_code=403, detail="You do not have permission to preview recipients for this event")

        # Scan users collection and apply validate_event_restrictions heuristics.
        # Limit scan to a reasonable cap to avoid long-running ops.
        cap = min(max(10, int(limit)), 500)
        samples = []
        eligible_count = 0
        cursor = users_col.find({})
        async for u in cursor:
            uid = str(u.get("user_id") or u.get("uid") or u.get("_id"))
            if not uid:
                continue
            msg = await validate_event_restrictions(event, uid)
            if not msg:
                eligible_count += 1
                if len(samples) < cap:
                    samples.append({"user_id": uid, "email": u.get("email"), "full_name": u.get("full_name") or u.get("name"), "college": u.get("college") or u.get("institution")})

        return {"status": "success", "estimated_eligible_count": eligible_count, "sample": samples}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events/{event_id}/announce-sample")
async def announce_sample(event_id: str, payload: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Admin helper: send a short announcement (subject+body) to a sample of eligible recipients (limited).
    This is meant for preview/testing only and will dispatch emails asynchronously.
    """
    try:
        subject = str(payload.get("subject") or "Announcement")
        body = str(payload.get("body") or "")
        limit = int(payload.get("limit") or 20)

        event_id = await resolve_event_id(event_id)
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id

        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        if not inst_id or str(user.get("institution_id")) != inst_id:
            raise HTTPException(status_code=403, detail="You do not have permission to send announcements for this event")

        # Collect a small sample of eligible recipients
        samples = []
        cursor = users_col.find({})
        async for u in cursor:
            uid = str(u.get("user_id") or u.get("uid") or u.get("_id"))
            if not uid:
                continue
            msg = await validate_event_restrictions(event, uid)
            if not msg and u.get("email"):
                samples.append({"user_id": uid, "email": u.get("email"), "name": u.get("full_name") or u.get("name")})
            if len(samples) >= limit:
                break

        # Dispatch emails asynchronously (fire-and-forget)
        sent = 0
        for s in samples:
            try:
                asyncio.create_task(send_notification_email(s["email"], subject, body))
                sent += 1
            except Exception:
                pass

        return {"status": "success", "queued": sent, "sample_size": len(samples)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events/{event_id}/announce")
async def announce_event(event_id: str, payload: dict = Body(...), user: dict = Depends(get_auth_user)):
    """Admin endpoint: create a queued announcement job that will enqueue eligible recipients.
    This returns immediately with a job id while enqueuing continues in background.
    """
    try:
        subject = str(payload.get("subject") or "Announcement")
        body = str(payload.get("body") or "")
        limit = payload.get("limit")

        event_id = await resolve_event_id(event_id)
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id

        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        if not inst_id or str(user.get("institution_id")) != inst_id:
            raise HTTPException(status_code=403, detail="You do not have permission to send announcements for this event")

        # Create background announcement job
        from services.announcement_service import create_announcement_job

        announcement_id = await create_announcement_job(event, subject, body, user, limit=limit)

        return {"status": "queued", "announcement_id": announcement_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/{event_id}/announcements")
async def list_announcements(event_id: str, user: dict = Depends(get_auth_user)):
    try:
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id

        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        if not inst_id or str(user.get("institution_id")) != inst_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view announcements for this event")

        cursor = announcements_col.find({"event_id": str(event.get("_id") or event.get("event_id"))}).sort("created_at", -1).limit(100)
        rows = []
        async for r in cursor:
            rows.append({
                "id": str(r.get("_id")),
                "subject": r.get("subject"),
                "status": r.get("status"),
                "estimated_recipients": r.get("estimated_recipients", 0),
                "created_at": r.get("created_at"),
            })

        return {"status": "success", "announcements": rows}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/{event_id}/announcements/{announcement_id}/audit")
async def announcement_audit(event_id: str, announcement_id: str, limit: int = 100, user: dict = Depends(get_auth_user)):
    try:
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id

        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        inst_id = str(event.get("institution_id") or event.get("createdBy") or "")
        if not inst_id or str(user.get("institution_id")) != inst_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view announcement audit for this event")

        cursor = announcement_audit_col.find({"announcement_id": announcement_id}).sort("created_at", -1).limit(min(1000, int(limit)))
        rows = []
        async for r in cursor:
            rows.append({
                "recipient": r.get("recipient"),
                "user_id": r.get("user_id"),
                "status": r.get("status"),
                "created_at": r.get("created_at"),
            })

        return {"status": "success", "audit": rows}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}/status")
async def get_user_registration_status(event_id: str, user: dict = Depends(get_auth_user)):
    """Rapid check of candidate application status for locking assessment stage UI overlays."""
    event_id = await resolve_event_id(event_id)
    reg = await registrations_col.find_one({"event_id": str(event_id), "user_id": user["user_id"]})
    if not reg:
        # Fallback check for legacy registrations stored with event_link_id (human-readable string)
        try:
            ev = await events_col.find_one({"_id": (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)})
            if ev and ev.get("event_id"):
                reg = await registrations_col.find_one({"event_id": str(ev["event_id"]), "user_id": user["user_id"]})
        except Exception as e:
            logger.warning(f"Handled exception at line 935: {e}")
            pass
            
    if not reg:
        return {"status": "NOT_REGISTERED"}
    return {"status": "REGISTERED", "registered_at": reg.get("registered_at")}

@router.post("/events/{event_id}/apply")
async def submit_event_registration(event_id: str, request: ApplyRegistrationRequest, user: dict = Depends(get_auth_user)):
    """
    Submits registration. Validates eligibility and required fields.
    Writes new profile fields back to global profiles.
    Syncs approved registrations immediately to participants collection to preserve legacy compatibility.
    """
    try:
        event_id = await resolve_event_id(event_id)
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id
        
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        settings = event.get("registration_settings") or {}
        profile_fields_config = normalize_profile_fields_config(settings.get("profile_fields_config") or {})

        # 0. STRICT DEADLINE ENFORCEMENT
        stages = event.get("stages", [])
        for stage in stages:
            if str(stage.get("type")).upper() == "REGISTRATION":
                # Check if registration stage deadline has passed using the core stage_access_control
                await check_stage_deadline(event_id=str(event_id), stage_name=stage.get("name"))
                break
        
        # 1. Validate required profile fields
        profile_data = request.profile_data
        is_professional = normalize_profile_type(profile_data.get("profile_type")) == "professional"
        
        for field, status_str in profile_fields_config.items():
            meta = DEFAULT_FIELDS_METADATA.get(field)
            if status_str == "REQUIRED":
                if not profile_data.get(field):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Profile field '{meta['label'] if meta else field}' is required for this event."
                    )
                
        # 2. Validate custom questions
        custom_questions = event.get("custom_questions") or []
        custom_answers = request.custom_answers
        for q in custom_questions:
            q_id = q.get("id")
            if q.get("required") and not custom_answers.get(q_id):
                raise HTTPException(
                    status_code=400,
                    detail=f"Question '{q.get('label')}' is required."
                )
                
        # 3. Enforce Eligibility Rules
        eligibility = event.get("eligibility_rules") or {}
        # Grad years restriction
        allowed_years = eligibility.get("graduation_years") or []
        if allowed_years and not is_professional:
            user_grad_year = profile_data.get("graduation_year")
            if not user_grad_year or int(user_grad_year) not in [int(y) for y in allowed_years]:
                raise HTTPException(
                    status_code=403,
                    detail=f"You are not eligible to register. This opportunity is restricted to graduation years: {', '.join(map(str, allowed_years))}."
                )
        # College Restriction
        college_rules = eligibility.get("college_restrictions") or []
        if college_rules:
            user_college = str(profile_data.get("college") or "").strip().lower()
            college_allowed = False
            for rule in college_rules:
                if rule.strip().lower() in user_college or user_college in rule.strip().lower():
                    college_allowed = True
                    break
            if not college_allowed:
                raise HTTPException(
                    status_code=403,
                    detail=f"Only applicants from specific colleges are permitted to register for this event."
                )
                
        # 4. Check for existing registration
        existing_reg = await registrations_col.find_one({"event_id": str(event_id), "user_id": user["user_id"]})
        is_update = existing_reg is not None
        existing_status = str(existing_reg.get("status") or "").strip().upper() if existing_reg else ""
        existing_participant = await participants_col.find_one({"event_id": str(event_id), "user_id": user["user_id"]})
        existing_participant_status = str(existing_participant.get("status") or "").strip().lower() if existing_participant else ""
        existing_current_stage = existing_participant.get("current_stage") if existing_participant else None
            
        # 5. Write back newly filled profile fields to global profiles dynamically
        updated_profile = {k: v for k, v in profile_data.items() if v is not None}
        updated_profile["updated_at"] = datetime.now(timezone.utc)
        await user_profiles_col.update_one(
            {"user_id": user["user_id"]},
            {"$set": updated_profile},
            upsert=True
        )
        
        # Sync profile fields back to base databases (users, learners)
        # Simply update profile model to trigger full sync
        try:
            profile_model = UserProfileSchema(**updated_profile)
            await update_global_profile(profile_model, user)
        except Exception as e:
            logger.warning(f"Error syncing profile back-end: {e}")
            
        # 6. Create or update registration record
        # CHECK AUTO-APPROVE
        first_stage_config = stages[0] if stages else {}
        is_auto_approve = first_stage_config.get("auto_approve", False)
        status_val = "APPROVED" if is_auto_approve else "PENDING_APPROVAL"
        if is_update and existing_status:
            status_val = existing_status

        registered_at = existing_reg.get("registered_at") if is_update else None
        if not registered_at:
            registered_at = datetime.now(timezone.utc)
        
        reg_doc = {
            "event_id": str(event_id),
            "user_id": user["user_id"],
            "name": profile_data.get("full_name") or user.get("full_name") or user.get("name") or "Anonymous Participant",
            "email": profile_data.get("email") or user.get("email") or "",
            "institution_id": str(event.get("institution_id") or event.get("createdBy") or ""),
            "status": status_val,
            "profile_snapshot": profile_data,
            "custom_answers": custom_answers,
            "registered_at": registered_at,
            "updated_at": datetime.now(timezone.utc)
        }
        if is_update and existing_reg and existing_reg.get("_id"):
            await registrations_col.update_one(
                {"_id": existing_reg["_id"]},
                {"$set": reg_doc}
            )
        else:
            insert_result = await registrations_col.insert_one(reg_doc)
            reg_doc["_id"] = insert_result.inserted_id
        
        # 7. Sync registration with participants collection to preserve legacy compatibility
        first_stage = None
        stages = event.get("stages") or []
        if stages:
            first_stage = stages[0].get("name") or stages[0].get("type")
            
        participant_status = existing_participant_status or ("registered" if is_auto_approve else "pending")
        if existing_status in {"APPROVED", "PENDING_APPROVAL", "REJECTED", "WAITLISTED"} and not existing_participant_status:
            participant_status = {
                "APPROVED": "registered",
                "PENDING_APPROVAL": "pending",
                "REJECTED": "rejected",
                "WAITLISTED": "waitlisted",
            }.get(existing_status, participant_status)
        
        participant_doc = {
            "event_id": str(event_id),
            "user_id": user["user_id"],
            "institution_id": str(event.get("institution_id") or event.get("createdBy") or ""),
            "name": profile_data.get("full_name") or user.get("full_name") or user.get("name") or "Anonymous Participant",
            "email": profile_data.get("email") or user.get("email") or "",
            "current_stage": existing_current_stage or first_stage,
            "registration_data": {**profile_data, **custom_answers},
            "status": participant_status,
            "registered_at": registered_at,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await participants_col.update_one(
            {"event_id": str(event_id), "user_id": user["user_id"]},
            {"$set": participant_doc},
            upsert=True
        )
        
        # 8. Handle Bundled Team Creation or Joining
        team_invite_code = None
        final_team_id = None
        final_team_name = None
        
        if request.team_action and request.team_payload:
            from services.team_service import create_team, create_solo_team, generate_invite_code, join_team_with_code
            
            action = request.team_action.upper()
            if action == "INDIVIDUAL":
                solo_resp = await create_solo_team(
                    event_id=str(event_id),
                    user_id=user["user_id"]
                )
                if solo_resp.get("status") == "success":
                    final_team_id = solo_resp["team"]["_id"]
                    final_team_name = solo_resp["team"]["team_name"]
            elif action == "CREATE":
                team_resp = await create_team(
                    event_id=str(event_id),
                    user_id=user["user_id"],
                    team_name=request.team_payload
                )
                if team_resp.get("status") == "success":
                    team_id = team_resp["team"]["_id"]
                    final_team_id = team_id
                    final_team_name = team_resp["team"]["team_name"]
                    code_resp = await generate_invite_code(team_id)
                    team_invite_code = code_resp.get("invite_code")
            elif action == "JOIN":
                join_resp = await join_team_with_code(
                    event_id=str(event_id),
                    user_id=user["user_id"],
                    invite_code=request.team_payload
                )
                if join_resp.get("status") == "success":
                    final_team_id = join_resp["team"]["_id"]
                    final_team_name = join_resp["team"]["team_name"]
                    
        if final_team_id and final_team_name:
            await registrations_col.update_one(
                {"_id": reg_doc["_id"]},
                {"$set": {"team_id": final_team_id, "team_name": final_team_name}}
            )

        return {
            "status": "success",
            "message": "Registration submitted successfully.",
            "reg_status": "REGISTERED",
            "team_invite_code": team_invite_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# INSTITUTION ADMIN REGISTRATION DASHBOARD ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/participants")
async def list_registrations_admin(
    event_id: str,
    page: int = 1,
    limit: int = 15,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_auth_user)
):
    """
    Host Admin Endpoint: Retrieve event registrants with pagination, searching,
    state filtering, and premium statistical aggregates.
    """
    try:
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id
            
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Verify host owns event
        if str(event.get("institution_id")) != str(user.get("institution_id")):
            raise HTTPException(status_code=403, detail="You do not have permission to view this event's registrations.")
            
        # Build registration filters
        query = {"event_id": str(event_id)}
        if status_filter:
            query["status"] = status_filter.upper()
            
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"profile_snapshot.full_name": search_regex},
                {"profile_snapshot.email": search_regex},
                {"profile_snapshot.college": search_regex}
            ]
            
        # Stats summary aggregations
        total_applicants = await registrations_col.count_documents({"event_id": str(event_id)})
        approved_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "APPROVED"})
        pending_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "PENDING_APPROVAL"})
        rejected_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "REJECTED"})
        waitlisted_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "WAITLISTED"})
        
        # Paginated results
        skip = (page - 1) * limit
        cursor = registrations_col.find(query).sort("registered_at", -1).skip(skip).limit(limit)
        registrations = []
        async for r in cursor:
            r["_id"] = str(r["_id"])
            registrations.append(r)
            
        return {
            "status": "success",
            "stats": {
                "total": total_applicants,
                "approved": approved_count,
                "pending": pending_count,
                "rejected": rejected_count,
                "waitlisted": waitlisted_count
            },
            "registrations": registrations,
            "page": page,
            "limit": limit,
            "total_pages": max(1, (total_applicants + limit - 1) // limit)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/events/{event_id}/participants/{registration_id}/status")
async def update_registration_status_admin(
    event_id: str,
    registration_id: str,
    status_update: str = Body(embed=True),
    user: dict = Depends(get_auth_user)
):
    """
    Host Admin Endpoint: Approve, reject, or waitlist candidates.
    Forces status propagation down to the legacy participants table to unlock/lock timeline assessment phases.
    """
    try:
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id
            
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Verify host owns event
        if str(event.get("institution_id")) != str(user.get("institution_id")):
            raise HTTPException(status_code=403, detail="You do not have permission to modify registrations.")
            
        new_status = status_update.upper()
        allowed_statuses = {"APPROVED", "REJECTED", "WAITLISTED", "PENDING_APPROVAL"}
        if new_status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status value. Must be one of: {allowed_statuses}")
            
        try:
            reg_obj_id = (ObjectId(registration_id) if ObjectId.is_valid(registration_id) else registration_id)
        except Exception:
            reg_obj_id = registration_id
            
        reg = await registrations_col.find_one({"_id": reg_obj_id})
        if not reg:
            raise HTTPException(status_code=404, detail="Registration application not found.")
            
        # Update registration status
        await registrations_col.update_one(
            {"_id": reg_obj_id},
            {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Propagate changes to participants collection to keep stages in sync
        # If APPROVED, candidate becomes 'registered' or 'shortlisted' (enabling down-stream stage entries)
        # If REJECTED, status is set to 'rejected'
        # If WAITLISTED, status is set to 'pending' or 'waitlisted'
        participant_status = "registered"
        if new_status == "APPROVED":
            participant_status = "registered"
        elif new_status == "REJECTED":
            participant_status = "rejected"
        elif new_status == "WAITLISTED":
            participant_status = "pending"
            
        await participants_col.update_one(
            {"event_id": str(event_id), "user_id": reg["user_id"]},
            {"$set": {"status": participant_status, "updated_at": datetime.now(timezone.utc)}}
        )

        return {"status": "success", "message": f"Candidate status updated to {new_status} and propagated."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}/roster")
async def get_event_roster(
    event_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    user: dict = Depends(get_auth_user)
):
    """
    Host Admin Endpoint: Returns a grouped roster of solos and teams for easy approval.
    """
    try:
        try:
            ev_id = (ObjectId(event_id) if ObjectId.is_valid(event_id) else event_id)
        except Exception:
            ev_id = event_id
            
        event = await events_col.find_one({"_id": ev_id}) if isinstance(ev_id, ObjectId) else await events_col.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        if str(event.get("institution_id")) != str(user.get("institution_id")):
            raise HTTPException(status_code=403, detail="Permission denied")
            
        query = {"event_id": str(event_id)}
        if status_filter:
            query["status"] = status_filter.upper()
            
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"profile_snapshot.full_name": search_regex},
                {"profile_snapshot.email": search_regex},
                {"profile_snapshot.college": search_regex},
                {"team_name": search_regex}
            ]
            
        cursor = registrations_col.find(query).sort("registered_at", -1)
        email_delivery_logs_col = db["email_delivery_logs"]
        
        solos = []
        teams_map = {}
        
        async for r in cursor:
            r["_id"] = str(r["_id"])
            
            # Auto-healing: If approved but notified_at is None, check actual email logs
            if r.get("status") == "APPROVED" and not r.get("notified_at"):
                prof = r.get("profile_snapshot") or {}
                email = r.get("email") or prof.get("email")
                if email:
                    log_query = {
                        "recipient": email.strip().lower(),
                        "status": "sent",
                        "$or": [
                            {"metadata.event_id": str(event_id)},
                            {"subject": {"$regex": event.get("title", ""), "$options": "i"}}
                        ]
                    }
                    log_doc = await email_delivery_logs_col.find_one(log_query)
                    if log_doc:
                        notified_time = log_doc.get("created_at") or datetime.now(timezone.utc)
                        r["notified_at"] = notified_time
                        # Auto-heal the registrations record in db
                        try:
                            await registrations_col.update_one(
                                {"_id": ObjectId(r["_id"])},
                                {"$set": {"notified_at": notified_time}}
                            )
                        except Exception:
                            pass
            
            team_id = r.get("team_id")
            
            if team_id:
                if team_id not in teams_map:
                    teams_map[team_id] = {
                        "team_id": team_id,
                        "team_name": r.get("team_name") or "Unknown Team",
                        "status": r.get("status"), # use first member's status as team status proxy
                        "members": []
                    }
                teams_map[team_id]["members"].append(r)
            else:
                solos.append(r)
                
        total_applicants = await registrations_col.count_documents({"event_id": str(event_id)})
        approved_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "APPROVED"})
        pending_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "PENDING_APPROVAL"})
        rejected_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "REJECTED"})
        waitlisted_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "WAITLISTED"})
        
        # New: count pending vs sent notifications
        notified_count = await registrations_col.count_documents({"event_id": str(event_id), "status": "APPROVED", "notified_at": {"$ne": None}})
        pending_notification_count = approved_count - notified_count
        
        return {
            "status": "success",
            "stats": {
                "total": total_applicants,
                "approved": approved_count,
                "pending": pending_count,
                "rejected": rejected_count,
                "waitlisted": waitlisted_count,
                "notified_approved": notified_count,
                "pending_notification": pending_notification_count
            },
            "roster": {
                "solos": solos,
                "teams": list(teams_map.values())
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/events/{event_id}/participants/{registration_id}/mark-notified")
async def mark_participant_notified(
    event_id: str,
    registration_id: str,
    user: dict = Depends(get_auth_user)
):
    """Admin Endpoint: Manually mark a specific registration as notified."""
    from datetime import datetime, timezone
    # 1. Update the record
    result = await registrations_col.update_one(
        {"_id": (ObjectId(registration_id) if ObjectId.is_valid(registration_id) else registration_id), "event_id": event_id},
        {"$set": {"notified_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found or already marked.")
    return {"status": "success", "message": "Participant marked as notified."}

from pydantic import BaseModel
from typing import List, Optional

class NotifyApprovedRequest(BaseModel):
    registration_ids: Optional[List[str]] = None

@router.post("/events/{event_id}/notify-approved")
async def notify_approved_participants(
    event_id: str, 
    request: NotifyApprovedRequest, 
    user: dict = Depends(get_auth_user)
):
    """Send email notification to APPROVED participants about next stage (optionally specific ones)."""
    try:
        from auth_institution import assert_institution_owns_event

        event = await assert_institution_owns_event(event_id, user)
        event_id = await resolve_event_id(event_id)

        from services.email_queue_service import enqueue_email
        from services.email_template_service import get_active_template, render_template

        frontend_url = os.getenv("FRONTEND_URL", "")
        app_logo_url = f"{frontend_url}/images/studlyf.png" if frontend_url else ""
        org_name = event.get("organization_name") or event.get("institution_name") or "Organization"
        event_title = event.get("title", "Event")
        
        # Find next upcoming stage
        now = datetime.now(timezone.utc)
        upcoming = []
        for stg in (event.get("stages") or []):
            if not isinstance(stg, dict):
                continue
            if str(stg.get("type", "")).upper() == "REGISTRATION":
                continue
            s = stg.get("start_date") or stg.get("startDate") or ""
            if s:
                try:
                    sd = datetime.fromisoformat(s)
                    if sd.tzinfo is None:
                        sd = sd.replace(tzinfo=timezone.utc)
                    upcoming.append((sd, stg.get("name", ""), s))
                except Exception:
                    pass
        upcoming.sort(key=lambda x: x[0])
        next_stage_name = upcoming[0][1] if upcoming else ""
        next_stage_active = now >= upcoming[0][0] if upcoming else False

        event_id_variants = list(dict.fromkeys([
            str(event_id),
            str(event.get("_id", "")),
            str(event.get("event_id", "")),
        ]))
        event_id_variants = [eid for eid in event_id_variants if eid]

        query = {"event_id": {"$in": event_id_variants}, "status": "APPROVED"}
        if request.registration_ids:
            query["_id"] = {"$in": [ObjectId(rid) for rid in request.registration_ids]}
        else:
            query["notified_at"] = None

        approved = await registrations_col.find(query).to_list(length=50000)

        sent = 0
        errors = []
        now_notified = datetime.now(timezone.utc)
        
        for reg in approved:
            try:
                prof = reg.get("profile_snapshot") or {}
                email = prof.get("email", "")
                if not email:
                    continue
                p_name = prof.get("full_name", "Participant")

                if next_stage_name and next_stage_active:
                    msg = f"Your application for <strong>{event_title}</strong> has been approved. You have been shortlisted for <strong>{next_stage_name}</strong> which is now <strong>active</strong>. Please proceed to participate."
                elif next_stage_name:
                    msg = f"Your application for <strong>{event_title}</strong> has been approved. The next stage <strong>{next_stage_name}</strong> will open shortly. You will be notified when it is ready."
                else:
                    msg = f"Your application for <strong>{event_title}</strong> has been approved. You can now participate in the event."

                subj = f"Approved — {event_title}"
                logo_html = f'<img src="{app_logo_url}" alt="Studlyf" style="max-height:32px;margin-bottom:24px;" />' if app_logo_url else ""
                body_html = f"""<div style="font-family: 'Poppins', sans-serif, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0 24px;">
                    {logo_html}
                    <div style="background: #f8f7ff; border-radius: 16px; padding: 32px; border: 1px solid #e8e5ff;">
                        <p style="font-size: 13px; color: #6C3BFF; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Approved</p>
                        <p style="font-size: 20px; color: #0f172a; font-weight: 700; margin: 0 0 16px 0;">Hi {p_name},</p>
                        <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 20px 0;">{msg}</p>
                        <table style="width:100%;">
                            <tr>
                                <td style="padding: 12px 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                                    <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Event</p>
                                    <p style="font-size: 15px; color: #0f172a; font-weight: 600; margin: 0;">{event_title}</p>
                                </td>
                            </tr>
                        </table>
                        <a href="{frontend_url}/events/{event_id}" style="display: block; text-align: center; padding: 14px 28px; background-color: #6C3BFF; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; margin-top: 20px;">Go to Event</a>
                    </div>
                    <div style="text-align: center; padding: 24px 0 0 0;">
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent by <strong style="color: #64748b;">Studlyf</strong> on behalf of {org_name}</p>
                    </div>
                </div>"""

                await enqueue_email(email, subj, body_html, idempotency_key=f"notify_approved_{reg['_id']}")
                
                # Mark as notified
                await registrations_col.update_one(
                    {"_id": reg["_id"]},
                    {"$set": {"notified_at": now_notified}}
                )
                
                sent += 1
            except Exception as e:
                errors.append({"registration_id": str(reg.get("_id")), "error": str(e)})

        return {"status": "success", "sent": sent, "errors": errors}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
