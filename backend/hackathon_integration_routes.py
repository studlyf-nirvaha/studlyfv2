import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from bson import ObjectId

from auth_institution import get_auth_user, assert_institution_scope
from db import (
    hackathon_problems_col,
    hackathon_selections_col,
    hackathon_event_config_col,
    events_col,
    institution_event_packages_col,
    institutions_col,
    users_col,
    payments_col,
)
from services.email_service import send_notification_email
import hmac
import hashlib
import os


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/institution/hackathon", tags=["Hackathon Management"])


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-safe dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


def serialize_list(docs: list) -> list:
    return [serialize_doc(d) for d in docs]


async def _get_institution_id(user: dict) -> str:
    institution_id = user.get("institution_id")
    if not institution_id:
        raise HTTPException(400, "Institution ID not found in user profile")
    return institution_id


async def ensure_package_enabled(institution_id: str):
    row = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "hackathon_package_enabled"
    })
    enabled = str((row or {}).get("value", "false")).lower() == "true"
    if not enabled:
        raise HTTPException(403, "Hackathon package is not enabled for your institution")


async def _send_activation_email(institution_id: str, plan_id: str, provider: str, payment_status: str, actor_email: Optional[str] = None, amount: int = 0, currency: str = 'INR'):
    try:
        from services.email_template_service import send_template_email

        inst = await institutions_col.find_one({"institution_id": institution_id})
        recipient = None
        user_name = "Your Institution"
        if actor_email:
            try:
                user_rec = await users_col.find_one({"email": actor_email})
                if user_rec:
                    user_name = user_rec.get('name') or user_rec.get('full_name') or user_name
            except Exception:
                pass
        if inst:
            recipient = inst.get("admin_email") or inst.get("email") or inst.get("contact_email")
            user_name = inst.get("admin_name") or inst.get("name") or user_name
        if not recipient:
            return

        PLAN_NAMES = {
            'basic': 'Basic Plan',
            'pack3': 'Pack of 3',
            'pack7': 'Pack of 7',
            'enterprise': 'Enterprise'
        }
        plan_name = PLAN_NAMES.get(plan_id, str(plan_id))

        plan_expiry = None
        try:
            end_row = await hackathon_event_config_col.find_one(
                {"institution_id": institution_id, "key": "subscription_end"}
            )
            if end_row and end_row.get("value"):
                plan_expiry = datetime.fromisoformat(str(end_row["value"]).replace("Z", "+00:00"))
        except Exception:
            pass

        frontend_url = os.getenv('FRONTEND_URL', 'https://studlyf.in')

        await send_template_email(
            template_type="plan_activation",
            recipient=recipient,
            context={
                "user_name": user_name,
                "plan_name": plan_name,
                "start_date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
                "expiry_date": plan_expiry.strftime("%B %d, %Y") if plan_expiry else "Unlimited",
                "billing_cycle": f"{provider} / {payment_status}",
                "manage_subscription_url": f"{frontend_url}/institution/settings?tab=plan",
                "frontend_url": frontend_url,
            },
            subject_override=f"Your {plan_name} Subscription is Now Active",
        )
    except Exception:
        logger.exception("Failed to send activation email")


