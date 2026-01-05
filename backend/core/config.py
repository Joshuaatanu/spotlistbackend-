"""
Application configuration settings.
"""

import os
from pathlib import Path


# Base paths
BASE_DIR = Path(__file__).parent.parent
INTEGRATION_PATH = BASE_DIR / "integration"

# Environment settings
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# API settings
API_TITLE = "Spotlist Checker API"
API_DESCRIPTION = """
TV advertising analytics platform for detecting double bookings.

## Features

- **Double Booking Detection**: Identify overlapping ad spots within configurable time windows
- **Multiple Data Sources**: Upload CSV/Excel files or fetch data from AEOS API
- **Metadata Enrichment**: Channel, daypart, EPG category, and company metadata
- **AI Insights**: Generate insights using OpenAI GPT models
- **Analysis History**: Persist and retrieve previous analyses

## Report Types

- Spotlist Analysis
- Top Ten Report
- Reach/Frequency Analysis
- Daypart Analysis
- Competitor Comparison
"""
API_VERSION = "1.0.0"

# CORS settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]
