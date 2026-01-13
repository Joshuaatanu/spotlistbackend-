"""
Unified Report Manager for AEOS API.

This module provides a centralized interface for managing all report types,
handling the complete report lifecycle: initiation, polling, and data retrieval.
"""

import time
from typing import Optional, Dict, Any, List
from enum import Enum

from aeos_client import AEOSClient
from utils import flatten_spotlist_report


class ReportStatus(Enum):
    """Report status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class ReportType(Enum):
    """Available report types."""
    SPOTLIST_BASIC = "initiateAdvertisementSpotlistReport"
    SPOTLIST_MEDIUM = "initiateAdvertisementSpotlistMediumReport"
    # Top Ten Reports (documented in API v2.3 Sections 4.3.4-4.3.6)
    TOP_TEN_SPOTS = "initiateTopTenSpots"  # Top 10 ads by XRP
    TOP_TEN_EVENTS = "initiateTopTenEvents"  # Top 10 events by Share
    TOP_TEN_CHANNEL = "initiateTopTenChannel"  # Top 10 channels by Share
    # Deep Analysis Reports (documented in API v2.3 Sections 4.3.1-4.3.2)
    DEEP_ANALYSIS_CHANNEL_EVENT = "initiateDeepAnalysisChannelEventReport"
    DEEP_ANALYSIS_ADVERTISING = "initiateDeepAnalysisAdvertisingReport"


class ReportManager:
    """
    Unified manager for all AEOS report types.
    
    Handles report lifecycle: initiation, status polling, and data retrieval.
    Provides consistent interface across all report types.
    """

    def __init__(self, client: AEOSClient):
        """
        Initialize the report manager.
        
        Args:
            client: AEOSClient instance for API communication
        """
        self.client = client
        self.active_reports: Dict[int, Dict[str, Any]] = {}

    def initiate_report(
        self,
        report_type: ReportType,
        payload: Dict[str, Any],
        timeout: int = 30,
    ) -> int:
        """
        Initiate a report of the specified type.
        
        Args:
            report_type: Type of report to initiate
            payload: Report-specific payload parameters
            timeout: Request timeout in seconds
            
        Returns:
            Report ID for tracking
            
        Raises:
            RuntimeError: If report initiation fails
        """
        try:
            response = self.client.post_report(
                report_type.value,
                payload,
                timeout=timeout,
            )
            
            # Handle different response formats
            report_id = (
                response.get("report_id")
                or response.get("reportId")
                or response.get("id")
            )
            
            if not report_id:
                raise RuntimeError(
                    f"Report initiation failed: no report_id in response. "
                    f"Response: {response}"
                )
            
            # Track active report
            self.active_reports[report_id] = {
                "type": report_type,
                "status": ReportStatus.PENDING,
                "initiated_at": time.time(),
                "payload": payload,
            }
            
            return report_id
            
        except Exception as e:
            raise RuntimeError(
                f"Failed to initiate {report_type.value}: {str(e)}"
            ) from e

    def get_report_status(self, report_id: int) -> Dict[str, Any]:
        """
        Get current status of a report.
        
        Args:
            report_id: Report ID to check
            
        Returns:
            Status dictionary with report_state and other metadata
        """
        try:
            response = self.client.post_report(
                "getReportStatus",
                {"report_id": report_id},
            )
            
            # Update tracked status
            if report_id in self.active_reports:
                state = response.get("report_state", "").lower()
                if state in ("done", "finished", "completed"):
                    self.active_reports[report_id]["status"] = ReportStatus.COMPLETED
                elif state in ("failed", "error"):
                    self.active_reports[report_id]["status"] = ReportStatus.FAILED
                else:
                    self.active_reports[report_id]["status"] = ReportStatus.PROCESSING
            
            return response
            
        except Exception as e:
            if report_id in self.active_reports:
                self.active_reports[report_id]["status"] = ReportStatus.FAILED
            raise RuntimeError(
                f"Failed to get status for report {report_id}: {str(e)}"
            ) from e

    def wait_for_report(
        self,
        report_id: int,
        poll_interval: int = 5,
        timeout: int = 600,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Poll report status until completion or timeout.
        
        Args:
            report_id: Report ID to wait for
            poll_interval: Seconds between status checks
            timeout: Maximum wait time in seconds
            progress_callback: Optional callback(status_dict) for progress updates
            
        Returns:
            Final status dictionary
            
        Raises:
            TimeoutError: If report doesn't complete within timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status = self.get_report_status(report_id)
            state = status.get("report_state", "").lower()
            
            # Call progress callback if provided
            if progress_callback:
                try:
                    progress_callback(status)
                except Exception:
                    pass  # Don't fail on callback errors
            
            # Check if completed
            if state in ("done", "finished", "completed"):
                if report_id in self.active_reports:
                    self.active_reports[report_id]["status"] = ReportStatus.COMPLETED
                return status
            
            # Check if failed
            if state in ("failed", "error"):
                if report_id in self.active_reports:
                    self.active_reports[report_id]["status"] = ReportStatus.FAILED
                raise RuntimeError(
                    f"Report {report_id} failed with state: {state}"
                )
            
            time.sleep(poll_interval)
        
        # Timeout reached
        if report_id in self.active_reports:
            self.active_reports[report_id]["status"] = ReportStatus.TIMEOUT
        raise TimeoutError(
            f"Report {report_id} did not complete within {timeout} seconds"
        )

    def get_report_data(
        self,
        report_id: int,
        flatten: bool = True,
    ) -> Dict[str, Any] | List[Dict[str, Any]]:
        """
        Retrieve completed report data.
        
        Args:
            report_id: Report ID to retrieve
            flatten: If True, flatten the report structure using utils.flatten_spotlist_report
            
        Returns:
            Report data (flattened list of dicts if flatten=True, else raw dict)
        """
        try:
            data = self.client.get_report_data(report_id)
            
            if flatten:
                return flatten_spotlist_report(data)
            return data
            
        except Exception as e:
            raise RuntimeError(
                f"Failed to retrieve data for report {report_id}: {str(e)}"
            ) from e

    def get_complete_report(
        self,
        report_type: ReportType,
        payload: Dict[str, Any],
        poll_interval: int = 5,
        timeout: int = 600,
        flatten: bool = True,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any] | List[Dict[str, Any]]:
        """
        Complete workflow: initiate, wait, and retrieve report data.
        
        Args:
            report_type: Type of report to generate
            payload: Report-specific payload parameters
            poll_interval: Seconds between status checks
            timeout: Maximum wait time in seconds
            flatten: If True, flatten the report structure
            progress_callback: Optional callback(status_dict) for progress updates
            
        Returns:
            Report data (flattened list of dicts if flatten=True, else raw dict)
        """
        # Initiate
        report_id = self.initiate_report(report_type, payload)
        
        # Wait for completion
        self.wait_for_report(
            report_id,
            poll_interval=poll_interval,
            timeout=timeout,
            progress_callback=progress_callback,
        )
        
        # Retrieve data
        return self.get_report_data(report_id, flatten=flatten)

    def get_active_reports(self) -> Dict[int, Dict[str, Any]]:
        """Get dictionary of all tracked active reports."""
        return self.active_reports.copy()

    def clear_completed_reports(self):
        """Remove completed/failed reports from tracking."""
        to_remove = [
            report_id
            for report_id, info in self.active_reports.items()
            if info["status"] in (ReportStatus.COMPLETED, ReportStatus.FAILED, ReportStatus.TIMEOUT)
        ]
        for report_id in to_remove:
            del self.active_reports[report_id]





