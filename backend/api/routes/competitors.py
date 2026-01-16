"""
Competitor analysis endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.dependencies import COMPETITOR_SERVICE_AVAILABLE

router = APIRouter(prefix="/api/competitors", tags=["Competitors"])


class CompetitorAnalysisRequest(BaseModel):
    """Request model for competitor analysis."""
    company_name: str = Field(..., description="Primary company name")
    competitors: List[str] = Field(..., description="List of competitor company names")
    date_from: str = Field(..., description="Start date (YYYY-MM-DD)")
    date_to: str = Field(..., description="End date (YYYY-MM-DD)")
    channel_filter: Optional[str] = Field(None, description="Optional channel filter")


@router.post("/analyze", summary="Analyze Competitors")
async def analyze_competitors(request: CompetitorAnalysisRequest):
    """
    Analyze advertising data for a company and its competitors.

    Args:
        request: CompetitorAnalysisRequest with company details and date range

    Returns:
        Comparison data for the company and competitors
    """
    if not COMPETITOR_SERVICE_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Competitor analysis service not available"
        )

    try:
        from services.competitor_analyzer import CompetitorAnalyzer

        analyzer = CompetitorAnalyzer()
        result = await analyzer.analyze(
            company_name=request.company_name,
            competitors=request.competitors,
            date_from=request.date_from,
            date_to=request.date_to,
            channel_filter=request.channel_filter
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
