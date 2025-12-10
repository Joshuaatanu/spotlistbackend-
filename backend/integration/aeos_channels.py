"""Helper module to retrieve available channels, brands, companies, and industries
using the shared AEOSClient helper interface.

Use this to find the IDs you need for your spotlist requests.
"""
from typing import Any, Dict, List, Optional
import json

from aeos_client import AEOSClient


class AEOSChannels:
    """High-level helper for AEOS /helper endpoints related to channels data."""

    def __init__(self, client: AEOSClient) -> None:
        self.client = client

    def get_channels(self, analytics: bool = False) -> Dict[str, Any]:
        """Get list of available channels.

        Returns the raw JSON response from the AEOS helper endpoint.
        """
        payload: Dict[str, Any] = {"analytics": analytics}
        try:
            return self.client.post_helper("getChannels", payload)
        except Exception as e:  # noqa: BLE001
            print(f"Failed to get channels: {e}")
            return {}

    def get_brands(
        self,
        company_ids: Optional[List[int]] = None,
        filter_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get list of available brands (optionally filtered by company or text)."""
        payload: Dict[str, Any] = {"companies": company_ids or []}

        if filter_text:
            payload["filter"] = filter_text

        try:
            return self.client.post_helper("getBrands", payload)
        except Exception as e:  # noqa: BLE001
            print(f"Failed to get brands: {e}")
            return {}

    def get_companies(
        self,
        industry_ids: Optional[List[int]] = None,
        filter_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get list of available companies (optionally filtered by industry or text)."""
        payload: Dict[str, Any] = {"industries": industry_ids or []}

        if filter_text:
            payload["filter"] = filter_text

        try:
            return self.client.post_helper("getCompanies", payload)
        except Exception as e:  # noqa: BLE001
            print(f"Failed to get companies: {e}")
            return {}

    def get_industries(self) -> Dict[str, Any]:
        """Get list of available industries."""
        payload: Dict[str, Any] = {}
        try:
            return self.client.post_helper("getIndustries", payload)
        except Exception as e:  # noqa: BLE001
            print(f"Failed to get industries: {e}")
            return {}


def save_to_file(data: Dict[str, Any], filename: str) -> None:
    """Save data to a JSON file on disk."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved to {filename}")


def _count_items(data: Dict[str, Any]) -> int:
    """Best-effort helper to count items in common AEOS helper responses.

    Many helper endpoints return objects shaped like:
    {"all": [ ... ]}
    This function tries to handle that gracefully.
    """
    if not data:
        return 0
    if isinstance(data, dict) and "all" in data and isinstance(data["all"], list):
        return len(data["all"])
    if isinstance(data, list):
        return len(data)
    return 0


def main() -> None:
    """Standalone helper to retrieve and save helper data as JSON files.

    Run this file directly if you just want to dump available channels,
    industries, companies, and brands to disk.
    """
    print("=" * 60)
    print("AEOS API Helper Data Retrieval")
    print("=" * 60)

    # Initialise the shared AEOS client (handles auth, base URL, etc.)
    client = AEOSClient()
    helper = AEOSChannels(client)

    print("\nRetrieving available data...")

    # 1. Channels
    print("\n1. Fetching channels...")
    channels = helper.get_channels()
    if channels:
        save_to_file(channels, "available_channels.json")
        print(f"   Found {_count_items(channels)} channels")

    # 2. Industries
    print("\n2. Fetching industries...")
    industries = helper.get_industries()
    if industries:
        save_to_file(industries, "available_industries.json")
        print(f"   Found {_count_items(industries)} industries")

    # 3. Companies
    print("\n3. Fetching companies...")
    companies = helper.get_companies()
    if companies:
        save_to_file(companies, "available_companies.json")
        print(f"   Found {_count_items(companies)} companies")

    # 4. Brands
    print("\n4. Fetching brands...")
    brands = helper.get_brands()
    if brands:
        save_to_file(brands, "available_brands.json")
        print(f"   Found {_count_items(brands)} brands")

    print("\n" + "=" * 60)
    print("✓ Helper data retrieval completed!")
    print("\nCheck the JSON files to find the IDs you need:")
    print("  - available_channels.json")
    print("  - available_industries.json")
    print("  - available_companies.json")
    print("  - available_brands.json")
    print("=" * 60)


if __name__ == "__main__":  # pragma: no cover
    main()
