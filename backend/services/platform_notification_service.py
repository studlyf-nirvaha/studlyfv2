"""
Centralized notification service.
All email triggers route through here using the DB-based template system.
"""
import os
import logging
from datetime import datetime
from typing import Optional

from services.email_template_service import send_template_email

logger = logging.getLogger("platform_notification_service")


async def notify_team_invitation(
    recipient_email: str,
    participant_name: str,
    team_leader_name: str,
    team_name: str,
    event_title: str,
    organization_name: str,
    invite_link: str,
    current_team_size: Optional[int] = None,
    max_team_size: Optional[int] = None,
):
    await send_template_email(
        template_type="team_invitation",
        recipient=recipient_email,
        context={
            "participant_name": participant_name,
            "team_leader_name": team_leader_name,
            "team_name": team_name,
            "event_title": event_title,
            "organization_name": organization_name,
            "invite_link": invite_link,
            "current_team_size": str(current_team_size),
            "max_team_size": str(max_team_size),
        },
    )


async def notify_team_join_approved(
    recipient_email: str,
    participant_name: str,
    team_name: str,
    event_title: str,
    organization_name: str,
    team_link: str,
):
    await send_template_email(
        template_type="team_join_approved",
        recipient=recipient_email,
        context={
            "participant_name": participant_name,
            "team_name": team_name,
            "event_title": event_title,
            "organization_name": organization_name,
            "team_link": team_link,
        },
    )


async def notify_event_published(
    recipient_email: str,
    organizer_name: str,
    event_title: str,
    event_link: str,
):
    await send_template_email(
        template_type="event_published",
        recipient=recipient_email,
        context={
            "organizer_name": organizer_name,
            "event_title": event_title,
            "event_link": event_link,
        },
    )


async def notify_new_registration(
    recipient_email: str,
    organizer_name: str,
    event_title: str,
    participant_name: str,
    registration_count: int,
    dashboard_link: str,
):
    await send_template_email(
        template_type="new_registration",
        recipient=recipient_email,
        context={
            "organizer_name": organizer_name,
            "event_title": event_title,
            "participant_name": participant_name,
            "registration_count": str(registration_count),
            "dashboard_link": dashboard_link,
        },
    )


async def notify_email_verification(
    recipient_email: str,
    participant_name: str,
    verification_link: str,
):
    await send_template_email(
        template_type="email_verification",
        recipient=recipient_email,
        context={
            "participant_name": participant_name,
            "verification_link": verification_link,
        },
    )


async def notify_password_reset(
    recipient_email: str,
    participant_name: str,
    reset_link: str,
    expiry_duration: str = "1 hour",
):
    return await send_template_email(
        template_type="password_reset",
        recipient=recipient_email,
        context={
            "participant_name": participant_name,
            "reset_link": reset_link,
            "expiry_duration": expiry_duration,
        },
    )


async def notify_payment_failed(
    recipient_email: str,
    user_name: str,
    plan_name: str,
    payment_link: str,
):
    await send_template_email(
        template_type="payment_failed",
        recipient=recipient_email,
        context={
            "user_name": user_name,
            "plan_name": plan_name,
            "payment_link": payment_link,
        },
    )


async def notify_opportunity_reminder(
    recipient_email: str,
    participant_name: str,
    event_title: str,
    organization_name: str,
    registration_deadline: str,
    event_link: str,
):
    await send_template_email(
        template_type="opportunity_reminder",
        recipient=recipient_email,
        context={
            "participant_name": participant_name,
            "event_title": event_title,
            "organization_name": organization_name,
            "registration_deadline": registration_deadline,
            "event_link": event_link,
        },
    )


async def notify_recommended_opportunities(
    recipient_email: str,
    participant_name: str,
    recommended_opportunities: str,
    recommendation_link: str,
):
    await send_template_email(
        template_type="recommended_opportunities",
        recipient=recipient_email,
        context={
            "participant_name": participant_name,
            "recommended_opportunities": recommended_opportunities,
            "recommendation_link": recommendation_link,
        },
    )
