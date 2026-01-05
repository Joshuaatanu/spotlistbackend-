"""
Health check endpoints.
"""

from fastapi import APIRouter

from api.dependencies import SUPABASE_AVAILABLE, check_database_connection

router = APIRouter(tags=["Health"])


@router.get("/health", summary="API Health Check")
async def health_check():
    """
    Check if the API is running.
    
    Returns:
        Status object with "ok" status
    """
    return {"status": "ok"}


@router.get("/db/health", summary="Database Health Check")
async def database_health():
    """
    Check database connection status.
    
    Returns:
        Connection status with connected boolean and optional error message
    """
    if not SUPABASE_AVAILABLE:
        return {"connected": False, "error": "Supabase client not installed"}
    return check_database_connection()
