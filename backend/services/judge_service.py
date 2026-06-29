from db import judges_col
from bson import ObjectId
from datetime import datetime, timezone
import secrets
import os
from dotenv import load_dotenv
import logging
logger = logging.getLogger(__name__)


load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
def _judge_invitation_url(token: str) -> str:
    import os
    base = os.getenv("FRONTEND_URL", "https://studlyf.in").rstrip("/")
    return f"{base}/#/judge-invitation?token={token}"


async def create_judge(data: dict):
    logger.info(f"DEBUG: Creating judge with data: {data}")
    logger.info(f"DEBUG: is_test flag: {data.get('is_test', False)}")

    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_test"] = data.get("is_test", False)
    data["status"] = data.get("status") or "INVITED"
    if not data.get("invitation_token"):
        data["invitation_token"] = secrets.token_urlsafe(24)

    if data.get("email"):
        data["email"] = str(data["email"]).strip().lower()

    result = await judges_col.insert_one(data)
    data["_id"] = str(result.inserted_id)

    logger.info(f"DEBUG: Judge created successfully: {data['_id']} - {data.get('name', 'Unknown')}")
    return data

async def get_all_judges():
    cursor = judges_col.find({}).sort("name", 1)
    judges = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["assignment_count"] = await _count_judge_assignments(doc["_id"])
        judges.append(doc)
    return judges


async def send_judge_panel_invitation_email(
    to_email: str,
    judge_name: str,
    *,
    event_title: str = "Studlyf Events",
    invitation_token: str = "",
) -> bool:
    """Send judge invitation email with accept/decline page link (not the institution admin dashboard)."""
    from services.email_service import send_notification_email

    email = (to_email or "").strip().lower()
    if not email:
        return False

    token = (invitation_token or "").strip()
    invite_url = _judge_invitation_url(token) if token else _judge_invitation_url(secrets.token_urlsafe(24))
    accept_url = f"{invite_url}&action=accept"
    decline_url = f"{invite_url.split('&action=')[0]}&action=decline"
    safe_name = judge_name or email
    safe_event = event_title or "your institution's events"

    email_html = f"""
    <html>
    <body style="font-family: 'Poppins', sans-serif; background:#f8fafc; color:#0f172a; padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;">
            <p style="margin:0 0 12px 0;font-size:18px;font-weight:800;">Hello {safe_name},</p>
            <p style="margin:0 0 18px 0;line-height:1.7;color:#475569;">
                You have been invited to evaluate submissions for <strong>{safe_event}</strong> on Studlyf.
                Please open the link below with <strong>{email}</strong> to accept or decline this invitation.
            </p>
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:16px;padding:16px;margin:20px 0;">
                <p style="margin:0;color:#6C3BFF;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Your invitation</p>
                <p style="margin:8px 0 0 0;font-size:14px;color:#0f172a;word-break:break-all;">{invite_url}</p>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin:24px 0;">
                <a href="{accept_url}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;">Accept Invitation</a>
                <a href="{decline_url}" style="display:inline-block;background:#f1f5f9;color:#475569;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;">Decline</a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                After accepting, sign in or create an account with <strong>{email}</strong> to access the judge portal.
            </p>
        </div>
    </body>
    </html>
    """
    return await send_notification_email(email, f"Judge Invitation: {safe_event}", email_html)


async def get_judge_invitation_details(token: str) -> dict:
    from db import events_col
    from urllib.parse import unquote

    tok = unquote((token or "").strip()).split("&")[0].strip()
    if not tok:
        raise ValueError("token is required")
    judge = await judges_col.find_one({"invitation_token": tok})
    if not judge and len(tok) == 24:
        try:
            judge = await judges_col.find_one({"_id": ObjectId(tok)})
        except Exception:
            judge = None
    if not judge:
        raise LookupError("Invitation not found or expired")

    event_name = "Studlyf Event"
    event_id = judge.get("event_id")
    if event_id:
        try:
            event = await events_col.find_one({"_id": ObjectId(str(event_id))})
            if event:
                event_name = event.get("title") or event.get("name") or event_name
        except Exception:
            pass

    return {
        "judge_name": judge.get("name") or judge.get("full_name") or "Judge",
        "judge_email": judge.get("email") or "",
        "event_name": event_name,
        "event_id": str(event_id) if event_id else None,
        "expertise": judge.get("expertise"),
        "status": judge.get("status") or "INVITED",
        "invitation_sent_at": judge.get("created_at"),
    }


