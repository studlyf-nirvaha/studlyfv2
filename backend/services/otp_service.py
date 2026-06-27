import secrets
import time
from datetime import datetime
from services.email_service import send_notification_email

# Simple in-memory storage for OTPs (In production, use Redis or a DB)
otp_store = {}

async def generate_and_send_otp(email: str):
    """
    Generates a secure 6-digit OTP, stores it with an expiry, and sends it via Gmail SMTP.
    """
    email = email.strip().lower()
    # Use secrets for cryptographically secure random numbers
    otp = str(secrets.randbelow(900000) + 100000)
    expiry = time.time() + 300  # 5 minutes expiry
    
    otp_store[email] = {"otp": otp, "expiry": expiry}
    
    subject = "Verification Code - Welcome to Studlyf Evolution"
    body_html = f"""
    <html>
        <body style="font-family: 'Poppins', sans-serif'', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.6; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eef2f6;">
                <div style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">The Evolution Begins</h1>
                </div>
                <div style="padding: 40px; text-align: left;">
                    <h2 style="color: #111827; margin-top: 0;">Thank you for joining Studlyf!</h2>
                    <p style="font-size: 16px; color: #4b5563;">We are thrilled to have your institution as part of our global engineering network. You are one step away from accessing your advanced management dashboard.</p>
                    
                    <div style="background-color: #f5f3ff; border: 1px dashed #7c3aed; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                        <span style="font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #111827;">{otp}</span>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 25px;">Please enter this code in the registration window to verify your identity. This code is valid for the next <b>5 minutes</b>.</p>
                    
                    <div style="border-top: 1px solid #eef2f6; padding-top: 25px;">
                        <p style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 5px;">Why verify?</p>
                        <p style="font-size: 13px; color: #6b7280; margin-top: 0;">Verification ensures that only authorized institutional representatives can manage certificates and event rankings, maintaining the integrity of the Studlyf network.</p>
                    </div>
                </div>
                <div style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eef2f6;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; {datetime.utcnow().year} Studlyf Engineering. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    success = await send_notification_email(email, subject, body_html)
    return success

async def verify_otp(email: str, otp: str):
    """
    Validates the provided OTP against the stored value.
    """
    email = email.strip().lower()
    if email not in otp_store:
        return False, "OTP not requested for this email"
    
    stored_data = otp_store[email]
    
    if time.time() > stored_data["expiry"]:
        del otp_store[email]
        return False, "OTP has expired"
    
    if stored_data["otp"] == otp:
        del otp_store[email]
        return True, "Verified"
    
    return False, "Invalid verification code"
    
async def send_welcome_email(email: str, name: str):
    """
    Sends a professional welcome email after successful OTP verification.
    """
    subject = "Welcome to Studlyf - Registration Successful"
    body_html = f"""
    <html>
        <body style="font-family: 'Poppins', sans-serif'', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.6; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eef2f6;">
                <div style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">Registration Confirmed</h1>
                </div>
                <div style="padding: 40px; text-align: left;">
                    <h2 style="color: #111827; margin-top: 0;">Welcome aboard, {name}!</h2>
                    <p style="font-size: 16px; color: #4b5563;">Your account has been successfully verified. You now have full access to the Studlyf Institutional Dashboard.</p>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0;"><b>What's next?</b></p>
                    <ul style="font-size: 14px; color: #6b7280; padding-left: 20px;">
                        <li>Customize your institutional profile.</li>
                        <li>Create and manage your first hackathon or event.</li>
                        <li>Automate certificate distribution for your participants.</li>
                        <li>Track real-time analytics for your students.</li>
                    </ul>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{os.getenv('FRONTEND_URL', 'https://studlyf.in')}/login" style="background-color: #7c3aed; color: #ffffff; padding: 12px 30px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Go to Dashboard</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #9ca3af; text-align: center;">The Studlyf team is here to support you at every step of your journey.</p>
                </div>
                <div style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eef2f6;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Studlyf Engineering Protocol &copy; {datetime.utcnow().year}</p>
                </div>
            </div>
        </body>
    </html>
    """
    await send_notification_email(email, subject, body_html)


