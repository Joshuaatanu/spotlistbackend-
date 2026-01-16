"""
Health check endpoints with comprehensive system status.

Provides endpoints for checking API health, database connectivity,
AEOS API availability, job queue status, and overall system health.
"""

import logging
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter

from api.dependencies import (
    SUPABASE_AVAILABLE,
    AEOS_AVAILABLE,
    JOBS_AVAILABLE,
    OPENAI_AVAILABLE,
    check_database_connection,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get("/health", summary="API Health Check")
async def health_check():
    """
    Quick check if the API is running.

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


@router.get("/health/detailed", summary="Detailed System Health Check")
async def detailed_health_check():
    """
    Comprehensive health check of all system components.

    Checks:
    - Database connectivity
    - AEOS API availability
    - Job queue status (with orphaned job detection)
    - OpenAI integration status

    Returns:
        Detailed health status with overall status (healthy/degraded/unhealthy)
    """
    health_status = {
        "status": "healthy",
        "components": {},
        "issues": [],
        "recovery_actions": []
    }

    # 1. Database Health
    db_status = await _check_database_health()
    health_status["components"]["database"] = db_status
    if not db_status.get("healthy"):
        health_status["issues"].append("Database connection issue")

    # 2. AEOS API Health
    aeos_status = await _check_aeos_health()
    health_status["components"]["aeos_api"] = aeos_status
    if not aeos_status.get("healthy"):
        health_status["issues"].append("AEOS API not available")

    # 3. Job Queue Health
    job_status = await _check_job_queue_health()
    health_status["components"]["job_queue"] = job_status
    if job_status.get("orphaned_jobs", 0) > 0:
        health_status["issues"].append(f"Found {job_status['orphaned_jobs']} orphaned jobs")
        health_status["recovery_actions"].append("auto_recover_jobs")

    # 4. OpenAI Health
    openai_status = await _check_openai_health()
    health_status["components"]["openai"] = openai_status
    if not openai_status.get("healthy"):
        health_status["issues"].append("OpenAI integration not available")

    # Determine overall status
    critical_issues = sum(1 for c in health_status["components"].values()
                         if not c.get("healthy") and c.get("critical", False))
    non_critical_issues = sum(1 for c in health_status["components"].values()
                              if not c.get("healthy") and not c.get("critical", False))

    if critical_issues > 0:
        health_status["status"] = "unhealthy"
    elif non_critical_issues > 0 or len(health_status["issues"]) > 0:
        health_status["status"] = "degraded"

    # Auto-trigger recovery if needed
    if "auto_recover_jobs" in health_status["recovery_actions"]:
        recovery_result = await _trigger_job_recovery()
        health_status["recovery_result"] = recovery_result

    return health_status


async def _check_database_health() -> Dict[str, Any]:
    """Check database health."""
    if not SUPABASE_AVAILABLE:
        return {
            "healthy": False,
            "critical": True,
            "available": False,
            "error": "Supabase client not installed"
        }

    try:
        result = check_database_connection()
        return {
            "healthy": result.get("connected", False),
            "critical": True,
            "available": True,
            "connected": result.get("connected", False),
            "error": result.get("error")
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "healthy": False,
            "critical": True,
            "available": True,
            "error": str(e)
        }


async def _check_aeos_health() -> Dict[str, Any]:
    """Check AEOS API health."""
    if not AEOS_AVAILABLE:
        return {
            "healthy": False,
            "critical": False,
            "available": False,
            "error": "AEOS integration not installed"
        }

    try:
        # Try to instantiate AEOS client (this will authenticate)
        from api.dependencies import AEOSClient
        loop = asyncio.get_event_loop()

        # Use run_in_executor for the sync operation
        try:
            client = await asyncio.wait_for(
                loop.run_in_executor(None, AEOSClient),
                timeout=10.0
            )
            return {
                "healthy": True,
                "critical": False,
                "available": True,
                "authenticated": client.token is not None
            }
        except asyncio.TimeoutError:
            return {
                "healthy": False,
                "critical": False,
                "available": True,
                "error": "AEOS authentication timeout"
            }
    except Exception as e:
        logger.error(f"AEOS health check failed: {e}")
        return {
            "healthy": False,
            "critical": False,
            "available": True,
            "error": str(e)
        }


async def _check_job_queue_health() -> Dict[str, Any]:
    """Check job queue health and detect orphaned jobs."""
    if not JOBS_AVAILABLE:
        return {
            "healthy": True,
            "critical": False,
            "available": False,
            "error": "Job service not installed"
        }

    try:
        from services.jobs import job_manager

        status = job_manager.get_status()

        # Check for orphaned jobs in database
        orphaned_count = 0
        if SUPABASE_AVAILABLE:
            try:
                from supabase_client import get_stale_running_jobs
                stale_jobs = get_stale_running_jobs()

                # Filter out jobs that are actually running in memory
                orphaned = [
                    j for j in stale_jobs
                    if j.get("id") not in status.get("running_job_ids", [])
                ]
                orphaned_count = len(orphaned)
            except Exception as e:
                logger.warning(f"Could not check for orphaned jobs: {e}")

        return {
            "healthy": orphaned_count == 0,
            "critical": False,
            "available": True,
            "running_jobs": status.get("running_count", 0),
            "max_concurrent": status.get("max_concurrent", 3),
            "can_start_new": status.get("can_start", True),
            "orphaned_jobs": orphaned_count,
            "recovered": status.get("recovered", False)
        }
    except Exception as e:
        logger.error(f"Job queue health check failed: {e}")
        return {
            "healthy": False,
            "critical": False,
            "available": True,
            "error": str(e)
        }


async def _check_openai_health() -> Dict[str, Any]:
    """Check OpenAI integration health."""
    if not OPENAI_AVAILABLE:
        return {
            "healthy": False,
            "critical": False,
            "available": False,
            "error": "OpenAI library not installed"
        }

    try:
        from api.dependencies import OPENAI_API_KEY
        from api.routes.insights import _circuit_state

        api_key_configured = OPENAI_API_KEY is not None and len(OPENAI_API_KEY) > 0

        return {
            "healthy": api_key_configured and not _circuit_state.get("is_open", False),
            "critical": False,
            "available": True,
            "api_key_configured": api_key_configured,
            "circuit_breaker_open": _circuit_state.get("is_open", False),
            "circuit_breaker_failures": _circuit_state.get("failures", 0)
        }
    except Exception as e:
        logger.error(f"OpenAI health check failed: {e}")
        return {
            "healthy": False,
            "critical": False,
            "available": True,
            "error": str(e)
        }


async def _trigger_job_recovery() -> Dict[str, Any]:
    """Trigger automatic job recovery if orphaned jobs detected."""
    if not JOBS_AVAILABLE:
        return {"triggered": False, "reason": "Job service not available"}

    try:
        from services.jobs import job_manager

        # Only recover if not already recovered
        if job_manager._recovered:
            return {"triggered": False, "reason": "Already recovered"}

        result = await job_manager.recover_on_startup()
        return {
            "triggered": True,
            "stale_jobs_found": result.get("stale_jobs_found", 0),
            "stale_jobs_marked_failed": result.get("stale_jobs_marked_failed", 0),
            "queued_jobs_started": result.get("queued_jobs_started", 0),
            "errors": result.get("errors", [])
        }
    except Exception as e:
        logger.error(f"Job recovery failed: {e}")
        return {"triggered": False, "error": str(e)}


@router.post("/health/recover-jobs", summary="Manually Trigger Job Recovery")
async def manual_job_recovery():
    """
    Manually trigger job recovery process.

    This will:
    1. Find and mark stale 'running' jobs as failed
    2. Process any queued jobs

    Returns:
        Recovery statistics
    """
    if not JOBS_AVAILABLE:
        return {"success": False, "error": "Job service not available"}

    try:
        from services.jobs import job_manager

        # Force recovery even if already run
        job_manager._recovered = False
        result = await job_manager.recover_on_startup()

        return {
            "success": True,
            **result
        }
    except Exception as e:
        logger.error(f"Manual job recovery failed: {e}")
        return {"success": False, "error": str(e)}
