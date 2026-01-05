"""
Pytest configuration and fixtures.
"""

import pytest
import sys
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))


@pytest.fixture
def sample_spotlist_data():
    """Sample spotlist data for testing double booking detection."""
    return [
        {
            "Channel": "RTL",
            "Airing date": "2024-01-15",
            "Airing time": "10:00:00",
            "Spend": 1000.0,
            "Claim": "Ad Campaign A",
            "EPG name": "Morning Show",
        },
        {
            "Channel": "RTL",
            "Airing date": "2024-01-15",
            "Airing time": "10:30:00",
            "Spend": 1000.0,
            "Claim": "Ad Campaign A",
            "EPG name": "Morning Show",
        },
        {
            "Channel": "RTL",
            "Airing date": "2024-01-15",
            "Airing time": "12:00:00",
            "Spend": 1500.0,
            "Claim": "Ad Campaign A",
            "EPG name": "Lunch News",
        },
        {
            "Channel": "VOX",
            "Airing date": "2024-01-15",
            "Airing time": "10:15:00",
            "Spend": 800.0,
            "Claim": "Ad Campaign B",
            "EPG name": "Morning Talk",
        },
    ]


@pytest.fixture
def sample_german_spotlist_data():
    """Sample German format spotlist data."""
    return [
        {
            "Medium": "RTL",
            "Datum": "15.01.2024",
            "Uhr": "10:00:00",
            "Kosten ctc.": "1.000,00",
            "Motiv": "Kampagne A",
            "Titel vor": "Morgenshow",
        },
        {
            "Medium": "RTL",
            "Datum": "15.01.2024",
            "Uhr": "10:30:00",
            "Kosten ctc.": "1.000,00",
            "Motiv": "Kampagne A",
            "Titel vor": "Morgenshow",
        },
    ]


@pytest.fixture
def analysis_metrics():
    """Sample analysis metrics for testing AI insights."""
    return {
        "total_spots": 100,
        "double_spots": 10,
        "total_cost": 50000.0,
        "double_cost": 5000.0,
        "percent_spots": 0.10,
        "percent_cost": 0.10,
        "total_xrp": 500.0,
        "double_xrp": 50.0,
        "cost_per_xrp": 100.0,
    }
