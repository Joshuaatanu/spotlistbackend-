"""
Spotlist Checker API - Main Application Entry Point

This is the FastAPI application for the TV advertising analytics platform.
All endpoint logic is organized into modular routers in the api/routes/ directory.
"""

import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add integration folder to path for AEOS imports
integration_path = Path(__file__).parent / "integration"
integration_path_str = str(integration_path.absolute())
if integration_path_str not in sys.path:
    sys.path.insert(0, integration_path_str)

# Import routers from modular routes
from api.routes import (
    health_router,
    database_router,
    config_router,
    jobs_router,
    metadata_router,
    insights_router,
    analysis_router,
    competitors_router,
)


# ============================================================================
# Application Setup with Enhanced OpenAPI Documentation
# ============================================================================

app = FastAPI(
    title="Spotlist Checker API",
    description="""
TV advertising analytics platform for detecting double bookings.

## Features

- **Double Booking Detection**: Identify overlapping ad spots within configurable time windows
- **Multiple Data Sources**: Upload CSV/Excel files or fetch data from AEOS API
- **Metadata Enrichment**: Channel, daypart, EPG category, and company metadata
- **AI Insights**: Generate insights using OpenAI GPT models
- **Analysis History**: Persist and retrieve previous analyses
- **Background Jobs**: Long-running data collection jobs with progress tracking

## Report Types

- Spotlist Analysis
- Top Ten Report
- Reach/Frequency Analysis
- Daypart Analysis
- Competitor Comparison
""",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_tags=[
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Database", "description": "Analysis and configuration persistence"},
        {"name": "Background Jobs", "description": "Long-running data collection jobs"},
        {"name": "Metadata", "description": "AEOS metadata for enrichment and filtering"},
        {"name": "Analysis", "description": "Spotlist analysis endpoints"},
        {"name": "AI Insights", "description": "AI-powered insights generation"},
        {"name": "Competitors", "description": "Competitor analysis endpoints"},
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure structured logging (optional - enable in production)
if os.getenv("ENABLE_LOGGING_MIDDLEWARE", "false").lower() == "true":
    try:
        from core.logging import setup_logging
        from api.middleware import LoggingMiddleware

        json_logs = os.getenv("JSON_LOGS", "false").lower() == "true"
        log_level = os.getenv("LOG_LEVEL", "INFO")
        setup_logging(log_level=log_level, json_logs=json_logs)

        app.add_middleware(LoggingMiddleware)
    except ImportError as e:
        print(f"Warning: Could not enable logging middleware: {e}")


# ============================================================================
# Register Modular Routers
# ============================================================================

# Health endpoints: /health, /db/health
app.include_router(health_router)

# Database endpoints: /analyses, /configurations
app.include_router(database_router)
app.include_router(config_router)

# Background Jobs endpoints: /jobs
app.include_router(jobs_router)

# Metadata endpoints: /metadata/*
app.include_router(metadata_router)

# Analysis endpoints: /analyze, /analyze-from-aeos
app.include_router(analysis_router)

# AI Insights endpoints: /generate-insights, /generate-suggestions
app.include_router(insights_router)

# Competitor endpoints: /api/competitors/analyze
app.include_router(competitors_router)


# ============================================================================
# Startup Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("=" * 60)
    print("Spotlist Checker API Starting...")
    print("=" * 60)

    # Check available services
    from api.dependencies import (
        AEOS_AVAILABLE,
        SUPABASE_AVAILABLE,
        JOBS_AVAILABLE,
        COMPETITOR_SERVICE_AVAILABLE,
        OPENAI_AVAILABLE,
    )

    print(f"  AEOS Integration: {'Available' if AEOS_AVAILABLE else 'Not available'}")
    print(f"  Supabase Database: {'Available' if SUPABASE_AVAILABLE else 'Not available'}")
    print(f"  Background Jobs: {'Available' if JOBS_AVAILABLE else 'Not available'}")
    print(f"  Competitor Analysis: {'Available' if COMPETITOR_SERVICE_AVAILABLE else 'Not available'}")
    print(f"  OpenAI Integration: {'Available' if OPENAI_AVAILABLE else 'Not available'}")

    # Recover background jobs from previous server instance
    if JOBS_AVAILABLE and SUPABASE_AVAILABLE:
        print("-" * 60)
        print("Recovering background jobs...")
        try:
            from services.jobs import job_manager
            recovery_stats = await job_manager.recover_on_startup()
            if recovery_stats.get("stale_jobs_found", 0) > 0:
                print(f"  Stale jobs found: {recovery_stats['stale_jobs_found']}")
                print(f"  Marked as failed: {recovery_stats['stale_jobs_marked_failed']}")
            if recovery_stats.get("queued_jobs_started", 0) > 0:
                print(f"  Queued jobs started: {recovery_stats['queued_jobs_started']}")
            if not recovery_stats.get("stale_jobs_found") and not recovery_stats.get("queued_jobs_started"):
                print("  No recovery needed")
        except Exception as e:
            print(f"  Recovery error: {e}")

    print("=" * 60)
    print("API Ready! Docs at /api/docs")
    print("=" * 60)


# ============================================================================
# Run with Uvicorn (for development)
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
