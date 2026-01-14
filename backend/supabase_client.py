# Supabase Client for Spotlist Checker
# This module provides the Supabase client and helper functions for database operations.

import os
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

try:
    from supabase import create_client, Client
except ImportError:
    print("Warning: supabase package not installed. Run: pip install supabase")
    create_client = None
    Client = None

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Global client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Get or create the Supabase client singleton."""
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: SUPABASE_URL and SUPABASE_KEY environment variables not set")
        return None
    
    if create_client is None:
        print("Warning: supabase package not installed")
        return None
    
    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        print(f"Error creating Supabase client: {e}")
        return None


# ============================================================================
# Analysis Operations
# ============================================================================

def save_analysis(
    session_id: str,
    file_name: str,
    metrics: Dict[str, Any],
    spotlist_data: Optional[List[Dict]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[Dict]:
    """
    Save an analysis result to the database.
    
    Args:
        session_id: Anonymous session identifier
        file_name: Original file name or data source description
        metrics: Analysis metrics (total_spots, double_spots, etc.)
        spotlist_data: Full annotated spotlist (optional, can be large)
        metadata: Additional metadata (report_type, date_range, etc.)
    
    Returns:
        The saved record or None on failure
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        data = {
            "session_id": session_id,
            "file_name": file_name,
            "metrics": metrics,
            "spotlist_data": spotlist_data,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = client.table("analyses").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error saving analysis: {e}")
        return None


def get_analyses(
    session_id: str,
    limit: int = 10,
    offset: int = 0
) -> List[Dict]:
    """
    Get analysis history for a session.
    
    Args:
        session_id: Anonymous session identifier
        limit: Maximum number of records to return
        offset: Number of records to skip
    
    Returns:
        List of analysis records
    """
    client = get_supabase_client()
    if not client:
        return []
    
    try:
        result = (
            client.table("analyses")
            .select("id, session_id, file_name, metrics, spotlist_data, metadata, created_at")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error fetching analyses: {e}")
        return []


def get_analysis_by_id(analysis_id: str) -> Optional[Dict]:
    """
    Get a specific analysis by ID.
    
    Args:
        analysis_id: The analysis UUID
    
    Returns:
        The analysis record or None
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        result = (
            client.table("analyses")
            .select("*")
            .eq("id", analysis_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as e:
        print(f"Error fetching analysis {analysis_id}: {e}")
        return None


def delete_analysis(analysis_id: str, session_id: str) -> bool:
    """
    Delete an analysis (only if it belongs to the session).
    
    Args:
        analysis_id: The analysis UUID
        session_id: Session ID for authorization
    
    Returns:
        True if deleted, False otherwise
    """
    client = get_supabase_client()
    if not client:
        return False
    
    try:
        result = (
            client.table("analyses")
            .delete()
            .eq("id", analysis_id)
            .eq("session_id", session_id)
            .execute()
        )
        return len(result.data) > 0 if result.data else False
    except Exception as e:
        print(f"Error deleting analysis {analysis_id}: {e}")
        return False


# ============================================================================
# Configuration Operations
# ============================================================================

def save_configuration(session_id: str, config: Dict[str, Any]) -> Optional[Dict]:
    """
    Save or update user configuration.
    Uses upsert to update existing config or create new one.
    
    Args:
        session_id: Anonymous session identifier
        config: Configuration settings
    
    Returns:
        The saved record or None on failure
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        data = {
            "session_id": session_id,
            "config": config,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = (
            client.table("configurations")
            .upsert(data, on_conflict="session_id")
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error saving configuration: {e}")
        return None


def get_configuration(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Get saved configuration for a session.
    
    Args:
        session_id: Anonymous session identifier
    
    Returns:
        The config dict or None
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        result = (
            client.table("configurations")
            .select("config")
            .eq("session_id", session_id)
            .single()
            .execute()
        )
        return result.data.get("config") if result.data else None
    except Exception as e:
        # Not found is expected for new sessions
        return None


# ============================================================================
# Background Jobs Operations
# ============================================================================

def create_job(
    session_id: str,
    job_name: str,
    job_type: str,
    parameters: Dict[str, Any]
) -> Optional[Dict]:
    """
    Create a new background job.

    Args:
        session_id: Anonymous session identifier
        job_name: User-friendly job name
        job_type: Type of job (spotlist, topTen, etc.)
        parameters: Job parameters (company_name, dates, filters, etc.)

    Returns:
        The created job record or None on failure
    """
    client = get_supabase_client()
    if not client:
        return None

    try:
        data = {
            "session_id": session_id,
            "job_name": job_name,
            "job_type": job_type,
            "parameters": parameters,
            "status": "pending",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat()
        }

        result = client.table("background_jobs").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating job: {e}")
        import traceback
        traceback.print_exc()
        raise  # Re-raise to get better error in the API response


def get_jobs(
    session_id: str,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
) -> List[Dict]:
    """
    Get background jobs for a session.

    Args:
        session_id: Anonymous session identifier
        status: Optional status filter
        limit: Maximum number of records
        offset: Number of records to skip

    Returns:
        List of job records
    """
    client = get_supabase_client()
    if not client:
        return []

    try:
        query = (
            client.table("background_jobs")
            .select("id, session_id, job_name, job_type, status, progress, progress_message, parameters, result_metadata, error_message, created_at, started_at, completed_at")
            .eq("session_id", session_id)
        )

        if status:
            query = query.eq("status", status)

        result = (
            query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return []


def get_job_by_id(job_id: str, session_id: Optional[str] = None) -> Optional[Dict]:
    """
    Get a specific job by ID.

    Args:
        job_id: The job UUID
        session_id: Optional session ID for authorization

    Returns:
        The job record or None
    """
    client = get_supabase_client()
    if not client:
        return None

    try:
        query = client.table("background_jobs").select("*").eq("id", job_id)

        if session_id:
            query = query.eq("session_id", session_id)

        result = query.single().execute()
        return result.data
    except Exception as e:
        print(f"Error fetching job {job_id}: {e}")
        return None


def update_job_status(
    job_id: str,
    status: str,
    progress: Optional[int] = None,
    progress_message: Optional[str] = None,
    error_message: Optional[str] = None,
    started_at: Optional[datetime] = None,
    completed_at: Optional[datetime] = None
) -> bool:
    """
    Update job status and progress.

    Args:
        job_id: The job UUID
        status: New status (pending, queued, running, completed, failed)
        progress: Progress percentage (0-100)
        progress_message: Current progress message
        error_message: Error message if failed
        started_at: Timestamp when job started
        completed_at: Timestamp when job completed

    Returns:
        True if updated, False otherwise
    """
    client = get_supabase_client()
    if not client:
        return False

    try:
        data = {"status": status}

        if progress is not None:
            data["progress"] = progress
        if progress_message is not None:
            data["progress_message"] = progress_message
        if error_message is not None:
            data["error_message"] = error_message
        if started_at is not None:
            data["started_at"] = started_at.isoformat()
        if completed_at is not None:
            data["completed_at"] = completed_at.isoformat()

        result = (
            client.table("background_jobs")
            .update(data)
            .eq("id", job_id)
            .execute()
        )
        return len(result.data) > 0 if result.data else False
    except Exception as e:
        print(f"Error updating job {job_id}: {e}")
        return False


def complete_job(
    job_id: str,
    result_data: Any,
    result_metadata: Dict[str, Any]
) -> bool:
    """
    Mark a job as complete with its results.

    Args:
        job_id: The job UUID
        result_data: The collected data
        result_metadata: Metadata about the results

    Returns:
        True if updated, False otherwise
    """
    client = get_supabase_client()
    if not client:
        return False

    try:
        # Don't store full result_data if it's too large (>1MB estimated)
        import json
        result_json = json.dumps(result_data) if result_data else "[]"
        data_size_mb = len(result_json) / (1024 * 1024)

        print(f"[complete_job] Job {job_id}: {len(result_data) if result_data else 0} rows, ~{data_size_mb:.2f}MB")

        # If data is too large, don't store it in DB - just store metadata
        if data_size_mb > 1:
            print(f"[complete_job] Data too large ({data_size_mb:.2f}MB), storing metadata only")
            store_data = None  # Don't store large data in DB
            result_metadata["data_too_large"] = True
            result_metadata["data_size_mb"] = round(data_size_mb, 2)
        else:
            store_data = result_data

        data = {
            "status": "completed",
            "progress": 100,
            "progress_message": "Complete",
            "result_data": store_data,
            "result_metadata": result_metadata,
            "completed_at": datetime.utcnow().isoformat()
        }

        result = (
            client.table("background_jobs")
            .update(data)
            .eq("id", job_id)
            .execute()
        )
        return len(result.data) > 0 if result.data else False
    except Exception as e:
        print(f"Error completing job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        return False


def delete_job(job_id: str, session_id: str) -> bool:
    """
    Delete a job (only if it belongs to the session).

    Args:
        job_id: The job UUID
        session_id: Session ID for authorization

    Returns:
        True if deleted, False otherwise
    """
    client = get_supabase_client()
    if not client:
        return False

    try:
        result = (
            client.table("background_jobs")
            .delete()
            .eq("id", job_id)
            .eq("session_id", session_id)
            .execute()
        )
        return len(result.data) > 0 if result.data else False
    except Exception as e:
        print(f"Error deleting job {job_id}: {e}")
        return False


def get_pending_jobs(limit: int = 10) -> List[Dict]:
    """
    Get pending jobs that need to be started (for queue processing).

    Args:
        limit: Maximum number of jobs to return

    Returns:
        List of pending job records
    """
    client = get_supabase_client()
    if not client:
        return []

    try:
        result = (
            client.table("background_jobs")
            .select("*")
            .in_("status", ["pending", "queued"])
            .order("created_at", desc=False)  # FIFO order
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error fetching pending jobs: {e}")
        return []


def get_running_jobs_count() -> int:
    """
    Get count of currently running jobs.

    Returns:
        Number of running jobs
    """
    client = get_supabase_client()
    if not client:
        return 0

    try:
        result = (
            client.table("background_jobs")
            .select("id", count="exact")
            .eq("status", "running")
            .execute()
        )
        return result.count if result.count else 0
    except Exception as e:
        print(f"Error counting running jobs: {e}")
        return 0


# ============================================================================
# Database Health Check
# ============================================================================

def check_database_connection() -> Dict[str, Any]:
    """
    Check if the database connection is working.
    
    Returns:
        Status dict with connected boolean and optional error message
    """
    client = get_supabase_client()
    
    if not client:
        return {
            "connected": False,
            "error": "Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY."
        }
    
    try:
        # Try a simple query
        result = client.table("analyses").select("id").limit(1).execute()
        return {"connected": True}
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }
