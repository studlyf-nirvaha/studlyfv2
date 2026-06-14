"""
SECURITY FIXES FOR PRODUCTION DEPLOYMENT
Addresses critical vulnerabilities from security audit
"""

from fastapi import HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import re
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta
from bson.errors import InvalidId
from bson import ObjectId
from functools import wraps
import asyncio

logger = logging.getLogger(__name__)

# ========== FIX 1: SECURE COOKIE-BASED AUTHENTICATION ==========

def setup_secure_cookies(app):
    """
    Replace localStorage-based JWT with httpOnly cookies
    Call this during app initialization
    """
    from fastapi.middleware.cors import CORSMiddleware
    
    # Add CORS middleware with specific origins
    ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == [""]:
        ALLOWED_ORIGINS = ["http://localhost:3000"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
        max_age=3600,
    )

def create_secure_cookie_response(response, access_token: str, refresh_token: str):
    """
    Set JWT tokens as httpOnly cookies instead of returning in JSON
    
    Usage:
        response = JSONResponse(content={"message": "Login successful"})
        return create_secure_cookie_response(response, access_token, refresh_token)
    """
    secure = os.getenv("ENVIRONMENT") == "production"
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,          # ✓ Prevents JavaScript access
        secure=secure,          # ✓ HTTPS only in production
        samesite="Lax",        # ✓ CSRF protection
        max_age=86400,         # 24 hours
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="Lax",
        max_age=2592000,       # 30 days
        path="/"
    )
    
    return response

def clear_auth_cookies(response):
    """Clear authentication cookies on logout"""
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="Lax"
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        samesite="Lax"
    )
    return response

# ========== FIX 2: AUTHORIZATION CHECKS ==========

async def verify_institution_ownership(institution_id: str, current_user: dict):
    """
    Verify that current user belongs to the institution they're accessing
    Use this in ALL institution-scoped endpoints
    """
    if current_user.get("institution_id") != institution_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this institution"
        )
    return True

async def verify_resource_ownership(
    resource: dict,
    current_user: dict,
    allow_admin: bool = True
):
    """
    Verify user owns the resource or is admin
    
    Args:
        resource: The database resource document
        current_user: Current authenticated user
        allow_admin: If True, admins bypass ownership check
    """
    # Admins can access anything (if allow_admin=True)
    if allow_admin and current_user.get("role") == "admin":
        if current_user.get("institution_id") == resource.get("institution_id"):
            return True
    
    # User must own the resource
    if str(resource.get("user_id")) == str(current_user["_id"]):
        return True
    
    # Institution admin accessing their institution's resource
    if (current_user.get("role") == "admin" and
        current_user.get("institution_id") == resource.get("institution_id")):
        return True
    
    raise HTTPException(
        status_code=403,
        detail="You do not have permission to access this resource"
    )

