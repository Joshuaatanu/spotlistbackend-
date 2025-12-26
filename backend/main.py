import io
import sys
from datetime import date, datetime, time
from typing import Any, Optional, List
from pathlib import Path

import pandas as pd
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import asyncio
import json
from typing import AsyncGenerator

# Try importing openai, handle if missing
try:
    import openai
except ImportError:
    openai = None

# Robust import for spotlist_checkerv2
try:
    from .spotlist_checkerv2 import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe
except ImportError:
    try:
        from spotlist_checkerv2 import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe
    except ImportError:
        # Fallback if both fail, though this shouldn't happen if structure is correct
        print("Error: Could not import spotlist_checkerv2. Make sure you are running from the correct directory.")
        raise

# Import AEOS integration modules
try:
    # Add integration folder to path so relative imports work
    integration_path = Path(__file__).parent / "integration"
    integration_path_str = str(integration_path.absolute())
    if integration_path_str not in sys.path:
        sys.path.insert(0, integration_path_str)
    
    # Import directly (they use relative imports within the integration folder)
    from aeos_client import AEOSClient
    from spotlist_checker import SpotlistChecker as AEOSSpotlistChecker
    from utils import flatten_spotlist_report
    AEOS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: AEOS integration not available: {e}")
    import traceback
    traceback.print_exc()
    AEOS_AVAILABLE = False

# Import Supabase client for database operations
try:
    from supabase_client import (
        save_analysis, get_analyses, get_analysis_by_id, delete_analysis,
        save_configuration, get_configuration, check_database_connection
    )
    SUPABASE_AVAILABLE = True
except ImportError:
    print("Warning: Supabase client not available. Database features disabled.")
    SUPABASE_AVAILABLE = False

