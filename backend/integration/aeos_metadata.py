from typing import Sequence

from aeos_client import AEOSClient


class AEOSMetadata:
    def __init__(self, client: AEOSClient):
        self.client = client

    def get_industries(self, filter_text: str = ""):
        """Return list of industries. Optional text filter.
        Maps to helper/getIndustries.
        """
        payload: dict = {"filter": filter_text} if filter_text else {"filter": ""}
        return self.client.post_helper("getIndustries", payload)

    def get_companies(
        self,
        industry_ids: Sequence[int] | None = None,
        filter_text: str = "",
    ):
        """Return list of companies (advertisers).
        Optional industries filter and text filter.
        Maps to helper/getCompanies.
        """
        payload: dict = {}
        if industry_ids:
            payload["industries"] = list(industry_ids)
        payload["filter"] = filter_text if filter_text else ""
        return self.client.post_helper("getCompanies", payload)

    def get_brands(
        self,
        company_ids: Sequence[int],
        filter_text: str = "",
    ):
        """Return list of brands for given company IDs.
        Maps to helper/getBrands (expects 'values' array).
        """
        payload: dict = {
            "values": list(company_ids),
            "filter": filter_text if filter_text else "",
        }
        return self.client.post_helper("getBrands", payload)

    def get_products(
        self,
        brand_ids: Sequence[int],
        filter_text: str = "",
    ):
        """Return list of products for given brand IDs.
        Maps to helper/getProducts (expects 'values' array).
        """
        payload: dict = {
            "values": list(brand_ids),
            "filter": filter_text if filter_text else "",
        }
        return self.client.post_helper("getProducts", payload)

    @staticmethod
    def _find_by_caption(items: list[dict], name: str):
        name_lower = name.lower()
        for item in items:
            if item.get("caption", "").lower() == name_lower:
                return item
        return None

    def find_company(self, name: str):
        """Find a single company by exact caption match."""
        return self._find_by_caption(self.get_companies(), name)

    def find_brand(self, company_id: int, brand_name: str):
        """Find a brand by name within a given company."""
        brands = self.get_brands([company_id])
        return self._find_by_caption(brands, brand_name)

    def find_product(self, brand_id: int, product_name: str):
        """Find a product by name within a given brand."""
        products = self.get_products([brand_id])
        return self._find_by_caption(products, product_name)

    # ---- Additional metadata helpers ----
    
    def get_categories(self, filter_text: str = ""):
        """Return list of advertisement categories. Optional text filter.
        Maps to helper/getCategories.
        """
        payload: dict = {"filter": filter_text} if filter_text else {"filter": ""}
        try:
            return self.client.post_helper("getCategories", payload)
        except Exception:
            # Fallback if endpoint doesn't exist
            return []

    def get_subcategories(
        self,
        category_ids: Sequence[int] | None = None,
        filter_text: str = "",
    ):
        """Return list of subcategories. Optional category filter and text filter.
        Maps to helper/getSubcategories.
        """
        payload: dict = {}
        if category_ids:
            payload["categories"] = list(category_ids)
        payload["filter"] = filter_text if filter_text else ""
        try:
            return self.client.post_helper("getSubcategories", payload)
        except Exception:
            # Fallback if endpoint doesn't exist
            return []

    def get_dayparts(self, filter_text: str = ""):
        """Return list of available daypart definitions.
        Maps to helper/getDayparts.
        Dayparts are time-of-day segments (e.g., "Prime Time", "Daytime").
        """
        payload: dict = {"filter": filter_text} if filter_text else {"filter": ""}
        try:
            return self.client.post_helper("getDayparts", payload)
        except Exception:
            # Fallback if endpoint doesn't exist
            return []

    def get_epg_categories(self, filter_text: str = ""):
        """Return list of EPG (Electronic Program Guide) categories.
        Maps to helper/getEPGCategories.
        EPG categories represent program types (e.g., "News", "Sports", "Entertainment").
        """
        payload: dict = {"filter": filter_text} if filter_text else {"filter": ""}
        try:
            return self.client.post_helper("getEPGCategories", payload)
        except Exception:
            # Fallback if endpoint doesn't exist
            return []

    def get_profiles(self, filter_text: str = ""):
        """Return list of audience profiles (target demographics).
        Maps to helper/getProfiles.
        Profiles represent target audience segments for analysis.
        """
        payload: dict = {"filter": filter_text} if filter_text else {"filter": ""}
        try:
            return self.client.post_helper("getProfiles", payload)
        except Exception:
            # Fallback if endpoint doesn't exist
            return []

    def find_category(self, name: str):
        """Find a category by exact caption match."""
        return self._find_by_caption(self.get_categories(), name)

    def find_subcategory(self, category_id: int, subcategory_name: str):
        """Find a subcategory by name within a given category."""
        subcategories = self.get_subcategories([category_id])
        return self._find_by_caption(subcategories, subcategory_name)

    def find_daypart(self, name: str):
        """Find a daypart by exact caption match."""
        return self._find_by_caption(self.get_dayparts(), name)

    def find_epg_category(self, name: str):
        """Find an EPG category by exact caption match."""
        return self._find_by_caption(self.get_epg_categories(), name)

    def find_profile(self, name: str):
        """Find a profile by exact caption match."""
        return self._find_by_caption(self.get_profiles(), name)
