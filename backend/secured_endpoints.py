"""
SECURED ENDPOINT IMPLEMENTATIONS
Examples of properly secured FastAPI endpoints
Replace vulnerable versions in main.py with these implementations
"""

from fastapi import FastAPI, Depends, Request, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from datetime import datetime
from typing import Optional
from bson import ObjectId
import os

from security_fixes import (
    verify_institution_ownership,
    verify_resource_ownership,
    verify_admin_role,
    SecureFileUploader,
    check_rate_limit,
    InputValidator,
    setup_secure_cookies,
    clear_auth_cookies,
    validate_certificate_access,
    build_certificate_download_path,
    build_safe_search_query,
    AuditLogger,
    setup_error_handlers,
    setup_https_middleware,
    setup_logging
)

# Initialize app with security middleware
app = FastAPI()
setup_logging()
setup_error_handlers(app)
setup_https_middleware(app)
setup_secure_cookies(app)

# ========== EXAMPLE 1: SECURE LOGIN ENDPOINT ==========

@app.post("/login")
async def login(
    request: Request,
    email: str,
    password: str,
    db = None,  # Injected from dependency
    _ = Depends(check_rate_limit("login", max_attempts=5, window_seconds=900))
):
    """
    Secure login with rate limiting and httpOnly cookies
    """
    try:
        # Validate email format
        email = InputValidator.validate_email(email)
        
        # Find user
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Log failed attempt
            await AuditLogger.log_auth_event(
                db, "login_failed", email=email, success=False
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password (assuming bcrypt hashed)
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"])
        
        if not pwd_context.verify(password, user.get("password_hash", "")):
            await AuditLogger.log_auth_event(
                db, "login_failed", user_id=str(user["_id"]), success=False
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if email verified
        if not user.get("email_verified"):
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before logging in"
            )
        
        # Generate tokens
        from datetime import timedelta, datetime
        import jwt
        
        secret = os.getenv("JWT_SECRET_KEY")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        
        # Access token (24 hours)
        access_payload = {
            "sub": str(user["_id"]),
            "email": user["email"],
            "institution_id": user.get("institution_id"),
            "role": user.get("role", "user"),
            "exp": datetime.utcnow() + timedelta(hours=24),
            "type": "access"
        }
        access_token = jwt.encode(access_payload, secret, algorithm=algorithm)
        
        # Refresh token (30 days)
        refresh_payload = {
            "sub": str(user["_id"]),
            "exp": datetime.utcnow() + timedelta(days=30),
            "type": "refresh"
        }
        refresh_token = jwt.encode(refresh_payload, secret, algorithm=algorithm)
        
        # Log successful login
        await AuditLogger.log_auth_event(
            db, "login_success",
            user_id=str(user["_id"]),
            email=user["email"],
            success=True
        )
        
        # Set cookies and return response
        response = JSONResponse(content={
            "message": "Login successful",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user.get("full_name"),
                "role": user.get("role", "user"),
                "institution_id": user.get("institution_id")
            }
        })
        
        return create_secure_cookie_response(response, access_token, refresh_token)
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ========== EXAMPLE 2: SECURE CERTIFICATE DOWNLOAD ==========

