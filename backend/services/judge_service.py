from db import judges_col
from bson import ObjectId
from datetime import datetime, timezone
import secrets

async def create_judge(data: dict):
    print(f"DEBUG: Creating judge with data: {data}")
    print(f"DEBUG: is_test flag: {data.get('is_test', False)}")
    
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_test"] = data.get("is_test", False)  # Ensure is_test flag is set
    
    result = await judges_col.insert_one(data)
    data["_id"] = str(result.inserted_id)
    
    print(f"DEBUG: Judge created successfully: {data['_id']} - {data.get('name', 'Unknown')}")
    return data

async def get_all_judges():
    cursor = judges_col.find({}).sort("name", 1)
    judges = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        judges.append(doc)
    return judges

def generate_evaluation_token():
    """Generate secure evaluation token"""
    return secrets.token_urlsafe(32)

async def assign_judge_to_submission(submission_id: str, judge_id: str):
    """Assign a judge to a submission. Enforces 1 judge limit."""
    return await assign_judge_to_multiple_submissions([submission_id], judge_id)

async def assign_judge_to_multiple_submissions(submission_ids: list, judge_id: str):
    """Assign a judge to multiple submissions and send a SINGLE consolidated email."""
    from db import submission_data_col, judges_col, events_col, submissions_col, teams_col
    from datetime import datetime, timezone, timedelta
    import os
    from bson import ObjectId
    from services.email_service import send_notification_email
    
    print(f"DEBUG: Assigning judge {judge_id} to submissions: {submission_ids}")
    
    # 1. Get judge details
    judge = await judges_col.find_one({"_id": ObjectId(judge_id)})
    if not judge:
        print(f"DEBUG: Judge not found: {judge_id}")
        return {"success": False, "error": "Judge not found"}
    
    judge_email = judge.get("email", "")
    judge_name = judge.get("full_name") or judge.get("name", "Unknown")
    print(f"DEBUG: Judge found: {judge_name} ({judge_email})")
    
    # 2. Process each submission
    projects_data = []
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    print(f"DEBUG: Processing {len(submission_ids)} submissions for judge {judge_email}")
    
    for sid in submission_ids:
        sid_str = str(sid)
        print(f"DEBUG: Looking up submission with ID/TeamID: {sid_str}")
        
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
        except:
            pass
            
        sub = await submission_data_col.find_one(query)
        target_id = None
        
        if not sub:
            print(f"DEBUG: No submission_data found for {sid_str}, attempting registration fallback")
            reg_query = {"$or": [{"_id": sid_str}, {"team_id": sid_str}]}
            try:
                if len(sid_str) == 24: reg_query["$or"].append({"_id": ObjectId(sid_str)})
            except: pass
            
            reg = await submissions_col.find_one(reg_query)
            if not reg:
                # Try teams_col
                try:
                    t_query = {"_id": ObjectId(sid_str)} if len(sid_str) == 24 else {"_id": sid_str}
                    reg = await teams_col.find_one(t_query)
                except Exception as e:
                    print(f"DEBUG: Error finding team record: {str(e)}")
                    pass
            
            if reg:
                print(f"DEBUG: Found registration/team for {sid_str}, creating submission_data record")
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
                    print(f"DEBUG: Successfully created submission_data record: {sub['_id']}")
                except Exception as e:
                    print(f"DEBUG: Failed to create submission_data record: {str(e)}")
                    sub = None
            else:
                print(f"DEBUG: CRITICAL - Could not find any record for sid: {sid_str}")
                continue
        
        target_id = sub["_id"]
        print(f"DEBUG: Assigning judge to submission_data _id: {target_id}")
        
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
                print(f"DEBUG: Error finding event {eid}: {str(e)}")
        
        projects_data.append({
            "title": sub.get("title", "Untitled Project"),
            "team_name": sub.get("team_name") or sub.get("user_name") or sub.get("title") or "Team",
            "event_name": event.get("name", "Event") if event else "Event",
            "evaluation_url": evaluation_url
        })

    if not projects_data:
        print("DEBUG: No projects data gathered. Assignment failed.")
        return {"success": False, "error": "No valid submissions found"}

    # 3. Send SINGLE Consolidated Email
    project_rows_html = ""
    for p in projects_data:
        project_rows_html += f"""
        <div style="background: white; border: 1px solid #e1e5ff; border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">{p['title']}</h4>
            <div style="font-size: 13px; color: #666; margin-bottom: 15px;">
                <span style="background: #f0f2ff; padding: 4px 10px; rounded: 6px; margin-right: 10px;">👥 {p['team_name']}</span>
                <span style="background: #fdf2f8; padding: 4px 10px; rounded: 6px;">🎯 {p['event_name']}</span>
            </div>
            <a href="{p['evaluation_url']}" style="display: inline-block; background: #6C3BFF; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px;">
                🚀 Start Evaluation
            </a>
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
        print(f"DEBUG: Dispatching consolidated evaluation email to {judge_email}")
        email_sent = await send_notification_email(
            to_email=judge_email,
            subject=f"Action Required: {len(projects_data)} Projects Assigned for Evaluation",
            body_html=email_html
        )
        if email_sent:
            print(f"DEBUG: Consolidated email successfully dispatched to {judge_email}")
        else:
            print(f"DEBUG: email_service returned False for {judge_email}")
    except Exception as e:
        print(f"Failed to send consolidated email to {judge_email}: {str(e)}")

    return {
        "success": True, 
        "email_sent": email_sent,
        "count": len(projects_data),
        "message": f"Assigned {len(projects_data)} projects. " + ("Email sent successfully." if email_sent else "Email delivery failed (check SMTP/API config).")
    }


