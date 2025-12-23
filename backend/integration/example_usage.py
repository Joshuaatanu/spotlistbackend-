"""
Example usage of enhanced AEOS API integration.

This file demonstrates how to use:
1. Enhanced metadata helpers
2. Unified report manager
3. New report types (Top Ten, Reach & Frequency, Daypart Analysis)
4. Enhanced deep analysis with full filtering
"""

from datetime import date, timedelta
from aeos_client import AEOSClient
from aeos_metadata import AEOSMetadata
from report_manager import ReportManager, ReportType
from report_types import (
    TopTenReport,
    ReachFrequencyReport,
    DaypartAnalysisReport,
    EnhancedSpotlistReport,
)


def example_enhanced_metadata():
    """Example: Using enhanced metadata helpers."""
    print("=" * 60)
    print("Example: Enhanced Metadata Helpers")
    print("=" * 60)
    
    client = AEOSClient()
    metadata = AEOSMetadata(client)
    
    # Get dayparts
    print("\n1. Fetching dayparts...")
    dayparts = metadata.get_dayparts()
    print(f"   Found {len(dayparts) if isinstance(dayparts, list) else 'N/A'} dayparts")
    
    # Get EPG categories
    print("\n2. Fetching EPG categories...")
    epg_categories = metadata.get_epg_categories()
    print(f"   Found {len(epg_categories) if isinstance(epg_categories, list) else 'N/A'} EPG categories")
    
    # Get profiles
    print("\n3. Fetching audience profiles...")
    profiles = metadata.get_profiles()
    print(f"   Found {len(profiles) if isinstance(profiles, list) else 'N/A'} profiles")
    
    # Get categories
    print("\n4. Fetching categories...")
    categories = metadata.get_categories()
    print(f"   Found {len(categories) if isinstance(categories, list) else 'N/A'} categories")
    
    # Get subcategories
    print("\n5. Fetching subcategories...")
    subcategories = metadata.get_subcategories()
    print(f"   Found {len(subcategories) if isinstance(subcategories, list) else 'N/A'} subcategories")


def example_report_manager():
    """Example: Using unified report manager."""
    print("\n" + "=" * 60)
    print("Example: Unified Report Manager")
    print("=" * 60)
    
    client = AEOSClient()
    manager = ReportManager(client)
    
    # Get analytics channels
    channels = client.get_analytics_channels()
    channel_ids = [ch["value"] for ch in channels[:3]]  # First 3 channels
    
    date_to = date.today()
    date_from = date_to - timedelta(days=7)
    
    print(f"\nGenerating spotlist report for {len(channel_ids)} channels...")
    print(f"Date range: {date_from} to {date_to}")
    
    payload = {
        "channels": channel_ids,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }
    
    # Initiate report
    report_id = manager.initiate_report(
        ReportType.SPOTLIST_MEDIUM,
        payload,
    )
    print(f"✓ Report initiated: {report_id}")
    
    # Wait for completion with progress callback
    def progress_callback(status):
        state = status.get("report_state", "unknown")
        print(f"  Status: {state}")
    
    final_status = manager.wait_for_report(
        report_id,
        poll_interval=5,
        timeout=600,
        progress_callback=progress_callback,
    )
    print(f"✓ Report completed: {final_status.get('report_state')}")
    
    # Retrieve data
    data = manager.get_report_data(report_id, flatten=True)
    print(f"✓ Retrieved {len(data)} rows")


def example_top_ten_report():
    """Example: Top Ten Report."""
    print("\n" + "=" * 60)
    print("Example: Top Ten Report")
    print("=" * 60)
    
    client = AEOSClient()
    top_ten = TopTenReport(client)
    
    date_to = date.today()
    date_from = date_to - timedelta(days=30)
    
    print(f"\nGetting top 10 companies by spend...")
    print(f"Date range: {date_from} to {date_to}")
    
    try:
        results = top_ten.get_top_ten(
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            metric="spend",
            entity_type="companies",
        )
        print(f"✓ Retrieved top 10 companies")
        for i, row in enumerate(results[:5], 1):  # Show first 5
            print(f"  {i}. {row}")
    except Exception as e:
        print(f"⚠ Error (may not be available in API): {e}")


def example_reach_frequency():
    """Example: Reach & Frequency Report."""
    print("\n" + "=" * 60)
    print("Example: Reach & Frequency Report")
    print("=" * 60)
    
    client = AEOSClient()
    rf_report = ReachFrequencyReport(client)
    
    channels = client.get_analytics_channels()
    channel_ids = [ch["value"] for ch in channels[:2]]  # First 2 channels
    
    date_to = date.today()
    date_from = date_to - timedelta(days=7)
    
    print(f"\nGetting reach & frequency analysis...")
    print(f"Channels: {len(channel_ids)}")
    print(f"Date range: {date_from} to {date_to}")
    
    try:
        results = rf_report.get_reach_frequency(
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            channel_ids=channel_ids,
            min_frequency=1,
            max_frequency=10,
        )
        print(f"✓ Retrieved reach & frequency data")
        print(f"  Results type: {type(results)}")
    except Exception as e:
        print(f"⚠ Error (may not be available in API): {e}")


