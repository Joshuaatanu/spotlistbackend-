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