app = FastAPI(title="Spotlist Checker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # Broadly allow local dev origins; tighten for production if needed.
    allow_origins=["*"],  # Cannot use "*" with allow_credentials=True, so set to False
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def dataframe_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Convert a DataFrame to JSON‑serialisable records.
    Handles pandas/numpy scalars and datetime-like values that the default
    JSON encoder would otherwise choke on.
    """

    def _convert(value: Any) -> Any:
        # Handle arrays/lists first - pd.isna can't handle them
        if isinstance(value, (list, np.ndarray)):
            return [_convert(v) for v in value]
        
        # Check for scalar NA values
        try:
            if pd.isna(value):
                return None
        except (ValueError, TypeError):
            # pd.isna fails on arrays with multiple elements
            pass
        
        if isinstance(value, (pd.Timestamp, datetime, date, time)):
            return value.isoformat()
        if hasattr(value, "item") and not isinstance(value, (str, bytes)):
            try:
                converted = value.item()
                # Check for NaN or infinity after conversion
                if isinstance(converted, float):
                    if np.isnan(converted) or np.isinf(converted):
                        return None
                return converted
            except Exception:
                pass
        # Final check for float NaN/infinity
        if isinstance(value, float):
            if np.isnan(value) or np.isinf(value):
                return None
        return value

    # DataFrame.map is the non-deprecated replacement for applymap
    return df.map(_convert).to_dict(orient="records")


def detect_data_format(df: pd.DataFrame) -> dict:
    """
    Detect the data format (English vs German) and return appropriate column mapping.
    Returns a dictionary mapping internal keys to actual column names.
    """
    columns_lower = {str(col).strip().lower(): str(col).strip() for col in df.columns}
    
    # German format detection
    german_indicators = ['kunde', 'produkt', 'kamp', 'verm.', 'medium', 'datum', 'uhr', 'motiv', 'kosten']
    is_german = any(indicator in columns_lower for indicator in german_indicators)
    
    if is_german:
        # German format mapping
        mapping = {}
        
        # Map program/channel
        if 'medium' in columns_lower:
            mapping['program'] = columns_lower['medium']
        elif 'sender' in columns_lower:
            mapping['program'] = columns_lower['sender']
        elif 'kanal' in columns_lower:
            mapping['program'] = columns_lower['kanal']
        
        # Map date
        if 'datum' in columns_lower:
            mapping['date'] = columns_lower['datum']
        elif 'date' in columns_lower:
            mapping['date'] = columns_lower['date']
        
        # Map time
        if 'uhr' in columns_lower:
            mapping['time'] = columns_lower['uhr']
        elif 'zeit' in columns_lower:
            mapping['time'] = columns_lower['zeit']
        elif 'time' in columns_lower:
            mapping['time'] = columns_lower['time']
        
        # Map cost
        # Find the cost column (could be "Kosten ctc." or similar)
        kosten_found = False
        for col_key in columns_lower:
            if 'kosten' in col_key:
                mapping['cost'] = columns_lower[col_key]
                kosten_found = True
                break
        
        if not kosten_found:
            if 'spend' in columns_lower:
                mapping['cost'] = columns_lower['spend']
            elif 'cost' in columns_lower:
                mapping['cost'] = columns_lower['cost']
        
        # Map creative (sendung_medium)
        if 'motiv' in columns_lower:
            mapping['sendung_medium'] = columns_lower['motiv']
        elif 'claim' in columns_lower:
            mapping['sendung_medium'] = columns_lower['claim']
        elif 'creative' in columns_lower:
            mapping['sendung_medium'] = columns_lower['creative']
        
        # Map EPG name (sendung_long)
        if 'titel vor' in columns_lower:
            mapping['sendung_long'] = columns_lower['titel vor']
        elif 'titel' in columns_lower:
            mapping['sendung_long'] = columns_lower['titel']
        elif 'epg name' in columns_lower:
            mapping['sendung_long'] = columns_lower['epg name']
        elif 'epg' in columns_lower:
            mapping['sendung_long'] = columns_lower['epg']
        
        # Ensure we have all required columns, fallback to defaults if missing
        default_mapping = {
            "program": "Channel",
            "date": "Airing date",
            "time": "Airing time",
            "cost": "Spend",
            "sendung_long": "EPG name",
            "sendung_medium": "Claim",
        }
        
        # Fill in any missing required columns with defaults (if they exist in the dataframe)
        df_columns_lower = {str(col).strip().lower(): str(col).strip() for col in df.columns}
        for key, default_col in default_mapping.items():
            if key not in mapping:
                default_col_lower = default_col.lower()
                if default_col_lower in df_columns_lower:
                    mapping[key] = df_columns_lower[default_col_lower]
        
        # Log the final mapping for debugging
        print(f"German format detected. Final column mapping: {mapping}")
        print(f"Available columns in dataframe: {list(df.columns)}")
        
        return {'format': 'german', 'column_map': mapping}
    
    else:
        # English format - use default mapping
        mapping = {}
        
        # Standard English column names
        if 'channel' in columns_lower:
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
        
        if 'spend' in columns_lower:
            mapping['cost'] = columns_lower['spend']
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
    """
    Load CSV/Excel uploads robustly:
    - Strip surrounding whitespace from column names (common in exported files)
    - Fall back to the python engine and skip malformed lines instead of failing
    - Handle "N/A", empty strings, and other common missing value indicators
    """
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

    # Normalise column names to match expected defaults
    df = df.rename(columns=lambda c: str(c).strip())
    return df


def json_safe(value: Any) -> Any:
    """
    Recursively convert numpy/pandas scalars to plain Python types
    so Starlette's JSONResponse can serialize them.
    Handles NaN, infinity, and other non-JSON-compliant values.
    """
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    if isinstance(value, tuple):
        return tuple(json_safe(v) for v in value)
    if isinstance(value, np.generic):
        val = value.item()
        # Handle NaN and infinity
        if isinstance(val, float):
            if np.isnan(val) or np.isinf(val):
                return None
        return val
    if isinstance(value, (pd.Timestamp, datetime, date, time)):
        return value.isoformat()
    # Handle float NaN/infinity directly
    if isinstance(value, float):
        if np.isnan(value) or np.isinf(value):
            return None
    # Handle pandas NA/NaN
    if pd.isna(value):
        return None
    return value


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ============================================================================
# Database Endpoints (Supabase)
# ============================================================================

class AnalysisSaveRequest(BaseModel):
    session_id: str
    file_name: str
    metrics: dict
    spotlist_data: Optional[List[dict]] = None
    metadata: Optional[dict] = None


class ConfigurationSaveRequest(BaseModel):
    session_id: str
    config: dict


@app.get("/db/health")
async def database_health():
    """Check database connection status."""
    if not SUPABASE_AVAILABLE:
        return {"connected": False, "error": "Supabase client not installed"}
    return check_database_connection()


@app.post("/analyses")
async def create_analysis(request: AnalysisSaveRequest):
    """Save an analysis result to the database."""
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


@app.get("/analyses")
async def list_analyses(session_id: str, limit: int = 10, offset: int = 0):
    """Get analysis history for a session."""
    if not SUPABASE_AVAILABLE:
        return []
    
    return get_analyses(session_id, limit, offset)


@app.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific analysis by ID."""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = get_analysis_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return result


@app.delete("/analyses/{analysis_id}")
async def remove_analysis(analysis_id: str, session_id: str):
    """Delete an analysis (only if it belongs to the session)."""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    success = delete_analysis(analysis_id, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis not found or unauthorized")
    
    return {"deleted": True}


@app.post("/configurations")
async def create_or_update_configuration(request: ConfigurationSaveRequest):
    """Save or update user configuration."""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = save_configuration(request.session_id, request.config)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to save configuration")
    
    return result


@app.get("/configurations/{session_id}")
async def get_saved_configuration(session_id: str):
    """Get saved configuration for a session."""
    if not SUPABASE_AVAILABLE:
        return None
    
    config = get_configuration(session_id)
    return {"config": config}


# Metadata endpoints for enhanced filtering
@app.get("/metadata/dayparts")
async def get_dayparts():
    """Get available dayparts for filtering."""
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        from aeos_metadata import AEOSMetadata
        metadata = AEOSMetadata(client)
        dayparts = await loop.run_in_executor(None, metadata.get_dayparts)
        # Normalize response format
        if isinstance(dayparts, list):
            return dayparts
        elif isinstance(dayparts, dict) and "all" in dayparts:
            return dayparts["all"]
        return []
    except Exception as e:
        print(f"Error fetching dayparts: {e}")
        return []


@app.get("/metadata/epg-categories")
async def get_epg_categories():
    """Get available EPG categories for filtering."""
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        from aeos_metadata import AEOSMetadata
        metadata = AEOSMetadata(client)
        categories = await loop.run_in_executor(None, metadata.get_epg_categories)
        # Normalize response format
        if isinstance(categories, list):
            return categories
        elif isinstance(categories, dict) and "all" in categories:
            return categories["all"]
        return []
    except Exception as e:
        print(f"Error fetching EPG categories: {e}")
        return []


@app.get("/metadata/profiles")
async def get_profiles():
    """Get available audience profiles for filtering."""
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        from aeos_metadata import AEOSMetadata
        metadata = AEOSMetadata(client)
        profiles = await loop.run_in_executor(None, metadata.get_profiles)
        # Normalize response format
        if isinstance(profiles, list):
            return profiles
        elif isinstance(profiles, dict) and "all" in profiles:
            return profiles["all"]
        return []
    except Exception as e:
        print(f"Error fetching profiles: {e}")
        return []


@app.get("/metadata/channels")
async def get_channels():
    """Get available channels for selection."""
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        # Get all channels (analytics + EPG)
        channels = await loop.run_in_executor(None, lambda: client.load_all_channels())
        # Return all channels from cache
        if channels and "all" in channels:
            return channels["all"]
        elif isinstance(channels, list):
            return channels
        return []
    except Exception as e:
        print(f"Error fetching channels: {e}")
        import traceback
        traceback.print_exc()
        return []


@app.get("/metadata/companies")
async def get_companies(filter_text: str = ""):
    """Get available companies for selection."""
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        from aeos_metadata import AEOSMetadata
        metadata = AEOSMetadata(client)
        # Call get_companies with industry_ids=None and filter_text
        companies = await loop.run_in_executor(None, lambda: metadata.get_companies(industry_ids=None, filter_text=filter_text))
        # Normalize response format
        if isinstance(companies, list):
            return companies
        elif isinstance(companies, dict) and "all" in companies:
            return companies["all"]
        return []
    except Exception as e:
        print(f"Error fetching companies: {e}")
        import traceback
        traceback.print_exc()
        return []


@app.get("/metadata/brands")
async def get_brands(company_ids: str = "", filter_text: str = ""):
    """Get available brands for given company IDs.
    
    Args:
        company_ids: Comma-separated list of company IDs (e.g., "1,2,3")
        filter_text: Optional text filter for brand names
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        from aeos_metadata import AEOSMetadata
        metadata = AEOSMetadata(client)
        
        # Parse company IDs from comma-separated string
        company_id_list = []
        if company_ids:
            try:
                company_id_list = [int(id.strip()) for id in company_ids.split(',') if id.strip()]
            except ValueError:
                pass
        
        if not company_id_list:
            return []
        
        # Get brands for the specified companies
        brands = await loop.run_in_executor(
            None, 
            lambda: metadata.get_brands(company_id_list, filter_text=filter_text)
        )
        
        # Normalize response format
        if isinstance(brands, list):
            return brands
        elif isinstance(brands, dict) and "all" in brands:
            return brands["all"]
        return []
    except Exception as e:
        print(f"Error fetching brands: {e}")
        import traceback
        traceback.print_exc()
        return []


@app.get("/metadata/products")
async def get_products(brand_ids: str = "", company_id: str = "", filter_text: str = ""):
    """Get available products for given brand IDs or company ID.
    
    Args:
        brand_ids: Comma-separated list of brand IDs (e.g., "1,2,3")
        company_id: Optional company ID - if provided, will fetch all brands for company first, then all products
        filter_text: Optional text filter for product names
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, AEOSClient)
        from aeos_metadata import AEOSMetadata
        metadata = AEOSMetadata(client)
        
        # If company_id is provided, get all brands for that company first
        brand_id_list = []
        if company_id:
            try:
                company_id_int = int(company_id.strip())
                # Get all brands for this company
                brands = await loop.run_in_executor(
                    None,
                    lambda: metadata.get_brands([company_id_int], filter_text="")
                )
                # Extract brand IDs
                if isinstance(brands, list):
                    brand_id_list = [b.get("value") or b.get("id") for b in brands if b.get("value") or b.get("id")]
                elif isinstance(brands, dict) and "all" in brands:
                    brand_id_list = [b.get("value") or b.get("id") for b in brands["all"] if b.get("value") or b.get("id")]
            except (ValueError, Exception) as e:
                print(f"Error fetching brands for company {company_id}: {e}")
                return []
        else:
            # Parse brand IDs from comma-separated string
            if brand_ids:
                try:
                    brand_id_list = [int(id.strip()) for id in brand_ids.split(',') if id.strip()]
                except ValueError:
                    pass
        
        if not brand_id_list:
            return []
        
        # Get products for the specified brands
        products = await loop.run_in_executor(
            None,
            lambda: metadata.get_products(brand_id_list, filter_text=filter_text)
        )
        
        # Normalize response format
        if isinstance(products, list):
            return products
        elif isinstance(products, dict) and "all" in products:
            return products["all"]
        return []
    except Exception as e:
        print(f"Error fetching products: {e}")
        import traceback
        traceback.print_exc()
        return []

@app.post("/analyze")
async def analyze_spotlist(
    file: UploadFile = File(...),
    creative_match_mode: int = Form(...),
    creative_match_text: str = Form(""),
    time_window_minutes: int = Form(60),
):
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

    # 3. Run Analysis
    try:
        df_annotated = checker.annotate_spotlist(df)
        metrics = checker.compute_metrics(df_annotated)
    except Exception as e:
        print(f"Error analyzing spotlist: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing spotlist: {str(e)}")

    # 4. Prepare Response Data
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
        
        # Let's generate the multi-window summaries here as requested
        time_windows = [30, 60, 90, 120]
        window_summaries = []
        
        # We need to re-run checker for different windows
        for w in time_windows:
            cfg_w = SpotlistCheckerConfig(
                creative_match_mode=creative_match_mode,
                creative_match_text=creative_match_text,
                time_window_minutes=w,
                column_map=detected_column_map  # Use the detected column mapping
            )
            checker_w = SpotlistChecker(cfg_w)
            df_w = checker_w.annotate_spotlist(df) # Run on original df
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

    # Convert timestamps to string for JSON serialization
    try:
        records = dataframe_to_records(df_annotated)
        
        # Get report_type from request if available (passed via form data)
        # For now, default to 'spotlist' - this will be enhanced when different report types are implemented
        report_type_from_request = report_type if 'report_type' in locals() else 'spotlist'
        
        result = {
            "metrics": {**metrics, **additional_metrics, **efficiency_metrics}, # Metrics for the selected window + additional metrics + efficiency metrics
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
                "report_type": report_type_from_request if 'report_type_from_request' in locals() else 'spotlist',
            },
        }
        
        return JSONResponse(content=json_safe(result))
    except Exception as e:
        print(f"Error serialization: {e}")
        raise HTTPException(status_code=500, detail=f"Error serializing response: {str(e)}")


