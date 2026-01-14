"""
Background Jobs API endpoints for creating, managing, and monitoring data collection jobs.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime

from api.dependencies import SUPABASE_AVAILABLE
from supabase_client import (
    create_job as db_create_job,
    get_jobs as db_get_jobs,
    get_job_by_id as db_get_job_by_id,
    delete_job as db_delete_job,
    update_job_status as db_update_job_status,
    get_running_jobs_count,
)
from services.jobs import job_manager, start_job

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


# ============================================================================
# Request/Response Models
# ============================================================================

class JobCreateRequest(BaseModel):
    """Request model for creating a background job."""
    session_id: str = Field(..., description="Anonymous session identifier")
    job_name: str = Field(..., description="User-friendly name for the job")
    job_type: str = Field("spotlist", description="Type of job (spotlist, topTen, etc.)")
    parameters: Dict[str, Any] = Field(..., description="Job parameters (company, dates, filters)")


class JobResponse(BaseModel):
    """Response model for a job."""
    id: str
    session_id: str
    job_name: str
    job_type: str
    status: str
    progress: int
    progress_message: Optional[str] = None
    parameters: Dict[str, Any] = {}
    result_metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class JobListResponse(BaseModel):
    """Response model for job list."""
    jobs: List[Dict[str, Any]]
    running_count: int
    pending_count: int
    max_concurrent: int


# ============================================================================
# Job Endpoints
# ============================================================================

@router.post("", summary="Create Background Job")
async def create_job(request: JobCreateRequest, background_tasks: BackgroundTasks):
    """
    Create a new background data collection job.

    The job will be queued and started automatically when capacity is available.
    Maximum 3 concurrent jobs allowed.

    Args:
        request: Job configuration including session_id, name, type, and parameters

    Returns:
        The created job record

    Raises:
        HTTPException: If database unavailable or creation fails
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")

    # Create job in database
    job = db_create_job(
        session_id=request.session_id,
        job_name=request.job_name,
        job_type=request.job_type,
        parameters=request.parameters
    )

    if job is None:
        raise HTTPException(status_code=500, detail="Failed to create job")

    job_id = job.get("id")

    # Try to start job immediately (or queue it)
    async def start_job_task():
        await start_job(job_id, request.parameters)

    background_tasks.add_task(start_job_task)

    # Return job with current status
    return {
        **job,
        "message": "Job created" if job_manager.can_start_job() else "Job queued (max concurrent jobs reached)"
    }


@router.get("", summary="List Jobs")
async def list_jobs(
    session_id: str,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    """
    Get background jobs for a session.

    Args:
        session_id: Anonymous session identifier
        status: Optional filter by status (pending, queued, running, completed, failed)
        limit: Maximum number of records (default: 20)
        offset: Number of records to skip

    Returns:
        List of jobs with counts and status information
    """
    if not SUPABASE_AVAILABLE:
        return JobListResponse(
            jobs=[],
            running_count=0,
            pending_count=0,
            max_concurrent=3
        )

    jobs = db_get_jobs(session_id, status, limit, offset)

    # Count by status
    running_count = sum(1 for j in jobs if j.get("status") == "running")
    pending_count = sum(1 for j in jobs if j.get("status") in ["pending", "queued"])

    return {
        "jobs": jobs,
        "running_count": running_count,
        "pending_count": pending_count,
        "max_concurrent": 3
    }


@router.get("/status", summary="Get Job Manager Status")
async def get_manager_status():
    """
    Get the current status of the job manager.

    Returns:
        Current running count, max concurrent, and whether new jobs can start
    """
    return job_manager.get_status()


@router.get("/{job_id}", summary="Get Job Details")
async def get_job(job_id: str, session_id: str):
    """
    Get detailed information about a specific job.

    Args:
        job_id: UUID of the job
        session_id: Session ID for authorization

    Returns:
        The job record with all details including result_data if completed

    Raises:
        HTTPException: If database unavailable or job not found
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")

    job = db_get_job_by_id(job_id, session_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.delete("/{job_id}", summary="Cancel/Delete Job")
async def delete_job(job_id: str, session_id: str):
    """
    Cancel a running job or delete a completed/failed job.

    Args:
        job_id: UUID of the job
        session_id: Session ID for authorization

    Returns:
        Confirmation of deletion

    Raises:
        HTTPException: If database unavailable, job not found, or unauthorized
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")

    # Check if job is running and cancel it
    if job_manager.is_job_running(job_id):
        await job_manager.cancel_job(job_id)
        # Update status in database
        db_update_job_status(
            job_id,
            status="failed",
            error_message="Cancelled by user",
            completed_at=datetime.utcnow()
        )
        return {"deleted": True, "was_running": True}

    # Delete from database
    success = db_delete_job(job_id, session_id)

    if not success:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")

    return {"deleted": True, "was_running": False}


@router.post("/{job_id}/retry", summary="Retry Failed Job")
async def retry_job(job_id: str, session_id: str, background_tasks: BackgroundTasks):
    """
    Retry a failed job.

    Args:
        job_id: UUID of the failed job
        session_id: Session ID for authorization

    Returns:
        The updated job record

    Raises:
        HTTPException: If job not found, not failed, or retry fails
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")

    job = db_get_job_by_id(job_id, session_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("status") != "failed":
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")

    # Reset job status
    db_update_job_status(
        job_id,
        status="pending",
        progress=0,
        progress_message="Retrying...",
        error_message=None
    )

    # Start the job
    parameters = job.get("parameters", {})

    async def start_job_task():
        await start_job(job_id, parameters)

    background_tasks.add_task(start_job_task)

    return {
        "id": job_id,
        "status": "pending",
        "message": "Job retry scheduled"
    }
