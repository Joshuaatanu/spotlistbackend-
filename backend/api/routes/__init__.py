"""
API Routes Package

This package contains all the route modules for the Spotlist Checker API.
"""

from .health import router as health_router
from .database import router as database_router, config_router
from .jobs import router as jobs_router
from .metadata import router as metadata_router
from .insights import router as insights_router
from .analysis import router as analysis_router
from .competitors import router as competitors_router

__all__ = [
    "health_router",
    "database_router",
    "config_router",
    "jobs_router",
    "metadata_router",
    "insights_router",
    "analysis_router",
    "competitors_router",
]
