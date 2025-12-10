import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config.settings import (
    AEOS_API_KEY,
    AEOS_API_URL,
    AEOS_AUTH_URL,
    DEFAULT_RETRY_BACKOFF,
    DEFAULT_RETRY_TOTAL,
    DEFAULT_TIMEOUT,
)


class AEOSClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or AEOS_API_KEY
        if not self.api_key:
            raise ValueError("AEOS_API_KEY is missing in environment variables.")
        self.token = None
        self.channels_cache = None

        # Session with retries to absorb transient SSL EOFs
        retry = Retry(
            total=DEFAULT_RETRY_TOTAL,
            backoff_factor=DEFAULT_RETRY_BACKOFF,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=["POST"],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session = requests.Session()
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    # ---- auth ----
    def authenticate(self):
        url = AEOS_AUTH_URL
        payload = {
            "authparams": self.api_key,
            "authmethod": "apikey",
            "app": "apiv4",
        }

        r = self.session.post(url, json=payload, timeout=DEFAULT_TIMEOUT)
        r.raise_for_status()

        data = r.json()
        self.token = data["token"]
        return self.token

    # Internal helper for headers
    def _headers(self):
        if self.token is None:
            self.authenticate()
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    # ---- helper/report posts ----
    def post_helper(self, method: str, payload: dict, timeout: float | None = None):
        """
        Call /APIv4/helper/{method} with JSON payload.
        """
        url = f"{AEOS_API_URL}/helper/{method}"
        r = self.session.post(
            url, json=payload, headers=self._headers(), timeout=timeout or DEFAULT_TIMEOUT
        )
        r.raise_for_status()
        return r.json()

    def post_report(self, method: str, payload: dict, timeout: float | None = None):
        """
        Call /APIv4/report/{method} with JSON payload.
        """
        url = f"{AEOS_API_URL}/report/{method}"
        r = self.session.post(
            url, json=payload, headers=self._headers(), timeout=timeout or DEFAULT_TIMEOUT
        )
        r.raise_for_status()
        return r.json()

    # ---- channel helpers ----
    def get_channels(self, analytics: bool):
        url = f"{AEOS_API_URL}/helper/getChannels"
        payload = {"analytics": bool(analytics)}

        r = self.session.post(url, json=payload, headers=self._headers(), timeout=DEFAULT_TIMEOUT)
        if not r.ok:
            raise RuntimeError(f"Error fetching channels: {r.status_code} {r.text}")

        return r.json()

    def load_all_channels(self):
        analytics_channels = self.get_channels(True)
        epg_channels = self.get_channels(False)

        self.channels_cache = {
            "analytics": analytics_channels,
            "epg": epg_channels,
            "all": analytics_channels + epg_channels,
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

    def get_all_channels_list(self):
        """
        Convenience: return flat list of all channels.
        """
        self._ensure_cache()
        return self.channels_cache["all"]
