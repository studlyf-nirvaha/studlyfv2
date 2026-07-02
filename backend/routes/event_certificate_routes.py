from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from db import events_col, users_col, participants_col, event_certificates_col
from auth_institution import get_auth_user, get_auth_user_optional
from services.institutional_certificate_service import certificate_service, ACHIEVEMENT_TYPES, VALID_ACHIEVEMENTS
from services.email_service import send_notification_email
from services.email_template_service import get_active_template, render_template
import os

router = APIRouter(prefix="/api/v1/events", tags=["Event Certificates"])


@router.post("/{event_id}/certificates/generate")
async def generate_event_certificates(
    event_id: str,
    achievement_type: str = "participation",
    user_id: str = None,
    template_id: Optional[str] = None,
    user: dict = Depends(get_auth_user),
):
    role = str(user.get("role") or "").lower()
    if role not in ("institution", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Institution access required")

    event = await events_col.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if role == "institution":
        inst_id = user.get("institution_id")
        if str(event.get("institution_id", "")) != inst_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")

    if achievement_type not in VALID_ACHIEVEMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid achievement type. Valid: {VALID_ACHIEVEMENTS}")

    event_code = event.get("eventCode") or event.get("event_type") or "HACK"

    # Enqueue async job (background worker processes it)
    from services.institutional_certificate_service import enqueue_certificate_job
    job_id = await enqueue_certificate_job(
        event_id=event_id,
        achievement_type=achievement_type,
        event_code=event_code[:6].upper(),
        template_id=template_id,
    )

    return {
        "status": "queued",
        "job_id": job_id,
        "message": "Certificate generation job queued. Background worker will process it.",
        "achievement_type": achievement_type,
    }


@router.get("/{event_id}/certificates")
async def list_event_certificates(
    event_id: str,
    user: dict = Depends(get_auth_user),
):
    role = str(user.get("role") or "").lower()
    query = {"event_id": event_id}
    if role in ("student", "learner"):
        query["user_id"] = user.get("user_id")
    elif role not in ("institution", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    certs = await event_certificates_col.find(query).sort("issued_at", -1).to_list(length=1000)
    for c in certs:
        c["_id"] = str(c["_id"])
    return certs


@router.get("/{event_id}/certificates/download")
async def download_user_certificate(
    event_id: str,
    user: dict = Depends(get_auth_user),
):
    user_id = user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    cert = await event_certificates_col.find_one({
        "event_id": event_id,
        "user_id": user_id,
    }, sort=[("issued_at", -1)])

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert_id = cert["certificate_id"]
    pdf_path = cert.get("pdf_path")

    if pdf_path and os.path.exists(pdf_path):
        from fastapi.responses import FileResponse
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"certificate_{cert_id}.pdf")

    # Fallback: redirect to static URL or render HTML
    from fastapi.responses import RedirectResponse
    frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
    return RedirectResponse(url=f"{frontend_url}/certificates/{cert_id}.pdf")


@router.get("/{event_id}/certificates/{user_id}")
async def get_user_event_certificate(
    event_id: str,
    user_id: str,
    user: dict = Depends(get_auth_user_optional),
):
    cert = await event_certificates_col.find_one({
        "event_id": event_id,
        "user_id": user_id,
    }, sort=[("issued_at", -1)])

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert["_id"] = str(cert["_id"])
    return cert


# ── Public Verification ──────────────────────────────────────────────

verification_router = APIRouter(prefix="/api/v1/verify", tags=["Certificate Verification"])


@verification_router.get("/{certificate_id}")
async def verify_event_certificate(certificate_id: str):
    """Public endpoint to verify an event participation certificate."""
    cert = await event_certificates_col.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid.")
    return {
        "status": "valid",
        "data": {
            "certificate_id": cert["certificate_id"],
            "participant_name": cert["participant_name"],
            "event_title": cert["event_title"],
            "organization_name": cert["organization_name"],
            "event_date": cert["event_date"],
            "achievement_type": cert["achievement_type"],
            "issued_date": cert["issued_date"],
        }
    }
