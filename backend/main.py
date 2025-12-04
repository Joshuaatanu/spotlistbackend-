import io
from datetime import date, datetime, time
from typing import Any, Optional

import pandas as pd
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Try importing openai, handle if missing
try:
    import openai
except ImportError:
    openai = None

from .spotlist_checkerv2 import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe

app = FastAPI(title="Spotlist Checker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # Broadly allow local dev origins; tighten for production if needed.
    allow_origins=["*"],
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
        if pd.isna(value):
            return None
        if isinstance(value, (pd.Timestamp, datetime, date, time)):
            return value.isoformat()
        if hasattr(value, "item") and not isinstance(value, (str, bytes)):
            try:
                return value.item()
            except Exception:
                pass
        return value

    # DataFrame.map is the non-deprecated replacement for applymap
    return df.map(_convert).to_dict(orient="records")


def read_spotlist_file(file: UploadFile, contents: bytes) -> pd.DataFrame:
    """
    Load CSV/Excel uploads robustly:
    - Strip surrounding whitespace from column names (common in exported files)
    - Fall back to the python engine and skip malformed lines instead of failing
    """
    name = (file.filename or "").lower()
    if name.endswith(".csv"):
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except Exception:
            df = pd.read_csv(
                io.BytesIO(contents),
                engine="python",
                on_bad_lines="skip",
                skipinitialspace=True,
            )
    elif name.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV or Excel.")

    # Normalise column names to match expected defaults
    df = df.rename(columns=lambda c: str(c).strip())
    return df


def json_safe(value: Any) -> Any:
    """
    Recursively convert numpy/pandas scalars to plain Python types
    so Starlette's JSONResponse can serialize them.
    """
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    if isinstance(value, tuple):
        return tuple(json_safe(v) for v in value)
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, (pd.Timestamp, datetime, date, time)):
        return value.isoformat()
    return value


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_spotlist(
    file: UploadFile = File(...),
    creative_match_mode: int = Form(...),
    creative_match_text: str = Form(""),
    time_window_minutes: int = Form(60),
):
    # 1. Read File
    try:
        contents = await file.read()
        df = read_spotlist_file(file, contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # 2. Configure Checker
    config = SpotlistCheckerConfig(
        creative_match_mode=creative_match_mode,
        creative_match_text=creative_match_text,
        time_window_minutes=time_window_minutes
    )
    checker = SpotlistChecker(config)

    # 3. Run Analysis
    try:
        df_annotated = checker.annotate_spotlist(df)
        metrics = checker.compute_metrics(df_annotated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing spotlist: {str(e)}")

    # 4. Prepare Response Data
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
    
    # Let's generate the multi-window summaries here as requested
    time_windows = [30, 60, 90, 120]
    window_summaries = []
    
    # We need to re-run checker for different windows? Yes, that's what the streamlit app did.
    # This is expensive (O(N^2) * 4). 
    # Optimization: The logic in annotate_spotlist is hardcoded to one window.
    # We can just run it 4 times.
    
    for w in time_windows:
        cfg_w = SpotlistCheckerConfig(
            creative_match_mode=creative_match_mode,
            creative_match_text=creative_match_text,
            time_window_minutes=w
        )
        checker_w = SpotlistChecker(cfg_w)
        df_w = checker_w.annotate_spotlist(df) # Run on original df
        m_w = checker_w.compute_metrics(df_w)

        window_summaries.append({
            "window_minutes": w,
            "all": m_w
        })

    # Convert timestamps to string for JSON serialization
    records = dataframe_to_records(df_annotated)
    
    result = {
        "metrics": {**metrics, **additional_metrics}, # Metrics for the selected window + additional metrics
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
    }
    
    return JSONResponse(content=json_safe(result))


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
        You are a Media Audit Expert. Analyze the following TV spotlist metrics for potential inefficiencies and double bookings.
        
        Data Summary:
        {summary}
        
        Please provide:
        1. An executive summary of the efficiency.
        2. Key concerns regarding double bookings (is the percentage high? standard is usually < 5%).
        3. Recommendations for optimization.
        
        Keep it concise and professional.
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
