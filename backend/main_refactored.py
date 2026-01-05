"""
Spotlist Checker API - Main Application Entry Point

This is the FastAPI application for the TV advertising analytics platform.
The application is organized into modular routers for better maintainability.
"""

import io
import sys
from datetime import date, datetime, time
from typing import Any, Optional, List
from pathlib import Path

import pandas as pd
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import asyncio
import json
from typing import AsyncGenerator

# Core configuration
from core.config import (
    API_TITLE, API_DESCRIPTION, API_VERSION,
    CORS_ORIGINS, CORS_ALLOW_CREDENTIALS, CORS_ALLOW_METHODS, CORS_ALLOW_HEADERS
)

# Core utilities
from core.utils import dataframe_to_records, json_safe, detect_data_format, read_spotlist_file

# API routers
from api.routes.health import router as health_router
from api.routes.database import router as database_router, config_router
from api.routes.metadata import router as metadata_router
from api.routes.insights import router as insights_router

# Dependencies
from api.dependencies import (
    AEOS_AVAILABLE, AEOSClient, AEOSSpotlistChecker, flatten_spotlist_report,
    SUPABASE_AVAILABLE, OPENAI_AVAILABLE,
    SpotlistChecker, SpotlistCheckerConfig, parse_number_safe
)

# ============================================================================
# Application Setup
# ============================================================================

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_tags=[
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Database", "description": "Analysis and configuration persistence"},
        {"name": "Metadata", "description": "AEOS metadata for enrichment and filtering"},
        {"name": "Analysis", "description": "Spotlist analysis endpoints"},
        {"name": "AI Insights", "description": "AI-powered insights generation"},
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# ============================================================================
# Mount Routers
# ============================================================================

app.include_router(health_router)
app.include_router(database_router)
app.include_router(config_router)
app.include_router(metadata_router)
app.include_router(insights_router)

# ============================================================================
# Analysis Endpoints (kept in main.py due to complexity)
# These will be refactored to a separate module in a future iteration
# ============================================================================

@app.post("/analyze", tags=["Analysis"], summary="Analyze Spotlist File")
async def analyze_spotlist(
    file: UploadFile = File(...),
    creative_match_mode: int = Form(...),
    creative_match_text: str = Form(""),
    time_window_minutes: int = Form(60),
):
    """
    Analyze an uploaded spotlist file for double bookings.
    
    Supports CSV and Excel file formats. Automatically detects German
    and English column naming conventions.
    
    Args:
        file: CSV or Excel file containing spotlist data
        creative_match_mode: Matching mode (0=exact, 1=substring, etc.)
        creative_match_text: Text for substring matching
        time_window_minutes: Time window for detecting double bookings
        
    Returns:
        Analysis results with metrics, window summaries, and annotated data
    """
    print(f"Analyzing file: {file.filename}, window: {time_window_minutes}")
    
    # 1. Read File
    try:
        contents = await file.read()
        df = read_spotlist_file(file, contents)
    except Exception as e:
        print(f"Error reading file: {e}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # 2. Detect data format and get column mapping
    format_info = detect_data_format(df)
    detected_column_map = format_info['column_map']
    detected_format = format_info['format']
    
    print(f"Detected format: {detected_format}")
    print(f"Column mapping: {detected_column_map}")
    
    # 3. Configure Checker with detected column mapping
    config = SpotlistCheckerConfig(
        creative_match_mode=creative_match_mode,
        creative_match_text=creative_match_text,
        time_window_minutes=time_window_minutes,
        column_map=detected_column_map
    )
    checker = SpotlistChecker(config)

    # 4. Run Analysis
    try:
        df_annotated = checker.annotate_spotlist(df)
        metrics = checker.compute_metrics(df_annotated)
    except Exception as e:
        print(f"Error analyzing spotlist: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing spotlist: {str(e)}")

    # 5. Prepare Response Data
    try:
        # Verify required columns exist
        required_cols = ["sendung_medium", "cost", "program", "date", "time", "sendung_long"]
        missing_cols = [col for col in required_cols if col not in config.column_map]
        if missing_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns in detected format: {missing_cols}. Detected mapping: {config.column_map}"
            )
        
        creative_col = config.column_map["sendung_medium"]
        df_annotated["creative_text_norm"] = df_annotated[creative_col].astype(str).str.lower()
        cost_col = config.column_map["cost"]
        program_col = config.column_map["program"]
        # Add numeric helper columns so the frontend doesn't have to guess column names
        df_annotated["cost_numeric"] = df_annotated[cost_col].apply(parse_number_safe)
        df_annotated["program_original"] = df_annotated[program_col].astype(str)
        
        # Extract additional metrics if available
        reach_col = None
        xrp_col = None
        daypart_col = None
        duration_col = None
        epg_category_col = None
        
        # Try to find reach/XRP columns (case-insensitive)
        for col in df_annotated.columns:
            col_lower = str(col).strip().lower()
            if col_lower in ['rch', 'reach'] and reach_col is None:
                reach_col = col
            if col_lower in ['xrp'] and xrp_col is None:
                xrp_col = col
            if col_lower in ['airing daypart', 'daypart'] and daypart_col is None:
                daypart_col = col
            if col_lower in ['duration'] and duration_col is None:
                duration_col = col
            if col_lower in ['epg category', 'category'] and epg_category_col is None:
                epg_category_col = col
        
        # Calculate additional metrics
        additional_metrics = {}
        
        if xrp_col:
            df_annotated["xrp_numeric"] = df_annotated[xrp_col].apply(parse_number_safe)
            total_xrp = float(df_annotated["xrp_numeric"].sum())
            double_xrp = float(df_annotated[df_annotated["is_double"]]["xrp_numeric"].sum())
            additional_metrics["total_xrp"] = total_xrp
            additional_metrics["double_xrp"] = double_xrp
            additional_metrics["percent_xrp"] = (double_xrp / total_xrp) if total_xrp > 0 else 0.0
        
        if reach_col:
            df_annotated["reach_numeric"] = df_annotated[reach_col].apply(parse_number_safe)
            total_reach = float(df_annotated["reach_numeric"].sum())
            double_reach = float(df_annotated[df_annotated["is_double"]]["reach_numeric"].sum())
            additional_metrics["total_reach"] = total_reach
            additional_metrics["double_reach"] = double_reach
            additional_metrics["percent_reach"] = (double_reach / total_reach) if total_reach > 0 else 0.0
        
        # Cost efficiency metrics
        if xrp_col and cost_col:
            total_cost = float(df_annotated[cost_col].apply(parse_number_safe).sum())
            total_xrp_val = float(df_annotated["xrp_numeric"].sum())
            additional_metrics["cost_per_xrp"] = (total_cost / total_xrp_val) if total_xrp_val > 0 else 0.0
        
        if reach_col and cost_col:
            total_cost = float(df_annotated[cost_col].apply(parse_number_safe).sum())
            total_reach_val = float(df_annotated["reach_numeric"].sum())
            additional_metrics["cost_per_reach"] = (total_cost / total_reach_val) if total_reach_val > 0 else 0.0
        
        # Spot Efficiency Analysis (based on invendo methodology)
        efficiency_metrics = {}
        efficient_spots = df_annotated[~df_annotated["is_double"]]
        efficient_spots_count = int(len(efficient_spots))
        efficient_cost = float(efficient_spots[cost_col].apply(parse_number_safe).sum())

        efficiency_metrics["efficient_spots"] = efficient_spots_count
        efficiency_metrics["efficient_cost"] = efficient_cost
        efficiency_metrics["efficient_percent_spots"] = (efficient_spots_count / metrics["total_spots"]) if metrics["total_spots"] > 0 else 0.0
        efficiency_metrics["efficient_percent_cost"] = (efficient_cost / metrics["total_cost"]) if metrics["total_cost"] > 0 else 0.0

        # Calculate station distribution for Fair Share analysis
        if program_col:
            station_distribution = df_annotated[program_col].value_counts().to_dict()
            total_stations = len(station_distribution)
            fair_share_percent = 100.0 / total_stations if total_stations > 0 else 0.0
            
            station_fair_share = {}
            for station, count in station_distribution.items():
                actual_percent = (count / metrics["total_spots"] * 100) if metrics["total_spots"] > 0 else 0.0
                station_fair_share[str(station)] = {
                    "actual_percent": actual_percent,
                    "fair_share_percent": fair_share_percent,
                    "difference": actual_percent - fair_share_percent,
                    "spots": int(count)
                }
            
            efficiency_metrics["station_fair_share"] = station_fair_share
            efficiency_metrics["total_stations"] = total_stations
        
        # Generate the multi-window summaries
        time_windows = [30, 60, 90, 120]
        window_summaries = []
        
        # Re-run checker for different windows
        for w in time_windows:
            cfg_w = SpotlistCheckerConfig(
                creative_match_mode=creative_match_mode,
                creative_match_text=creative_match_text,
                time_window_minutes=w,
                column_map=detected_column_map
            )
            checker_w = SpotlistChecker(cfg_w)
            df_w = checker_w.annotate_spotlist(df)
            m_w = checker_w.compute_metrics(df_w)
            
            window_summaries.append({
                "window_minutes": w,
                "all": m_w
            })
            
    except Exception as e:
        print(f"Error processing response data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing data: {str(e)}")

    # 6. Convert timestamps to string for JSON serialization
    try:
        records = dataframe_to_records(df_annotated)
        
        result = {
            "metrics": {**metrics, **additional_metrics, **efficiency_metrics},
            "window_summaries": window_summaries,
            "data": records,
            "field_map": {
                "cost_column": cost_col,
                "program_column": program_col,
                "creative_column": creative_col,
                "reach_column": reach_col if reach_col else None,
                "xrp_column": xrp_col if xrp_col else None,
                "daypart_column": daypart_col if daypart_col else None,
                "duration_column": duration_col if duration_col else None,
                "epg_category_column": epg_category_col if epg_category_col else None,
            },
            "metadata": {
                "report_type": "spotlist",
            },
        }
        
        return JSONResponse(content=json_safe(result))
    except Exception as e:
        print(f"Error serialization: {e}")
        raise HTTPException(status_code=500, detail=f"Error serializing response: {str(e)}")
