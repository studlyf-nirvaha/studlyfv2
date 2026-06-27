import os
import io
import base64
import qrcode
import uuid
import hashlib
from jinja2 import Environment, FileSystemLoader
try:
    from weasyprint import HTML
    HAS_WEASYPRINT = True
except Exception:
    HAS_WEASYPRINT = False
from datetime import datetime, timezone
from bson import ObjectId
from db import event_certificates_col, cert_templates_col, certificate_jobs_col
from services.email_template_service import get_active_template, render_template


ACHIEVEMENT_TYPES = {
    "participation": "Participation",
    "runner_up": "Runner Up",
    "second_runner_up": "Second Runner Up",
    "finalist": "Finalist",
    "winner": "Winner",
    "top_performer": "Top Performer",
    "organizer": "Organizer",
    "mentor": "Mentor",
}

VALID_ACHIEVEMENTS = list(ACHIEVEMENT_TYPES.keys())


def generate_certificate_id(event_code: str = "HACK") -> str:
    year = datetime.utcnow().year
    seq = uuid.uuid4().int % 100000
    code = event_code[:6].upper() if event_code else "HACK"
    return f"STUD-{code}-{year}-{seq:05d}"


def resolve_rank_achievement(rank: int | None) -> str:
    if rank == 1:
        return "winner"
    if rank == 2:
        return "runner_up"
    if rank == 3:
        return "second_runner_up"
    return "participation"


def _event_has_final_terminal_stage(event: dict) -> bool:
    stages = event.get("stages") or []
    if not isinstance(stages, list) or not stages:
        return False

    last_stage = stages[-1] or {}
    last_stage_type = str(last_stage.get("type") or "").upper().strip()
    last_stage_name = str(last_stage.get("name") or "").upper().strip()
    terminal_types = {"FINAL", "FINALE", "RESULTS", "CERTIFICATION", "AWARDS"}
    terminal_names = {"FINAL", "FINALE", "RESULTS", "CERTIFICATION", "AWARDS", "WINNERS"}
    return last_stage_type in terminal_types or any(t in last_stage_name for t in terminal_names)


def _build_certificate_record(
    *,
    cert_id: str,
    event_id: str,
    user_id: str,
    participant_name: str,
    event_title: str,
    organization_name: str,
    event_date: str,
    achievement_type: str,
    achievement_label: str,
    verification_code: str,
    verification_url: str,
    issued_date: str,
    institution_id: str | None = None,
    template_id: str | None = None,
    rank: int | None = None,
    team_id: str | None = None,
    pdf_path: str | None = None,
) -> dict:
    return {
        "certificate_id": cert_id,
        "event_id": event_id,
        "institution_id": institution_id,
        "template_id": template_id,
        "user_id": user_id,
        "participant_name": participant_name,
        "event_title": event_title,
        "organization_name": organization_name,
        "event_date": event_date,
        "achievement_type": achievement_label,
        "achievement_key": achievement_type,
        "rank": rank,
        "team_id": team_id,
        "issued_at": datetime.utcnow(),
        "issued_date": issued_date,
        "verification_code": verification_code,
        "verification_url": verification_url,
        "pdf_path": pdf_path,
        "status": "Issued",
        "immutable_flag": True,
    }


