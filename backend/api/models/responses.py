"""
Pydantic models for API responses.

These models provide type safety and automatic OpenAPI documentation
for all API response types.
"""

from datetime import datetime
from typing import Any, Optional, List, Dict
from pydantic import BaseModel, Field


# ============================================================================
# Health Response Models
# ============================================================================

class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str = Field(..., description="API health status", json_schema_extra={"example": "ok"})


class DatabaseHealthResponse(BaseModel):
    """Response model for database health check."""
    connected: bool = Field(..., description="Whether the database is connected")
    error: Optional[str] = Field(None, description="Error message if not connected")


# ============================================================================
# Analysis Response Models
# ============================================================================

class FieldMap(BaseModel):
    """Mapping of detected column names."""
    cost_column: Optional[str] = Field(None, description="Column name for cost data")
    program_column: Optional[str] = Field(None, description="Column name for program/channel")
    creative_column: Optional[str] = Field(None, description="Column name for creative/claim")
    reach_column: Optional[str] = Field(None, description="Column name for reach data")
    xrp_column: Optional[str] = Field(None, description="Column name for XRP data")
    daypart_column: Optional[str] = Field(None, description="Column name for daypart")
    duration_column: Optional[str] = Field(None, description="Column name for duration")
    epg_category_column: Optional[str] = Field(None, description="Column name for EPG category")


class AnalysisMetrics(BaseModel):
    """Core analysis metrics."""
    total_spots: int = Field(..., description="Total number of spots analyzed")
    double_spots: int = Field(..., description="Number of double-booked spots")
    total_cost: float = Field(..., description="Total advertising spend")
    double_cost: float = Field(..., description="Spend on double-booked spots")
    percent_spots: float = Field(..., ge=0, le=1, description="Percentage of double spots")
    percent_cost: float = Field(..., ge=0, le=1, description="Percentage of double cost")
    
    # Optional extended metrics
    total_xrp: Optional[float] = Field(None, description="Total XRP (if available)")
    double_xrp: Optional[float] = Field(None, description="XRP for double spots")
    percent_xrp: Optional[float] = Field(None, description="Percentage of double XRP")
    total_reach: Optional[float] = Field(None, description="Total reach")
    double_reach: Optional[float] = Field(None, description="Reach for double spots")
    cost_per_xrp: Optional[float] = Field(None, description="Cost efficiency metric")
    
    # Efficiency metrics
    efficient_spots: Optional[int] = Field(None, description="Non-double spots count")
    efficient_cost: Optional[float] = Field(None, description="Cost for efficient spots")
    efficient_percent_spots: Optional[float] = Field(None, description="Percentage of efficient spots")
    efficient_percent_cost: Optional[float] = Field(None, description="Percentage of efficient cost")
    total_stations: Optional[int] = Field(None, description="Number of unique stations")
    
    model_config = {"extra": "allow"}  # Allow additional metrics


class WindowSummary(BaseModel):
    """Metrics for a specific time window."""
    window_minutes: int = Field(..., description="Time window size in minutes")
    all: Dict[str, Any] = Field(..., description="Metrics for this window")


class AnalysisMetadata(BaseModel):
    """Metadata about the analysis."""
    report_type: str = Field("spotlist", description="Type of report generated")
    company_name: Optional[str] = Field(None, description="Company name if AEOS source")
    date_from: Optional[str] = Field(None, description="Start date for AEOS data")
    date_to: Optional[str] = Field(None, description="End date for AEOS data")
    channel_filter: Optional[str] = Field(None, description="Channel filter applied")


class AnalysisResponse(BaseModel):
    """Complete analysis response."""
    metrics: Dict[str, Any] = Field(..., description="Analysis metrics")
    window_summaries: List[WindowSummary] = Field(..., description="Multi-window analysis results")
    data: List[Dict[str, Any]] = Field(..., description="Annotated spotlist data")
    field_map: FieldMap = Field(..., description="Detected column mappings")
    metadata: AnalysisMetadata = Field(..., description="Analysis metadata")


# ============================================================================
# Database Response Models
# ============================================================================

class AnalysisRecord(BaseModel):
    """Stored analysis record from database."""
    id: str = Field(..., description="Unique analysis ID (UUID)")
    session_id: str = Field(..., description="Session identifier")
    file_name: str = Field(..., description="Source file name or description")
    metrics: Dict[str, Any] = Field(..., description="Analysis metrics")
    spotlist_data: Optional[List[Dict[str, Any]]] = Field(None, description="Full spotlist data")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    created_at: datetime = Field(..., description="When the analysis was created")


class ConfigurationRecord(BaseModel):
    """Stored configuration record."""
    id: str = Field(..., description="Configuration ID")
    session_id: str = Field(..., description="Session identifier")
    config: Dict[str, Any] = Field(..., description="Configuration settings")
    updated_at: datetime = Field(..., description="Last update time")


class ConfigurationResponse(BaseModel):
    """Response wrapper for configuration."""
    config: Optional[Dict[str, Any]] = Field(None, description="Configuration settings or null")


class DeleteResponse(BaseModel):
    """Response for delete operations."""
    deleted: bool = Field(..., description="Whether deletion was successful")


# ============================================================================
# AI Insights Response Models
# ============================================================================

class InsightsResponse(BaseModel):
    """Response from AI insights generation."""
    insights: str = Field(..., description="AI-generated analysis and recommendations")


# ============================================================================
# Metadata Response Models
# ============================================================================

class MetadataItem(BaseModel):
    """Generic metadata item (channel, company, etc.)."""
    value: int = Field(..., description="Unique identifier")
    caption: str = Field(..., description="Display name")
    
    model_config = {"extra": "allow"}  # Allow additional fields


class DaypartItem(BaseModel):
    """Daypart metadata item."""
    value: str = Field(..., description="Daypart value (e.g., '6 - 9')")
    caption: str = Field(..., description="Display name")


# ============================================================================
# Error Response Models
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str = Field(..., description="Error message")
