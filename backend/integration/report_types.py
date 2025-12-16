"""
Report Type Implementations for AEOS API.

This module provides high-level implementations for various report types:
- Top Ten Reports
- Reach & Frequency Reports
- Daypart Analysis Reports
- Enhanced Spotlist Reports with full filtering
"""

from typing import Optional, Sequence, Dict, Any, List
from datetime import date

from aeos_client import AEOSClient
from report_manager import ReportManager, ReportType


class TopTenReport:
    """
    Top Ten Reports - Uses documented API endpoints from v2.3.
    
    According to API v2.3 documentation (Sections 4.3.4-4.3.6):
    - initiateTopTenSpots: Top 10 advertisements by XRP score
    - initiateTopTenEvents: Top 10 events by Share
    - initiateTopTenChannel: Top 10 channels by Share
    """

    def __init__(self, client: AEOSClient):
        self.client = client
        self.manager = ReportManager(client)

    def get_top_ten_spots(
        self,
        period: str = "Last 7 days",  # "Yesterday" or "Last 7 days"
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> List[Dict[str, Any]]:
        """
        Get Top 10 advertisements by XRP score.
        
        Args:
            period: Time period - "Yesterday" or "Last 7 days"
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            List of top 10 ads with XRP, Brand, Airings, Company, Product
        """
        if period not in ["Yesterday", "Last 7 days"]:
            raise ValueError('period must be "Yesterday" or "Last 7 days"')
        
        payload = {"period": period}
        
        return self.manager.get_complete_report(
            ReportType.TOP_TEN_SPOTS,
            payload,
            poll_interval=poll_interval,
            timeout=timeout,
            flatten=True,
        )

    def get_top_ten_events(
        self,
        period: str = "Last 7 days",  # "Yesterday" or "Last 7 days"
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> List[Dict[str, Any]]:
        """
        Get Top 10 events by Share.
        
        Args:
            period: Time period - "Yesterday" or "Last 7 days"
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            List of top 10 events with name, id, airing date/time, channel, category, Share
        """
        if period not in ["Yesterday", "Last 7 days"]:
            raise ValueError('period must be "Yesterday" or "Last 7 days"')
        
        payload = {"period": period}
        
        return self.manager.get_complete_report(
            ReportType.TOP_TEN_EVENTS,
            payload,
            poll_interval=poll_interval,
            timeout=timeout,
            flatten=True,
        )

    def get_top_ten_channels(
        self,
        period: str = "Last 7 days",  # "Yesterday" or "Last 7 days"
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> List[Dict[str, Any]]:
        """
        Get Top 10 channels by Share.
        
        Args:
            period: Time period - "Yesterday" or "Last 7 days"
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            List of top 10 channels with name, id, Share percentage
        """
        if period not in ["Yesterday", "Last 7 days"]:
            raise ValueError('period must be "Yesterday" or "Last 7 days"')
        
        payload = {"period": period}
        
        return self.manager.get_complete_report(
            ReportType.TOP_TEN_CHANNEL,
            payload,
            poll_interval=poll_interval,
            timeout=timeout,
            flatten=True,
        )

    def get_top_ten(
        self,
        report_subtype: str = "spots",  # "spots", "events", "channel"
        period: str = "Last 7 days",
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> List[Dict[str, Any]]:
        """
        Convenience method to get any Top Ten report type.
        
        Args:
            report_subtype: Type of Top Ten report - "spots", "events", or "channel"
            period: Time period - "Yesterday" or "Last 7 days"
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            List of top 10 results
        """
        if report_subtype == "spots":
            return self.get_top_ten_spots(period, poll_interval, timeout)
        elif report_subtype == "events":
            return self.get_top_ten_events(period, poll_interval, timeout)
        elif report_subtype == "channel":
            return self.get_top_ten_channels(period, poll_interval, timeout)
        else:
            raise ValueError('report_subtype must be "spots", "events", or "channel"')


class ReachFrequencyReport:
    """
    Reach & Frequency Analysis Report.
    
    Uses initiateDeepAnalysisAdvertisingReport (API v2.3 Section 4.3.2)
    with reach and frequency variables, as initiateReachFrequencyReport
    is not documented in the API specification.
    """

    def __init__(self, client: AEOSClient):
        self.client = client
        self.manager = ReportManager(client)

    def get_reach_frequency(
        self,
        date_from: str,
        date_to: str,
        channel_ids: List[int],
        company_ids: Optional[Sequence[int]] = None,
        brand_ids: Optional[Sequence[int]] = None,
        product_ids: Optional[Sequence[int]] = None,
        profiles: Optional[Sequence[int]] = None,
        dayparts: Optional[Sequence[str]] = None,  # Daypart values like "6 - 9" (not IDs)
        industries: Optional[Sequence[int]] = None,
        categories: Optional[Sequence[int]] = None,
        subcategories: Optional[Sequence[int]] = None,
        frequency: str = "1+",  # Default frequency filter
        showdataby: str = "By Day",  # "By Day", "By weekday", "By calendar week", etc.
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> Dict[str, Any]:
        """
        Get Reach & Frequency analysis using Deep Analysis Advertising Report.
        
        Args:
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            channel_ids: List of channel IDs
            company_ids: Optional company filter
            brand_ids: Optional brand filter
            product_ids: Optional product filter
            profiles: Optional audience profile filter
            dayparts: Optional daypart filter
            industries: Optional industry filter
            categories: Optional category filter
            subcategories: Optional subcategory filter
            frequency: Frequency filter (default: "1+")
            showdataby: Data grouping option (default: "By Day")
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            Dictionary with reach and frequency data
        """
        # Use Deep Analysis Advertising Report with reach variable
        payload = {
            "date_from": date_from,
            "date_to": date_to,
            "channels": channel_ids,
            "variables": ["reach (%)"],  # Primary variable for reach analysis
            "frequency": frequency,
            "showdataby": showdataby,
        }
        
        if company_ids:
            payload["companies"] = list(company_ids)
        if brand_ids:
            payload["brands"] = list(brand_ids)
        if product_ids:
            payload["products"] = list(product_ids)
        if profiles:
            payload["profiles"] = list(profiles)
        if dayparts:
            payload["dayparts"] = list(dayparts)
        if industries:
            payload["industries"] = list(industries)
        if categories:
            payload["categories"] = list(categories)
        if subcategories:
            payload["subcategories"] = list(subcategories)
        
        return self.manager.get_complete_report(
            ReportType.DEEP_ANALYSIS_ADVERTISING,
            payload,
            poll_interval=poll_interval,
            timeout=timeout,
            flatten=False,  # Deep analysis reports have specific structure
        )


class DaypartAnalysisReport:
    """
    Daypart Analysis Report - Analyze performance by time of day segments.
    
    Uses initiateDeepAnalysisChannelEventReport (API v2.3 Section 4.3.1)
    with daypart filters, as initiateDaypartAnalysisReport is not documented
    in the API specification.
    """

    def __init__(self, client: AEOSClient):
        self.client = client
        self.manager = ReportManager(client)

    def get_daypart_analysis(
        self,
        date_from: str,
        date_to: str,
        channel_ids: List[int],
        company_ids: Optional[Sequence[int]] = None,
        dayparts: Optional[Sequence[str]] = None,  # None = all dayparts, use daypart values like "6 - 9"
        variables: Optional[List[str]] = None,  # Default: ["spend", "xrp", "airings", "reach (%)"]
        profiles: Optional[Sequence[int]] = None,
        epg_categories: Optional[Sequence[int]] = None,
        splitby: str = "-1",  # Time segmentation: "-1", "1 hour", "30 minutes", etc.
        showdataby: str = "By Day",  # "By Day", "By weekday", etc.
        threshold: str = "5sec",  # Contact threshold
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> List[Dict[str, Any]]:
        """
        Get daypart analysis report using Deep Analysis Channel Event Report.
        
        Args:
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            channel_ids: List of channel IDs
            company_ids: Optional company filter (note: for advertising analysis, 
                        use Deep Analysis Advertising Report instead)
            dayparts: Optional specific dayparts to analyze (None = all)
                     Use daypart values like "6 - 9", "9 - 11", etc.
            variables: List of variables/metrics to include
                     Default: ["reach (%)", "share", "amr-perc", "ats-avg"]
                     Note: Must use Channel Event Report compatible variables
                     Valid: "amr-perc", "reach (%)", "reach-avg", "share", "ats-avg", "atv-avg"
            profiles: Optional audience profile filter
            epg_categories: Optional EPG category filter
            splitby: Time segmentation (default: "-1" for no split)
            showdataby: Data grouping option (default: "By Day")
            threshold: Contact threshold (default: "5sec")
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            List of daypart analysis rows
        """
        if variables is None:
            # Use Channel Event Report compatible variables (not Advertising variables)
            # Valid for Channel Event: "amr-perc", "reach (%)", "reach-avg", "share", "ats-avg", "atv-avg"
            variables = ["reach (%)", "share", "amr-perc", "ats-avg"]
        
        payload = {
            "date_from": date_from,
            "date_to": date_to,
            "channels": channel_ids,
            "variables": variables,
            "splitby": splitby,
            "showdataby": showdataby,
            "threshold": threshold,
        }
        
        if dayparts:
            payload["dayparts"] = list(dayparts)
        if profiles:
            payload["profiles"] = list(profiles)
        if epg_categories:
            payload["epg_categories"] = list(epg_categories)
        # Note: company_ids not directly supported in Channel Event Report
        # For company-specific daypart analysis, consider using Deep Analysis Advertising Report
        
        return self.manager.get_complete_report(
            ReportType.DEEP_ANALYSIS_CHANNEL_EVENT,
            payload,
            poll_interval=poll_interval,
            timeout=timeout,
            flatten=True,
        )


class EnhancedSpotlistReport:
    """Enhanced Spotlist Report with full filtering capabilities."""

    def __init__(self, client: AEOSClient):
        self.client = client
        self.manager = ReportManager(client)

    def get_spotlist(
        self,
        date_from: str,
        date_to: str,
        channel_ids: Optional[List[int]] = None,
        company_ids: Optional[Sequence[int]] = None,
        brand_ids: Optional[Sequence[int]] = None,
        product_ids: Optional[Sequence[int]] = None,
        industry_ids: Optional[Sequence[int]] = None,
        category_ids: Optional[Sequence[int]] = None,
        subcategory_ids: Optional[Sequence[int]] = None,
        dayparts: Optional[Sequence[str]] = None,  # Daypart values like "6 - 9" (not IDs)
        weekdays: Optional[Sequence[int]] = None,  # 0=Monday, 6=Sunday
        epg_categories: Optional[Sequence[int]] = None,
        use_medium_report: bool = True,  # True = Medium report (XRP/SPEND), False = Basic
        poll_interval: int = 5,
        timeout: int = 600,
    ) -> List[Dict[str, Any]]:
        """
        Get enhanced spotlist report with full filtering options.
        
        Args:
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            channel_ids: List of channel IDs (None = all channels)
            company_ids: Optional company filter
            brand_ids: Optional brand filter
            product_ids: Optional product filter
            industry_ids: Optional industry filter
            category_ids: Optional category filter
            subcategory_ids: Optional subcategory filter
            dayparts: Optional daypart filter
            weekdays: Optional weekday filter (0=Monday, 6=Sunday)
            epg_categories: Optional EPG category filter
            use_medium_report: If True, use Medium report (with XRP/SPEND), else Basic
            poll_interval: Polling interval in seconds
            timeout: Maximum wait time in seconds
            
        Returns:
            List of spotlist rows
        """
        report_type = (
            ReportType.SPOTLIST_MEDIUM
            if use_medium_report
            else ReportType.SPOTLIST_BASIC
        )
        
        payload = {
            "date_from": date_from,
            "date_to": date_to,
        }
        
        # Add filters only if provided
        if channel_ids:
            payload["channels"] = channel_ids
        if company_ids:
            payload["companies"] = list(company_ids)
        if brand_ids:
            payload["brands"] = list(brand_ids)
        if product_ids:
            payload["products"] = list(product_ids)
        if industry_ids:
            payload["industries"] = list(industry_ids)
        if category_ids:
            payload["categories"] = list(category_ids)
        if subcategory_ids:
            payload["subcategories"] = list(subcategory_ids)
        if dayparts:
            payload["dayparts"] = list(dayparts)
        if weekdays is not None:
            payload["weekdays"] = list(weekdays)
        if epg_categories:
            payload["epg_categories"] = list(epg_categories)
        
        return self.manager.get_complete_report(
            report_type,
            payload,
            poll_interval=poll_interval,
            timeout=timeout,
            flatten=True,
        )


