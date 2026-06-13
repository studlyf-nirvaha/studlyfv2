"""
Rate limiting utilities for API endpoints.
"""
import os
import time
from typing import Dict, Optional
from fastapi import HTTPException, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# Initialize rate limiter with Redis backend (fallback to memory if Redis not available)
USE_REDIS = False
redis_client = None

if REDIS_AVAILABLE:
    try:
        redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=int(os.getenv("REDIS_DB", 0)),
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True
        )
        redis_client.ping()
        limiter = Limiter(key_func=get_remote_address, storage_uri=f"redis://{redis_client.host}:{redis_client.port}/{redis_client.db}")
        USE_REDIS = True
    except Exception:
        limiter = Limiter(key_func=get_remote_address)
        USE_REDIS = False
else:
    limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "auth": {
        "login": "5/minute",      # 5 login attempts per minute
        "register": "3/minute",   # 3 registration attempts per minute
        "reset": "3/hour",        # 3 password reset attempts per hour
    },
    "api": {
        "general": "100/minute", # 100 requests per minute for general API
        "upload": "10/minute",    # 10 file uploads per minute
        "search": "30/minute",   # 30 search requests per minute
    }
}

class MemoryRateLimiter:
    """In-memory rate limiter as fallback when Redis is not available."""
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self.requests: Dict[str, Dict[str, list]] = {}
            self._initialized = True

    def is_allowed(self, key: str, limit: int, window: int) -> tuple[bool, Dict[str, int]]:
        """
        Check if request is allowed based on rate limit.
        
        Args:
            key: Unique identifier (usually IP address)
            limit: Maximum requests allowed
            window: Time window in seconds
            
        Returns:
            tuple: (allowed, info_dict)
        """
        current_time = time.time()
        
        if key not in self.requests:
            self.requests[key] = {}
        
        # Clean old requests outside the window
        if "requests" not in self.requests[key]:
            self.requests[key]["requests"] = []
        
        # Remove requests outside the time window
        self.requests[key]["requests"] = [
            req_time for req_time in self.requests[key]["requests"]
            if current_time - req_time < window
        ]
        
        # Check if under limit
        if len(self.requests[key]["requests"]) < limit:
            self.requests[key]["requests"].append(current_time)
            return True, {
                "limit": limit,
                "remaining": limit - len(self.requests[key]["requests"]) - 1,
                "reset": int(current_time + window)
            }
        else:
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset": int(current_time + window)
            }

# Module-level singleton used by all code paths
_memory_limiter = MemoryRateLimiter()

def get_rate_limit_string(limit_str: str) -> tuple[int, int]:
    """
    Parse rate limit string like "5/minute" into (limit, window_seconds).
    
    Args:
        limit_str: Rate limit string
        
    Returns:
        tuple: (limit, window_seconds)
    """
    if "/" not in limit_str:
        return 100, 60  # Default
    
    limit, period = limit_str.split("/", 1)
    limit = int(limit)
    
    period_map = {
        "second": 1,
        "minute": 60,
        "hour": 3600,
        "day": 86400
    }
    
    window = period_map.get(period.lower(), 60)
    return limit, window

def check_rate_limit(
    request: Request, 
    limit_type: str = "general",
    category: str = "api"
) -> None:
    """
    Check rate limit for a request.
    
    Args:
        request: FastAPI Request object
        limit_type: Specific limit type (login, register, etc.)
        category: Rate limit category (auth, api)
        
    Raises:
        HTTPException: If rate limit exceeded
    """
    # Get rate limit configuration
    limit_config = RATE_LIMITS.get(category, {}).get(limit_type, "100/minute")
    limit, window = get_rate_limit_string(limit_config)
    
    # Get client IP
    client_ip = get_remote_address(request)
    
    if USE_REDIS:
        # Use Redis-based rate limiting
        key = f"rate_limit:{category}:{limit_type}:{client_ip}"
        
        try:
            current_count = redis_client.get(key)
            if current_count is None:
                redis_client.setex(key, window, 1)
            else:
                current_count = int(current_count)
                if current_count >= limit:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. {limit} requests per {window//60} minute(s) allowed.",
                        headers={
                            "X-RateLimit-Limit": str(limit),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(int(time.time() + window))
                        }
                    )
                redis_client.incr(key)
                redis_client.expire(key, window)
        except redis.RedisError:
            # Fallback to memory limiter if Redis fails
            allowed, info = _memory_limiter.is_allowed(client_ip, limit, window)
            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. {limit} requests per {window//60} minute(s) allowed.",
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset"])
                    }
                )
    else:
        # Use memory-based rate limiting
        allowed, info = _memory_limiter.is_allowed(client_ip, limit, window)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. {limit} requests per {window//60} minute(s) allowed.",
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(info["reset"])
                }
            )

# Decorator for rate limiting
def rate_limit(limit_type: str = "general", category: str = "api"):
    """
    Decorator for applying rate limits to endpoints.
    
    Args:
        limit_type: Specific limit type
        category: Rate limit category
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs
            request = None
            for key, value in kwargs.items():
                if isinstance(value, Request):
                    request = value
                    break
            
            if request:
                check_rate_limit(request, limit_type, category)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