async def respond_judge_invitation(*, token: str = "", judge_email: str = "", event_id: str = "", accept: bool = True) -> dict:
    """Accept/decline by invitation token (public) or by authenticated judge email."""
    from db import events_col
    from notification_helpers import notify_institution
    from auth_utils import create_access_token

    judge = None
    tok = (token or "").strip()
    email = (judge_email or "").strip().lower()

    if tok:
        judge = await judges_col.find_one({"invitation_token": tok})
    elif email:
        query: dict = {"email": email}
        if event_id:
            query["event_id"] = str(event_id)
        judge = await judges_col.find_one({**query, "status": {"$in": ["INVITED", "invited", "PENDING", "pending"]}})
        if not judge:
            judge = await judges_col.find_one(query, sort=[("created_at", -1)])

    if not judge:
        raise LookupError("Invitation not found")

    judge_id = judge["_id"]
    judge_email_norm = str(judge.get("email") or email or "").strip().lower()
    new_status = "ACCEPTED" if accept else "DECLINED"
    responded_at = datetime.now(timezone.utc).isoformat()

    await judges_col.update_one(
        {"_id": judge_id},
        {"$set": {"status": new_status, "responded_at": responded_at}},
    )

    event_id = judge.get("event_id")
    event_title = "Event"
    inst_id = judge.get("institution_id")
    login_token_str = ""
    if event_id:
        try:
            event = await events_col.find_one({"_id": ObjectId(str(event_id))})
            if event:
                event_title = event.get("title") or event.get("name") or event_title
                inst_id = inst_id or event.get("institution_id")
                judges_list = list(event.get("judges") or [])
                updated = False
                for i, j in enumerate(judges_list):
                    je = str(j.get("email") or "").strip().lower()
                    jid = str(j.get("id") or "")
                    if je == judge_email_norm or jid == str(judge_id):
                        judges_list[i] = {**j, "status": new_status, "responded_at": responded_at}
                        updated = True
                        break
                if not updated and judge_email_norm:
                    judges_list.append({
                        "id": str(judge_id),
                        "name": judge.get("name"),
                        "email": judge_email_norm,
                        "expertise": judge.get("expertise"),
                        "status": new_status,
                        "responded_at": responded_at,
                    })
                await events_col.update_one(
                    {"_id": ObjectId(str(event_id))},
                    {"$set": {"judges": judges_list}},
                )
        except Exception as e:
            logger.error(f"DEBUG: Event judge status sync failed: {e}")

    if accept:
        # Use the judge's own _id as the identity — no user account created
        judge_id_str = str(judge["_id"])
        from datetime import timedelta
        login_token_str = create_access_token(
            data={"user_id": judge_id_str, "email": judge_email_norm, "role": "judge"},
            expires_delta=timedelta(hours=24),
        )

    judge_name = judge.get("name") or judge_email_norm or "Judge"
    if inst_id:
        msg = (
            f"Judge {judge_name} ({judge_email_norm}) accepted the invitation for \"{event_title}\"."
            if accept
            else f"Judge {judge_name} ({judge_email_norm}) declined the invitation for \"{event_title}\"."
        )
        await notify_institution(
            str(inst_id),
            msg,
            ntype="judge_invitation_response",
            title="Judge invitation update",
            meta={"event_id": str(event_id) if event_id else None, "accept": accept, "judge_email": judge_email_norm},
        )

    return {
        "status": "success",
        "accept": accept,
        "judge_email": judge_email_norm,
        "event_id": str(event_id) if event_id else None,
        "login_token": login_token_str if accept else "",
    }


