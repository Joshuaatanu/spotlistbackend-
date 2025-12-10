import time
import requests
from typing import Optional, Sequence

from aeos_client import AEOSClient
from utils import flatten_spotlist_report


class SpotlistChecker:
    def __init__(self, client: AEOSClient, poll_interval: int = 5):
        self.client = client
        self.poll_interval = poll_interval

    # ---- initiate spotlist report ----
    def initiate_spotlist(
        self,
        channel_id: Optional[int],
        date_from: str,
        date_to: str,
        brand_ids: Optional[Sequence[int]] = None,
        product_ids: Optional[Sequence[int]] = None,
        industry_ids: Optional[Sequence[int]] = None,
        category_ids: Optional[Sequence[int]] = None,
        subcategory_ids: Optional[Sequence[int]] = None,
        company_ids: Optional[Sequence[int]] = None,
    ) -> int:
        """
        Kick off a spotlist report for a channel+filters.
        Dates in YYYY-MM-DD, channel_id from getChannels,
        brand/product/industry/category/... from helper methods.
        """

        payload = {
            "date_from": date_from,
            "date_to": date_to,
            "industries": list(industry_ids) if industry_ids else None,
            "categories": list(category_ids) if category_ids else None,
            "subcategories": list(subcategory_ids) if subcategory_ids else None,
            "companies": list(company_ids) if company_ids else None,
            "brands": list(brand_ids) if brand_ids else None,
            "products": list(product_ids) if product_ids else None,
            # you can extend this with dayparts, weekday, epg_categories, etc.
        }
        if channel_id is not None:
            payload["channels"] = [channel_id]

        resp = self.client.post_report("initiateAdvertisementSpotlistMediumReport", payload)
        # expected: {"status": true, "report_id": 123456, ...}

        if "report_id" not in resp:
            # Print the response so we can see what AEOS is complaining about
            print("initiateAdvertisementSpotlistMediumReport response (no report_id):", resp)
            raise RuntimeError(
                "initiateAdvertisementSpotlistMediumReport did not return report_id. "
                f"Response: {resp}"
            )

        report_id = resp["report_id"]
        return report_id
        
        
    

    def get_spots_for_advertiser_substring(
        self,
        advertiser_substring: str,
        date_from: str,
        date_to: str,
        channels: Optional[list[dict]] = None,
    ) -> list[dict]:
        """
        High-level helper:
        - For each channel, fetch spotlist for the given date range (no company/brand filters)
        - Flatten the report
        - Filter locally where advertiser_substring appears in common advertiser/brand/company columns
        - Return a combined list of rows with an added 'Channel' column
        """
        # If no channels list is passed, get all channels from the client
        if channels is None:
            # Use only analytics channels (with ad harvesting), as advised by AEOS
            channels = self.client.get_analytics_channels()

        all_rows: list[dict] = []
        needle = advertiser_substring.lower()
        candidate_cols = [
            "Kunde",
            "Customer",
            "Advertiser",
            "Company",
            "Brand",
            "Product",
        ]

        for ch in channels:
            channel_id = ch["value"]
            channel_name = ch["caption"]

            try:
                report = self.get_spotlist(
                    channel_id=channel_id,
                    date_from=date_from,
                    date_to=date_to,
                    company_ids=None,
                    brand_ids=None,
                )
            except Exception:
                # no data or report failure, skip this channel
                continue

            rows = flatten_spotlist_report(report)

            for r in rows:
                haystack_parts = []
                for col in candidate_cols:
                    val = r.get(col)
                    if val:
                        haystack_parts.append(str(val))
                haystack = " ".join(haystack_parts).lower()
                if haystack and needle in haystack:
                    r["Channel"] = channel_name
                    all_rows.append(r)

        return all_rows

    # ---- poll report_data until ready ----
    def wait_for_report(self, report_id: int, timeout: int = 300):
        """
        Poll getReportData until the report is ready or timeout.
        """
        start = time.time()
        while True:
            try:
                resp = self.client.post_report(
                    "getReportData",
                    {"report_id": report_id},
                )
            except requests.exceptions.SSLError:
                # transient TLS drop, backoff and retry
                if time.time() - start > timeout:
                    raise TimeoutError(
                        f"Report {report_id} did not complete in time (SSL retries)."
                    )
                time.sleep(self.poll_interval)
                continue
            except Exception:
                # Any other error, surface it
                raise

            # When report is still running, API returns status only.
            if "body" in resp and "header" in resp:
                # report completed
                return resp

            if time.time() - start > timeout:
                raise TimeoutError(f"Report {report_id} did not complete in time.")

            time.sleep(self.poll_interval)

    # ---- one-shot helper: from spec to final data ----
    def get_spotlist(
        self,
        channel_id: Optional[int],
        date_from: str,
        date_to: str,
        timeout: int = 600,
        **kwargs,
    ):
        """
        Convenience method:
        - initiates the report
        - waits for completion
        - returns the full report data
        """
        report_id = self.initiate_spotlist(
            channel_id=channel_id,
            date_from=date_from,
            date_to=date_to,
            **kwargs,
        )
        return self.wait_for_report(report_id, timeout=timeout)
    def initiate_channel_event_analysis_report(
        self,
        channel_ids,
        date_from: str,
        date_to: str,
        granularity: str = "channel",
    ) -> int:
        """
        Start a Channel / Event Analysis report for the given channels and period.

        NOTE: You must set the exact method name and payload fields according
        to section 4.3.1 of the AEOS API PDF. Commonly this is something like
        'initiateChannelEventAnalysisReport' or 'initiateChannelAnalysisReport'.

        For now we use a placeholder name; adjust to match the PDF.
        """
        payload = {
            "channels": channel_ids,      # list of channel IDs (ints)
            "date_from": date_from,       # "YYYY-MM-DD"
            "date_to": date_to,           # "YYYY-MM-DD"
            "splitby": "-1",
            "threshold": "5sec",
            "profiles": [],
            "dayparts": [],
            "variables": ["amr-perc", "reach (%)", "reach-avg", "share", "ats-avg", "atv-avg", "airings"],
            "showdataby": "period",
            "epg_categories": [],
        }
        if granularity:
            payload["granularity"] = granularity

        # Section 4.3.1 INITIATEDEEPANALYSISCHANNELEVENTREPORT
        data = self.client.post_report("initiateDeepAnalysisChannelEventReport", payload)
        status = str(data.get("status")).lower()
        if status != "true":
            raise RuntimeError(f"Channel/Event Analysis not accepted: {data}")
        return data["report_id"]

    def get_channel_event_analysis(
        self,
        channel_ids,
        date_from: str,
        date_to: str,
        granularity: str = "channel",
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> dict:
        """
        Convenience wrapper:
        - starts Channel/Event Analysis
        - waits for completion
        - returns final getReportData JSON
        """
        report_id = self.initiate_channel_event_analysis_report(
            channel_ids=channel_ids,
            date_from=date_from,
            date_to=date_to,
            granularity=granularity,
        )
        self.client.wait_for_report(report_id, poll_interval=poll_interval, timeout=timeout)
        return self.client.get_report_data(report_id)
