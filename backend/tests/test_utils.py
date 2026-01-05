"""
Tests for core utility functions.
"""

import math
import pytest
import pandas as pd
from core.utils import dataframe_to_records, json_safe, detect_data_format


class TestDataframeToRecords:
    """Tests for dataframe_to_records utility."""
    
    def test_simple_dataframe(self):
        """Test converting simple DataFrame to records."""
        df = pd.DataFrame({
            "name": ["Alice", "Bob"],
            "age": [30, 25]
        })
        
        records = dataframe_to_records(df)
        
        assert len(records) == 2
        assert records[0]["name"] == "Alice"
        assert records[0]["age"] == 30
    
    def test_nan_handling(self):
        """Test that NaN values are handled properly."""
        df = pd.DataFrame({
            "value": [1.0, float('nan'), 3.0]
        })
        
        records = dataframe_to_records(df)
        
        assert records[0]["value"] == 1.0
        # NaN values should be converted to None or remain as NaN
        middle_val = records[1]["value"]
        assert middle_val is None or (isinstance(middle_val, float) and math.isnan(middle_val))
        assert records[2]["value"] == 3.0
    
    def test_datetime_handling(self):
        """Test that datetime values are converted to ISO format."""
        df = pd.DataFrame({
            "date": pd.to_datetime(["2024-01-15", "2024-01-16"])
        })
        
        records = dataframe_to_records(df)
        
        assert "2024-01-15" in records[0]["date"]


class TestJsonSafe:
    """Tests for json_safe utility."""
    
    def test_simple_dict(self):
        """Test converting simple dictionary."""
        data = {"key": "value", "number": 42}
        result = json_safe(data)
        
        assert result == {"key": "value", "number": 42}
    
    def test_nested_dict(self):
        """Test converting nested dictionary."""
        data = {"outer": {"inner": 123}}
        result = json_safe(data)
        
        assert result == {"outer": {"inner": 123}}
    
    def test_nan_to_none(self):
        """Test that NaN is converted to None."""
        data = {"value": float('nan')}
        result = json_safe(data)
        
        assert result["value"] is None
    
    def test_infinity_to_none(self):
        """Test that infinity is converted to None."""
        data = {"value": float('inf')}
        result = json_safe(data)
        
        assert result["value"] is None


class TestDetectDataFormat:
    """Tests for detect_data_format utility."""
    
    def test_english_format(self):
        """Test detecting English format columns."""
        df = pd.DataFrame({
            "Channel": ["RTL"],
            "Airing date": ["2024-01-15"],
            "Airing time": ["10:00:00"],
            "Spend": [1000.0],
            "Claim": ["Ad A"],
            "EPG name": ["Morning Show"],
        })
        
        result = detect_data_format(df)
        
        assert result["format"] == "english"
        assert result["column_map"]["program"] == "Channel"
        assert result["column_map"]["cost"] == "Spend"
    
    def test_german_format(self):
        """Test detecting German format columns."""
        df = pd.DataFrame({
            "Medium": ["RTL"],
            "Datum": ["15.01.2024"],
            "Uhr": ["10:00:00"],
            "Kosten ctc.": ["1.000,00"],
            "Motiv": ["Kampagne A"],
            "Titel vor": ["Morgenshow"],
        })
        
        result = detect_data_format(df)
        
        assert result["format"] == "german"
        assert result["column_map"]["program"] == "Medium"