async def _activate_subscription(
    institution_id: str,
    plan_id: str,
    payment_status: str,
    provider: str,
    payment_id: Optional[str] = None,
    amount: int = 0,
    currency: str = "INR",
    actor_email: Optional[str] = None,
):
    now_iso = datetime.now(timezone.utc).isoformat()

    await hackathon_event_config_col.update_one(
        {"institution_id": institution_id, "key": "subscription_plan_id"},
        {"$set": {"value": plan_id, "updated_at": now_iso}},
        upsert=True,
    )
    await hackathon_event_config_col.update_one(
        {"institution_id": institution_id, "key": "subscription_status"},
        {"$set": {"value": "active", "updated_at": now_iso}},
        upsert=True,
    )
    await hackathon_event_config_col.update_one(
        {"institution_id": institution_id, "key": "payment_status"},
        {"$set": {"value": payment_status, "updated_at": now_iso}},
        upsert=True,
    )
    await hackathon_event_config_col.update_one(
        {"institution_id": institution_id, "key": "payment_provider"},
        {"$set": {"value": provider, "updated_at": now_iso}},
        upsert=True,
    )
    await hackathon_event_config_col.update_one(
        {"institution_id": institution_id, "key": "hackathon_package_enabled"},
        {"$set": {"value": "true", "updated_at": now_iso}},
        upsert=True,
    )
    if payment_id:
        await hackathon_event_config_col.update_one(
            {"institution_id": institution_id, "key": "last_payment_id"},
            {"$set": {"value": payment_id, "updated_at": now_iso}},
            upsert=True,
        )

    await payments_col.insert_one({
        "institution_id": institution_id,
        "email": actor_email,
        "type": "hackathon_package_subscription",
        "amount": amount,
        "currency": currency,
        "status": payment_status,
        "provider": provider,
        "payment_id": payment_id,
        "description": f"Hackathon package activation ({plan_id})",
        "created_at": now_iso,
    })

    # Set subscription start/end dates based on plan durations
    # Duration mapping in days for each plan id
    DURATION_DAYS = {
        "basic": 30,
        "pack3": 30,
        "pack7": 90,
        "enterprise": None,
    }
    try:
        start_dt = datetime.now(timezone.utc)
        end_dt = None
        dur = DURATION_DAYS.get(plan_id)
        if dur is not None:
            end_dt = (start_dt + timedelta(days=int(dur)))

        await hackathon_event_config_col.update_one(
            {"institution_id": institution_id, "key": "subscription_start"},
            {"$set": {"value": start_dt.isoformat(), "updated_at": now_iso}},
            upsert=True,
        )
        if end_dt:
            await hackathon_event_config_col.update_one(
                {"institution_id": institution_id, "key": "subscription_end"},
                {"$set": {"value": end_dt.isoformat(), "updated_at": now_iso}},
                upsert=True,
            )
        else:
            # Remove any existing end date for unlimited plans
            await hackathon_event_config_col.delete_one({"institution_id": institution_id, "key": "subscription_end"})
    except Exception:
        logger.exception("Failed to set subscription dates")

    await _send_activation_email(institution_id, plan_id, provider, payment_status, actor_email=actor_email, amount=amount, currency=currency)



# ─── PROBLEM STATEMENTS ────────────────────────────────────────────────────────

