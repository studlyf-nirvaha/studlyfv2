"""
Registration Service - Auto-fill user profile data and merge with event-specific fields
Implements Unstop-like registration with pre-filled profile data
"""

from db import db, users_col, participants_col, events_col, submission_data_col, opportunities_col
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import re
import json

def _ensure_list(val):
    """Normalize a field value to a list, handling JSON-encoded strings."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        # Try JSON decode for array-like strings
        if val.startswith("[") and val.endswith("]"):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
        return [val]
    return [str(val)]

async def validate_event_restrictions(
    event: Dict[str, Any],
    user_id: str
) -> Optional[str]:
    """
    Validate user against event restrictions (candidateTypes, college, gender).
    Uses the same profile data source as the registration form auto-fill.
    Returns an error message string if blocked, or None if allowed.
    """
    try:
        user = await users_col.find_one({"user_id": str(user_id)})
        if not user:
            return "User not found"
        user_profile = await get_user_profile_data(user_id, user=user)

        # --- participationType is NOT checked here (affects submission/team, not registration) ---

        # --- candidateTypes ---
        candidate_types = _ensure_list(event.get("candidateTypes"))
        if candidate_types:
            allowed = [c.lower().strip() for c in candidate_types]
            if "everyone can apply" not in allowed:
                user_college = str(user_profile.get("college") or user.get("college") or user.get("institution") or "").strip()
                user_company = str(user_profile.get("institution") or user.get("company") or user.get("organization") or "").strip()
                user_role = str(user.get("role") or "").lower().strip()

                # Build heuristics — use get_user_profile_data for consistency with form auto-fill
                profile_type = str(user_profile.get("profile_type") or "").lower().strip()
                is_college_student = (bool(user_college) or profile_type == "student") and not bool(user_company) and profile_type != "fresher"
                is_fresher = profile_type == "fresher"
                is_professional = bool(user_company) or user_role in ("professional", "institution", "alumni")
                is_school_student = "school" in user_college.lower() if user_college else False

                matched = False
                for typ in allowed:
                    if "college student" in typ and is_college_student:
                        matched = True
                        break
                    if "fresher" in typ and is_fresher:
                        matched = True
                        break
                    if "professional" in typ and is_professional:
                        matched = True
                        break
                    if "school student" in typ and is_school_student:
                        matched = True
                        break
                    if "everyone" in typ:
                        matched = True
                        break

                if not matched and not any("everyone" in t for t in allowed):
                    return "You are not eligible for this event based on the candidate type restrictions. Only the following types can register: " + ", ".join(allowed)

        # --- College / Organization restriction ---
        eligible_orgs = _ensure_list(event.get("eligibleOrganizations"))
        if eligible_orgs:
            # "Allow All" means no restriction
            orgs_clean = [o.lower().strip() for o in eligible_orgs if o]
            if "allow all" not in orgs_clean:
                user_college = str(user.get("college") or user.get("institution") or "").strip().lower()
                if user_college:
                    matched_org = any(org in user_college or user_college in org for org in orgs_clean)
                    if not matched_org:
                        return f"Only applicants from specific colleges/organizations can register for this event."
        else:
            legacy_restriction = event.get("collegeRestriction")
            if legacy_restriction and str(legacy_restriction).lower() not in ("", "everyone can apply", "everyone"):
                user_college = str(user.get("college") or user.get("institution") or "").strip().lower()
                if not user_college or legacy_restriction.lower() not in user_college:
                    pass  # Legacy field is vague; we don't strictly block on it

        # --- Gender restriction ---
        eligible_genders = _ensure_list(event.get("eligibleGenders"))
        if eligible_genders:
            # "Allow All" means no restriction
            genders_clean = [g.lower().strip() for g in eligible_genders if g]
            if "allow all" not in genders_clean:
                user_gender = str(user.get("gender") or "").strip().lower()
                if user_gender:
                    matched_gender = any(g == user_gender for g in genders_clean)
                    if not matched_gender:
                        allowed = [g for g in eligible_genders if g]
                        return f"This event is restricted to: {', '.join(allowed)}"
        else:
            legacy_gender = event.get("genderRestriction")
            if legacy_gender and str(legacy_gender).lower() not in ("", "everyone can apply", "everyone", "allow all"):
                user_gender = str(user.get("gender") or "").strip().lower()
                if user_gender:
                    allowed = [g.strip().lower() for g in str(legacy_gender).split(",")]
                    if user_gender not in allowed:
                        return f"This event is restricted to: {legacy_gender}"

        return None
    except Exception as e:
        print(f"[WARNING] validate_event_restrictions error: {e}")
        return None  # Don't block on validation errors — fail open

async def get_user_profile_data(user_id: str, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Fetch user profile data (name, email, college, education, etc.) for auto-fill.
    Merges base user fields with extended learner profile (education history)."""
    try:
        if user is None:
            user = await users_col.find_one({"user_id": str(user_id)})
        if not user:
            return {}

        full_name = user.get("full_name", "") or user.get("name", "")
        first_name = full_name.split(" ")[0].lower().strip() if full_name else ""

        college_raw = user.get("college", "") or user.get("institution", "") or user.get("college_name", "") or user.get("university", "") or user.get("education", "")
        # Guard: if the "college" value is actually the user's name, treat as empty
        if college_raw.lower().strip() == full_name.lower().strip() or college_raw.lower().strip() == first_name:
            college_raw = ""
        
        profile_data = {
             "full_name": full_name,
             "name": user.get("name", "") or full_name,
             "email": user.get("email", ""),
             "phone": user.get("phone", ""),
             "college": college_raw,
             "institution": user.get("institution", "") or user.get("college", "") or user.get("college_name", "") or user.get("company", "") or user.get("organization", ""),
             "gender": user.get("gender", ""),
             "skills": user.get("skills", []),
             "profile_type": user.get("profile_type", ""),
         }

        # Merge education from learner_profiles (extended profile)
        try:
            learner = await db["learner_profiles"].find_one({"user_id": str(user_id)})
            if learner:
                if not profile_data["profile_type"]:
                    profile_data["profile_type"] = learner.get("userType", "")
                edu_list = learner.get("educationList", [])
                if isinstance(edu_list, list) and len(edu_list) > 0:
                    edu = edu_list[0]
                else:
                    edu = learner.get("education", {})
                if isinstance(edu, dict):
                    profile_data["degree"] = edu.get("degree", "")
                    profile_data["specialization"] = edu.get("specialization", "")
                    profile_data["startYear"] = str(edu.get("startYear", ""))
                    profile_data["endYear"] = str(edu.get("endYear", ""))
                    profile_data["cgpa"] = str(edu.get("cgpa", ""))
                    # Also use education institution as college fallback
                    edu_institution = edu.get("institution", "")
                    if edu_institution and not profile_data["college"]:
                        profile_data["college"] = edu_institution
                        profile_data["institution"] = edu_institution
        except Exception:
            pass
        
        return profile_data
    except Exception as e:
        print(f"[ERROR] get_user_profile_data: {e}")
        return {}

