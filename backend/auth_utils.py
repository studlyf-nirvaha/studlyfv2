import os
from datetime import datetime, timedelta
from typing import Optional
import jwt
from dotenv import load_dotenv

# Load env from root
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(root_env)

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise ValueError("CRITICAL: JWT_SECRET environment variable is not set. Please generate a secure random key.")
if len(SECRET_KEY) < 32:
    raise ValueError("CRITICAL: JWT_SECRET must be at least 32 characters long for security.")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

import bcrypt

# We are using bcrypt directly since passlib 1.7.4 has known compatibility issues
BCRYPT_ROUNDS = 12

def verify_password(plain_password, hashed_password):
    """Verify a plain password against a hashed one with enhanced error handling."""
    try:
        # Ensure both passwords are strings and handle encoding issues
        if not isinstance(plain_password, str):
            plain_password = str(plain_password)
        if not isinstance(hashed_password, str):
            hashed_password = str(hashed_password)
        
        # Strip whitespace but preserve case for password verification
        plain_password = plain_password.strip()
        hashed_password = hashed_password.strip()
        
        # Verify with bcrypt directly
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError as ve:
        if "Invalid salt" in str(ve):
            # This happens for legacy plaintext passwords; fallback handles it.
            return False
        import logging
        logger = logging.getLogger("auth")
        logger.error(f"Password verification error: {ve}")
        return False
    except Exception as e:
        # Log other errors for debugging
        import logging
        logger = logging.getLogger("auth")
        logger.error(f"Password verification error: {e}")
        return False

_DUMMY_PWD_HASH = bcrypt.hashpw(b"timing-attack-mitigation", bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")

def dummy_verify_password():
    """Run a throwaway bcrypt check to equalize timing on the user-not-found path."""
    try:
        bcrypt.checkpw(b"invalid", _DUMMY_PWD_HASH.encode("utf-8"))
    except Exception:
        pass

def get_password_hash(password):
    """Generate a hashed version of a password using bcrypt with enhanced error handling."""
    try:
        # Ensure password is a string and handle encoding issues
        if not isinstance(password, str):
            password = str(password)
        
        # Strip whitespace but preserve case for password hashing
        password = password.strip()
        
        # Explicitly truncate to 72 bytes to satisfy bcrypt limitations
        password = password[:72]
        
        # Hash with bcrypt directly
        salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger("auth")
        logger.error(f"Password hashing error: {e}")
        raise ValueError(f"Could not hash password. Detail: {str(e)}")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a secure JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