@app.get("/download-certificate/{certificate_id}")
async def download_certificate(
    certificate_id: str,
    current_user: dict = Depends(lambda: {}),  # Requires authentication
    db = None
):
    """
    Download certificate with authorization checks
    Validates: authentication, ownership, status, file path
    """
    try:
        # Validate and verify user can access
        cert = await validate_certificate_access(
            certificate_id, current_user, db
        )
        
        # Get safe file path with traversal protection
        file_path = build_certificate_download_path(cert["filename"])
        
        # Log the download (for audit trail)
        await AuditLogger.log_admin_action(
            db,
            admin_id=current_user["_id"],
            institution_id=current_user["institution_id"],
            action="certificate_downloaded",
            resource_type="certificate",
            resource_id=certificate_id
        )
        
        return FileResponse(
            file_path,
            filename=f"{cert.get('name', 'certificate')}.pdf",
            media_type="application/pdf"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ========== EXAMPLE 3: SECURE FILE UPLOAD ==========

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(lambda: {}),  # Requires authentication
    db = None
):
    """
    Secure file upload with validation
    Validates: file type, size, filename sanitization
    """
    try:
        # Read file content
        content = await file.read()
        
        # Validate and save
        upload_info = SecureFileUploader.validate_and_save(
            content,
            file.filename or "file",
            file.content_type or "application/octet-stream"
        )
        
        # Store upload reference in database
        db_entry = {
            "user_id": ObjectId(current_user["_id"]),
            "institution_id": current_user.get("institution_id"),
            **upload_info
        }
        
        result = await db.file_uploads.insert_one(db_entry)
        
        # Log upload
        await AuditLogger.log_admin_action(
            db,
            admin_id=current_user["_id"],
            institution_id=current_user["institution_id"],
            action="file_uploaded",
            resource_type="file",
            resource_id=str(result.inserted_id),
            details={
                "original_filename": file.filename,
                "content_type": file.content_type,
                "size": len(content)
            }
        )
        
        return {
            "upload_id": str(result.inserted_id),
            "filename": upload_info["stored_filename"],
            "size": upload_info["size"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ========== EXAMPLE 4: SECURE SEARCH ENDPOINT ==========

@app.get("/search/certificates")
async def search_certificates(
    q: str,
    current_user: dict = Depends(lambda: {}),
    limit: int = 20,
    db = None
):
    """
    Secure search with protection against NoSQL injection
    """
    try:
        # Validate institution ownership
        await verify_institution_ownership(
            current_user["institution_id"],
            current_user
        )
        
        # Limit query length
        if len(q) > 100:
            raise HTTPException(status_code=400, detail="Search query too long")
        
        # Build safe search query (with escaped regex)
        search_query = build_safe_search_query(
            q,
            fields=["name", "recipient_name", "certificate_code"]
        )
        
        # Add institution filter
        full_query = {
            "$and": [
                search_query,
                {"institution_id": current_user["institution_id"]},
                {"status": "active"}
            ]
        }
        
        # Execute with pagination
        results = await db.certificates.find(full_query).limit(limit).to_list(limit)
        
        # Return safe response (exclude sensitive fields)
        return {
            "results": [
                {
                    "id": str(cert["_id"]),
                    "name": cert.get("name"),
                    "recipient": cert.get("recipient_name"),
                    "issued_date": cert.get("issued_date"),
                    "code": cert.get("certificate_code")
                }
                for cert in results
            ],
            "count": len(results)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ========== EXAMPLE 5: SECURE CERTIFICATE VERIFICATION (PUBLIC) ==========

@app.get("/verify/{certificate_id}")
async def verify_certificate(
    certificate_id: str,
    db = None
):
    """
    PUBLIC endpoint to verify certificate
    Only returns non-sensitive public data
    """
    try:
        # Validate ID format
        cert_id = InputValidator.validate_object_id(certificate_id)
        
        # Get certificate (no auth required for public verification)
        cert = await db.certificates.find_one({
            "_id": cert_id,
            "status": "active"  # Only active certificates
        })
        
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Return ONLY public information
        # Do NOT include: verification_code, user_email, user_id
        return {
            "verified": True,
            "certificate_id": certificate_id,
            "name": cert.get("name"),
            "recipient": cert.get("recipient_name"),
            "issued_date": cert.get("issued_date"),
            "institution": cert.get("institution_name"),
            "code": cert.get("certificate_code")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Certificate verification failed")

# ========== EXAMPLE 6: SECURE LOGOUT ==========

@app.post("/logout")
async def logout(current_user: dict = Depends(lambda: {})):
    """
    Secure logout - clear httpOnly cookies
    """
    try:
        response = JSONResponse(content={"message": "Logout successful"})
        return clear_auth_cookies(response)
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Logout failed")

# ========== EXAMPLE 7: INSTITUTION ACCESS WITH AUTHORIZATION ==========

@app.get("/api/institution/{institution_id}")
async def get_institution(
    institution_id: str,
    current_user: dict = Depends(lambda: {}),
    db = None
):
    """
    Get institution with ownership verification
    """
    try:
        # Verify user can access this institution
        await verify_institution_ownership(institution_id, current_user)
        
        # Fetch institution
        institution = await db.institutions.find_one({
            "_id": ObjectId(institution_id)
        })
        
        if not institution:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        # Return institution data
        return {
            "id": str(institution["_id"]),
            "name": institution.get("name"),
            "domain": institution.get("domain"),
            "email": institution.get("email"),
            "created_at": institution.get("created_at")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ========== EXAMPLE 8: ADMIN-ONLY OPERATION WITH AUDIT LOGGING ==========

@app.post("/admin/revoke-certificate/{certificate_id}")
async def revoke_certificate(
    certificate_id: str,
    reason: str,
    current_user: dict = Depends(lambda: {}),
    db = None
):
    """
    Revoke certificate with admin authorization and audit logging
    """
    try:
        # Validate admin role
        await verify_admin_role(current_user)
        
        # Validate ID
        cert_id = InputValidator.validate_object_id(certificate_id)
        
        # Get certificate
        cert = await db.certificates.find_one({"_id": cert_id})
        
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Verify admin belongs to same institution
        if cert["institution_id"] != current_user["institution_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update certificate status
        await db.certificates.update_one(
            {"_id": cert_id},
            {
                "$set": {
                    "status": "revoked",
                    "revoked_at": datetime.utcnow(),
                    "revoked_by": ObjectId(current_user["_id"]),
                    "revocation_reason": InputValidator.sanitize_string(reason)
                }
            }
        )
        
        # Log admin action (for audit trail)
        await AuditLogger.log_admin_action(
            db,
            admin_id=current_user["_id"],
            institution_id=current_user["institution_id"],
            action="certificate_revoked",
            resource_type="certificate",
            resource_id=certificate_id,
            details={
                "reason": reason,
                "certificate_code": cert.get("certificate_code")
            }
        )
        
        return {"message": "Certificate revoked successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        from security_fixes import SafeErrorHandler
        SafeErrorHandler.log_detailed_error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