async def stream_progress_updates(
    company_name: Optional[str],
    date_from: str,
    date_to: str,
    creative_match_mode: int,
    creative_match_text: str,
    time_window_minutes: int,
    channel_filter: Optional[str] = None,
    report_type: str = "spotlist",
    top_ten_subtype: str = "spots",
    weekdays: Optional[List[int]] = None,
    dayparts: Optional[List[str]] = None,  # Daypart values like "6 - 9" (not IDs)
    epg_categories: Optional[List[int]] = None,
    profiles: Optional[List[int]] = None,
    brand_ids: Optional[List[int]] = None,
    product_ids: Optional[List[int]] = None,
) -> AsyncGenerator[str, None]:
    """Generator that yields progress updates as SSE events"""
    
    def send_progress(progress: float, message: str, stage: str = "info"):
        """Helper to send progress update"""
        data = {
            "progress": progress,
            "message": message,
            "stage": stage
        }
        return f"data: {json.dumps(data)}\n\n"
    
    try:
        yield send_progress(0, "Initializing AEOS client...", "info")
        
        if not AEOS_AVAILABLE:
            yield send_progress(0, "AEOS integration not available", "error")
            return
        
        # 1. Initialize AEOS client
        await asyncio.sleep(0)  # Yield control
        loop = asyncio.get_event_loop()
        try:
            client = await loop.run_in_executor(None, AEOSClient)
            checker = AEOSSpotlistChecker(client)
        except ValueError as e:
            # Catch API key missing errors and provide helpful message
            if "AEOS_API_KEY" in str(e):
                yield send_progress(0, "AEOS API key not found. Please ensure AEOS_API_KEY is set in environment variables.", "error")
            else:
                yield send_progress(0, f"Error initializing AEOS client: {str(e)}", "error")
            return
        except Exception as e:
            yield send_progress(0, f"Error initializing AEOS client: {str(e)}", "error")
            import traceback
            traceback.print_exc()
            return
        
        yield send_progress(5, "Fetching analytics channels...", "info")
        await asyncio.sleep(0)
        
        # 2. Get analytics channels (filtered if specified)
        all_channels_raw = await loop.run_in_executor(None, client.get_analytics_channels)
        
        # Filter by channel name(s) if specified (supports comma-separated list)
        if channel_filter and channel_filter.strip():
            # Split by comma and strip whitespace from each
            filter_terms = [term.strip().lower() for term in channel_filter.split(',') if term.strip()]
            
            if filter_terms:
                all_channels = []
                matched_channels = []
                
                # Find channels matching any of the filter terms
                for ch in all_channels_raw:
                    channel_name_lower = ch.get("caption", "").lower()
                    # Check if any filter term matches this channel
                    for term in filter_terms:
                        if term in channel_name_lower:
                            all_channels.append(ch)
                            matched_channels.append(ch.get("caption", ""))
                            break  # Only add each channel once
                
                if not all_channels:
                    yield send_progress(10, f"None of the specified channels found: {channel_filter}. Available channels will be searched.", "warning")
                    all_channels = all_channels_raw
                else:
                    # Remove duplicates while preserving order
                    seen = set()
                    unique_channels = []
                    unique_names = []
                    for ch in all_channels:
                        ch_name = ch.get("caption", "")
                        if ch_name not in seen:
                            seen.add(ch_name)
                            unique_channels.append(ch)
                            unique_names.append(ch_name)
                    
                    all_channels = unique_channels
                    if len(all_channels) == 1:
                        yield send_progress(10, f"Filtering to channel: {unique_names[0]}", "info")
                    else:
                        display_names = unique_names[:5]  # Show up to 5 names
                        more_text = f" and {len(unique_names) - 5} more" if len(unique_names) > 5 else ""
                        yield send_progress(10, f"Filtering to {len(all_channels)} channels: {', '.join(display_names)}{more_text}", "info")
            else:
                all_channels = all_channels_raw
        else:
            all_channels = all_channels_raw
        
        total_channels = len(all_channels)
        yield send_progress(10, f"Searching {total_channels} channel(s)", "info")
        
        # Handle different report types
        if report_type == "topTen":
            # Top Ten Report - Uses documented API endpoints (v2.3 Sections 4.3.4-4.3.6)
            # Note: Top Ten reports use "period" parameter ("Yesterday" or "Last 7 days")
            # not date_from/date_to. We'll calculate period from date range.
            yield send_progress(20, f"Generating Top Ten report...", "info")
            try:
                from report_types import TopTenReport
                from datetime import datetime, timedelta
                
                top_ten = TopTenReport(client)
                
                # Calculate period from date range
                # Top Ten API only supports "Yesterday" or "Last 7 days"
                date_from_obj = datetime.strptime(date_from, "%Y-%m-%d")
                date_to_obj = datetime.strptime(date_to, "%Y-%m-%d")
                today = datetime.now().date()
                yesterday = today - timedelta(days=1)
                
                # Determine period based on date range
                if date_to_obj.date() == yesterday:
                    period = "Yesterday"
                else:
                    period = "Last 7 days"  # Default to 7 days for any other range
                
                # Use subtype from form parameter (defaults to "spots" if not provided)
                # Valid values: "spots", "events", "channel"
                if top_ten_subtype not in ["spots", "events", "channel"]:
                    top_ten_subtype = "spots"  # Fallback to default
                
                result_data = await loop.run_in_executor(
                    None,
                    top_ten.get_top_ten,
                    top_ten_subtype,
                    period,
                    5,  # poll_interval
                    600,  # timeout
                )
                
                df = pd.DataFrame(result_data if result_data else [])
                yield send_progress(100, f"Top Ten report complete! Found {len(df)} results.", "success")
                
                raw_data_result = {
                    "raw_data": dataframe_to_records(df),
                    "metadata": {
                        "company_name": company_name,
                        "date_from": date_from,
                        "date_to": date_to,
                        "period": period,  # Store the calculated period
                        "top_ten_type": top_ten_subtype,  # Store which Top Ten type was used
                        "channel_filter": channel_filter if channel_filter else None,
                        "report_type": report_type,
                        "total_records": len(df),
                        "channels_found": [],
                        "format_detected": "topTen",
                        "column_map": {},
                    }
                }
                yield f"data: {json.dumps({'progress': 100, 'message': 'collection_complete', 'raw_data': json_safe(raw_data_result)})}\n\n"
                return
            except Exception as e:
                yield send_progress(0, f"Error generating Top Ten report: {str(e)}", "error")
                import traceback
                traceback.print_exc()
                return
        
        elif report_type == "reachFrequency":
            # Reach & Frequency Report - Uses Deep Analysis Advertising Report (API v2.3 Section 4.3.2)
            yield send_progress(20, f"Generating Reach & Frequency report...", "info")
            try:
                from report_types import ReachFrequencyReport
                rf_report = ReachFrequencyReport(client)
                channel_ids = [ch["value"] for ch in all_channels[:5]]  # Limit to 5 channels for RF
                
                # Get company ID if company name is provided
                company_ids = None
                if company_name:
                    from aeos_metadata import AEOSMetadata
                    metadata = AEOSMetadata(client)
                    company_obj = await loop.run_in_executor(None, metadata.find_company, company_name)
                    if company_obj:
                        company_ids = [company_obj.get("value") or company_obj.get("id")]
                
                result_data = await loop.run_in_executor(
                    None,
                    rf_report.get_reach_frequency,
                    date_from,
                    date_to,
                    channel_ids,
                    company_ids,
                    None,  # brand_ids
                    None,  # product_ids
                    profiles,
                    dayparts,
                    None,  # industries
                    None,  # categories
                    None,  # subcategories
                    "1+",  # frequency (default)
                    "By Day",  # showdataby (default)
                    5,  # poll_interval
                    600,  # timeout
                )
                
                # Convert result to list format if it's a dict
                if isinstance(result_data, dict):
                    # Try to extract list from dict structure
                    if "data" in result_data:
                        result_list = result_data["data"]
                    elif "body" in result_data:
                        result_list = result_data["body"]
                    else:
                        # Convert dict to list of dicts
                        result_list = [result_data]
                else:
                    result_list = result_data if result_data else []
                
                df = pd.DataFrame(result_list if isinstance(result_list, list) else [])
                yield send_progress(100, f"Reach & Frequency report complete! Found {len(df)} results.", "success")
                
                raw_data_result = {
                    "raw_data": dataframe_to_records(df),
                    "metadata": {
                        "company_name": company_name,
                        "date_from": date_from,
                        "date_to": date_to,
                        "channel_filter": channel_filter if channel_filter else None,
                        "report_type": report_type,
                        "total_spots": len(df),
                        "channels_found": [],
                        "format_detected": "reachFrequency",
                        "column_map": {},
                    }
                }
                yield f"data: {json.dumps({'progress': 100, 'message': 'collection_complete', 'raw_data': json_safe(raw_data_result)})}\n\n"
                return
            except Exception as e:
                yield send_progress(0, f"Error generating Reach & Frequency report: {str(e)}", "error")
                import traceback
                traceback.print_exc()
                return
        
        elif report_type == "deepAnalysis":
            # Deep Analysis (KPI) Report
            yield send_progress(20, f"Generating Deep Analysis (KPI) report...", "info")
            try:
                channel_ids = [ch["value"] for ch in all_channels[:10]]  # Limit channels for performance
                
                result_data = await loop.run_in_executor(
                    None,
                    client.get_channel_kpis,
                    date_from,
                    date_to,
                    channel_ids,
                    ["amr-perc", "reach (%)", "reach-avg", "share", "ats-avg", "atv-avg", "airings"],
                    profiles,
                    dayparts,
                    epg_categories,
                    "-1",  # splitby
                    "5sec",  # threshold
                    "period",  # showdataby
                    5,  # poll_interval
                    600,  # timeout
                )
                
                df = pd.DataFrame(result_data if result_data else [])
                yield send_progress(100, f"Deep Analysis report complete! Found {len(df)} channel KPIs.", "success")
                
                raw_data_result = {
                    "raw_data": dataframe_to_records(df),
                    "metadata": {
                        "company_name": company_name,
                        "date_from": date_from,
                        "date_to": date_to,
                        "channel_filter": channel_filter if channel_filter else None,
                        "report_type": report_type,
                        "total_spots": len(df),
                        "channels_found": [ch["caption"] for ch in all_channels[:10]],
                        "format_detected": "deepAnalysis",
                        "column_map": {},
                    }
                }
                yield f"data: {json.dumps({'progress': 100, 'message': 'collection_complete', 'raw_data': json_safe(raw_data_result)})}\n\n"
                return
            except Exception as e:
                yield send_progress(0, f"Error generating Deep Analysis report: {str(e)}", "error")
                import traceback
                traceback.print_exc()
                return
        
        elif report_type == "daypartAnalysis":
            # Daypart Analysis Report - Uses Deep Analysis Channel Event Report (API v2.3 Section 4.3.1)
            yield send_progress(20, f"Generating Daypart Analysis report...", "info")
            try:
                from report_types import DaypartAnalysisReport
                daypart_report = DaypartAnalysisReport(client)
                channel_ids = [ch["value"] for ch in all_channels[:5]]  # Limit channels
                
                # Note: Channel Event Report doesn't directly support company filtering
                # For company-specific daypart analysis, consider using Deep Analysis Advertising Report
                # For now, we'll use Channel Event Report with daypart filters
                
                # Convert dayparts from IDs to values if needed (dayparts should be strings like "6 - 9")
                daypart_values = dayparts if dayparts else None
                
                result_data = await loop.run_in_executor(
                    None,
                    daypart_report.get_daypart_analysis,
                    date_from,
                    date_to,
                    channel_ids,
                    None,  # company_ids (not supported in Channel Event Report)
                    daypart_values,  # dayparts filter (list of strings like "6 - 9")
                    ["reach (%)", "share", "amr-perc", "ats-avg"],  # Channel Event compatible variables
                    profiles,  # profiles
                    epg_categories,  # epg_categories
                    "-1",  # splitby (no time split)
                    "By Day",  # showdataby
                    "5sec",  # threshold
                    5,  # poll_interval
                    600,  # timeout
                )
                
                df = pd.DataFrame(result_data if result_data else [])
                yield send_progress(100, f"Daypart Analysis report complete! Found {len(df)} results.", "success")
                
                raw_data_result = {
                    "raw_data": dataframe_to_records(df),
                    "metadata": {
                        "company_name": company_name,
                        "date_from": date_from,
                        "date_to": date_to,
                        "channel_filter": channel_filter if channel_filter else None,
                        "report_type": report_type,
                        "total_spots": len(df),
                        "channels_found": [ch["caption"] for ch in all_channels[:5]],
                        "format_detected": "daypartAnalysis",
                        "column_map": {},
                    }
                }
                yield f"data: {json.dumps({'progress': 100, 'message': 'collection_complete', 'raw_data': json_safe(raw_data_result)})}\n\n"
                return
            except Exception as e:
                yield send_progress(0, f"Error generating Daypart Analysis report: {str(e)}", "error")
                import traceback
                traceback.print_exc()
                return

        # Default: Spotlist Report (existing logic)
        # 3. Fetch spotlists for each channel and filter by company
        all_rows = []
        target = company_name.lower()
        channels_processed = 0
        channels_with_data = 0
        
        for idx, ch in enumerate(all_channels):
            channel_id = ch["value"]
            channel_caption = ch["caption"]
            channels_processed += 1
            
            # Progress based on channels processed (10% to 70%)
            progress = 10 + (idx / total_channels) * 60
            yield send_progress(
                int(progress),
                f"Processing channel {channels_processed}/{total_channels}: {channel_caption}...",
                "info"
            )
            
            try:
                await asyncio.sleep(0)  # Yield control to event loop
                yield send_progress(
                    int(progress),
                    f"Requesting report for {channel_caption}...",
                    "info"
                )
                
                # Run blocking operation in thread pool
                # Use enhanced spotlist with filters if available
                loop = asyncio.get_event_loop()
                
                # Check if we should use enhanced filtering (including brand/product filters)
                # Use enhanced filtering if any advanced filters are provided OR if brand/product IDs are specified
                if dayparts or weekdays or epg_categories or brand_ids or product_ids:
                    # Use enhanced spotlist report with filters
                    from report_types import EnhancedSpotlistReport
                    enhanced_spotlist = EnhancedSpotlistReport(client)
                    
                    # Get company ID if company name is provided
                    company_ids_for_filter = None
                    if company_name:
                        from aeos_metadata import AEOSMetadata
                        metadata = AEOSMetadata(client)
                        company_obj = await loop.run_in_executor(None, metadata.find_company, company_name)
                        if company_obj:
                            company_ids_for_filter = [company_obj.get("value") or company_obj.get("id")]
                    
                    # Use asyncio timeout to prevent hanging on individual channels
                    try:
                        report_rows = await asyncio.wait_for(
                            loop.run_in_executor(
                                None,
                                enhanced_spotlist.get_spotlist,
                                date_from,
                                date_to,
                                [channel_id],
                                company_ids_for_filter,  # company_ids
                                brand_ids,  # brand_ids
                                product_ids,  # product_ids
                                None,  # industry_ids
                                None,  # category_ids
                                None,  # subcategory_ids
                                dayparts,
                                weekdays,
                                epg_categories,
                                True,  # use_medium_report
                                5,     # poll_interval
                                300,   # timeout - reduced from 600 to 300 seconds per channel
                            ),
                            timeout=310.0  # Slightly longer than the API timeout
                        )
                        # Convert rows to report format
                        if report_rows:
                            rows = report_rows
                        else:
                            rows = []
                    except asyncio.TimeoutError:
                        yield send_progress(
                            int(progress),
                            f"⏱ Timeout waiting for {channel_caption} (moving to next channel)...",
                            "warning"
                        )
                        rows = []
                    except Exception as api_error:
                        yield send_progress(
                            int(progress),
                            f"⚠ API error for {channel_caption}: {str(api_error)[:50]} (moving to next channel)...",
                            "warning"
                        )
                        rows = []
                else:
                    # Use standard spotlist (only when no advanced filters are used)
                    # Also add timeout protection for standard spotlist
                    try:
                        report = await asyncio.wait_for(
                            loop.run_in_executor(
                                None,
                                checker.get_spotlist,
                                channel_id,
                                date_from,
                                date_to,
                            ),
                            timeout=300.0  # 5 minute timeout per channel
                        )
                        rows = flatten_spotlist_report(report)
                    except asyncio.TimeoutError:
                        yield send_progress(
                            int(progress),
                            f"⏱ Timeout waiting for {channel_caption} (moving to next channel)...",
                            "warning"
                        )
                        rows = []
                    except Exception as api_error:
                        yield send_progress(
                            int(progress),
                            f"⚠ API error for {channel_caption}: {str(api_error)[:50]} (moving to next channel)...",
                            "warning"
                        )
                        rows = []
                
                yield send_progress(
                    int(progress + 2),
                    f"Processing data from {channel_caption}...",
                    "info"
                )
                
                if not rows:
                    yield send_progress(
                        int(progress + 1),
                        f"ℹ No spots found on {channel_caption} (moving to next channel)...",
                        "info"
                    )
                    continue
                
                # Filter by company name (only if not using enhanced filtering with company_ids)
                # When using enhanced filtering with brand/product IDs, the API already filters by company
                channel_matches = 0
                for r in rows:
                    # If using enhanced filtering with company_ids, brand_ids, or product_ids, 
                    # the API already filtered, so we don't need to filter again by company name
                    if brand_ids or product_ids or (dayparts or weekdays or epg_categories):
                        # Enhanced filtering already applied - just add channel info
                        r["Channel"] = channel_caption
                        all_rows.append(r)
                        channel_matches += 1
                    else:
                        # Standard filtering - filter by company name substring
                        company = str(r.get("Company") or r.get("Kunde") or "").lower()
                        if target in company:
                            r["Channel"] = channel_caption
                            all_rows.append(r)
                            channel_matches += 1
                
                if channel_matches > 0:
                    channels_with_data += 1
                    yield send_progress(
                        int(progress + 5),
                        f"✓ Found {channel_matches} spots on {channel_caption}",
                        "success"
                    )
                        
            except Exception as e:
                yield send_progress(
                    int(progress),
                    f"⚠ Skipped {channel_caption}: {str(e)[:50]}",
                    "warning"
                )
                continue
        
        yield send_progress(70, f"Found {len(all_rows)} total spots from {channels_with_data} channels", "success")
        
        if not all_rows:
            yield send_progress(
                70,
                f"No ads found for company '{company_name}' in date range",
                "error"
            )
            return
        
        yield send_progress(75, "Converting to DataFrame...", "info")
        
        # 4. Convert to DataFrame
        df = pd.DataFrame(all_rows)
        
        if "Channel" not in df.columns and "Medium" in df.columns:
            df["Channel"] = df["Medium"]
        
        yield send_progress(80, "Detecting data format...", "info")
        
        # 5. Detect data format
        format_info = detect_data_format(df)
        detected_column_map = format_info['column_map']
        detected_format = format_info['format']
        
        yield send_progress(85, f"Detected format: {detected_format}", "info")
        
        # Get program column for metadata (needed for raw data return)
        detected_program_col = detected_column_map.get('program', None)
        if not detected_program_col:
            # Try to find any channel-like column
            for col in df.columns:
                col_lower = str(col).strip().lower()
                if col_lower in ['channel', 'medium', 'sender', 'kanal']:
                    detected_program_col = col
                    break
        
        # Return raw collected data - user can choose to download or analyze
        yield send_progress(100, "Data collection complete! Preparing raw data...", "success")
        
        raw_data_result = {
            "raw_data": dataframe_to_records(df),
            "metadata": {
                "company_name": company_name,
                "date_from": date_from,
                "date_to": date_to,
                "channel_filter": channel_filter if channel_filter else None,
                "report_type": report_type,  # Include report type in metadata
                "total_spots": len(df),
                "channels_found": list(df[detected_program_col].unique().astype(str)) if detected_program_col and detected_program_col in df.columns else [],
                "format_detected": detected_format,
                "column_map": detected_column_map,
            }
        }
        yield f"data: {json.dumps({'progress': 100, 'message': 'collection_complete', 'raw_data': json_safe(raw_data_result)})}\n\n"
        return  # Exit - raw data sent, analysis will be done separately if user chooses
        
    except Exception as e:
        yield send_progress(0, f"Error: {str(e)}", "error")
        import traceback
        traceback.print_exc()