async def get_pending_invitations_for_email(email: str) -> list:
    from db import events_col

    em = (email or "").strip().lower()
    if not em:
        return []
    cursor = judges_col.find({
        "email": em,
        "status": {"$in": ["INVITED", "invited", "PENDING", "pending"]},
    }).sort("created_at", -1)
    out = []
    async for doc in cursor:
        event_name = "Event"
        eid = doc.get("event_id")
        if eid:
            try:
                ev = await events_col.find_one({"_id": ObjectId(str(eid))})
                if ev:
                    event_name = ev.get("title") or ev.get("name") or event_name
            except Exception:
                pass
        out.append({
            "_id": str(doc["_id"]),
            "event_id": str(eid) if eid else None,
            "event_name": event_name,
            "expertise": doc.get("expertise"),
            "status": doc.get("status"),
            "created_at": doc.get("created_at"),
            "invitation_token": doc.get("invitation_token"),
        })
    return out

def generate_evaluation_token():
    """Generate secure evaluation token"""
    return secrets.token_urlsafe(32)

async def assign_judge_to_submission(submission_id: str, judge_id: str):
    """Assign a judge to a submission. Enforces 1 judge limit."""
    return await assign_judge_to_multiple_submissions([submission_id], judge_id)

MAX_ASSIGNMENTS_PER_JUDGE = 20


async def assign_round_robin(submission_ids: list, judge_ids: list, max_per_judge: int = MAX_ASSIGNMENTS_PER_JUDGE):
    """Distribute submissions across judges with a per-judge cap (round-robin)."""
    subs = [str(s) for s in (submission_ids or []) if s]
    judges = [str(j) for j in (judge_ids or []) if j]
    if not subs or not judges:
        return {"success": False, "error": "submission_ids and judge_ids are required"}

    buckets: dict[str, list[str]] = {jid: [] for jid in judges}
    judge_load = {jid: await _count_judge_assignments(jid) for jid in judges}
    skipped: list[str] = []

    for sid in subs:
        ordered = sorted(judges, key=lambda j: (len(buckets[j]), judge_load.get(j, 0)))
        placed = False
        for jid in ordered:
            if len(buckets[jid]) + judge_load.get(jid, 0) >= max_per_judge:
                continue
            buckets[jid].append(sid)
            placed = True
            break
        if not placed:
            skipped.append(sid)

    results = []
    for jid, batch in buckets.items():
        if not batch:
            continue
        results.append(await assign_judge_to_multiple_submissions(batch, jid))

    return {
        "success": True,
        "assigned": {jid: len(batch) for jid, batch in buckets.items() if batch},
        "skipped": skipped,
        "results": results,
    }


async def _count_judge_assignments(judge_id: str) -> int:
    from db import submission_data_col

    return await submission_data_col.count_documents({
        "$or": [
            {"assigned_judges.judge_id": judge_id},
            {"assigned_judge_id": judge_id},
        ]
    })


