"""
Additional tests for core utilities to improve coverage.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, date, time
from core.utils import dataframe_to_records, json_safe, detect_data_format, read_spotlist_file
from fastapi import UploadFile, HTTPException
from io import BytesIO
from unittest.mock import MagicMock


class TestDataframeToRecordsExtended:
    """Extended tests for dataframe_to_records."""
    
    def test_with_arrays(self):
        """Test handling arrays in dataframe."""
        df = pd.DataFrame({
            "values": [[1, 2, 3], [4, 5, 6]]
        })
        records = dataframe_to_records(df)
        assert records[0]["values"] == [1, 2, 3]
    
    def test_with_timestamp(self):
        """Test handling pandas Timestamp."""
        df = pd.DataFrame({
            "timestamp": [pd.Timestamp("2024-01-15 10:30:00")]
        })
        records = dataframe_to_records(df)
        assert "2024-01-15" in records[0]["timestamp"]
    
    def test_with_infinity(self):
        """Test handling infinity values."""
        df = pd.DataFrame({
            "value": [float('inf'), float('-inf')]
        })
        records = dataframe_to_records(df)
        assert records[0]["value"] is None
        assert records[1]["value"] is None


class TestJsonSafeExtended:
    """Extended tests for json_safe."""
    
    def test_tuple_handling(self):
        """Test that tuples are preserved."""
        data = {"coords": (1, 2, 3)}
        result = json_safe(data)
        assert result["coords"] == (1, 2, 3)
    
    def test_numpy_scalar(self):
        """Test numpy scalar conversion."""
        data = {"value": np.float64(42.5)}
        result = json_safe(data)
        assert result["value"] == 42.5
    
    def test_datetime_objects(self):
        """Test datetime conversion."""
        data = {
            "datetime": datetime(2024, 1, 15, 10, 30),
            "date": date(2024, 1, 15),
            "time": time(10, 30, 0),
        }
        result = json_safe(data)
        assert "2024-01-15" in result["datetime"]
        assert result["date"] == "2024-01-15"
        assert "10:30" in result["time"]
    
    def test_pandas_na(self):
        """Test pandas NA handling."""
        data = {"value": pd.NA}
        result = json_safe(data)
        assert result["value"] is None


class TestDetectDataFormatExtended:
    """Extended tests for detect_data_format."""
    
    def test_german_with_sender(self):
        """Test German format with Sender column."""
        df = pd.DataFrame({
            "Sender": ["RTL"],
            "Datum": ["15.01.2024"],
            "Uhr": ["10:00"],
            "Kosten": ["1000"],
            "Motiv": ["Ad A"],
        })
        result = detect_data_format(df)
        assert result["format"] == "german"
        assert result["column_map"]["program"] == "Sender"
    
    def test_german_with_kanal(self):
        """Test German format with Kanal column."""
        df = pd.DataFrame({
            "Kanal": ["VOX"],
            "Datum": ["15.01.2024"],
            "Zeit": ["10:00"],
        })
        result = detect_data_format(df)
        assert result["format"] == "german"
        assert result["column_map"]["program"] == "Kanal"
    
    def test_english_with_program(self):
        """Test English format with Program column."""
        df = pd.DataFrame({
            "Program": ["RTL"],
            "Date": ["2024-01-15"],
            "Time": ["10:00"],
            "Cost": ["1000"],
            "Creative": ["Ad A"],
            "EPG": ["Morning Show"],
        })
        result = detect_data_format(df)
        assert result["format"] == "english"
        assert result["column_map"]["program"] == "Program"


class TestReadSpotlistFile:
    """Tests for read_spotlist_file function."""
    
    def test_csv_file(self):
        """Test reading CSV file."""
        csv_content = b"Channel,Date,Time,Spend\nRTL,2024-01-15,10:00,1000"
        
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test.csv"
        
        df = read_spotlist_file(mock_file, csv_content)
        
        assert len(df) == 1
        assert "Channel" in df.columns
    
    def test_invalid_format(self):
        """Test rejection of invalid file format."""
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test.txt"
        
        with pytest.raises(HTTPException) as exc_info:
            read_spotlist_file(mock_file, b"some content")
        
        assert exc_info.value.status_code == 400
        assert "Invalid file format" in exc_info.value.detail
    
    def test_whitespace_column_names(self):
        """Test that whitespace is stripped from column names."""
        csv_content = b" Channel , Date , Time \nRTL,2024-01-15,10:00"
        
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test.csv"
        
        df = read_spotlist_file(mock_file, csv_content)
        
        assert "Channel" in df.columns
        assert " Channel " not in df.columns
