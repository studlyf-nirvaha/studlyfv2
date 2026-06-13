import time
from functools import wraps
from fastapi import Request

# Simple in-memory cache: {cache_key: {'data': ..., 'timestamp': ...}}
_cache = {}
CACHE_TTL = 300 # 5 minutes

def cache_response(key_prefix: str):
    """
    Decorator for caching read-heavy GET endpoints.
    
    Usage:
    @router.get("/some-endpoint")
    @cache_response("prefix")
    async def endpoint(...):
        ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate a unique cache key based on args/kwargs
            # For this simple implementation, we'll use a combination of prefix 
            # and request-specific arguments (e.g., institution_id or event_id)
            cache_key = f"{key_prefix}:{str(args)}:{str(kwargs)}"
            
            now = time.time()
            if cache_key in _cache:
                entry = _cache[cache_key]
                if now - entry['timestamp'] < CACHE_TTL:
                    return entry['data']
            
            # Execute the actual function
            result = await func(*args, **kwargs)
            
            # Cache the result
            _cache[cache_key] = {'timestamp': now, 'data': result}
            return result
        return wrapper
    return decorator