async def verify_admin_role(current_user: dict, institution_id: str = None):
    """
    Verify user is admin (optionally for specific institution)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    if institution_id and current_user.get("institution_id") != institution_id:
        raise HTTPException(
            status_code=403,
            detail="You are not an admin for this institution"
        )
    
    return True

# ========== FIX 3: FILE UPLOAD SECURITY ==========

class SecureFileUploader:
    """Secure file upload handler with validation"""
    
    UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/var/app/uploads"))
    
    ALLOWED_MIMETYPES = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    }
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    
    @classmethod
    def validate_and_save(cls, file_content: bytes, filename: str, content_type: str):
        """
        Validate and safely save uploaded file
        
        Returns:
            dict with upload_id, filename, content_type, size
        """
        # 1. Validate file type
        if content_type not in cls.ALLOWED_MIMETYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(cls.ALLOWED_MIMETYPES.keys())}"
            )
        
        # 2. Validate file size
        if len(file_content) > cls.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {cls.MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
            )
        
        # 3. Sanitize original filename
        safe_filename = Path(filename).name
        safe_filename = "".join(
            c for c in safe_filename 
            if c.isalnum() or c in "._- "
        )
        if not safe_filename:
            safe_filename = "uploaded_file"
        
        # 4. Generate unique filename with proper extension
        file_ext = cls.ALLOWED_MIMETYPES.get(content_type, ".bin")
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # 5. Create upload directory
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        # 6. Save file
        filepath = cls.UPLOAD_DIR / unique_filename
        filepath.write_bytes(file_content)
        
        # 7. Verify file was saved
        if not filepath.exists():
            raise HTTPException(
                status_code=500,
                detail="Failed to save file"
            )
        
        logger.info(f"File uploaded: {unique_filename} ({len(file_content)} bytes)")
        
        return {
            "upload_id": str(uuid.uuid4()),
            "original_filename": filename,
            "stored_filename": unique_filename,
            "content_type": content_type,
            "size": len(file_content),
            "created_at": datetime.utcnow()
        }

# ========== FIX 4: RATE LIMITING ==========

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.attempts = {}  # {key: [(timestamp, count)]}
    
    def is_allowed(self, key: str, max_attempts: int = 5, window_seconds: int = 900) -> bool:
        """
        Check if request is allowed under rate limit
        
        Args:
            key: Unique identifier (e.g., "login:user@email.com")
            max_attempts: Max requests allowed in window
            window_seconds: Time window in seconds
        """
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        # Initialize key if not exists
        if key not in self.attempts:
            self.attempts[key] = []
        
        # Remove old attempts outside window
        self.attempts[key] = [
            ts for ts in self.attempts[key] 
            if ts > window_start
        ]
        
        # Check if limit exceeded
        if len(self.attempts[key]) >= max_attempts:
            return False
        
        # Record this attempt
        self.attempts[key].append(now)
        
        # Cleanup old keys periodically
        if len(self.attempts) > 10000:
            self._cleanup_old_keys()
        
        return True
    
    def _cleanup_old_keys(self):
        """Remove old keys to prevent memory growth"""
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        
        keys_to_delete = [
            key for key, timestamps in self.attempts.items()
            if all(ts < hour_ago for ts in timestamps)
        ]
        
        for key in keys_to_delete:
            del self.attempts[key]

# Global rate limiter instance
rate_limiter = RateLimiter()

async def check_rate_limit(
    key: str,
    max_attempts: int = 5,
    window_seconds: int = 900
):
    """
    Dependency for rate limiting
    
    Usage:
        @app.post("/login")
        async def login(credentials: LoginRequest, _ = Depends(check_rate_limit("login:"))):
            ...
    """
    if not rate_limiter.is_allowed(key, max_attempts, window_seconds):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(window_seconds)}
        )
    
    return True

# ========== FIX 5: INPUT VALIDATION & SANITIZATION ==========

class InputValidator:
    """Input validation utilities"""
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format (RFC 5322 simplified)"""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, email):
            raise HTTPException(
                status_code=400,
                detail="Invalid email format"
            )
        return email.lower().strip()
    
    @staticmethod
    def validate_object_id(id_str: str) -> ObjectId:
        """Validate MongoDB ObjectId format"""
        try:
            return ObjectId(id_str)
        except InvalidId:
            raise HTTPException(
                status_code=400,
                detail="Invalid ID format"
            )
    
    @staticmethod
    def escape_regex(s: str) -> str:
        """Escape special regex characters to prevent NoSQL injection"""
        return re.escape(s)
    
    @staticmethod
    def sanitize_string(s: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        # Remove leading/trailing whitespace
        s = s.strip()
        
        # Limit length
        if len(s) > max_length:
            s = s[:max_length]
        
        # Remove null bytes
        s = s.replace("\x00", "")
        
        return s

# ========== FIX 6: ERROR HANDLING ==========

class SafeErrorHandler:
    """Generic error responses that don't leak internal details"""
    
    @staticmethod
    def generic_error(detail: str = "Internal Server Error") -> dict:
        """Return generic error response"""
        import uuid
        request_id = str(uuid.uuid4())
        logger.error(f"Error [{request_id}]: {detail}")
        
        return {
            "error": detail,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def log_detailed_error(exc: Exception):
        """Log full error details server-side"""
        logger.error(f"Detailed error: {exc}", exc_info=True)

def setup_error_handlers(app):
    """Setup global error handlers"""
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Catch-all exception handler"""
        SafeErrorHandler.log_detailed_error(exc)
        
        # Return generic error to client
        return JSONResponse(
            status_code=500,
            content=SafeErrorHandler.generic_error("Internal Server Error")
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTPExceptions"""
        # Log the error
        logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
        
        # Return appropriate response
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# ========== FIX 7: CERTIFICATE SECURITY ==========

async def validate_certificate_access(
    certificate_id: str,
    current_user: dict,
    db
):
    """
    Validate user can access certificate
    Checks: authentication, authorization, status
    """
    try:
        cert = await db.certificates.find_one({
            "_id": ObjectId(certificate_id)
        })
    except InvalidId:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Check status (only active certificates can be accessed)
    if cert.get("status") != "active":
        raise HTTPException(status_code=410, detail="Certificate is no longer valid")
    
    # Check ownership
    if str(cert.get("user_id")) != str(current_user["_id"]):
        # Allow admins of same institution
        if not (current_user.get("role") == "admin" and
                current_user.get("institution_id") == cert.get("institution_id")):
            raise HTTPException(status_code=403, detail="Forbidden")
    
    return cert

def build_certificate_download_path(certificate_filename: str) -> Path:
    """
    Safely build certificate file path with no traversal
    """
    base_dir = Path(os.getenv("CERTIFICATE_DIR", "/var/app/certificates"))
    
    # Ensure filename is safe
    safe_filename = Path(certificate_filename).name
    
    # Build full path
    full_path = base_dir / safe_filename
    
    # Verify it's within base directory
    try:
        full_path.resolve().relative_to(base_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Certificate file not found")
    
    return full_path

# ========== FIX 8: QUERY SECURITY ==========

def build_safe_search_query(search_term: str, fields: list) -> dict:
    """
    Build safe MongoDB search query with escaped regex
    
    Args:
        search_term: User search input
        fields: List of fields to search in
    
    Returns:
        Safe MongoDB query dict
    """
    # Escape regex special characters
    escaped_term = InputValidator.escape_regex(search_term.strip())
    
    # Build safe query
    query = {
        "$or": [
            {field: {"$regex": escaped_term, "$options": "i"}}
            for field in fields
        ]
    }
    
    return query

# ========== FIX 9: AUDIT LOGGING ==========

class AuditLogger:
    """Log sensitive operations for compliance and security"""
    
    @staticmethod
    async def log_admin_action(
        db,
        admin_id: str,
        institution_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: dict = None
    ):
        """
        Log admin action
        
        Example:
            await AuditLogger.log_admin_action(
                db=db,
                admin_id=user_id,
                institution_id=institution_id,
                action="revoke_certificate",
                resource_type="certificate",
                resource_id=cert_id,
                details={"reason": "fraud detected"}
            )
        """
        audit_entry = {
            "admin_id": ObjectId(admin_id),
            "institution_id": institution_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": None,  # Set from request context
            "timestamp": datetime.utcnow(),
            "status": "completed"
        }
        
        await db.audit_logs.insert_one(audit_entry)
        logger.info(f"Audit: {admin_id} - {action} on {resource_type}:{resource_id}")
    
    @staticmethod
    async def log_auth_event(
        db,
        event_type: str,
        user_id: str = None,
        email: str = None,
        success: bool = True,
        details: dict = None
    ):
        """Log authentication events (login, logout, failed auth, etc.)"""
        auth_entry = {
            "event_type": event_type,
            "user_id": ObjectId(user_id) if user_id else None,
            "email": email,
            "success": success,
            "details": details or {},
            "timestamp": datetime.utcnow()
        }
        
        await db.auth_logs.insert_one(auth_entry)

# ========== FIX 10: HTTPS ENFORCEMENT ==========

def setup_https_middleware(app, force_https: bool = True):
    """
    Setup HTTPS enforcement middleware
    """
    if force_https and os.getenv("ENVIRONMENT") == "production":
        from fastapi.middleware.trustedhost import TrustedHostMiddleware
        
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[
                host.strip() 
                for host in os.getenv("ALLOWED_HOSTS", "localhost").split(",")
            ]
        )
        
        # Add security headers
        @app.middleware("http")
        async def add_security_headers(request: Request, call_next):
            response = await call_next(request)
            
            # Redirect HTTP to HTTPS
            if request.url.scheme == "http":
                return JSONResponse(
                    status_code=301,
                    content={},
                    headers={
                        "Location": request.url.replace("http://", "https://")
                    }
                )
            
            # Add security headers
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Content-Security-Policy"] = "default-src 'self'"
            
            return response

# ========== FIX 11: LOGGING SETUP ==========

def setup_logging():
    """Setup secure production logging"""
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/var/log/app.log'),
            logging.StreamHandler()
        ]
    )
    
    # Disable verbose logging in production
    if os.getenv("ENVIRONMENT") == "production":
        logging.getLogger("pymongo").setLevel(logging.WARNING)
        logging.getLogger("urllib3").setLevel(logging.WARNING)
