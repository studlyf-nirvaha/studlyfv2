"""
backend/proxy.py - SECURITY PROXY FOR EXTERNAL API CALLS

All external API calls (Google AI, Stripe, etc.) go through backend.
Frontend NEVER sees API keys or makes direct external calls.
This prevents credential exposure and allows server-side validation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import aiohttp
import asyncio
import logging

logger = logging.getLogger("app")

router = APIRouter(prefix="/api", tags=["proxy"])

# SECURITY: Load secrets from environment only on backend
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

# These are imported from your existing auth/db modules
# from .main import get_current_user, User
# from .db import get_db, SessionLocal

@router.post("/ai/generate-portfolio")
async def generate_portfolio(
    data: dict,
    current_user = Depends(),  # Replace with: get_current_user
    db: Session = Depends()    # Replace with: get_db
):
    """
    SECURITY: Backend handles Google AI API calls.
    Frontend calls /api/ai/generate-portfolio
    Backend internally calls Google AI with hidden GEMINI_API_KEY
    """
    
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not configured")
        raise HTTPException(status_code=500, detail="Service unavailable")
    
    try:
        # Validate user input
        if not data or not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="Invalid request")
        
        # Make request to Google AI API (backend only)
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
                headers={
                    "x-goog-api-key": GEMINI_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "contents": [{"parts": [{"text": str(data.get("prompt", ""))}]}]
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                
                if response.status != 200:
                    logger.error(f"Google AI API error: {response.status}")
                    raise HTTPException(status_code=502, detail="AI service error")
                
                result = await response.json()
                
                # Log audit trail (server-side only)
                logger.info(f"Portfolio generated for user {current_user.id}")
                
                return {"result": result}
    
    except HTTPException:
        raise
    except asyncio.TimeoutError:
        logger.error("Google AI API timeout")
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logger.error(f"Portfolio generation error: {type(e).__name__}: {str(e)}")
        # SECURITY: Generic error response to client
        raise HTTPException(status_code=500, detail="Unable to generate portfolio")

@router.post("/ai/generate-resume")
async def generate_resume(
    data: dict,
    current_user = Depends(),  # Replace with: get_current_user
    db: Session = Depends()    # Replace with: get_db
):
    """
    SECURITY: Backend handles Google AI API calls for resume generation.
    Frontend never sees GEMINI_API_KEY.
    """
    
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not configured")
        raise HTTPException(status_code=500, detail="Service unavailable")
    
    try:
        if not data or not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="Invalid request")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
                headers={
                    "x-goog-api-key": GEMINI_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "contents": [{"parts": [{"text": str(data.get("prompt", ""))}]}]
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                
                if response.status != 200:
                    logger.error(f"Google AI API error: {response.status}")
                    raise HTTPException(status_code=502, detail="AI service error")
                
                result = await response.json()
                logger.info(f"Resume generated for user {current_user.id}")
                
                return {"result": result}
    
    except HTTPException:
        raise
    except asyncio.TimeoutError:
        logger.error("Google AI API timeout")
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logger.error(f"Resume generation error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to generate resume")

@router.post("/payment/create-intent")
async def create_payment_intent(
    data: dict,
    current_user = Depends(),  # Replace with: get_current_user
    db: Session = Depends()    # Replace with: get_db
):
    """
    SECURITY: Stripe API calls handled on backend.
    Frontend NEVER sees STRIPE_SECRET_KEY or processes payments directly.
    """
    
    if not STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY not configured")
        raise HTTPException(status_code=500, detail="Service unavailable")
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY  # Backend only
        
        # Validate payment request
        amount = data.get("amount")
        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")
        
        # Create payment intent (backend only)
        intent = stripe.PaymentIntent.create(
            amount=int(amount),
            currency="usd",
            metadata={
                "user_id": current_user.id,
                "product_id": data.get("product_id", "")
            }
        )
        
        logger.info(f"Payment intent created for user {current_user.id}: {intent.id}")
        
        # Return only safe data (client_secret for frontend)
        return {
            "client_secret": intent.client_secret,
            "amount": intent.amount,
            "currency": intent.currency
        }
    
    except Exception as e:
        logger.error(f"Payment error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to process payment")

@router.get("/payment/config")
async def get_payment_config():
    """
    SECURITY: Only expose publishable key (not secret key).
    Frontend can use this for client-side Stripe setup.
    """
    
    if not STRIPE_PUBLISHABLE_KEY:
        logger.error("STRIPE_PUBLISHABLE_KEY not configured")
        raise HTTPException(status_code=500, detail="Service unavailable")
    
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY
    }

# Usage in main.py:
# app.include_router(router)