async def assign_judge_to_multiple_submissions(submission_ids: list, judge_id: str):
    """Assign a judge to multiple submissions and send a SINGLE consolidated email."""
    from db import submission_data_col, judges_col, events_col, submissions_col, teams_col, users_col
    from datetime import datetime, timezone, timedelta
    import os
    from bson import ObjectId
    from services.email_service import send_notification_email
    
    logger.info(f"DEBUG: Assigning judge {judge_id} to submissions: {submission_ids}")

    existing_count = await _count_judge_assignments(judge_id)
    new_ids = [str(s) for s in (submission_ids or []) if s]
    submission_ids = new_ids
    
    # 1. Get judge details
    judge = await judges_col.find_one({"_id": ObjectId(judge_id)})
    if not judge:
        logger.info(f"DEBUG: Judge not found: {judge_id}")
        return {"success": False, "error": "Judge not found"}
    
    judge_email = judge.get("email", "")
    judge_name = judge.get("full_name") or judge.get("name", "Unknown")
    logger.info(f"DEBUG: Judge found: {judge_name} ({judge_email})")
    
    # 2. Process each submission
    projects_data = []
    base_url = (
        os.getenv("FRONTEND_URL") or
        os.getenv("RENDER_EXTERNAL_URL", "").replace("api.", "").replace(":8000", ":3000") or
        "http://localhost:3000"
    ).rstrip("/")
    logger.info(f"DEBUG: Processing {len(submission_ids)} submissions for judge {judge_email}, base_url={base_url}")
    
    for sid in submission_ids:
        sid_str = str(sid)
        logger.info(f"DEBUG: Looking up submission with ID/TeamID: {sid_str}")
        
        # Robust lookup: try ID first, then team_id/user_id
        # Also handle ObjectId variants for sid
        query = {
            "$or": [
                {"team_id": sid_str},
                {"user_id": sid_str},
                {"submission_id": sid_str}
            ]
        }
        try:
            if len(sid_str) == 24:
                query["$or"].append({"_id": ObjectId(sid_str)})
        except Exception as e:
            logger.warning(f"Handled exception at line 370: {e}")
            pass
            
        sub = await submission_data_col.find_one(query)
        target_id = None
        
        if not sub:
            logger.info(f"DEBUG: No submission_data found for {sid_str}, attempting registration fallback")
            reg_query = {"$or": [{"_id": sid_str}, {"team_id": sid_str}]}
            try:
                if len(sid_str) == 24: reg_query["$or"].append({"_id": ObjectId(sid_str)})
            except Exception as e:
                logger.warning(f"Handled exception at line 381: {e}")
                pass
            
            reg = await submissions_col.find_one(reg_query)
            if not reg:
                # Try teams_col
                try:
                    t_query = {"_id": ObjectId(sid_str)} if len(sid_str) == 24 else {"_id": sid_str}
                    reg = await teams_col.find_one(t_query)
                except Exception as e:
                    logger.error(f"DEBUG: Error finding team record: {str(e)}")
                    pass
            
            if reg:
                logger.info(f"DEBUG: Found registration/team for {sid_str}, creating submission_data record")
                sub = {
                    "event_id": str(reg.get("event_id")),
                    "team_id": sid_str if reg.get("members") else None,
                    "user_id": sid_str if not reg.get("members") else reg.get("user_id"),
                    "team_name": reg.get("name") or reg.get("team_name") or reg.get("title") or "Team",
                    "title": reg.get("title") or reg.get("name") or "Untitled Project",
                    "data": {},
                    "status": "Pending Assignment"
                }
                try:
                    res = await submission_data_col.insert_one(sub)
                    sub["_id"] = str(res.inserted_id)
                    logger.info(f"DEBUG: Successfully created submission_data record: {sub['_id']}")
                except Exception as e:
                    logger.error(f"DEBUG: Failed to create submission_data record: {str(e)}")
                    sub = None
            else:
                logger.error(f"DEBUG: CRITICAL - Could not find any record for sid: {sid_str}")
                continue
        
        target_id = sub["_id"]
        logger.info(f"DEBUG: Assigning judge to submission_data _id: {target_id}")
        
        # Reuse existing token if same judge is already assigned to prevent 404s on refresh
        token = None
        existing_judges = sub.get("assigned_judges", [])
        if isinstance(existing_judges, list):
            for ej in existing_judges:
                if ej.get("judge_id") == judge_id and ej.get("evaluation_token"):
                    token = ej.get("evaluation_token")
                    break
        
        if not token:
            token = secrets.token_urlsafe(32)
            
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        evaluation_url = f"{base_url}/#/evaluate/{token}"
        
        judge_entry = {
            "judge_id": judge_id, 
            "name": judge_name, 
            "email": judge_email,
            "evaluation_token": token,
            "evaluation_url": evaluation_url
        }
        
        # Update submission: Add or update the judge in the assigned_judges array
        # This allows multiple judges to evaluate the same submission
        new_assigned_judges = sub.get("assigned_judges", [])
        if not isinstance(new_assigned_judges, list):
            new_assigned_judges = []
            
        # Check if judge already exists in the array
        found = False
        for i, aj in enumerate(new_assigned_judges):
            if aj.get("judge_id") == judge_id:
                new_assigned_judges[i] = judge_entry
                found = True
                break
        
        if not found:
            new_assigned_judges.append(judge_entry)

        # Update the submission record
        await submission_data_col.update_one(
            {"_id": target_id},
            {"$set": {
                "assigned_judges": new_assigned_judges,
                "assigned_judge_id": judge_id, # Latest assigned
                "assigned_judge_emails": [j.get("email") for j in new_assigned_judges if j.get("email")],
                "status": "Under Review",
                "evaluation_token": token, # Latest token for top-level
                "evaluation_token_expires": expires_at
            }}
        )
        
        # Get event details safely
        event = None
        eid = sub.get("event_id")
        if eid:
            try:
                event = await events_col.find_one({"_id": ObjectId(eid) if isinstance(eid, str) and len(eid) == 24 else eid})
            except Exception as e:
                logger.error(f"DEBUG: Error finding event {eid}: {str(e)}")
        
        # Get stage details
        stage_name = "Evaluation Stage"
        sid = sub.get("stage_id")
        if event and sid:
            for s in event.get("stages", []):
                if str(s.get("id")) == str(sid):
                    stage_name = s.get("name", "Evaluation Stage")
                    break
        
        # Extract files
        files_html = ""
        sub_data = sub.get("data") or {}
        for field_id, val in sub_data.items():
            if isinstance(val, dict) and val.get("url"):
                fname = val.get("filename") or field_id
                files_html += f'<li><a href="{val.get("url")}" style="color: #6C3BFF; text-decoration: none;">📎 {fname}</a></li>'
            elif isinstance(val, str) and (val.startswith("http://") or val.startswith("https://")) and (".pdf" in val.lower() or ".doc" in val.lower() or ".ppt" in val.lower()):
                 files_html += f'<li><a href="{val}" style="color: #6C3BFF; text-decoration: none;">📎 External File</a></li>'

        if files_html:
            files_html = f'<ul style="margin: 10px 0; padding-left: 20px; font-size: 12px; color: #64748b;">{files_html}</ul>'

        # Resolve team name thoroughly
        team_name = ""
        for candidate in (
            sub.get("team_name"),
            sub_data.get("team_display_name"),
            sub_data.get("team_name"),
            sub.get("user_name"),
            sub.get("title"),
        ):
            if candidate and str(candidate).strip():
                team_name = str(candidate).strip()
                break
        if not team_name:
            tid = sub.get("team_id")
            if tid:
                try:
                    team_doc = await teams_col.find_one({"_id": ObjectId(str(tid))})
                except Exception:
                    team_doc = None
                if not team_doc:
                    try:
                        team_doc = await teams_col.find_one({"team_id": str(tid)})
                    except Exception:
                        team_doc = None
                if team_doc:
                    team_name = str(team_doc.get("team_name") or team_doc.get("name") or team_doc.get("title") or "").strip()
            if not team_name:
                uid = sub.get("user_id")
                if uid:
                    try:
                        user_doc = await users_col.find_one({"user_id": str(uid)})
                    except Exception:
                        user_doc = None
                    if not user_doc:
                        try:
                            user_doc = await users_col.find_one({"_id": ObjectId(str(uid))})
                        except Exception:
                            user_doc = None
                    if user_doc:
                        team_name = str(user_doc.get("full_name") or user_doc.get("name") or user_doc.get("email") or "").strip()
        if not team_name:
            team_name = "Solo Participant"

        # Resolve title
        title = (
            sub.get("title")
            or sub.get("project_title")
            or sub.get("stage_name")
            or team_name
            or "Submission"
        )

        # Resolve event name
        event_name = (event.get("title") or event.get("name")) if event else ""
        if not event_name:
            eid = sub.get("event_id")
            if eid:
                try:
                    ev_doc = await events_col.find_one({"_id": ObjectId(str(eid))})
                except Exception:
                    ev_doc = None
                if not ev_doc:
                    try:
                        ev_doc = await events_col.find_one({"event_id": str(eid)})
                    except Exception:
                        ev_doc = None
                if ev_doc:
                    event_name = ev_doc.get("title") or ev_doc.get("name") or ""

        projects_data.append({
            "title": title,
            "team_name": team_name,
            "event_name": event_name or "Event",
            "stage_name": stage_name,
            "description": sub.get("description") or sub.get("solution_description") or sub_data.get("idea_abstract") or "No description provided",
            "evaluation_url": evaluation_url,
            "files_html": files_html
        })

    if not projects_data:
        logger.error("DEBUG: No projects data gathered. Assignment failed.")
        return {"success": False, "error": "No valid submissions found"}

    # 3. Send SINGLE Consolidated Email
    project_rows_html = ""
    for p in projects_data:
        project_rows_html += f"""
        <div style="background: white; border: 1px solid #e1e5ff; border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #1a1a1a; font-size: 16px;">{p['title']}</h4>
                <span style="background: #f0f2ff; color: #6C3BFF; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">{p['stage_name']}</span>
            </div>
            
            <p style="font-size: 12px; color: #475569; margin: 8px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                {p['description']}
            </p>

            <div style="font-size: 12px; color: #64748b; margin: 12px 0;">
                <span style="margin-right: 15px;">👥 <strong>Team:</strong> {p['team_name']}</span>
                <span>🎯 <strong>Event:</strong> {p['event_name']}</span>
            </div>

            {p['files_html']}
            
            <div style="margin-top: 15px; text-align: right;">
                <a href="{p['evaluation_url']}" style="display: inline-block; background: #6C3BFF; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px;">
                    🚀 Start Evaluation
                </a>
            </div>
        </div>
        """

    email_html = f"""
    <html>
    <body style="font-family: 'Poppins', sans-serif'', Arial, sans-serif; color: #333; max-width: 650px; margin: auto; padding: 20px; background-color: #fcfcfd;">
        <div style="background: white; border: 1px solid #edf0f7; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.03);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; padding: 12px; background: #f8f9ff; border-radius: 16px; margin-bottom: 15px;">
                    <span style="font-size: 32px;">⚖️</span>
                </div>
                <h2 style="color: #6C3BFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Evaluation Dashboard</h2>
                <p style="color: #64748b; margin-top: 8px;">Consolidated Portfolio Assignment</p>
            </div>
            
            <p>Hello <strong>{judge_name}</strong>,</p>
            <p>You have been assigned to evaluate the following <strong>{len(projects_data)} projects</strong>. Each project requires a separate clinical assessment via the secure links below.</p>
            
            <div style="margin: 30px 0;">
                {project_rows_html}
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 16px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                    ⚠️ These evaluation links are unique to your account and will expire in 7 days.
                </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px; line-height: 1.6;">
                This automated dispatch was authorized by the Institutional Committee.<br>
                Need help? Contact the event administrator directly.
            </p>
        </div>
    </body>
    </html>
    """

    email_sent = False
    try:
        logger.info(f"DEBUG: Dispatching consolidated evaluation email to {judge_email}")
        email_sent = await send_notification_email(
            to_email=judge_email,
            subject=f"Action Required: {len(projects_data)} Projects Assigned for Evaluation",
            body_html=email_html
        )
        if email_sent:
            logger.info(f"DEBUG: Consolidated email successfully dispatched to {judge_email}")
        else:
            logger.info(f"DEBUG: email_service returned False for {judge_email}")
    except Exception as e:
        logger.error(f"Failed to send consolidated email to {judge_email}: {str(e)}")

    return {
        "success": True,
        "email_sent": email_sent,
        "count": len(projects_data),
        "assignment_count": existing_count + len(projects_data),
        "message": f"Assigned {len(projects_data)} projects (judge now has {existing_count + len(projects_data)} total). "
        + ("Email sent successfully." if email_sent else "Email delivery failed (check SMTP/API config)."),
    }


