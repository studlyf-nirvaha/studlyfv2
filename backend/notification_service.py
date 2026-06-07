"""
Comprehensive Notification Service
Handles in-app notifications, email notifications, and notification bell functionality
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from bson import ObjectId
from db import notifications_col, users_col, institutions_col
from services.email_service import send_notification_email
from notification_helpers import notify_institution
import os

class NotificationService:
    """Service for managing all types of notifications"""
    
    async def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        institution_id: Optional[str] = None,
        event_id: Optional[str] = None
    ):
        """Create a new notification"""
        
        notification_doc = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "priority": "medium",  # high, medium, low
            "category": "general"  # general, judge, event, system
        }
        
        # Add optional fields
        if metadata:
            notification_doc["meta"] = metadata
        if institution_id:
            notification_doc["institution_id"] = institution_id
        if event_id:
            notification_doc["event_id"] = event_id
        
        # Insert notification
        result = await notifications_col.insert_one(notification_doc)
        notification_id = str(result.inserted_id)
        
        # Send email notification if enabled
        try:
            await self._send_email_notification_if_enabled(user_id, notification_doc)
        except Exception as e:
            print(f"[EMAIL] Failed to send email notification: {e}")
        
        # Create institution notification if applicable
        if institution_id:
            await notify_institution(
                institution_id,
                type=notification_type,
                title=title,
                message=message,
                meta=metadata
            )
        
        return {"notification_id": notification_id, "status": "created"}
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
        category: Optional[str] = None
    ):
        """Get notifications for a user with pagination and filtering"""
        
        # Build query
        query = {"user_id": user_id}
        
        if unread_only:
            query["is_read"] = False
        
        if category:
            query["category"] = category
        
        # Get notifications
        cursor = notifications_col.find(query).sort("created_at", -1).skip(offset).limit(limit)
        notifications = []
        
        async for notification in cursor:
            formatted_notification = {
                "_id": str(notification["_id"]),
                "type": notification.get("type", ""),
                "title": notification.get("title", ""),
                "message": notification.get("message", ""),
                "is_read": notification.get("is_read", False),
                "created_at": notification.get("created_at", ""),
                "priority": notification.get("priority", "medium"),
                "category": notification.get("category", "general"),
                "meta": notification.get("meta", {}),
                "institution_id": notification.get("institution_id", ""),
                "event_id": notification.get("event_id", "")
            }
            notifications.append(formatted_notification)
        
        # Get unread count
        unread_count = await notifications_col.count_documents({"user_id": user_id, "is_read": False})
        
        return {
            "notifications": notifications,
            "unread_count": unread_count,
            "total_count": len(notifications),
            "has_more": len(notifications) == limit
        }
    
    async def mark_notification_read(self, notification_id: str, user_id: str):
        """Mark a notification as read"""
        
        result = await notifications_col.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.matched_count == 0:
            raise ValueError("Notification not found or access denied")
        
        return {"status": "marked_as_read"}
    
    async def mark_all_notifications_read(self, user_id: str, category: Optional[str] = None):
        """Mark all notifications as read for a user"""
        
        query = {"user_id": user_id, "is_read": False}
        if category:
            query["category"] = category
        
        result = await notifications_col.update_many(
            query,
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "status": "marked_all_as_read",
            "count": result.modified_count
        }
    
    async def delete_notification(self, notification_id: str, user_id: str):
        """Delete a notification"""
        
        result = await notifications_col.delete_one({
            "_id": ObjectId(notification_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise ValueError("Notification not found or access denied")
        
        return {"status": "deleted"}
    
    async def get_notification_stats(self, user_id: str):
        """Get notification statistics for a user"""
        
        # Get counts by category
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$category",
                "total": {"$sum": 1},
                "unread": {"$sum": {"$cond": [{"$eq": ["$is_read", False]}, 1, 0]}}
            }}
        ]
        
        category_stats = []
        async for stat in notifications_col.aggregate(pipeline):
            category_stats.append({
                "category": stat["_id"],
                "total": stat["total"],
                "unread": stat["unread"]
            })
        
        # Get recent activity
        recent_notifications = await notifications_col.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(5).to_list(length=5)
        
        # Get priority counts
        high_priority = await notifications_col.count_documents({
            "user_id": user_id, "is_read": False, "priority": "high"
        })
        
        return {
            "category_stats": category_stats,
            "high_priority_unread": high_priority,
            "recent_activity": len(recent_notifications),
            "total_unread": sum(stat["unread"] for stat in category_stats)
        }
    
    async def create_judge_notification(
        self,
        judge_email: str,
        notification_type: str,
        title: str,
        message: str,
        event_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create notification for a judge"""
        
        # Find judge in judges collection first
        from db import judges_col
        judge = await judges_col.find_one({"email": judge_email.lower().strip()})
        if not judge:
            raise ValueError("Judge not found")
        
        # Check if judge has a user account
        judge_user = await users_col.find_one({"email": judge_email.lower().strip()})
        if not judge_user:
            # Judge hasn't created account yet - create notification with judge email as user_id
            user_id = judge_email
        else:
            user_id = judge_user.get("user_id")
            if not user_id:
                raise ValueError("Judge user ID not found")
        
        # Create notification with judge category
        return await self.create_notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            metadata=metadata,
            event_id=event_id
        )
    
    async def create_institution_notification(
        self,
        institution_id: str,
        notification_type: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        event_id: Optional[str] = None
    ):
        """Create notifications for all institution admins"""
        
        # Get institution users with admin role
        institution_users = []
        async for user in users_col.find({
            "institution_id": institution_id,
            "role": {"$in": ["admin", "institution"]}
        }):
            institution_users.append(user)
        
        # Create notifications for all institution users
        created_notifications = []
        for user in institution_users:
            user_id = user.get("user_id")
            if user_id:
                result = await self.create_notification(
                    user_id=user_id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    metadata=metadata,
                    institution_id=institution_id,
                    event_id=event_id
                )
                created_notifications.append(result)
        
        return {
            "status": "created",
            "count": len(created_notifications),
            "notifications": created_notifications
        }
    
    async def cleanup_old_notifications(self, days_old: int = 30):
        """Clean up old read notifications"""
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        
        result = await notifications_col.delete_many({
            "is_read": True,
            "created_at": {"$lt": cutoff_date.isoformat()}
        })
        
        return {
            "status": "cleanup_completed",
            "deleted_count": result.deleted_count
        }
    
    async def _send_email_notification_if_enabled(self, user_id: str, notification: dict):
        """Send email notification if user has email notifications enabled"""
        
        # Get user preferences
        user = await users_col.find_one({"user_id": user_id})
        if not user:
            return
        
        # Check if user has email notifications enabled
        email_preferences = user.get("email_preferences", {})
        notification_type = notification.get("type", "")
        
        # Check if this notification type is enabled for email
        if not email_preferences.get(f"email_{notification_type}", True):
            return
        
        # Get user email
        user_email = user.get("email")
        if not user_email:
            return
        
        # Send email
        subject = f"Studlyf: {notification.get('title', 'New Notification')}"
        
        body_html = f"""
        <html>
        <body style="font-family: 'Poppins', sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6B46C1;">{notification.get('title', 'New Notification')}</h2>
                <p>{notification.get('message', '')}</p>
                <p>
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/notifications" 
                       style="background-color: #6B46C1; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        View Notifications
                    </a>
                </p>
                <p>Best Regards,<br>Studlyf Team</p>
            </div>
        </body>
        </html>
        """
        
        try:
            await send_notification_email(user_email, subject, body_html)
        except Exception as e:
            # Log error but don't fail the notification creation
            print(f"Failed to send email notification: {e}")

# Global instance
notification_service = NotificationService()

