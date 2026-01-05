"""
Pydantic models for API requests.
"""

from typing import Any, Optional, List
from pydantic import BaseModel, Field


class AnalysisSaveRequest(BaseModel):
    """Request model for saving an analysis result."""
    session_id: str = Field(..., description="Anonymous session identifier")
    file_name: str = Field(..., description="Original file name or data source description")
    metrics: dict = Field(..., description="Analysis metrics (total_spots, double_spots, etc.)")
    spotlist_data: Optional[List[dict]] = Field(None, description="Full annotated spotlist (can be large)")
    metadata: Optional[dict] = Field(None, description="Additional metadata (report_type, date_range, etc.)")


class ConfigurationSaveRequest(BaseModel):
    """Request model for saving user configuration."""
    session_id: str = Field(..., description="Anonymous session identifier")
    config: dict = Field(..., description="User configuration settings")


class InsightRequest(BaseModel):
    """Request model for generating AI insights."""
    metrics: dict[str, Any] = Field(..., description="Analysis metrics to generate insights for")
    apiKey: str = Field(..., description="OpenAI API key")
