"""
Database (Supabase) endpoints for analysis and configuration CRUD operations.
"""

from fastapi import APIRouter, HTTPException

from api.models.requests import AnalysisSaveRequest, ConfigurationSaveRequest
from api.dependencies import (
    SUPABASE_AVAILABLE,
    save_analysis, get_analyses, get_analysis_by_id, delete_analysis,
    save_configuration, get_configuration
)

router = APIRouter(prefix="/analyses", tags=["Database"])
config_router = APIRouter(prefix="/configurations", tags=["Database"])


# ============================================================================
# Analysis Endpoints
# ============================================================================

@router.post("", summary="Save Analysis")
async def create_analysis(request: AnalysisSaveRequest):
    """
    Save an analysis result to the database.
    
    Args:
        request: Analysis data including session_id, file_name, metrics, and optional spotlist_data
        
    Returns:
        The saved analysis record
        
    Raises:
        HTTPException: If database is unavailable or save fails
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = save_analysis(
        session_id=request.session_id,
        file_name=request.file_name,
        metrics=request.metrics,
        spotlist_data=request.spotlist_data,
        metadata=request.metadata
    )
    
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to save analysis")
    
    return result


@router.get("", summary="List Analyses")
async def list_analyses(session_id: str, limit: int = 10, offset: int = 0):
    """
    Get analysis history for a session.
    
    Args:
        session_id: Anonymous session identifier
        limit: Maximum number of records to return (default: 10)
        offset: Number of records to skip for pagination
        
    Returns:
        List of analysis records, empty list if database unavailable
    """
    if not SUPABASE_AVAILABLE:
        return []
    
    return get_analyses(session_id, limit, offset)


@router.get("/{analysis_id}", summary="Get Analysis")
async def get_analysis(analysis_id: str):
    """
    Get a specific analysis by ID.
    
    Args:
        analysis_id: UUID of the analysis
        
    Returns:
        The analysis record
        
    Raises:
        HTTPException: If database unavailable or analysis not found
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = get_analysis_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return result


@router.delete("/{analysis_id}", summary="Delete Analysis")
async def remove_analysis(analysis_id: str, session_id: str):
    """
    Delete an analysis (only if it belongs to the session).
    
    Args:
        analysis_id: UUID of the analysis to delete
        session_id: Session ID for authorization
        
    Returns:
        Confirmation of deletion
        
    Raises:
        HTTPException: If database unavailable, not found, or unauthorized
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    success = delete_analysis(analysis_id, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis not found or unauthorized")
    
    return {"deleted": True}


# ============================================================================
# Configuration Endpoints
# ============================================================================

@config_router.post("", summary="Save Configuration")
async def create_or_update_configuration(request: ConfigurationSaveRequest):
    """
    Save or update user configuration.
    
    Uses upsert to update existing config or create new one.
    
    Args:
        request: Configuration data including session_id and config dict
        
    Returns:
        The saved configuration record
        
    Raises:
        HTTPException: If database unavailable or save fails
    """
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = save_configuration(request.session_id, request.config)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to save configuration")
    
    return result


@config_router.get("/{session_id}", summary="Get Configuration")
async def get_saved_configuration(session_id: str):
    """
    Get saved configuration for a session.
    
    Args:
        session_id: Anonymous session identifier
        
    Returns:
        Configuration dict or None if not found
    """
    if not SUPABASE_AVAILABLE:
        return None
    
    config = get_configuration(session_id)
    return {"config": config}