@app.post("/analyze-from-aeos")
async def analyze_from_aeos(
    company_name: str = Form(""),  # Optional - not required for Top Ten reports
    date_from: str = Form(...),
    date_to: str = Form(...),
    creative_match_mode: int = Form(1),
    creative_match_text: str = Form(""),
    time_window_minutes: int = Form(60),
    channel_filter: str = Form(""),
    report_type: str = Form("spotlist"),
    top_ten_subtype: str = Form(""),  # Optional - only used for Top Ten reports
    weekdays: str = Form(""),
    dayparts: str = Form(""),
    epg_categories: str = Form(""),
    profiles: str = Form(""),
    brand_ids: str = Form(""),  # Optional - comma-separated or JSON array of brand IDs
    product_ids: str = Form(""),  # Optional - comma-separated or JSON array of product IDs
):
    """
    Fetch spotlist data from AEOS API by company name and date range,
    then analyze it using the same pipeline as file uploads.
    Streams progress updates via Server-Sent Events (SSE).
    
    channel_filter: Optional channel name to filter by (e.g., "VOX"). 
                   If empty, searches all channels.
    """
    # Parse filter JSON strings
    weekdays_list = None
    dayparts_list = None
    epg_categories_list = None
    profiles_list = None
    brand_ids_list = None
    product_ids_list = None
    
    try:
        if weekdays:
            weekdays_list = json.loads(weekdays)
        if dayparts:
            dayparts_list = json.loads(dayparts)
        if epg_categories:
            epg_categories_list = json.loads(epg_categories)
        if profiles:
            profiles_list = json.loads(profiles)
        if brand_ids:
            brand_ids_list = json.loads(brand_ids)
        if product_ids:
            product_ids_list = json.loads(product_ids)
    except json.JSONDecodeError:
        pass  # Use None if parsing fails
    
    return StreamingResponse(
        stream_progress_updates(
            company_name=company_name if company_name else None,
            date_from=date_from,
            date_to=date_to,
            creative_match_mode=creative_match_mode,
            creative_match_text=creative_match_text,
            time_window_minutes=time_window_minutes,
            channel_filter=channel_filter if channel_filter else None,
            report_type=report_type,
            top_ten_subtype=top_ten_subtype if top_ten_subtype else "spots",
            weekdays=weekdays_list,
            dayparts=dayparts_list,
            epg_categories=epg_categories_list,
            profiles=profiles_list,
            brand_ids=brand_ids_list,
            product_ids=product_ids_list,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


class InsightRequest(BaseModel):
    metrics: dict[str, Any]
    apiKey: str

@app.post("/generate-insights")
async def generate_insights(request: InsightRequest):
    if not openai:
        raise HTTPException(status_code=500, detail="OpenAI library not installed on server.")
    
    if not request.apiKey:
        raise HTTPException(status_code=400, detail="API Key is required.")

    try:
        client = openai.OpenAI(api_key=request.apiKey)
        
        # Construct a summary of the metrics
        m = request.metrics
        summary = f"""
        Total Spend: €{m.get('total_cost', 0):,.2f}
        Double Booking Spend: €{m.get('double_cost', 0):,.2f} ({m.get('percent_cost', 0)*100:.1f}%)
        Total Spots: {m.get('total_spots', 0)}
        Double Spots: {m.get('double_spots', 0)} ({m.get('percent_spots', 0)*100:.1f}%)
        """
        
        if 'total_xrp' in m:
            summary += f"Total XRP: {m.get('total_xrp', 0):.1f}\n"
        if 'cost_per_xrp' in m:
            summary += f"Cost per XRP: €{m.get('cost_per_xrp', 0):.2f}\n"

        prompt = f"""
        You are a Media Audit Expert following invendo TV Audit methodology. Analyze the following TV spotlist metrics for potential inefficiencies and double bookings.
        
        Data Summary:
        {summary}
        
        Industry Benchmarks:
        - Double bookings should be < 5% of total spots (industry standard)
        - Efficient spots should represent > 60% of total spend
        - Low incremental reach spots (<5% incremental) should be minimized
        
        Please provide:
        1. An executive summary of the efficiency compared to industry standards.
        2. Key concerns regarding double bookings (current rate: {m.get('percent_spots', 0)*100:.1f}% vs. <5% target).
        3. Spot efficiency breakdown (efficient vs. double bookings vs. low incremental).
        4. Specific recommendations for optimization based on invendo audit methodology.
        
        Keep it concise, professional, and actionable.
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini", # Use a fast, capable model
            messages=[
                {"role": "system", "content": "You are a helpful assistant for media analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )
        
        return {"insights": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