@router.get("/problems")
async def list_problems(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    pipeline = [
        {"$match": {"institution_id": institution_id}},
        {"$lookup": {
            "from": "hackathon_selections",
            "localField": "problem_id",
            "foreignField": "problem_id",
            "as": "selections"
        }},
        {"$addFields": {
            "team_count": {"$size": "$selections"},
            "slots_left": {"$subtract": ["$max_teams", {"$size": "$selections"}]},
            "is_full": {"$gte": [{"$size": "$selections"}, "$max_teams"]}
        }},
        {"$sort": {"domain": 1, "ps_code": 1}},
        {"$project": {"selections": 0}}
    ]
    problems = await hackathon_problems_col.aggregate(pipeline).to_list(length=100)
    return serialize_list(problems)


@router.get("/problems/{problem_id}")
async def get_problem(problem_id: str, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    try:
        obj_id = ObjectId(problem_id)
    except Exception as e:
        logger.warning(f"Handled exception at line 242: {e}")
        raise HTTPException(400, "Invalid problem ID")

    pipeline = [
        {"$match": {"_id": obj_id, "institution_id": institution_id}},
        {"$lookup": {
            "from": "hackathon_selections",
            "localField": "problem_id",
            "foreignField": "problem_id",
            "as": "selections"
        }},
        {"$addFields": {
            "team_count": {"$size": "$selections"},
            "slots_left": {"$subtract": ["$max_teams", {"$size": "$selections"}]},
            "is_full": {"$gte": [{"$size": "$selections"}, "$max_teams"]}
        }}
    ]
    docs = await hackathon_problems_col.aggregate(pipeline).to_list(length=1)
    if not docs:
        raise HTTPException(404, "Problem not found")
    return serialize_doc(docs[0])


@router.post("/problems")
async def create_problem(
    body: dict,
    user: dict = Depends(get_auth_user),
):
    institution_id = await _get_institution_id(user)
    await ensure_package_enabled(institution_id)
    ps_code = body.get("ps_code")
    if ps_code:
        existing = await hackathon_problems_col.find_one({
            "institution_id": institution_id,
            "ps_code": ps_code
        })
        if existing:
            raise HTTPException(409, f'Problem code "{ps_code}" already exists')

    problem_id = str(uuid.uuid4())[:12]
    doc = {
        "problem_id": problem_id,
        "institution_id": institution_id,
        "title": body["title"],
        "description": body.get("description", ""),
        "domain": body.get("domain", ""),
        "tech_stack": body.get("tech_stack", ""),
        "ps_code": ps_code or None,
        "brief": body.get("brief", ""),
        "max_teams": body.get("max_teams", 5),
        "status": body.get("status", "active"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await hackathon_problems_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/problems/{problem_id}")
async def update_problem(
    problem_id: str,
    body: dict,
    user: dict = Depends(get_auth_user),
):
    institution_id = await _get_institution_id(user)
    await ensure_package_enabled(institution_id)
    try:
        obj_id = ObjectId(problem_id)
    except Exception as e:
        logger.warning(f"Handled exception at line 311: {e}")
        raise HTTPException(400, "Invalid problem ID")

    existing = await hackathon_problems_col.find_one({"_id": obj_id, "institution_id": institution_id})
    if not existing:
        raise HTTPException(404, "Problem not found")

    ps_code = body.get("ps_code")
    if ps_code:
        dup = await hackathon_problems_col.find_one({
            "institution_id": institution_id,
            "ps_code": ps_code,
            "_id": {"$ne": obj_id}
        })
        if dup:
            raise HTTPException(409, f'Problem code "{ps_code}" already in use')

    update_fields = {}
    for field in ["title", "description", "domain", "tech_stack", "ps_code", "brief", "max_teams", "status"]:
        if field in body:
            update_fields[field] = body[field]
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    await hackathon_problems_col.update_one(
        {"_id": obj_id},
        {"$set": update_fields}
    )
    updated = await hackathon_problems_col.find_one({"_id": obj_id})
    return serialize_doc(updated)


@router.delete("/problems/{problem_id}")
async def delete_problem(problem_id: str, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    await ensure_package_enabled(institution_id)
    try:
        obj_id = ObjectId(problem_id)
    except Exception as e:
        logger.warning(f"Handled exception at line 348: {e}")
        raise HTTPException(400, "Invalid problem ID")

    result = await hackathon_problems_col.delete_one({"_id": obj_id, "institution_id": institution_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Problem not found")

    await hackathon_selections_col.delete_many({"problem_id": problem_id})
    return {"success": True}


# ─── TEAM SELECTIONS ───────────────────────────────────────────────────────────

@router.get("/selections")
async def list_selections(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    pipeline = [
        {"$lookup": {
            "from": "hackathon_problems",
            "localField": "problem_id",
            "foreignField": "problem_id",
            "as": "problem"
        }},
        {"$unwind": {"path": "$problem", "preserveNullAndEmptyArrays": False}},
        {"$match": {"problem.institution_id": institution_id}},
        {"$sort": {"selected_at": -1}},
        {"$addFields": {
            "problem_title": "$problem.title",
            "domain": "$problem.domain",
            "ps_code": "$problem.ps_code",
            "problem_id": {"$toString": "$problem._id"}
        }},
        {"$project": {"problem": 0}}
    ]
    selections = await hackathon_selections_col.aggregate(pipeline).to_list(length=500)
    return serialize_list(selections)


@router.get("/selections/{problem_id}")
async def get_problem_selections(problem_id: str, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    pipeline = [
        {"$match": {"problem_id": problem_id}},
        {"$lookup": {
            "from": "hackathon_problems",
            "localField": "problem_id",
            "foreignField": "problem_id",
            "as": "problem"
        }},
        {"$unwind": {"path": "$problem", "preserveNullAndEmptyArrays": False}},
        {"$match": {"problem.institution_id": institution_id}},
        {"$sort": {"selected_at": -1}},
        {"$addFields": {
            "problem_title": "$problem.title",
            "domain": "$problem.domain",
            "ps_code": "$problem.ps_code"
        }},
        {"$project": {"problem": 0}}
    ]
    selections = await hackathon_selections_col.aggregate(pipeline).to_list(length=200)
    return serialize_list(selections)


@router.post("/problems/{problem_id}/select")
async def select_problem(
    problem_id: str,
    body: dict,
    user: dict = Depends(get_auth_user),
):
    institution_id = await _get_institution_id(user)
    await ensure_package_enabled(institution_id)
    try:
        obj_id = ObjectId(problem_id)
    except Exception as e:
        logger.warning(f"Handled exception at line 421: {e}")
        raise HTTPException(400, "Invalid problem ID")

    problem = await hackathon_problems_col.find_one({"_id": obj_id, "institution_id": institution_id})
    if not problem:
        raise HTTPException(404, "Problem not found")
    if problem.get("status") != "active":
        raise HTTPException(400, "Problem is not active")

    team_count = await hackathon_selections_col.count_documents({"problem_id": problem_id})
    if team_count >= problem.get("max_teams", 5):
        raise HTTPException(400, "This problem has reached its maximum team capacity")

    team_lead_email = body.get("team_lead_email") or user.get("email")
    existing = await hackathon_selections_col.find_one({"team_lead_email": team_lead_email})
    if existing:
        raise HTTPException(409, "This team lead has already selected a problem")

    selection = {
        "problem_id": problem.get("problem_id", problem_id),
        "team_name": body.get("team_name", ""),
        "team_lead_name": body.get("team_lead_name", ""),
        "team_lead_email": team_lead_email,
        "team_size": body.get("team_size", 1),
        "selected_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await hackathon_selections_col.insert_one(selection)
    selection["_id"] = result.inserted_id
    return {
        "success": True,
        "selection_id": str(result.inserted_id),
        "problem_title": problem.get("title"),
    }


@router.get("/my-selection")
async def my_selection(user: dict = Depends(get_auth_user)):
    email = user.get("email")
    if not email:
        raise HTTPException(400, "User email not found")

    pipeline = [
        {"$match": {"team_lead_email": email}},
        {"$lookup": {
            "from": "hackathon_problems",
            "localField": "problem_id",
            "foreignField": "problem_id",
            "as": "problem"
        }},
        {"$unwind": {"path": "$problem", "preserveNullAndEmptyArrays": True}},
        {"$addFields": {
            "problem_title": "$problem.title",
            "domain": "$problem.domain",
            "ps_code": "$problem.ps_code"
        }},
        {"$project": {"problem": 0}}
    ]
    docs = await hackathon_selections_col.aggregate(pipeline).to_list(length=1)
    return serialize_doc(docs[0]) if docs else None


# ─── HACKATHON PACKAGE SUBSCRIPTION ──────────────────────────────────────────

@router.get("/package-status")
async def get_hackathon_package_status(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    row = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "hackathon_package_enabled"
    })
    enabled = str((row or {}).get("value", "false")).lower() == "true"
    # also include subscription_status if present
    status_row = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "subscription_status"
    })
    subscription_status = str((status_row or {}).get("value") or "inactive")
    payment_row = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "payment_status"
    })
    provider_row = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "payment_provider"
    })
    plan_row = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "subscription_plan_id"
    })
    payment_status = str((payment_row or {}).get("value") or "pending")
    payment_provider = str((provider_row or {}).get("value") or "none")
    current_plan_id = str((plan_row or {}).get("value") or "basic")
    # subscription dates
    start_row = await hackathon_event_config_col.find_one({"institution_id": institution_id, "key": "subscription_start"})
    end_row = await hackathon_event_config_col.find_one({"institution_id": institution_id, "key": "subscription_end"})
    subscription_start = start_row.get("value") if start_row else None
    subscription_end = end_row.get("value") if end_row else None
    # Fetch last payment if any
    last_payments = await payments_col.find({"institution_id": institution_id, "type": "hackathon_package_subscription"}).sort("created_at", -1).to_list(length=1)
    last_payment = last_payments[0] if last_payments else None

    pkg = {
        "id": "hackathon_package",
        "name": "Hackathon Event Package",
        "price": 0,
        "currency": "₹",
        "priceLabel": f"₹0",
        "description": "Enables Problem Statements, Team Selections, Participant Portal, and Participant Card features for your events.",
        "features": [
            "Problem Statements management (CRUD)",
            "Team Selection tracking",
            "Participant Portal with Problem Board",
            "Participant Card with Reg ID, Bullet Points, LinkedIn Post",
            "Countdown timer & Sponsors section",
            "Poster download for participants"
        ]
    }
    # compute remaining days if end present
    days_remaining = None
    if subscription_end:
        try:
            end_dt = datetime.fromisoformat(subscription_end)
            now = datetime.now(timezone.utc)
            delta = (end_dt - now).total_seconds() / 86400.0
            days_remaining = int(delta) if delta >= 0 else 0
        except Exception:
            days_remaining = None

    return {
        "enabled": enabled,
        "package": pkg,
        "subscription_status": subscription_status,
        "payment_status": payment_status,
        "payment_provider": payment_provider,
        "current_plan_id": current_plan_id,
        "subscription_start": subscription_start,
        "subscription_end": subscription_end,
        "days_remaining": days_remaining,
        "last_payment": {
            "amount": int(last_payment.get('amount', 0)) if last_payment else 0,
            "currency": last_payment.get('currency', '₹') if last_payment else '₹',
            "provider": last_payment.get('provider') if last_payment else payment_provider,
            "status": last_payment.get('status') if last_payment else payment_status,
            "payment_id": last_payment.get('payment_id') if last_payment else None
        }
    }


@router.post("/package-toggle")
async def toggle_hackathon_package(body: dict, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    enabled = bool(body.get("enabled", False))
    await hackathon_event_config_col.update_one(
        {"institution_id": institution_id, "key": "hackathon_package_enabled"},
        {"$set": {"value": str(enabled).lower(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"success": True, "enabled": enabled}


@router.post("/subscribe")
async def subscribe_hackathon_package(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    inst = await institutions_col.find_one({"institution_id": institution_id})
    inst_email = (inst or {}).get("email") or user.get("email") or ""
    inst_name = (inst or {}).get("name") or user.get("name") or user.get("full_name") or "Your Institution"

    await _activate_subscription(
        institution_id=institution_id,
        plan_id="basic",
        payment_status="free",
        provider="manual",
        payment_id=f"free_{uuid.uuid4().hex[:10]}",
        amount=0,
        currency="INR",
        actor_email=inst_email,
    )

    return {
        "success": True,
        "enabled": True,
        "subscription_status": "active",
        "payment_status": "free",
        "message": "Hackathon Event Package activated successfully. Confirmation email sent."
    }


# ─── EVENT CONFIG ──────────────────────────────────────────────────────────────

@router.get("/event-config")
async def get_event_config(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    configs = await hackathon_event_config_col.find({"institution_id": institution_id}).to_list(length=100)
    config = {}
    for c in configs:
        config[c["key"]] = c["value"]
    return config


@router.put("/event-config")
async def update_event_config(body: dict, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    for key, value in body.items():
        existing = await hackathon_event_config_col.find_one({
            "institution_id": institution_id,
            "key": key
        })
        if existing:
            await hackathon_event_config_col.update_one(
                {"_id": existing["_id"]},
                {"$set": {"value": str(value)}}
            )
        else:
            await hackathon_event_config_col.insert_one({
                "institution_id": institution_id,
                "key": key,
                "value": str(value),
            })
    return {"success": True}


# ─── PLANS ─────────────────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    plans = [
            {
                "id": "basic",
                "name": "Basic Plan",
                "price": 0,
                "currency": "₹",
                "priceLabel": "Free",
                "duration": "Auto renews every 30 days",
                "isRecommended": False,
                "cta": "Select Plan",
                "features": [
                    "2 Jobs/Internship listings",
                    "7 days registration window per listing",
                    "Upto 30 applications view access per listing",
                    "Access listing upto 15 days after registration window ends",
                    "10 interviews credits",
                    "0 assessments credits"
                ]
            },
            {
                "id": "pack3",
                "name": "Pack of 3",
                "price": 0,
                "currency": "₹",
                "priceLabel": "Free",
                "duration": "Valid for 30 days",
                "isRecommended": True,
                "cta": "Select Plan",
                "features": [
                    "3 Jobs/Internship listings",
                    "30 days registration window per listing",
                    "Unlimited Application views",
                    "Access listing upto 15 days after registration window ends",
                    "50 interviews credits",
                    "100 assessments credits"
                ]
            },
            {
                "id": "pack7",
                "name": "Pack of 7",
                "price": 0,
                "currency": "₹",
                "priceLabel": "Free",
                "duration": "Valid for 90 days",
                "isRecommended": False,
                "cta": "Select Plan",
                "features": [
                    "Upto 7 Jobs/Internship",
                    "30 days registration window per listing",
                    "Unlimited Application views",
                    "Access listing upto 15 days after registration window ends",
                    "100 interviews credits",
                    "200 assessments credits"
                ]
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 0,
                "currency": "₹",
                "priceLabel": "Custom",
                "duration": "Custom duration",
                "isRecommended": False,
                "cta": "Contact Us",
                "isCustom": True,
                "features": [
                    "Host custom jobs/listing",
                    "Custom duration for registration window",
                    "Unlimited Application views",
                    "Access listing upto 30 days after registration window ends",
                    "Custom interviews credits",
                    "Custom assessments credits",
                    "Download access"
                ]
            }
        ]

    allowed_ids = {p["id"] for p in plans}
    stored_plan = await hackathon_event_config_col.find_one({
        "institution_id": institution_id,
        "key": "subscription_plan_id"
    })

    # Normalize stored_plan value. Some installations may have stored the value
    # as a string, list, or small dict — coerce to a single plan id safely.
    raw_val = (stored_plan or {}).get("value")
    current_plan_id = "basic"
    try:
        if isinstance(raw_val, list) and raw_val:
            # If a list was accidentally stored, prefer the last selected value
            current_plan_id = str(raw_val[-1])
        elif isinstance(raw_val, dict):
            # If a dict was stored, look for common keys
            current_plan_id = str(raw_val.get("id") or raw_val.get("plan_id") or raw_val.get("value") or "basic")
        elif raw_val:
            current_plan_id = str(raw_val)
    except Exception:
        current_plan_id = "basic"

    # Ensure returned id is one of the allowed plans
    if current_plan_id not in allowed_ids:
        current_plan_id = "basic"

    # Only the plan whose id matches current_plan_id is marked current
    for p in plans:
        p["isCurrent"] = p["id"] == current_plan_id
        p["cta"] = "Select Plan"
        if p["isCurrent"]:
            p["cta"] = "Current Plan"

    from services.subscription_service import get_plan_expiry_status, get_pending_plan
    expiry = await get_plan_expiry_status(institution_id)
    pending_plan = await get_pending_plan(institution_id)

    return {
        "plans": plans,
        "pendingPlan": pending_plan,
        "faqs": [
            {
                "q": "What is the difference between the plans?",
                "a": "The Basic Plan offers standard features (2 listings, 7-day registration window, 30 application views). Higher-tier plans provide additional listings, longer windows, unlimited application views, and more credits."
            },
            {
                "q": "How do I upgrade to a higher plan?",
                "a": "You can upgrade by selecting any plan. Currently all plans are available at no cost."
            },
            {
                "q": "Can I switch between plans?",
                "a": "Yes, you can switch between plans at any time."
            }
        ],
        "currentPlanId": current_plan_id,
        "expiry": expiry,
    }


@router.post("/plans/select")
async def select_plan(body: dict, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    plan_id = str(body.get("plan_id") or "").strip()
    allowed_ids = {"basic", "pack3", "pack7", "enterprise"}
    if plan_id not in allowed_ids:
        raise HTTPException(400, "Invalid plan_id")

    from services.subscription_service import get_current_plan_id, set_pending_plan

    current = await get_current_plan_id(institution_id)
    if plan_id == current:
        raise HTTPException(400, "This plan is already active.")

    # Store as pending — requires confirmation before activation
    pending = await set_pending_plan(institution_id, plan_id)

    # Return pending plan info — frontend shows confirmation modal
    return {
        "success": True,
        "status": "pending",
        "pending": pending,
        "is_demo_mode": True,
        "message": "Plan change initiated. Please confirm to activate.",
    }


@router.post("/plans/confirm")
async def confirm_plan_change(body: dict, user: dict = Depends(get_auth_user)):
    """Confirm pending plan change and activate the new plan."""
    institution_id = await _get_institution_id(user)
    from services.subscription_service import confirm_plan_change as _confirm
    try:
        result = await _confirm(institution_id, actor_email=user.get("email"))
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/plans/cancel-pending")
async def cancel_pending_plan_change(body: dict, user: dict = Depends(get_auth_user)):
    """Cancel a pending plan change without activating it."""
    institution_id = await _get_institution_id(user)
    from services.subscription_service import cancel_pending_plan as _cancel
    await _cancel(institution_id)
    return {"success": True, "message": "Plan change cancelled."}


@router.post("/plans/activate")
async def activate_plan(body: dict, user: dict = Depends(get_auth_user)):
    """Activate selected plan after payment confirmation (or free mode)."""
    institution_id = await _get_institution_id(user)
    plan_id = str(body.get("plan_id") or "").strip()
    allowed_ids = {"basic", "pack3", "pack7", "enterprise"}
    if plan_id not in allowed_ids:
        raise HTTPException(400, "Invalid plan_id")

    confirmed = bool(body.get("payment_confirmed", True))
    if not confirmed:
        raise HTTPException(400, "Payment not confirmed")

    provider = str(body.get("provider") or "manual").strip().lower() or "manual"
    payment_id = str(body.get("payment_id") or f"{provider}_{uuid.uuid4().hex[:10]}")
    payment_status = str(body.get("payment_status") or ("free" if provider == "manual" else "paid"))

    await _activate_subscription(
        institution_id=institution_id,
        plan_id=plan_id,
        payment_status=payment_status,
        provider=provider,
        payment_id=payment_id,
        amount=int(body.get("amount") or 0),
        currency=str(body.get("currency") or "INR"),
        actor_email=user.get("email"),
    )

    return {
        "success": True,
        "currentPlanId": plan_id,
        "enabled": True,
        "subscription_status": "active",
        "payment_status": payment_status,
    }


# ─── EVENT PACKAGES (dynamic institution packages) ───────────────────────────


@router.get("/packages")
async def list_packages(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    docs = await institution_event_packages_col.find({"institution_id": institution_id, "active": True}).to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return {"packages": docs}


@router.post("/packages")
async def create_package(body: dict, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    now = datetime.utcnow()
    doc = {
        "institution_id": institution_id,
        "title": body.get("title"),
        "description": body.get("description"),
        "url": body.get("url"),
        "hero_url": body.get("hero_url"),
        "thumbnail": body.get("thumbnail"),
        "cta_label": body.get("cta_label"),
        "metadata": body.get("metadata", {}),
        "active": True,
        "created_at": now,
        "updated_at": now,
    }
    res = await institution_event_packages_col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc


@router.get("/packages/{package_id}")
async def get_package(package_id: str, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    try:
        obj_id = ObjectId(package_id)
    except Exception:
        raise HTTPException(400, "Invalid package id")
    doc = await institution_event_packages_col.find_one({"_id": obj_id, "institution_id": institution_id})
    if not doc:
        raise HTTPException(404, "Package not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.patch("/packages/{package_id}")
async def update_package(package_id: str, body: dict, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    try:
        obj_id = ObjectId(package_id)
    except Exception:
        raise HTTPException(400, "Invalid package id")
    existing = await institution_event_packages_col.find_one({"_id": obj_id, "institution_id": institution_id})
    if not existing:
        raise HTTPException(404, "Package not found")
    updates = {k: v for k, v in body.items() if k in ("title","description","url","hero_url","thumbnail","cta_label","metadata","active")}
    if not updates:
        return {"success": True}
    updates["updated_at"] = datetime.utcnow()
    await institution_event_packages_col.update_one({"_id": obj_id}, {"$set": updates})
    updated = await institution_event_packages_col.find_one({"_id": obj_id})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.delete("/packages/{package_id}")
async def delete_package(package_id: str, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    try:
        obj_id = ObjectId(package_id)
    except Exception:
        raise HTTPException(400, "Invalid package id")
    existing = await institution_event_packages_col.find_one({"_id": obj_id, "institution_id": institution_id})
    if not existing:
        raise HTTPException(404, "Package not found")
    # Soft-delete
    await institution_event_packages_col.update_one({"_id": obj_id}, {"$set": {"active": False, "updated_at": datetime.utcnow()}})
    return {"success": True}


@router.patch("/events/{event_id}/assign-package")
async def assign_package_to_event(event_id: str, body: dict, user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    package_id = body.get("package_id")
    if not package_id:
        raise HTTPException(400, "package_id required")
    try:
        pkg_obj = ObjectId(package_id)
    except Exception:
        raise HTTPException(400, "Invalid package id")
    pkg = await institution_event_packages_col.find_one({"_id": pkg_obj, "institution_id": institution_id, "active": True})
    if not pkg:
        raise HTTPException(404, "Package not found or inactive")
    try:
        ev_obj = ObjectId(event_id)
    except Exception:
        raise HTTPException(400, "Invalid event id")
    ev = await events_col.find_one({"_id": ev_obj, "institution_id": institution_id})
    if not ev:
        raise HTTPException(404, "Event not found")
    await events_col.update_one({"_id": ev_obj}, {"$set": {"package_id": str(pkg_obj), "updated_at": datetime.utcnow()}})
    return {"success": True}


# ─── STATS ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(user: dict = Depends(get_auth_user)):
    institution_id = await _get_institution_id(user)
    active = await hackathon_problems_col.count_documents({
        "institution_id": institution_id,
        "status": "active"
    })
    total_picks = await hackathon_selections_col.aggregate([
        {"$lookup": {
            "from": "hackathon_problems",
            "localField": "problem_id",
            "foreignField": "problem_id",
            "as": "problem"
        }},
        {"$unwind": "$problem"},
        {"$match": {"problem.institution_id": institution_id}},
        {"$count": "count"}
    ]).to_list(length=1)
    picks = total_picks[0]["count"] if total_picks else 0

    domains_cursor = await hackathon_problems_col.aggregate([
        {"$match": {"institution_id": institution_id, "status": "active"}},
        {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(length=50)
    domains = [{"domain": d["_id"], "count": d["count"]} for d in domains_cursor]

    return {
        "activeStatements": active,
        "totalPicks": picks,
        "domains": domains
    }


@router.post('/razorpay-webhook')
async def razorpay_webhook(request: Request):
    """Receive Razorpay webhook (test mode). Verifies signature and activates subscription.
    Expect order/payment notes to include 'institution_id' and 'plan_id'."""
    secret = os.getenv('RAZORPAY_SECRET')
    signature = request.headers.get('X-Razorpay-Signature') or request.headers.get('x-razorpay-signature')
    body_bytes = await request.body()
    if secret and signature:
        computed = hmac.new(secret.encode('utf-8'), body_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, signature):
            raise HTTPException(400, 'Invalid signature')
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, 'Invalid JSON')

    # Try to extract institution_id and plan_id from common Razorpay payload shapes
    inst_id = None
    plan_id = None
    # search for notes in payload
    def _find_notes(obj):
        if not isinstance(obj, dict):
            return None
        for k, v in obj.items():
            if k == 'notes' and isinstance(v, dict):
                return v
            if isinstance(v, dict):
                res = _find_notes(v)
                if res:
                    return res
        return None

    notes = _find_notes(payload)
    if notes:
        inst_id = notes.get('institution_id') or notes.get('institution')
        plan_id = notes.get('plan_id')

    if not inst_id or not plan_id:
        # nothing actionable
        return {"success": False, "reason": "missing notes"}

    await _activate_subscription(
        institution_id=inst_id,
        plan_id=plan_id,
        payment_status="paid",
        provider="razorpay",
        payment_id=(notes or {}).get("payment_id") or (notes or {}).get("order_id") or f"razorpay_{uuid.uuid4().hex[:10]}",
        amount=0,
        currency="INR",
        actor_email=None,
    )

    return {"success": True}


@router.post('/stripe-webhook')
async def stripe_webhook(request: Request):
    """Receive Stripe webhook (test mode). Verifies signature using STRIPE_WEBHOOK_SECRET.
    Expects metadata to include 'institution_id' and 'plan_id'."""
    secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    header = request.headers.get('Stripe-Signature') or request.headers.get('stripe-signature')
    body_bytes = await request.body()
    if secret and header:
        # header format: t=timestamp,v1=signature[,v0=...]
        parts = {k: v for k, v in [p.split('=', 1) for p in header.split(',') if '=' in p]}
        t = parts.get('t')
        v1 = parts.get('v1')
        if not t or not v1:
            raise HTTPException(400, 'Invalid signature header')
        signed_payload = f"{t}.{body_bytes.decode('utf-8')}".encode('utf-8')
        computed = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, v1):
            raise HTTPException(400, 'Invalid signature')

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, 'Invalid JSON')

    # try to extract metadata
    inst_id = None
    plan_id = None
    def _find_metadata(obj):
        if not isinstance(obj, dict):
            return None
        if 'metadata' in obj and isinstance(obj['metadata'], dict):
            return obj['metadata']
        for v in obj.values():
            if isinstance(v, dict):
                res = _find_metadata(v)
                if res:
                    return res
        return None

    meta = _find_metadata(payload)
    if meta:
        inst_id = meta.get('institution_id') or meta.get('institution')
        plan_id = meta.get('plan_id')

    if not inst_id or not plan_id:
        return {"success": False, "reason": "missing metadata"}

    await _activate_subscription(
        institution_id=inst_id,
        plan_id=plan_id,
        payment_status="paid",
        provider="stripe",
        payment_id=(meta or {}).get("payment_id") or (meta or {}).get("session_id") or f"stripe_{uuid.uuid4().hex[:10]}",
        amount=0,
        currency="INR",
        actor_email=None,
    )

    return {"success": True}


@router.post("/check-expiring-plans")
async def check_expiring_plans(user: dict = Depends(get_auth_user)):
    """Admin endpoint to check all institutions with expiring plans and send notifications."""
    from services.subscription_service import get_stored_plan_end_date, check_and_notify_expiring_plan

    affected = []
    cursor = hackathon_event_config_col.find({"key": "subscription_end", "value": {"$exists": True}})
    seen = set()
    async for row in cursor:
        iid = row.get("institution_id")
        if iid and iid not in seen:
            seen.add(iid)
            end_date = await get_stored_plan_end_date(iid)
            if end_date:
                remaining = (end_date - datetime.now(timezone.utc)).total_seconds() / 86400.0
                if remaining <= 7:
                    await check_and_notify_expiring_plan(iid)
                    affected.append({"institution_id": iid, "days_remaining": round(remaining, 1)})

    return {"checked": len(seen), "notified": len(affected), "details": affected}