async def classify_registration_fields(
    fields: List[Dict[str, Any]],
    user_profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Classify registration fields into:
    - prefilled: Fields that can be auto-filled from user profile
    - custom: Fields specific to this event that need user input
    
    Returns a mapping with field classifications and prefilled values.
    """
    prefill_mapping = {
        "name": ["full name", "name", "your name", "student name", "participant name"],
        "email": ["email", "email address", "your email"],
        "phone": ["phone", "phone number", "mobile", "contact number", "phone no"],
        "college": ["college", "university", "institution", "school", "institution name", "college name"],
        "gender": ["gender", "sex", "choose your gender"],
        "skills": ["skills", "technical skills", "expertise", "your skills"],
        "degree": ["degree", "qualification", "course", "branch", "major", "program"],
        "specialization": ["specialization", "stream", "field of study", "discipline", "focus area", "concentration"],
        "cgpa": ["cgpa", "gpa", "grade", "percentage", "marks", "score"],
        "startYear": ["start year", "year of joining", "batch start", "admission year", "enrollment year"],
        "endYear": ["end year", "graduation year", "year of passing", "passout year", "batch end", "completion year"],
    }
    
    classified = {
        "prefilled": [],
        "custom": [],
        "prefilled_values": {}
    }
    
    for field in fields:
        field_label = (field.get("label", "") or "").lower().strip()
        field_type = (field.get("type", "") or "").lower().strip()
        field_id = field.get("id", "")
        
        # Check if this field can be prefilled
        is_prefillable = False
        prefill_key = None
        
        for profile_key, keywords in prefill_mapping.items():
            if any(keyword in field_label for keyword in keywords):
                is_prefillable = True
                prefill_key = profile_key
                break
        
        field_info = {
            "id": field_id,
            "label": field.get("label", ""),
            "type": field_type,
            "required": field.get("required", False),
            "hint": field.get("hint", ""),
            "options": field.get("options", []),
        }
        
        if is_prefillable and prefill_key:
            field_info["_profile_key"] = prefill_key
            if user_profile.get(prefill_key):
                field_info["prefilled"] = True
                field_info["prefilled_value"] = user_profile.get(prefill_key)
                classified["prefilled"].append(field_info)
                classified["prefilled_values"][field_id] = user_profile.get(prefill_key)
            else:
                field_info["prefilled"] = False
                classified["custom"].append(field_info)
        else:
            # This is custom/event-specific
            field_info["_profile_key"] = ""
            field_info["prefilled"] = False
            classified["custom"].append(field_info)
    
    return classified

async def merge_registration_data(
    user_id: str,
    event_id: str,
    registration_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Merge user profile data with registration form data.
    Adds prefilled profile data to the registration automatically.
    
    Returns the complete registration data with both prefilled and custom fields.
    """
    try:
        # Get user profile
        user_profile = await get_user_profile_data(user_id)
        
        # Get event to check registration fields
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event:
            return {"error": "Event not found"}
        
        registration_fields = event.get("registrationFields", [])
        
        # Classify fields
        field_classification = await classify_registration_fields(
            registration_fields,
            user_profile
        )
        
        # Build complete registration data.
        # User's submitted answers take priority over profile defaults.
        merged_data = {
            **field_classification["prefilled_values"],  # Start with profile defaults
            **registration_data,  # User's answers override
        }
        
        # Extract name and email for participant record
        name = merged_data.get("name") or merged_data.get("full_name") or user_profile.get("full_name") or "Anonymous"
        email = merged_data.get("email") or user_profile.get("email") or "unknown@participant.local"
        
        return {
            "status": "success",
            "merged_data": merged_data,
            "prefilled_count": len(field_classification["prefilled"]),
            "custom_count": len(field_classification["custom"]),
            "participant_name": name,
            "participant_email": email,
            "user_profile": user_profile,
        }
    except Exception as e:
        print(f"[ERROR] merge_registration_data: {e}")
        return {"error": str(e)}

async def complete_registration(
    event_id: str,
    user_id: str,
    registration_data: Dict[str, Any],
    institution_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Complete event registration with auto-filled profile data.
    Creates/updates participant record with merged data.
    """
    try:
        # Merge profile data with registration data
        merge_result = await merge_registration_data(user_id, event_id, registration_data)
        
        if "error" in merge_result:
            return merge_result
        
        merged_data = merge_result["merged_data"]
        name = merge_result["participant_name"]
        email = merge_result["participant_email"]
        
        # Get event info
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event:
            return {"error": "Event not found"}

        # Enforce event eligibility restrictions (candidateTypes, college, gender)
        restriction_error = await validate_event_restrictions(event, user_id)
        if restriction_error:
            return {"error": restriction_error, "status": "restricted"}

        # Determine first stage from event stages to set as current_stage
        event_stages = event.get("stages", [])
        first_stage_name = None
        if event_stages and isinstance(event_stages, list) and len(event_stages) > 0:
            first_stage = event_stages[0]
            first_stage_name = first_stage.get("name") or first_stage.get("type")

        # Create/update participant
        participant_doc = {
            "event_id": str(event_id),
            "user_id": str(user_id),
            "institution_id": institution_id or event.get("createdBy") or event.get("institution_id"),
            "name": name,
            "email": email,
            "current_stage": first_stage_name,
            "registration_data": merged_data,
            "registration_fields_filled": registration_data,
            "prefilled_fields_used": merge_result["prefilled_count"],
            "status": "registered",
            "registered_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        
        result = await participants_col.update_one(
            {"event_id": str(event_id), "user_id": str(user_id)},
            {"$set": participant_doc},
            upsert=True
        )
        
        # Store registration submission in submission_data for tracking
        actual_stage_name = first_stage_name or event.get("title", "registration")
        await submission_data_col.update_one(
            {
                "event_id": str(event_id),
                "user_id": str(user_id),
                "stage_id": "registration",
            },
            {
                "$set": {
                    "event_id": str(event_id),
                    "user_id": str(user_id),
                    "stage_id": "registration",
                    "stage_name": actual_stage_name,
                    "data": merged_data,
                    "submitted_at": datetime.now(timezone.utc),
                    "status": "submitted",
                }
            },
            upsert=True
        )
        
        # Increment applicantsCount on the linked opportunity, if any
        try:
            opp = await opportunities_col.find_one({"event_link_id": str(event_id)})
            if opp:
                await opportunities_col.update_one(
                    {"_id": opp["_id"]},
                    {"$inc": {"applicantsCount": 1}}
                )
        except Exception as e:
            print(f"[WARNING] Could not increment applicantsCount for event {event_id}: {e}")

        return {
            "status": "success",
            "message": "Registration completed successfully with auto-filled profile data",
            "participant_id": str(result.upserted_id) if result.upserted_id else "updated",
            "name": name,
            "email": email,
            "prefilled_fields": merge_result["prefilled_count"],
            "custom_fields": merge_result["custom_count"],
        }
    
    except Exception as e:
        print(f"[ERROR] complete_registration: {e}")
        return {"error": str(e), "status": "error"}

# Core profile keys that must ALWAYS be collected in registration (like Unstop).
CORE_REGISTRATION_KEYS = [
    "name", "email", "phone", "college",
    "degree", "specialization", "startYear", "endYear", "cgpa",
]

# Default field definitions for core keys (used when admin hasn't configured a matching field).
DEFAULT_FIELD_DEFS = {
    "name":           {"id": "full_name",      "label": "Full Name",         "type": "text",   "required": True},
    "email":          {"id": "email",           "label": "Email",             "type": "text",   "required": True},
    "phone":          {"id": "phone",           "label": "Phone Number",      "type": "text",   "required": True},
    "college":        {"id": "college",         "label": "College Name",      "type": "text",   "required": True},
    "degree":         {"id": "degree",          "label": "Degree",            "type": "text",   "required": False},
    "specialization": {"id": "specialization",  "label": "Specialization",    "type": "text",   "required": False},
    "startYear":      {"id": "startYear",       "label": "Start Year",        "type": "number", "required": False},
    "endYear":        {"id": "endYear",         "label": "Graduation Year",   "type": "number", "required": False},
    "cgpa":           {"id": "cgpa",            "label": "CGPA / Percentage", "type": "text",   "required": False},
}

def _ensure_core_fields(
    classification: Dict[str, Any],
    user_profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    After classify_registration_fields, inject any missing core fields
    so the form always shows name, email, phone, college, education.
    Already-present fields (prefilled or custom) are kept as-is.
    """
    existing_profile_keys = set()
    for f in classification.get("prefilled", []):
        existing_profile_keys.add(f.get("_profile_key", ""))
    for f in classification.get("custom", []):
        existing_profile_keys.add(f.get("_profile_key", ""))
    
    for key in CORE_REGISTRATION_KEYS:
        if key not in existing_profile_keys:
            default = DEFAULT_FIELD_DEFS.get(key)
            if not default:
                continue
            entry = dict(default)
            prefilled_val = user_profile.get(key) or ""
            entry["prefilled"] = True
            entry["prefilled_value"] = prefilled_val
            classification["prefilled"].append(entry)
            classification["prefilled_values"][default["id"]] = prefilled_val
    
    return classification

async def get_registration_fields_with_prefill(
    event_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Get registration fields for an event with prefill information.
    ALWAYS includes core profile fields (name, email, phone, college, education).
    Admin's stage config fields are merged on top as overrides or custom additions.
    """
    try:
        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event:
            return {"error": "Event not found"}
        
        user_profile = await get_user_profile_data(user_id)
        
        # Try to get fields from REGISTRATION stage config first
        admin_fields = []
        for s in (event.get("stages") or []):
            if isinstance(s, dict) and str(s.get("type", "")).upper() == "REGISTRATION":
                cfg = s.get("config") if isinstance(s.get("config"), dict) else {}
                stage_fields = cfg.get("fields", [])
                if isinstance(stage_fields, list):
                    admin_fields = stage_fields
                    break
        
        # Fallback to event-level registrationFields (legacy)
        if not admin_fields:
            admin_fields = event.get("registrationFields", [])
        
        field_classification = await classify_registration_fields(
            admin_fields,
            user_profile
        )
        
        # Always inject any missing core fields (name, email, phone, college, education)
        field_classification = _ensure_core_fields(field_classification, user_profile)
        
        # Reorder prefilled fields: core fields in CORE_REGISTRATION_KEYS order, then non-core
        core_order = {key: i for i, key in enumerate(CORE_REGISTRATION_KEYS)}
        field_classification["prefilled"].sort(
            key=lambda f: core_order.get(f.get("_profile_key", ""), 999)
        )
        
        return {
            "status": "success",
            "event_id": event_id,
            "event_title": event.get("title", ""),
            "prefilled_fields": field_classification["prefilled"],
            "custom_fields": field_classification["custom"],
            "user_profile": user_profile,
            "prefilled_count": len(field_classification["prefilled"]),
            "custom_count": len(field_classification["custom"]),
        }
    
    except Exception as e:
        print(f"[ERROR] get_registration_fields_with_prefill: {e}")
        return {"error": str(e)}

async def check_registration_status(
    event_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Check if user is already registered for an event.
    
    Performs fallback lookups using alternative event_id formats
    (ObjectId string vs human-readable event_id) to avoid false negatives
    caused by event_id format mismatches.
    """
    try:
        from db import events_col
        
        participant = await participants_col.find_one({
            "event_id": str(event_id),
            "user_id": str(user_id)
        })
        
        if not participant:
            # Fallback: try alternative event_id formats
            try:
                ev = await events_col.find_one({"_id": ObjectId(event_id)})
                if ev and ev.get("event_id"):
                    participant = await participants_col.find_one({
                        "event_id": str(ev["event_id"]),
                        "user_id": str(user_id)
                    })
            except:
                pass
        
        if not participant:
            try:
                ev = await events_col.find_one({"event_id": event_id})
                if ev:
                    participant = await participants_col.find_one({
                        "event_id": str(ev["_id"]),
                        "user_id": str(user_id)
                    })
            except:
                pass
        
        if participant:
            return {
                "status": "registered",
                "registered_at": participant.get("registered_at"),
                "name": participant.get("name"),
                "email": participant.get("email"),
            }
        
        return {"status": "not_registered"}
    
    except Exception as e:
        print(f"[ERROR] check_registration_status: {e}")
        return {"error": str(e)}
