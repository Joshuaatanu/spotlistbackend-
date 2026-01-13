"""
Cache Service - Provides caching for AEOS metadata with Redis or in-memory fallback

Features:
- Redis caching when available
- In-memory LRU cache as fallback
- Configurable TTL per key type
- Automatic cache invalidation
"""
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Callable, Optional, TypeVar
from functools import lru_cache
import threading

T = TypeVar('T')


# TTL configurations (in seconds)
CACHE_TTL = {
    'channels': 86400,       # 24 hours - channels rarely change
    'companies': 3600,       # 1 hour - companies may be added
    'brands': 3600,          # 1 hour
    'dayparts': 86400,       # 24 hours
    'epg_categories': 86400, # 24 hours
    'profiles': 86400,       # 24 hours
    'spotlist': 900,         # 15 minutes - data changes frequently
    'deep_analysis': 1800,   # 30 minutes
    'default': 3600,         # 1 hour default
}


class InMemoryCache:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key not in self._cache:
                return None
            value, expires_at = self._cache[key]
            if expires_at and datetime.now() > expires_at:
                del self._cache[key]
                return None
            return value
    
    def set(self, key: str, value: str, ttl: int = 3600) -> None:
        with self._lock:
            expires_at = datetime.now() + timedelta(seconds=ttl)
            self._cache[key] = (value, expires_at)
    
    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)
    
    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
    
    def keys(self, pattern: str = "*") -> list:
        """Get keys matching pattern (simple * wildcard support)"""
        with self._lock:
            if pattern == "*":
                return list(self._cache.keys())
            prefix = pattern.rstrip("*")
            return [k for k in self._cache.keys() if k.startswith(prefix)]


class CacheService:
    """
    Unified cache service with Redis or in-memory fallback.
    
    Usage:
        cache = CacheService()
        
        # Direct get/set
        cache.set("channels:all", data, ttl=86400)
        data = cache.get("channels:all")
        
        # Get or fetch pattern
        data = cache.get_or_fetch("channels:all", fetch_channels, ttl=86400)
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize cache service.
        
        Args:
            redis_url: Redis URL (e.g., "redis://localhost:6379"). 
                      Falls back to REDIS_URL env var, then in-memory cache.
        """
        self._redis = None
        self._in_memory = InMemoryCache()
        self._use_redis = False
        
        # Try to connect to Redis
        redis_url = redis_url or os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                self._redis = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self._redis.ping()
                self._use_redis = True
                print(f"✓ Redis cache connected: {redis_url}")
            except Exception as e:
                print(f"⚠ Redis not available, using in-memory cache: {e}")
                self._redis = None
                self._use_redis = False
        else:
            print("ℹ No REDIS_URL set, using in-memory cache")
    
    @property
    def is_redis(self) -> bool:
        return self._use_redis
    
    def _get_ttl(self, key: str) -> int:
        """Get TTL based on key prefix"""
        for prefix, ttl in CACHE_TTL.items():
            if key.startswith(prefix):
                return ttl
        return CACHE_TTL['default']
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache, returns None if not found or expired"""
        try:
            if self._use_redis:
                value = self._redis.get(key)
            else:
                value = self._in_memory.get(key)
            
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error for {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        try:
            ttl = ttl or self._get_ttl(key)
            serialized = json.dumps(value)
            
            if self._use_redis:
                self._redis.setex(key, ttl, serialized)
            else:
                self._in_memory.set(key, serialized, ttl)
            return True
        except Exception as e:
            print(f"Cache set error for {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        try:
            if self._use_redis:
                self._redis.delete(key)
            else:
                self._in_memory.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error for {key}: {e}")
            return False
    
    def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate all keys with given prefix"""
        try:
            if self._use_redis:
                keys = self._redis.keys(f"{prefix}*")
                if keys:
                    return self._redis.delete(*keys)
            else:
                keys = self._in_memory.keys(f"{prefix}*")
                for key in keys:
                    self._in_memory.delete(key)
                return len(keys)
            return 0
        except Exception as e:
            print(f"Cache invalidate error for {prefix}: {e}")
            return 0
    
    def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], T],
        ttl: Optional[int] = None
    ) -> T:
        """
        Get from cache or fetch using provided function.
        
        Args:
            key: Cache key
            fetch_fn: Function to call if cache miss
            ttl: Optional TTL override
            
        Returns:
            Cached or freshly fetched value
        """
        cached = self.get(key)
        if cached is not None:
            return cached
        
        # Fetch and cache
        value = fetch_fn()
        self.set(key, value, ttl=ttl)
        return value
    
    def make_key(self, prefix: str, **params) -> str:
        """
        Generate cache key from prefix and parameters.
        
        Args:
            prefix: Key prefix (e.g., "spotlist")
            **params: Parameters to include in key hash
            
        Returns:
            Cache key like "spotlist:abc123"
        """
        if not params:
            return prefix
        
        # Create deterministic hash of parameters
        param_str = json.dumps(params, sort_keys=True, default=str)
        hash_suffix = hashlib.md5(param_str.encode()).hexdigest()[:12]
        return f"{prefix}:{hash_suffix}"
    
    def stats(self) -> dict:
        """Get cache statistics"""
        if self._use_redis:
            info = self._redis.info()
            return {
                "backend": "redis",
                "keys": self._redis.dbsize(),
                "memory_used": info.get("used_memory_human", "unknown"),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
            }
        else:
            keys = self._in_memory.keys("*")
            return {
                "backend": "in_memory",
                "keys": len(keys),
            }


# Singleton cache instance
_cache_instance: Optional[CacheService] = None


def get_cache() -> CacheService:
    """Get the singleton cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance
