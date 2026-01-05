"""
Core utility functions for the Spotlist Checker API.

These functions handle DataFrame conversions, JSON serialization,
file reading, and data format detection.
"""

import io
from datetime import date, datetime, time
from typing import Any

import pandas as pd
import numpy as np
from fastapi import HTTPException, UploadFile


def dataframe_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Convert a DataFrame to JSON-serializable records.
    
    Handles pandas/numpy scalars and datetime-like values that the default
    JSON encoder would otherwise choke on.
    
    Args:
        df: pandas DataFrame to convert
        
    Returns:
        List of dictionaries suitable for JSON serialization
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


def json_safe(value: Any) -> Any:
    """
    Recursively convert numpy/pandas scalars to plain Python types
    so Starlette's JSONResponse can serialize them.
    
    Handles NaN, infinity, and other non-JSON-compliant values.
    
    Args:
        value: Any value that might contain numpy/pandas types
        
    Returns:
        JSON-serializable value
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


def detect_data_format(df: pd.DataFrame) -> dict:
    """
    Detect the data format (English vs German) and return appropriate column mapping.
    
    Args:
        df: pandas DataFrame with spotlist data
        
    Returns:
        Dictionary with 'format' ('german' or 'english') and 'column_map'
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
        
        # Map cost - Find the cost column (could be "Kosten ctc." or similar)
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
    Load CSV/Excel uploads robustly.
    
    Features:
    - Strip surrounding whitespace from column names (common in exported files)
    - Fall back to the python engine and skip malformed lines instead of failing
    - Handle "N/A", empty strings, and other common missing value indicators
    
    Args:
        file: FastAPI UploadFile object
        contents: Raw bytes of the file
        
    Returns:
        pandas DataFrame with the spotlist data
        
    Raises:
        HTTPException: If the file format is not supported
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
