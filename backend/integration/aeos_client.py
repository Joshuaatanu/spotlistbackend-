import os
import socket
import requests
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv
from pathlib import Path

# Try to load .env file relative to this script's directory
# But don't fail if it doesn't exist (e.g., on Render where env vars are set in dashboard)
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback: try current directory or parent directories
    load_dotenv()

BASE_URL = "https://api.adscanner.tv"
API_KEY = os.getenv("AEOS_API_KEY")


# Global flag to track if socket has been patched
_socket_patched = False
_original_getaddrinfo = None


def _patch_socket_for_ipv4():
    """Patch socket.getaddrinfo to prefer IPv4 addresses (only once)."""
    global _socket_patched, _original_getaddrinfo
    
    if _socket_patched:
        return  # Already patched, don't patch again
    
    _original_getaddrinfo = socket.getaddrinfo
    
    def getaddrinfo_ipv4(*args, **kwargs):
        # Get all address info
        results = _original_getaddrinfo(*args, **kwargs)
        # Filter to only IPv4 (AF_INET)
        ipv4_results = [r for r in results if r[0] == socket.AF_INET]
        # Return IPv4 if available, otherwise return original
        return ipv4_results if ipv4_results else results
    
    socket.getaddrinfo = getaddrinfo_ipv4
    _socket_patched = True


