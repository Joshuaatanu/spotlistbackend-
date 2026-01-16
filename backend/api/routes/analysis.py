"""
Analysis endpoints for spotlist checking and AEOS data fetching.
"""

import io
import sys
import asyncio
import json
from datetime import date, datetime, time
from pathlib import Path
from typing import Any, Optional, List, AsyncGenerator

import pandas as pd
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

# Import spotlist checker
try:
    from spotlist_checkerv2 import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe
except ImportError:
    from ..dependencies import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe

# Import AEOS integration
from api.dependencies import (
    AEOS_AVAILABLE,
    AEOSClient,
    AEOSSpotlistChecker,
    flatten_spotlist_report
)

router = APIRouter(tags=["Analysis"])


# ============================================================================
# Utility Functions
# ============================================================================

def dataframe_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert DataFrame to JSON-serializable records."""
    def _convert(value: Any) -> Any:
        if isinstance(value, (list, np.ndarray)):
            return [_convert(v) for v in value]
        try:
            if pd.isna(value):
                return None
        except (ValueError, TypeError):
            pass
        if isinstance(value, (pd.Timestamp, datetime, date, time)):
            return value.isoformat()
        if hasattr(value, "item") and not isinstance(value, (str, bytes)):
            try:
                converted = value.item()
                if isinstance(converted, float) and (np.isnan(converted) or np.isinf(converted)):
                    return None
                return converted
            except Exception:
                pass
        if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
            return None
        return value
    return df.map(_convert).to_dict(orient="records")


def json_safe(value: Any) -> Any:
    """Recursively convert numpy/pandas scalars to plain Python types."""
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    if isinstance(value, tuple):
        return tuple(json_safe(v) for v in value)
    if isinstance(value, np.generic):
        val = value.item()
        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            return None
        return val
    if isinstance(value, (pd.Timestamp, datetime, date, time)):
        return value.isoformat()
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return None
    return value


def detect_data_format(df: pd.DataFrame) -> dict:
    """Detect data format (English vs German) and return column mapping."""
    columns_lower = {str(col).strip().lower(): str(col).strip() for col in df.columns}

    german_indicators = ['kunde', 'produkt', 'kamp', 'verm.', 'medium', 'datum', 'uhr', 'motiv', 'kosten']
    is_german = any(indicator in columns_lower for indicator in german_indicators)

    mapping = {}

    if is_german:
        # German format mapping
        if 'medium' in columns_lower:
            mapping['program'] = columns_lower['medium']
        elif 'sender' in columns_lower:
            mapping['program'] = columns_lower['sender']
        elif 'kanal' in columns_lower:
            mapping['program'] = columns_lower['kanal']
        elif 'station' in columns_lower:
            mapping['program'] = columns_lower['station']
        elif 'channel' in columns_lower:
            mapping['program'] = columns_lower['channel']

        if 'datum' in columns_lower:
            mapping['date'] = columns_lower['datum']
        elif 'date' in columns_lower:
            mapping['date'] = columns_lower['date']

        if 'uhr' in columns_lower:
            mapping['time'] = columns_lower['uhr']
        elif 'zeit' in columns_lower:
            mapping['time'] = columns_lower['zeit']
        elif 'time' in columns_lower:
            mapping['time'] = columns_lower['time']

        for col_key in columns_lower:
            if 'kosten' in col_key:
                mapping['cost'] = columns_lower[col_key]
                break
        else:
            if 'cost to client' in columns_lower:
                mapping['cost'] = columns_lower['cost to client']
            elif 'spend' in columns_lower:
                mapping['cost'] = columns_lower['spend']
            elif 'gross' in columns_lower:
                mapping['cost'] = columns_lower['gross']
            elif 'cost' in columns_lower:
                mapping['cost'] = columns_lower['cost']

        if 'motiv' in columns_lower:
            mapping['sendung_medium'] = columns_lower['motiv']
        elif 'claim' in columns_lower:
            mapping['sendung_medium'] = columns_lower['claim']
        elif 'creative' in columns_lower:
            mapping['sendung_medium'] = columns_lower['creative']

        if 'titel vor' in columns_lower:
            mapping['sendung_long'] = columns_lower['titel vor']
        elif 'titel' in columns_lower:
            mapping['sendung_long'] = columns_lower['titel']
        elif 'epg name' in columns_lower:
            mapping['sendung_long'] = columns_lower['epg name']

        return {'format': 'german', 'column_map': mapping}
    else:
        # English format
        if 'station' in columns_lower:
            mapping['program'] = columns_lower['station']
        elif 'channel' in columns_lower:
            mapping['program'] = columns_lower['channel']
        elif 'program' in columns_lower:
            mapping['program'] = columns_lower['program']

        if 'airing date' in columns_lower:
            mapping['date'] = columns_lower['airing date']
        elif 'date' in columns_lower:
            mapping['date'] = columns_lower['date']

        if 'airing time' in columns_lower:
            mapping['time'] = columns_lower['airing time']
        elif 'time' in columns_lower:
            mapping['time'] = columns_lower['time']

        if 'cost to client' in columns_lower:
            mapping['cost'] = columns_lower['cost to client']
        elif 'spend' in columns_lower:
            mapping['cost'] = columns_lower['spend']
        elif 'gross' in columns_lower:
            mapping['cost'] = columns_lower['gross']
        elif 'cost' in columns_lower:
            mapping['cost'] = columns_lower['cost']

        if 'claim' in columns_lower:
            mapping['sendung_medium'] = columns_lower['claim']
        elif 'creative' in columns_lower:
            mapping['sendung_medium'] = columns_lower['creative']

        if 'epg name' in columns_lower:
            mapping['sendung_long'] = columns_lower['epg name']
        elif 'epg' in columns_lower:
            mapping['sendung_long'] = columns_lower['epg']

        return {'format': 'english', 'column_map': mapping}


def read_spotlist_file(file: UploadFile, contents: bytes) -> pd.DataFrame:
    """Load CSV/Excel uploads robustly."""
    name = (file.filename or "").lower()
    na_values = ['N/A', 'n/a', 'NA', 'na', '', 'NULL', 'null', 'None', 'none']

    if name.endswith(".csv"):
        try:
            df = pd.read_csv(io.BytesIO(contents), na_values=na_values, keep_default_na=True)
        except Exception:
            df = pd.read_csv(
                io.BytesIO(contents),
                engine="python",
                on_bad_lines="skip",
                skipinitialspace=True,
                na_values=na_values,
                keep_default_na=True,
            )
    elif name.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(contents), na_values=na_values, keep_default_na=True)
    else:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV or Excel.")

    df = df.rename(columns=lambda c: str(c).strip())
    return df


# ============================================================================
# File Upload Analysis Endpoint
# ============================================================================

@router.post("/analyze", summary="Analyze Uploaded Spotlist")
async def analyze_spotlist(
    file: UploadFile = File(...),
    creative_match_mode: int = Form(...),
    creative_match_text: str = Form(""),
    time_window_minutes: int = Form(60),
):
    """
    Analyze an uploaded spotlist file for double bookings.

    Args:
        file: CSV or Excel file containing spotlist data
        creative_match_mode: Matching mode (0=any, 1=same, 2=different, 3=contains)
        creative_match_text: Text to match for mode 3
        time_window_minutes: Time window for double detection

    Returns:
        Analysis results with metrics, data, and field mappings
    """
    print(f"Analyzing file: {file.filename}, window: {time_window_minutes}")

    # Read file
    try:
        contents = await file.read()
        df = read_spotlist_file(file, contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # Detect data format
    format_info = detect_data_format(df)
    detected_column_map = format_info['column_map']

    # Configure and run checker
    config = SpotlistCheckerConfig(
        creative_match_mode=creative_match_mode,
        creative_match_text=creative_match_text,
        time_window_minutes=time_window_minutes,
        column_map=detected_column_map
    )
    checker = SpotlistChecker(config)

    try:
        df_annotated = checker.annotate_spotlist(df)
        metrics = checker.compute_metrics(df_annotated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing spotlist: {str(e)}")

    # Process response data
    try:
        required_cols = ["cost", "program", "date", "time"]
        missing_cols = [col for col in required_cols if col not in config.column_map]
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {missing_cols}"
            )

        cost_col = config.column_map["cost"]
        program_col = config.column_map["program"]
        creative_col = config.column_map.get("sendung_medium")

        df_annotated["cost_numeric"] = df_annotated[cost_col].apply(parse_number_safe)
        df_annotated["program_original"] = df_annotated[program_col].astype(str)

        if creative_col:
            df_annotated["creative_text_norm"] = df_annotated[creative_col].astype(str).str.lower()
        else:
            df_annotated["creative_text_norm"] = "n/a"

        # Find additional columns
        reach_col = xrp_col = daypart_col = duration_col = epg_category_col = None
        for col in df_annotated.columns:
            col_lower = str(col).strip().lower()
            if col_lower in ['rch', 'reach'] and not reach_col:
                reach_col = col
            if col_lower == 'xrp' and not xrp_col:
                xrp_col = col
            if col_lower in ['airing daypart', 'daypart'] and not daypart_col:
                daypart_col = col
            if col_lower == 'duration' and not duration_col:
                duration_col = col
            if col_lower in ['epg category', 'category'] and not epg_category_col:
                epg_category_col = col

        # Calculate additional metrics
        additional_metrics = {}
        if xrp_col:
            df_annotated["xrp_numeric"] = df_annotated[xrp_col].apply(parse_number_safe)
            total_xrp = float(df_annotated["xrp_numeric"].sum())
            double_xrp = float(df_annotated[df_annotated["is_double"]]["xrp_numeric"].sum())
            additional_metrics.update({
                "total_xrp": total_xrp,
                "double_xrp": double_xrp,
                "percent_xrp": (double_xrp / total_xrp) if total_xrp > 0 else 0.0
            })

        if reach_col:
            df_annotated["reach_numeric"] = df_annotated[reach_col].apply(parse_number_safe)
            total_reach = float(df_annotated["reach_numeric"].sum())
            double_reach = float(df_annotated[df_annotated["is_double"]]["reach_numeric"].sum())
            additional_metrics.update({
                "total_reach": total_reach,
                "double_reach": double_reach,
                "percent_reach": (double_reach / total_reach) if total_reach > 0 else 0.0
            })

        # Efficiency metrics
        efficiency_metrics = {}
        efficient_spots = df_annotated[~df_annotated["is_double"]]
        efficiency_metrics["efficient_spots"] = int(len(efficient_spots))
        efficiency_metrics["efficient_cost"] = float(efficient_spots[cost_col].apply(parse_number_safe).sum())
        efficiency_metrics["efficient_percent_spots"] = (efficiency_metrics["efficient_spots"] / metrics["total_spots"]) if metrics["total_spots"] > 0 else 0.0
        efficiency_metrics["efficient_percent_cost"] = (efficiency_metrics["efficient_cost"] / metrics["total_cost"]) if metrics["total_cost"] > 0 else 0.0

        # Multi-window summaries
        window_summaries = []
        for w in [30, 60, 90, 120]:
            cfg_w = SpotlistCheckerConfig(
                creative_match_mode=creative_match_mode,
                creative_match_text=creative_match_text,
                time_window_minutes=w,
                column_map=detected_column_map
            )
            checker_w = SpotlistChecker(cfg_w)
            df_w = checker_w.annotate_spotlist(df)
            m_w = checker_w.compute_metrics(df_w)
            window_summaries.append({"window_minutes": w, "all": m_w})

        records = dataframe_to_records(df_annotated)

        result = {
            "metrics": {**metrics, **additional_metrics, **efficiency_metrics},
            "window_summaries": window_summaries,
            "data": records,
            "field_map": {
                "cost_column": cost_col,
                "program_column": program_col,
                "creative_column": creative_col,
                "reach_column": reach_col,
                "xrp_column": xrp_col,
                "daypart_column": daypart_col,
                "duration_column": duration_col,
                "epg_category_column": epg_category_col,
            },
            "metadata": {"report_type": "spotlist"},
        }

        return JSONResponse(content=json_safe(result))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing data: {str(e)}")


# ============================================================================
# AEOS Data Fetch Endpoint
# ============================================================================

@router.get("/analyze-from-aeos", summary="Analyze AEOS Data (SSE)")
async def analyze_from_aeos(
    company_name: Optional[str] = None,
    date_from: str = "",
    date_to: str = "",
    creative_match_mode: int = 0,
    creative_match_text: str = "",
    time_window_minutes: int = 60,
    channel_filter: Optional[str] = None,
    report_type: str = "spotlist",
    top_ten_subtype: str = "spots",
    weekdays: Optional[str] = None,
    dayparts: Optional[str] = None,
    epg_categories: Optional[str] = None,
    profiles: Optional[str] = None,
    brand_ids: Optional[str] = None,
    product_ids: Optional[str] = None,
    competitor_company_name: Optional[str] = None,
):
    """
    Fetch and analyze data from AEOS API with Server-Sent Events progress.
    """
    # Parse comma-separated lists
    weekdays_list = [int(x) for x in weekdays.split(',')] if weekdays else None
    dayparts_list = dayparts.split(',') if dayparts else None
    epg_list = [int(x) for x in epg_categories.split(',')] if epg_categories else None
    profiles_list = [int(x) for x in profiles.split(',')] if profiles else None
    brand_list = [int(x) for x in brand_ids.split(',')] if brand_ids else None
    product_list = [int(x) for x in product_ids.split(',')] if product_ids else None

    async def generate():
        # Import the streaming logic from main module
        from main import stream_progress_updates
        async for event in stream_progress_updates(
            company_name=company_name,
            date_from=date_from,
            date_to=date_to,
            creative_match_mode=creative_match_mode,
            creative_match_text=creative_match_text,
            time_window_minutes=time_window_minutes,
            channel_filter=channel_filter,
            report_type=report_type,
            top_ten_subtype=top_ten_subtype,
            weekdays=weekdays_list,
            dayparts=dayparts_list,
            epg_categories=epg_list,
            profiles=profiles_list,
            brand_ids=brand_list,
            product_ids=product_list,
            competitor_company_name=competitor_company_name,
        ):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