def example_daypart_analysis():
    """Example: Daypart Analysis Report."""
    print("\n" + "=" * 60)
    print("Example: Daypart Analysis Report")
    print("=" * 60)
    
    client = AEOSClient()
    daypart_report = DaypartAnalysisReport(client)
    
    channels = client.get_analytics_channels()
    channel_ids = [ch["value"] for ch in channels[:2]]  # First 2 channels
    
    date_to = date.today()
    date_from = date_to - timedelta(days=7)
    
    print(f"\nGetting daypart analysis...")
    print(f"Channels: {len(channel_ids)}")
    print(f"Date range: {date_from} to {date_to}")
    
    try:
        results = daypart_report.get_daypart_analysis(
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            channel_ids=channel_ids,
            metrics=["spend", "xrp", "airings"],
        )
        print(f"✓ Retrieved {len(results)} daypart analysis rows")
        for row in results[:3]:  # Show first 3
            print(f"  {row}")
    except Exception as e:
        print(f"⚠ Error (may not be available in API): {e}")


def example_enhanced_spotlist():
    """Example: Enhanced Spotlist with full filtering."""
    print("\n" + "=" * 60)
    print("Example: Enhanced Spotlist Report")
    print("=" * 60)
    
    client = AEOSClient()
    spotlist = EnhancedSpotlistReport(client)
    
    channels = client.get_analytics_channels()
    channel_ids = [ch["value"] for ch in channels[:2]]  # First 2 channels
    
    date_to = date.today()
    date_from = date_to - timedelta(days=7)
    
    print(f"\nGetting enhanced spotlist with filters...")
    print(f"Channels: {len(channel_ids)}")
    print(f"Date range: {date_from} to {date_to}")
    
    try:
        results = spotlist.get_spotlist(
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            channel_ids=channel_ids,
            use_medium_report=True,  # Get XRP/SPEND data
            # weekdays=[0, 1, 2, 3, 4],  # Monday-Friday only
            # dayparts=[...],  # Specific dayparts
        )
        print(f"✓ Retrieved {len(results)} spotlist rows")
        if results:
            print(f"  Sample columns: {list(results[0].keys())[:5]}")
    except Exception as e:
        print(f"⚠ Error: {e}")


def example_enhanced_deep_analysis():
    """Example: Enhanced Deep Analysis with full filtering."""
    print("\n" + "=" * 60)
    print("Example: Enhanced Deep Analysis")
    print("=" * 60)
    
    client = AEOSClient()
    
    channels = client.get_analytics_channels()
    channel_ids = [ch["value"] for ch in channels[:3]]  # First 3 channels
    
    date_to = date.today()
    date_from = date_to - timedelta(days=7)
    
    print(f"\nGetting enhanced deep analysis with filters...")
    print(f"Channels: {len(channel_ids)}")
    print(f"Date range: {date_from} to {date_to}")
    
    # Get metadata for filtering
    metadata = AEOSMetadata(client)
    
    # Try to get dayparts and profiles (may not be available)
    dayparts = metadata.get_dayparts()
    daypart_ids = None
    if isinstance(dayparts, list) and dayparts:
        daypart_ids = [dp.get("value") for dp in dayparts[:2] if dp.get("value")]
    
    profiles = metadata.get_profiles()
    profile_ids = None
    if isinstance(profiles, list) and profiles:
        profile_ids = [p.get("value") for p in profiles[:1] if p.get("value")]
    
    try:
        results = client.get_channel_kpis(
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            channel_ids=channel_ids,
            kpis=["amr-perc", "reach (%)", "share", "airings"],
            dayparts=daypart_ids,
            profiles=profile_ids,
            splitby="-1",  # No time split
            showdataby="period",  # Aggregate across period
        )
        print(f"✓ Retrieved {len(results)} KPI rows")
        for row in results[:3]:  # Show first 3
            print(f"  {row}")
    except Exception as e:
        print(f"⚠ Error: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("AEOS API Enhanced Integration Examples")
    print("=" * 60)
    
    try:
        # Run examples
        example_enhanced_metadata()
        example_report_manager()
        example_enhanced_deep_analysis()
        example_enhanced_spotlist()
        
        # These may not be available in all API versions
        # example_top_ten_report()
        # example_reach_frequency()
        # example_daypart_analysis()
        
        print("\n" + "=" * 60)
        print("✓ Examples completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error running examples: {e}")
        import traceback
        traceback.print_exc()