class InstitutionalCertificateService:
    def __init__(self):
        template_dir = os.path.join(os.path.dirname(__file__), '../templates')
        os.makedirs(template_dir, exist_ok=True)
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )

    def _generate_qr_blob(self, url: str):
        qr = qrcode.QRCode(version=1, box_size=10, border=3)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()

    def _ensure_template(self, path: str):
        if not os.path.exists(path):
            with open(path, 'w', encoding='utf-8') as f:
                f.write("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,600;14..32,700;14..32,800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif'', 'Segoe UI', system-ui, sans-serif; background: #f8fafc; padding: 40px; display: flex; justify-content: center; }
    .cert { width: 900px; min-height: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; position: relative; }
    .cert-border { border: 2px solid #e2e8f0; border-radius: 14px; margin: 16px; padding: 32px 40px; min-height: calc(100% - 32px); position: relative; }
    .cert-border::before { content: ''; position: absolute; top: -1px; left: 40px; right: 40px; height: 4px; background: linear-gradient(90deg, #6c3bff, #4f46e5); border-radius: 2px; }
    .header { text-align: center; margin-bottom: 28px; }
    .header h1 { font-size: 28px; font-weight: 800; color: #1e293b; letter-spacing: 3px; text-transform: uppercase; }
    .header .subtitle { font-size: 11px; color: #6c3bff; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; margin-top: 4px; }
    .sep { width: 60px; height: 3px; background: linear-gradient(90deg, #6c3bff, #4f46e5); margin: 16px auto; border-radius: 2px; }
    .presented-to { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 4px; font-weight: 500; }
    .recipient-name { text-align: center; font-size: 32px; font-weight: 800; color: #0f172a; margin: 8px 0; letter-spacing: -0.5px; }
    .for-text { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 8px; font-weight: 500; }
    .event-title { text-align: center; font-size: 20px; font-weight: 700; color: #4f46e5; margin: 8px 0; }
    .org-text { text-align: center; color: #64748b; font-size: 13px; margin: 6px 0; font-weight: 500; }
    .org-name { text-align: center; font-size: 16px; font-weight: 700; color: #1e293b; margin: 2px 0 12px 0; }
    .platform-line { text-align: center; color: #94a3b8; font-size: 12px; margin-bottom: 16px; font-style: italic; }
    .desc-text { text-align: center; color: #475569; font-size: 13px; line-height: 1.7; max-width: 600px; margin: 0 auto 16px auto; }
    .wish-text { text-align: center; color: #475569; font-size: 13px; line-height: 1.6; max-width: 550px; margin: 0 auto 20px auto; }
    .cert-id-box { text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; display: inline-block; margin: 0 auto 24px auto; }
    .cert-id-box .label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    .cert-id-box .value { font-size: 11px; color: #0f172a; font-weight: 700; letter-spacing: 0.5px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signature-block { text-align: center; width: 45%; }
    .signature-block .line { width: 140px; height: 1px; background: #cbd5e1; margin: 0 auto 6px auto; }
    .signature-block .title { font-size: 10px; color: #64748b; font-weight: 600; }
    .signature-block .name { font-size: 12px; color: #1e293b; font-weight: 700; margin-top: 2px; }
    .footer-qr { position: absolute; bottom: 20px; right: 20px; text-align: center; }
    .footer-qr img { width: 56px; height: 56px; }
    .footer-qr .qr-label { font-size: 7px; color: #94a3b8; line-height: 1.2; margin-top: 2px; }
    .verify-link { text-align: center; margin-top: 16px; }
    .verify-link a { color: #6c3bff; font-size: 10px; text-decoration: none; }
</style>
</head>
<body>
    <div class="cert">
        <div class="cert-border">
            <div class="header">
                <h1>Certificate of Participation</h1>
                <div class="subtitle">Studlyf</div>
            </div>
            <div class="sep"></div>
            <div class="presented-to">This certificate is proudly presented to</div>
            <div class="recipient-name">{{ participant_name }}</div>
            <div class="for-text">for successfully participating in</div>
            <div class="event-title">&ldquo;{{ event_title }}&rdquo;</div>
            <div class="org-text">organized by</div>
            <div class="org-name">{{ organization_name }}</div>
            <div class="platform-line">through the Studlyf platform on {{ event_date }}.</div>
            <div class="desc-text">The participant demonstrated enthusiasm, commitment, and active involvement throughout the event.</div>
            <div class="wish-text">We appreciate their participation and wish them continued success in their learning and professional journey.</div>
            <div class="cert-id-box">
                <div class="label">Certificate ID</div>
                <div class="value">{{ certificate_id }}</div>
                <div class="label" style="margin-top:2px;">Issued Date</div>
                <div class="value">{{ issued_date }}</div>
            </div>
            <div class="signatures">
                <div class="signature-block">
                    <div class="line"></div>
                    <div class="title">Organizer Signature</div>
                    <div class="name">{{ organizer_signature }}</div>
                </div>
                <div class="signature-block">
                    <div class="line"></div>
                    <div class="title">Studlyf Authorized Signature</div>
                    <div class="name">{{ studlyf_signature }}</div>
                </div>
            </div>
            <div class="footer-qr">
                <img src="data:image/png;base64,{{ qr_blob }}" alt="QR">
                <div class="qr-label">Verify<br>{{ cert_short_id }}</div>
            </div>
            <div class="verify-link">
                <a href="{{ verification_url }}">Verify Certificate: {{ verification_url }}</a>
            </div>
        </div>
    </div>
</body>
</html>""")

    async def issue_event_certificate(
        self,
        event_id: str,
        user_id: str,
        participant_name: str,
        event_title: str,
        organization_name: str,
        event_date: str,
        achievement_type: str = "participation",
        event_code: str = "HACK",
        institution_id: str | None = None,
        rank: int | None = None,
        team_id: str | None = None,
        template_id: str | None = None,
    ) -> dict:
        cert_id = generate_certificate_id(event_code)
        v_code = hashlib.sha256(f"{cert_id}:{event_id}:{user_id}".encode()).hexdigest()[:12].upper()
        frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
        v_url = f"{frontend_url}/#/verify/{cert_id}"
        qr_blob = self._generate_qr_blob(v_url)
        issue_date = datetime.utcnow().strftime("%B %d, %Y")
        achievement_label = ACHIEVEMENT_TYPES.get(achievement_type, "Participation")

        html = None
        if template_id:
            tmpl_doc = await cert_templates_col.find_one({"template_id": template_id})
            if tmpl_doc and tmpl_doc.get("html_content"):
                try:
                    html = tmpl_doc["html_content"].format(
                        student_name=participant_name,
                        course_title=event_title,
                        issue_date=issue_date,
                        certificate_id=cert_id,
                        achievement_label=achievement_label,
                        rank=rank or '',
                        cert_type=achievement_type,
                    )
                except Exception as e:
                    print(f"[TEMPLATE ERROR] Rendering failed for template {template_id}: {e}")
                    html = None
            else:
                print(f"[TEMPLATE ERROR] Template {template_id} not found or no content")

        if not html:
            template_path = os.path.join(os.path.dirname(__file__), '../templates/professional_certificate.html')
            self._ensure_template(template_path)
            template = self.jinja_env.get_template('professional_certificate.html')

            html = template.render(
                participant_name=participant_name,
                event_title=event_title,
                organization_name=organization_name,
                event_date=event_date,
                certificate_id=cert_id,
                issued_date=issue_date,
                qr_blob=qr_blob,
                verification_url=v_url,
                cert_short_id=cert_id[-10:],
                organizer_signature=organization_name,
                studlyf_signature="Studlyf Authorized Signature",
            )

        pdf_path = None
        if HAS_WEASYPRINT:
            pdf_path = f"artifacts/certs/certificate_{cert_id}.pdf"
            os.makedirs("artifacts/certs", exist_ok=True)
            HTML(string=html).write_pdf(pdf_path)

        record = _build_certificate_record(
            cert_id=cert_id,
            event_id=event_id,
            user_id=user_id,
            participant_name=participant_name,
            event_title=event_title,
            organization_name=organization_name,
            event_date=event_date,
            achievement_type=achievement_type,
            achievement_label=achievement_label,
            verification_code=v_code,
            verification_url=v_url,
            issued_date=issue_date,
            institution_id=institution_id,
            template_id=template_id,
            rank=rank,
            team_id=team_id,
            pdf_path=pdf_path,
        )
        existing = await event_certificates_col.find_one({
            "event_id": event_id, "user_id": user_id, "achievement_key": achievement_type
        })
        if existing:
            existing["_id"] = str(existing["_id"])
            return existing

        await event_certificates_col.insert_one(record)
        record["_id"] = str(record["_id"])

        return record

    async def issue_ranked_event_certificates(self, event_id: str, rankings: list, send_email: bool = True, template_id: str | None = None) -> list:
        from db import events_col, participants_col, teams_col, users_col
        from services.email_template_service import get_active_template, render_template
        from services.email_service import (
            send_notification_email,
            get_certificate_issued_template,
            get_winner_announcement_template,
            get_feedback_request_template,
        )

        event = await events_col.find_one({"_id": ObjectId(event_id)})
        if not event:
            return []

        event_title = event.get("title", "Untitled Event")
        org_name = event.get("organisation") or event.get("organization") or "Unknown"
        event_date = event.get("eventDate") or event.get("start_date") or datetime.utcnow().strftime("%B %d, %Y")
        institution_id = str(event.get("institution_id", ""))
        event_code = (event.get("eventCode") or event.get("event_type") or "HACK")[:6].upper()
        frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
        template_id = template_id or event.get("template_id")

        template = await get_active_template(event_id, institution_id, "certificate_issued")
        issued_records: list = []

        for rank_data in rankings or []:
            rank = rank_data.get("rank")
            achievement_type = str(rank_data.get("achievement_type") or "").strip() or resolve_rank_achievement(rank)
            team_id = rank_data.get("team_id")
            participant_id = rank_data.get("participant_id")
            recipients: list[dict] = []

            if team_id:
                team_doc = None
                try:
                    team_doc = await teams_col.find_one({"_id": ObjectId(str(team_id))})
                except Exception:
                    team_doc = await teams_col.find_one({"_id": team_id})
                if team_doc:
                    for member in team_doc.get("members", []) or []:
                        member_user_id = str(member.get("user_id") or member.get("id") or member.get("_id") or "")
                        if not member_user_id:
                            continue
                        member_name = member.get("name") or member.get("full_name") or team_doc.get("team_name") or "Participant"
                        member_email = member.get("email") or ""
                        if not member_email:
                            user_doc = await users_col.find_one({"user_id": member_user_id})
                            member_email = (user_doc or {}).get("email", "")
                            member_name = (user_doc or {}).get("full_name") or (user_doc or {}).get("name") or member_name
                        recipients.append({"user_id": member_user_id, "name": member_name, "email": member_email})
            elif participant_id:
                participant_doc = None
                try:
                    participant_doc = await participants_col.find_one({"_id": ObjectId(str(participant_id))})
                except Exception:
                    participant_doc = await participants_col.find_one({"_id": participant_id})
                if participant_doc:
                    participant_user_id = str(participant_doc.get("user_id") or "")
                    if participant_user_id:
                        participant_name = participant_doc.get("name") or participant_doc.get("full_name") or "Participant"
                        participant_email = participant_doc.get("email") or ""
                        if not participant_email:
                            user_doc = await users_col.find_one({"user_id": participant_user_id})
                            participant_email = (user_doc or {}).get("email", "")
                            participant_name = (user_doc or {}).get("full_name") or (user_doc or {}).get("name") or participant_name
                        recipients.append({"user_id": participant_user_id, "name": participant_name, "email": participant_email})

            for recipient in recipients:
                existing = await event_certificates_col.find_one({
                    "event_id": event_id,
                    "user_id": recipient["user_id"],
                    "achievement_key": achievement_type,
                })
                if existing:
                    continue

                band_template_id = rank_data.get("template_id") or template_id

                record = await self.issue_event_certificate(
                    event_id=event_id,
                    user_id=recipient["user_id"],
                    participant_name=recipient["name"],
                    event_title=event_title,
                    organization_name=org_name,
                    event_date=event_date,
                    achievement_type=achievement_type,
                    event_code=event_code,
                    institution_id=institution_id,
                    template_id=band_template_id,
                    rank=rank,
                    team_id=str(team_id) if team_id else None,
                )
                issued_records.append(record)

                if not send_email or not recipient.get("email"):
                    continue

                try:
                    context = {
                        "participant_name": recipient["name"],
                        "event_title": event_title,
                        "organization_name": org_name,
                        "event_date": event_date,
                        "certificate_id": record["certificate_id"],
                        "issued_date": record["issued_date"],
                        "certificate_download_link": f"{frontend_url}/api/v1/institution/download-certificate/{record['certificate_id']}",
                        "verification_url": record["verification_url"],
                    }
                    subj, body = render_template(template, context) if template else (
                        f"Certificate Issued: {event_title}",
                        get_certificate_issued_template(
                            participant_name=recipient["name"],
                            event_title=event_title,
                            organization_name=org_name,
                            certificate_id=record["certificate_id"],
                            issued_date=record["issued_date"],
                            certificate_download_link=f"{frontend_url}/api/v1/institution/download-certificate/{record['certificate_id']}",
                            verification_url=record["verification_url"],
                        ),
                    )
                    await send_notification_email(recipient["email"], subj, body)

                    if rank == 1:
                        winner_subject = f"Winner Announcement: {event_title}"
                        winner_body = get_winner_announcement_template(
                            participant_name=recipient["name"],
                            event_title=event_title,
                            organization_name=org_name,
                            rank=str(rank),
                            prize_details=f"Rank {rank} achiever in {event_title}",
                            results_link=f"{frontend_url}/events/{event_id}",
                        )
                        await send_notification_email(recipient["email"], winner_subject, winner_body)

                    feedback_subject = f"We'd love your feedback on {event_title}"
                    feedback_body = get_feedback_request_template(
                        participant_name=recipient["name"],
                        event_title=event_title,
                        organization_name=org_name,
                        feedback_link=f"{frontend_url}/events/{event_id}?tab=feedback",
                    )
                    await send_notification_email(recipient["email"], feedback_subject, feedback_body)
                except Exception as e:
                    print(f"[CERT EMAIL FAIL] {recipient['user_id']}: {e}")

        return issued_records

    async def get_certificate(self, certificate_id: str) -> dict:
        cert = await event_certificates_col.find_one({"certificate_id": certificate_id})
        if cert:
            cert["_id"] = str(cert["_id"])
        return cert

    async def get_user_certificates(self, event_id: str, user_id: str) -> list:
        cursor = event_certificates_col.find({"event_id": event_id, "user_id": user_id}).sort("issued_at", -1)
        certs = await cursor.to_list(length=None)
        for c in certs:
            c["_id"] = str(c["_id"])
        return certs

    async def get_event_certificates(self, event_id: str) -> list:
        cursor = event_certificates_col.find({"event_id": event_id}).sort("issued_at", -1)
        certs = await cursor.to_list(length=None)
        for c in certs:
            c["_id"] = str(c["_id"])
        return certs


async def enqueue_certificate_job(event_id: str, achievement_type: str = "participation", event_code: str = "HACK", template_id: str | None = None) -> str:
    """Create a certificate generation job in the queue. Returns job_id."""
    result = await certificate_jobs_col.insert_one({
        "event_id": event_id,
        "achievement_type": achievement_type,
        "event_code": event_code,
        "template_id": template_id,
        "status": "pending",
        "processed": 0,
        "total": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return str(result.inserted_id)


async def process_certificate_jobs():
    """Background worker: polls certificate_jobs_col for pending jobs and processes them."""
    import asyncio
    from db import certificate_jobs_col, events_col, participants_col, users_col, event_certificates_col
    from services.email_template_service import send_template_email

    while True:
        try:
            job = await certificate_jobs_col.find_one_and_update(
                {"status": "pending"},
                {"$set": {"status": "processing", "started_at": datetime.utcnow()}},
                sort=[("created_at", 1)],
            )
            if not job:
                await asyncio.sleep(5)
                continue

            event_id = job["event_id"]
            achievement_type = job.get("achievement_type", "participation")
            event_code = job.get("event_code", "HACK")
            template_id = job.get("template_id")
            event = await events_col.find_one({"_id": ObjectId(event_id)}) if event_id else None
            if not event:
                await certificate_jobs_col.update_one(
                    {"_id": job["_id"]},
                    {"$set": {"status": "failed", "error": "Event not found", "completed_at": datetime.utcnow()}},
                )
                continue

            event_title = event.get("title", "Untitled Event")
            org_name = event.get("organisation") or event.get("organization") or "Unknown"
            event_date = event.get("eventDate") or event.get("start_date") or datetime.utcnow().strftime("%B %d, %Y")
            institution_id = str(event.get("institution_id", ""))
            frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
            template = await get_active_template(event_id, institution_id, "certificate_issued")

            cursor = participants_col.find({"event_id": event_id})
            total = await participants_col.count_documents({"event_id": event_id})
            processed = 0
            batch_size = 100
            pending_records: list[dict] = []
            pending_email_jobs: list[tuple[str, str, str]] = []

            async def flush_pending_batch():
                nonlocal pending_records, pending_email_jobs, processed
                if not pending_records:
                    return
                await event_certificates_col.insert_many(pending_records)
                for email, subj, body in pending_email_jobs:
                    try:
                        from services.email_service import send_notification_email
                        await send_notification_email(email, subj, body)
                    except Exception as e:
                        print(f"[CERT BG EMAIL FAIL] batch-send: {e}")
                processed += len(pending_records)
                await certificate_jobs_col.update_one(
                    {"_id": job["_id"]},
                    {"$set": {"processed": processed, "updated_at": datetime.utcnow()}},
                )
                pending_records = []
                pending_email_jobs = []

            async for participant in cursor:
                pid = participant.get("user_id")
                if not pid:
                    continue

                existing = await event_certificates_col.find_one({
                    "event_id": event_id, "user_id": pid, "achievement_key": achievement_type
                })
                if existing:
                    processed += 1
                    continue

                pname = participant.get("name") or participant.get("participant_name") or "Participant"
                puser = await users_col.find_one({"user_id": pid})
                cert_id = generate_certificate_id(event_code[:6].upper())
                v_code = hashlib.sha256(f"{cert_id}:{event_id}:{pid}".encode()).hexdigest()[:12].upper()
                v_url = f"{frontend_url}/#/verify/{cert_id}"
                issue_date = datetime.utcnow().strftime("%B %d, %Y")
                record = _build_certificate_record(
                    cert_id=cert_id,
                    event_id=event_id,
                    user_id=pid,
                    participant_name=pname,
                    event_title=event_title,
                    organization_name=org_name,
                    event_date=event_date,
                    achievement_type=achievement_type,
                    achievement_label=ACHIEVEMENT_TYPES.get(achievement_type, "Participation"),
                    verification_code=v_code,
                    verification_url=v_url,
                    issued_date=issue_date,
                    institution_id=institution_id,
                    template_id=template_id,
                )
                pending_records.append(record)

                try:
                    pemail = (puser or {}).get("email", "").strip()
                    if pemail:
                        context = {
                            "participant_name": pname,
                            "event_title": event_title,
                            "organization_name": org_name,
                            "event_date": event_date,
                            "certificate_id": cert_id,
                            "issued_date": issue_date,
                            "certificate_download_link": f"{frontend_url}/api/v1/institution/download-certificate/{cert_id}",
                            "verification_url": v_url,
                        }
                        if template:
                            subj, body = render_template(template, context)
                        else:
                            from services.email_service import get_certificate_issued_template
                            subj = f"Certificate Issued: {event_title}"
                            body = get_certificate_issued_template(
                                participant_name=pname,
                                event_title=event_title,
                                organization_name=org_name,
                                certificate_id=cert_id,
                                issued_date=issue_date,
                                certificate_download_link=f"{frontend_url}/api/v1/institution/download-certificate/{cert_id}",
                                verification_url=v_url,
                            )
                        pending_email_jobs.append((pemail, subj, body))
                except Exception as e:
                    print(f"[CERT BG EMAIL FAIL] {pid}: {e}")

                if len(pending_records) >= batch_size:
                    await flush_pending_batch()

            await flush_pending_batch()

            await certificate_jobs_col.update_one(
                {"_id": job["_id"]},
                {"$set": {"status": "completed", "processed": processed, "total": total, "completed_at": datetime.utcnow()}},
            )

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[CERT QUEUE ERROR] {e}")
            await asyncio.sleep(10)


certificate_service = InstitutionalCertificateService()


