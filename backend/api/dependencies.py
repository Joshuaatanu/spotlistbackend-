"""
Shared dependencies for API routes.

This module provides dependency injection for common resources like
AEOS client, metadata service, and availability flags.
"""

import sys
from pathlib import Path
from functools import lru_cache

# Add integration folder to path
_integration_path = Path(__file__).parent.parent / "integration"
_integration_path_str = str(_integration_path.absolute())
if _integration_path_str not in sys.path:
    sys.path.insert(0, _integration_path_str)

# AEOS Integration availability flag
AEOS_AVAILABLE = False
AEOSClient = None
AEOSSpotlistChecker = None
flatten_spotlist_report = None
AEOSMetadata = None

try:
    from aeos_client import AEOSClient as _AEOSClient
    from spotlist_checker import SpotlistChecker as _AEOSSpotlistChecker
    from utils import flatten_spotlist_report as _flatten_spotlist_report
    from aeos_metadata import AEOSMetadata as _AEOSMetadata
    
    AEOSClient = _AEOSClient
    AEOSSpotlistChecker = _AEOSSpotlistChecker
    flatten_spotlist_report = _flatten_spotlist_report
    AEOSMetadata = _AEOSMetadata
    AEOS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: AEOS integration not available: {e}")

# Supabase availability flag
SUPABASE_AVAILABLE = False
try:
    from supabase_client import (
        save_analysis, get_analyses, get_analysis_by_id, delete_analysis,
        save_configuration, get_configuration, check_database_connection
    )
    SUPABASE_AVAILABLE = True
except ImportError:
    print("Warning: Supabase client not available. Database features disabled.")
    # Define stub functions
    def save_analysis(*args, **kwargs): return None
    def get_analyses(*args, **kwargs): return []
    def get_analysis_by_id(*args, **kwargs): return None
    def delete_analysis(*args, **kwargs): return False
    def save_configuration(*args, **kwargs): return None
    def get_configuration(*args, **kwargs): return None
    def check_database_connection(*args, **kwargs): return {"connected": False, "error": "Supabase not available"}

# OpenAI availability flag
OPENAI_AVAILABLE = False
openai = None
OPENAI_API_KEY = None
try:
    import openai as _openai
    import os
    openai = _openai
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_AVAILABLE = True
except ImportError:
    print("Warning: OpenAI not available. AI insights disabled.")

# Spotlist checker import
try:
    from spotlist_checkerv2 import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe
except ImportError:
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from spotlist_checkerv2 import SpotlistChecker, SpotlistCheckerConfig, parse_number_safe
    except ImportError:
        print("Error: Could not import spotlist_checkerv2")
        raise


@lru_cache()
def get_aeos_client():
    """
    Get a cached AEOS client instance.
    
    Returns:
        AEOSClient instance or None if not available
    """
    if not AEOS_AVAILABLE or AEOSClient is None:
        return None
    return AEOSClient()


def get_aeos_metadata():
    """
    Get an AEOS metadata service instance.
    
    Returns:
        AEOSMetadata instance or None if not available
    """
    if not AEOS_AVAILABLE or AEOSMetadata is None:
        return None
    client = get_aeos_client()
    if client is None:
        return None
    return AEOSMetadata(client)