class AEOSClient:
    """Client for AEOS API v4."""
    def __init__(self, api_key: str | None = None, force_ipv4: bool = True):
        # Try passed API key, then module-level API_KEY, then environment variable directly
        self.api_key = api_key or API_KEY or os.getenv("AEOS_API_KEY")
        if not self.api_key:
            # Debug: check what env vars are available
            env_vars_with_aeos = [k for k in os.environ.keys() if 'AEOS' in k.upper()]
            raise ValueError(
                f"AEOS_API_KEY is missing in environment variables. "
                f"Available AEOS-related env vars: {env_vars_with_aeos}"
            )
        self.token = None
        self.token_expires_at = None  # Track token expiration time
        self.channels_cache = None
        
        # Force IPv4 if requested (default: True)
        if force_ipv4:
            _patch_socket_for_ipv4()
        
        # Session with retries to absorb transient SSL EOFs
        retry = Retry(
            total=5,
            backoff_factor=1,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=["POST"],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session = requests.Session()
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)



    def authenticate(self):
        url = f"{BASE_URL}/auth/login"
        payload = {
            "authparams": self.api_key,
            "authmethod": "apikey",
            "app": "apiv4"
        }

        r = self.session.post(url, json=payload, timeout=15)
        r.raise_for_status()

        data = r.json()
        self.token = data["token"]
        # Token expires in 600 seconds (10 minutes), refresh 30 seconds early for safety
        self.token_expires_at = datetime.now() + timedelta(seconds=570)
        return self.token

    # Internal helper for headers
    def _headers(self):
        # Check if token is expired or missing
        if self.token is None or (self.token_expires_at and datetime.now() >= self.token_expires_at):
            self.authenticate()
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def post_helper(self, method: str, payload: dict, timeout: float | None = 30):
        """
        Call /APIv4/helper/{method} with JSON payload.
        Automatically retries on 401 errors after re-authentication.
        """
        url = f"{BASE_URL}/APIv4/helper/{method}"
        max_retries = 2
        for attempt in range(max_retries):
            try:
                r = self.session.post(
                    url,
                    json=payload,
                    headers=self._headers(),
                    timeout=timeout,
                )
                # If 401, re-authenticate and retry once
                if r.status_code == 401 and attempt < max_retries - 1:
                    print("  ⟳ Token expired, re-authenticating...")
                    self.token = None
                    self.token_expires_at = None
                    continue
                r.raise_for_status()
                return r.json()
            except requests.exceptions.HTTPError as e:
                if e.response and e.response.status_code == 401 and attempt < max_retries - 1:
                    print("  ⟳ Token expired, re-authenticating...")
                    self.token = None
                    self.token_expires_at = None
                    continue
                raise

    def post_report(self, method: str, payload: dict, timeout: float | None = 30):
        """
        Call /APIv4/report/{method} with JSON payload.
        Automatically retries on 401 errors after re-authentication.
        """
        url = f"{BASE_URL}/APIv4/report/{method}"
        max_retries = 2
        for attempt in range(max_retries):
            try:
                r = self.session.post(
                    url,
                    json=payload,
                    headers=self._headers(),
                    timeout=timeout,
                )
                # If 401, re-authenticate and retry once
                if r.status_code == 401 and attempt < max_retries - 1:
                    print("  ⟳ Token expired, re-authenticating...")
                    self.token = None
                    self.token_expires_at = None
                    continue
                r.raise_for_status()
                return r.json()
            except requests.exceptions.HTTPError as e:
                if e.response and e.response.status_code == 401 and attempt < max_retries - 1:
                    print("  ⟳ Token expired, re-authenticating...")
                    self.token = None
                    self.token_expires_at = None
                    continue
                raise

  
    def get_channels(self, analytics: bool):
        """Get channels using post_helper for automatic 401 retry."""
        payload = {"analytics": bool(analytics)}
        return self.post_helper("getChannels", payload, timeout=30)

    def load_all_channels(self):
        analytics_channels = self.get_channels(True)
        epg_channels = self.get_channels(False)

        self.channels_cache = {
            "analytics": analytics_channels,
            "epg": epg_channels,
            "all": analytics_channels + epg_channels
        }
        return self.channels_cache

    def _ensure_cache(self):
        if self.channels_cache is None:
            self.load_all_channels()

    

    # Get channel by exact name
    def get_channel_id(self, name: str):
        self._ensure_cache()
        for ch in self.channels_cache["all"]:
            if ch["caption"].lower() == name.lower():
                return ch["value"]
        return None

    # Reverse lookup: get name by ID
    def get_channel_name(self, channel_id: int):
        self._ensure_cache()
        for ch in self.channels_cache["all"]:
            if int(ch["value"]) == int(channel_id):
                return ch["caption"]
        return None

    # Partial search (e.g., "pro" → Pro7)
    def search_channels(self, query: str):
        self._ensure_cache()
        q = query.lower()
        return [ch for ch in self.channels_cache["all"] if q in ch["caption"].lower()]

    # Return the whole cache
    def get_all(self):
        self._ensure_cache()
        return self.channels_cache
        # Return the whole cache
    
    def get_all_channels_list(self):
        """
        Convenience: return flat list of all channels.
        """
        self._ensure_cache()
        return self.channels_cache["all"]

    # ---- Convenience: analytics channels only (for ad harvesting) ----
    def get_analytics_channels(self):
        """Return channels that have ad harvesting (analytics = True)."""
        return self.get_channels(True)

    # ---- Report helpers ----
    def initiate_spotlist_medium_report(
        self,
        channel_ids,
        date_from: str,
        date_to: str,
        industries=None,
        categories=None,
        subcategories=None,
        companies=None,
        brands=None,
        products=None,
    ):
        """Initiate Advertisement Spotlist Medium report for XRP/SPEND etc.

        Uses /APIv4/report/initiateAdvertisementSpotlistMediumReport
        and returns the report_id.
        """
        payload = {
            "channels": channel_ids,
            "date_from": date_from,
            "date_to": date_to,
            "industries": industries,
            "categories": categories,
            "subcategories": subcategories,
            "companies": companies,
            "brands": brands,
            "products": products,
        }

        data = self.post_report("initiateAdvertisementSpotlistMediumReport", payload)
        status = str(data.get("status")).lower()
        if status != "true":
            raise RuntimeError(f"Spotlist medium report not accepted by API: {data}")
        return data["report_id"]

    def wait_for_report(self, report_id: int, poll_interval: int = 5, timeout: int = 600):
        """Poll getReportStatus until the report is done or timeout.

        Returns the final status payload.
        """
        import time

        start = time.time()
        while True:
            data = self.post_report("getReportStatus", {"report_id": report_id})
            state = data.get("report_state")
            print(f"[getReportStatus] report_id={report_id}, state={state}")

            if state and str(state).lower() in ("done", "finished", "completed"):
                return data

            if time.time() - start > timeout:
                raise TimeoutError(f"Report {report_id} not finished within {timeout} seconds.")

            time.sleep(poll_interval)

    def get_report_data(self, report_id: int):
        """Fetch report data using getReportData.

        Returns the raw JSON with 'header' and 'body'.
        """
        data = self.post_report("getReportData", {"report_id": report_id})
        if data is None:
            raise RuntimeError(f"Report {report_id} returned None")
        if not isinstance(data, dict):
            raise RuntimeError(f"Report {report_id} returned unexpected type: {type(data)}, data: {data}")
        if "body" not in data:
            raise RuntimeError(f"Report {report_id} not completed yet, response: {data}")
        return data

    def get_channel_kpis(
        self,
        date_from: str,
        date_to: str,
        channel_ids: list[int],
        kpis: list[str] | None = None,
        profiles: list[int] | None = None,
        dayparts: list[str] | None = None,  # Daypart values like "6 - 9" (not IDs)
        epg_categories: list[int] | None = None,
        splitby: str = "-1",
        threshold: str = "5sec",
        showdataby: str = "period",
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> list[dict]:
        """
        Enhanced Channel/Event Analysis KPI helper (section 4.3.1) with full filtering.

        Returns rows with per-channel KPIs such as:
        - amr-perc
        - reach (%)
        - reach-avg
        - share
        - ats-avg
        - atv-avg
        - airings

        Args:
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            channel_ids: List of channel IDs to analyze
            kpis: List of KPI variables to include (default: all standard KPIs)
            profiles: Optional list of audience profile IDs for targeting
            dayparts: Optional list of daypart values (strings like "6 - 9") for time-based filtering
            epg_categories: Optional list of EPG category IDs for program-based filtering
            splitby: Time split granularity ("-1" = no split, "day" = daily, "week" = weekly, etc.)
            threshold: Minimum viewing duration (default: "5sec")
            showdataby: Aggregation level ("period" = aggregate, "day" = daily breakdown, etc.)
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds

        Returns:
            List of dictionaries with KPI data
        """
        if kpis is None:
            kpis = [
                "amr-perc",
                "reach (%)",
                "reach-avg",
                "share",
                "ats-avg",
                "atv-avg",
                "airings",
            ]

        payload = {
            # Section 4.3.1 INITIATEDEEPANALYSISCHANNELEVENTREPORT
            "splitby": splitby,
            "date_from": date_from,
            "date_to": date_to,
            "threshold": threshold,
            "channels": channel_ids,
            "variables": kpis,
            "showdataby": showdataby,
        }

        # Add optional filters
        if profiles is not None:
            payload["profiles"] = profiles
        else:
            payload["profiles"] = []

        if dayparts is not None:
            payload["dayparts"] = dayparts
        else:
            payload["dayparts"] = []

        if epg_categories is not None:
            payload["epg_categories"] = epg_categories
        else:
            payload["epg_categories"] = []

        resp = self.post_report("initiateDeepAnalysisChannelEventReport", payload)
        if "report_id" not in resp:
            raise RuntimeError(f"Channel KPI report not accepted: {resp}")
        report_id = resp["report_id"]

        # Wait for report with configurable polling
        self.wait_for_report(report_id, poll_interval=poll_interval, timeout=timeout)
        data = self.get_report_data(report_id)
        
        # Handle nested structure: body contains 'body' and 'header' keys
        if isinstance(data.get("body"), dict):
            # Extract the actual data from the nested structure
            nested_body = data.get("body", {})
            actual_body = nested_body.get("body", [])
            actual_header = nested_body.get("header", [])
            
            # Reconstruct the expected format for flatten_spotlist_report
            normalized_data = {
                "header": actual_header,
                "body": actual_body
            }
        else:
            # Standard structure
            normalized_data = data

        from utils import flatten_spotlist_report
        rows = flatten_spotlist_report(normalized_data)
        return rows

    def get_enhanced_deep_analysis(
        self,
        date_from: str,
        date_to: str,
        channel_ids: list[int],
        kpis: list[str] | None = None,
        profiles: list[int] | None = None,
        dayparts: list[str] | None = None,  # Daypart values like "6 - 9" (not IDs)
        epg_categories: list[int] | None = None,
        company_ids: list[int] | None = None,
        brand_ids: list[int] | None = None,
        splitby: str = "-1",
        threshold: str = "5sec",
        showdataby: str = "period",
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> list[dict]:
        """
        Enhanced Deep Analysis with full filtering capabilities.
        
        This is a more comprehensive version that supports additional filters
        like companies and brands (if supported by the API version).

        Args:
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            channel_ids: List of channel IDs
            kpis: List of KPI variables
            profiles: Optional audience profile IDs
            dayparts: Optional daypart IDs
            epg_categories: Optional EPG category IDs
            company_ids: Optional company IDs for filtering
            brand_ids: Optional brand IDs for filtering
            splitby: Time split granularity
            threshold: Minimum viewing duration
            showdataby: Aggregation level
            poll_interval: Polling interval
            timeout: Maximum wait time

        Returns:
            List of dictionaries with analysis data
        """
        # Use the enhanced get_channel_kpis as base
        return self.get_channel_kpis(
            date_from=date_from,
            date_to=date_to,
            channel_ids=channel_ids,
            kpis=kpis,
            profiles=profiles,
            dayparts=dayparts,
            epg_categories=epg_categories,
            splitby=splitby,
            threshold=threshold,
            showdataby=showdataby,
            poll_interval=poll_interval,
            timeout=timeout,
        )
