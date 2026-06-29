from datetime import datetime
from db import audit_logs_col
import logging
logger = logging.getLogger(__name__)


async def log_admin_action(admin_email: str, action: str, details: str = ""):
    """
    Core auditing service to record administrative actions.
    Ensures compliance with institutional security standards.
    """
    try:
        log_entry = {
            "action": action,
            "user": admin_email,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
        await audit_logs_col.insert_one(log_entry)
        return True
    except Exception as e:
        logger.error(f"Audit Log Error: {e}")
        return False
