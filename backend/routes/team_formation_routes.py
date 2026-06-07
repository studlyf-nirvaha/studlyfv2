"""
Team Formation Routes - Handle team formation emails and notifications
"""
from fastapi import APIRouter, HTTPException, Body
import logging
from db import users_col
from services.email_service import send_notification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/team-formation", tags=["Team Formation"])

@router.post("/send-email")
async def send_team_formation_email(data: dict = Body(...)):
    """Send team formation email to team leader"""
    try:
        team_name = data.get("teamName", "")
        leader_name = data.get("leader", "")
        event = data.get("event", "")
        
        # Look up the leader's email in the users collection
        leader_user = await users_col.find_one({"full_name": leader_name})
        if not leader_user:
            # Fallback check by name (case-insensitive)
            leader_user = await users_col.find_one({"full_name": {"$regex": f"^{leader_name}$", "$options": "i"}})
        
        leader_email = leader_user.get("email") if leader_user else None
        
        if not leader_email:
            # If still not found, we can't send the email reliably
            logger.warning(f"Could not find email for leader: {leader_name}")
            # For backward compatibility with the frontend mock, if they provided an email use it
            leader_email = data.get("leaderEmail")
            
        if not leader_email:
             # Last resort placeholder for debugging (to be removed in production)
             leader_email = f"{leader_name.lower().replace(' ', '.')}@example.com"
             logger.error(f"Using fallback placeholder email for {leader_name}")
        
        # Create HTML email content
        email_html = f"""
        <html>
        <body style="font-family: 'Poppins', sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px;">
            <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 30px;">
                <h2 style="color: #0ea5e9; text-align: center;">🎯 Team Formation Confirmation</h2>
                <p>Hello <strong>{leader_name}</strong>,</p>
                <p>Your team has been successfully formed for <strong>{event}</strong>.</p>
                
                <div style="background: white; border: 1px solid #e1e5ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #1a1a1a;">Team Details</h3>
                    <div style="display: flex; gap: 20px; margin: 15px 0; font-size: 14px; color: #666;">
                        <span>👥 Team: {team_name}</span>
                        <span>👤 Leader: {leader_name}</span>
                    </div>
                    <div style="display: flex; gap: 20px; margin: 15px 0; font-size: 14px; color: #666;">
                        <span>🎯 Event: {event}</span>
                        <span>📅 Formed: {data.get('formationDate', 'Today')}</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <h4 style="color: #1a1a1a;">Next Steps:</h4>
                    <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                        <li>Check your dashboard for event timeline</li>
                        <li>Prepare for submission phase</li>
                        <li>Coordinate with team members</li>
                        <li>Follow event guidelines</li>
                    </ul>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                    This team formation was confirmed by the event administrator.<br>
                    If you have any questions, please contact the event organizer.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Send email
        
        await send_notification_email(
            to_email=leader_email,
            subject=f"Team Formation Confirmed: {team_name} - {event}",
            body_html=email_html
        )
        
        return {
            "success": True,
            "message": "Team formation email sent successfully",
            "team_name": team_name,
            "leader": leader_name,
            "event": event
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send team formation email: {str(e)}")

