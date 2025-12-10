"""
Centralized configuration and environment loading.
"""

import os
from dotenv import load_dotenv

load_dotenv()

AEOS_AUTH_URL = os.getenv("AEOS_AUTH_URL", "https://api.adscanner.tv/auth/login")
AEOS_API_URL = os.getenv("AEOS_API_URL", "https://api.adscanner.tv/APIv4")
AEOS_API_KEY = os.getenv("AEOS_API_KEY")

DEFAULT_TIMEOUT = float(os.getenv("AEOS_TIMEOUT", "30"))
DEFAULT_RETRY_TOTAL = int(os.getenv("AEOS_RETRY_TOTAL", "5"))
DEFAULT_RETRY_BACKOFF = float(os.getenv("AEOS_RETRY_BACKOFF", "1"))
