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
