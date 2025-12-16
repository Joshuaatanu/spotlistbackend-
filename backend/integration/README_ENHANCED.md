# Enhanced AEOS API Integration

This document describes the enhanced AEOS Data API v2.3.5 integration with comprehensive report types, filtering options, and a unified report management system.

## Overview

The enhanced integration provides:

1. **Enhanced Metadata Helpers** - Access to dayparts, EPG categories, profiles, categories, and subcategories
2. **Unified Report Manager** - Centralized interface for all report types
3. **New Report Types** - Top Ten, Reach & Frequency, Daypart Analysis
4. **Enhanced Deep Analysis** - Full filtering capabilities with profiles, dayparts, and EPG categories

## Components

### 1. Enhanced Metadata (`aeos_metadata.py`)

The `AEOSMetadata` class now includes additional helper methods:

```python
from aeos_client import AEOSClient
from aeos_metadata import AEOSMetadata

client = AEOSClient()
metadata = AEOSMetadata(client)

# Get dayparts (time-of-day segments)
dayparts = metadata.get_dayparts()

# Get EPG categories (program types)
epg_categories = metadata.get_epg_categories()

# Get audience profiles (target demographics)
profiles = metadata.get_profiles()

# Get categories and subcategories
categories = metadata.get_categories()
subcategories = metadata.get_subcategories(category_ids=[1, 2, 3])

# Find specific items
daypart = metadata.find_daypart("Prime Time")
epg_cat = metadata.find_epg_category("News")
profile = metadata.find_profile("Adults 18-49")
```

### 2. Unified Report Manager (`report_manager.py`)

The `ReportManager` class provides a consistent interface for all report operations:

```python
from aeos_client import AEOSClient
from report_manager import ReportManager, ReportType

client = AEOSClient()
manager = ReportManager(client)

# Initiate a report
payload = {
    "channels": [1, 2, 3],
    "date_from": "2025-01-01",
    "date_to": "2025-01-31",
}
report_id = manager.initiate_report(ReportType.SPOTLIST_MEDIUM, payload)

# Wait for completion with progress callback
def progress_callback(status):
    print(f"Status: {status.get('report_state')}")

final_status = manager.wait_for_report(
    report_id,
    poll_interval=5,
    timeout=600,
    progress_callback=progress_callback,
)

# Retrieve data
data = manager.get_report_data(report_id, flatten=True)

# Or do it all in one call
data = manager.get_complete_report(
    ReportType.SPOTLIST_MEDIUM,
    payload,
    flatten=True,
)
```

### 3. New Report Types (`report_types.py`)

#### Top Ten Report

Get top 10 advertisers/brands/products by various metrics:

```python
from report_types import TopTenReport

top_ten = TopTenReport(client)

results = top_ten.get_top_ten(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
    metric="spend",  # "spend", "xrp", "airings", "reach"
    entity_type="companies",  # "companies", "brands", "products"
)
```

#### Reach & Frequency Report

Analyze reach and frequency metrics:

```python
from report_types import ReachFrequencyReport

rf_report = ReachFrequencyReport(client)

results = rf_report.get_reach_frequency(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
    company_ids=[10, 20],
    min_frequency=1,
    max_frequency=10,
    profiles=[1, 2],  # Audience profiles
    dayparts=[1, 2],  # Time segments
)
```

#### Daypart Analysis Report

Analyze performance by time of day:

```python
from report_types import DaypartAnalysisReport

daypart_report = DaypartAnalysisReport(client)

results = daypart_report.get_daypart_analysis(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
    metrics=["spend", "xrp", "airings", "reach"],
    dayparts=[1, 2, 3],  # Specific dayparts, or None for all
)
```

#### Enhanced Spotlist Report

Full-featured spotlist with all filtering options:

```python
from report_types import EnhancedSpotlistReport

spotlist = EnhancedSpotlistReport(client)

results = spotlist.get_spotlist(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
    company_ids=[10, 20],
    brand_ids=[100, 200],
    dayparts=[1, 2],
    weekdays=[0, 1, 2, 3, 4],  # Monday-Friday
    epg_categories=[1, 2],
    use_medium_report=True,  # Include XRP/SPEND
)
```

### 4. Enhanced Deep Analysis (`aeos_client.py`)

The `get_channel_kpis` method now supports full filtering:

```python
from aeos_client import AEOSClient

client = AEOSClient()

results = client.get_channel_kpis(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
    kpis=["amr-perc", "reach (%)", "share", "airings"],
    profiles=[1, 2],  # Audience profiles
    dayparts=[1, 2],  # Time segments
    epg_categories=[1, 2],  # Program categories
    splitby="-1",  # Time split: "-1"=none, "day"=daily, "week"=weekly
    threshold="5sec",  # Minimum viewing duration
    showdataby="period",  # Aggregation level
)
```

## Available Report Types

The `ReportType` enum includes:

- `SPOTLIST_BASIC` - Basic spotlist report
- `SPOTLIST_MEDIUM` - Medium spotlist with XRP/SPEND
- `TOP_TEN` - Top Ten rankings
- `REACH_FREQUENCY` - Reach & Frequency analysis
- `DAYPART_ANALYSIS` - Daypart performance analysis
- `DEEP_ANALYSIS_CHANNEL_EVENT` - Deep channel/event analysis

## Filtering Options

### Dayparts
Time-of-day segments (e.g., "Prime Time", "Daytime", "Late Night")

### EPG Categories
Program types (e.g., "News", "Sports", "Entertainment")

### Profiles
Target audience demographics (e.g., "Adults 18-49", "Women 25-54")

### Weekdays
0 = Monday, 1 = Tuesday, ..., 6 = Sunday

### Categories & Subcategories
Advertisement classification hierarchy

## KPI Variables

Available KPI variables for deep analysis:

- `amr-perc` - Average percentage of households watching
- `reach (%)` - Percentage of households that saw at least threshold duration
- `reach-avg` - Average daily reach over selected period
- `share` - Share of viewing vs total TV
- `ats-avg` - Average time spent (based on reach)
- `atv-avg` - Average time viewed (all households)
- `airings` - Total number of aired ads

## Time Split Options

The `splitby` parameter controls time granularity:

- `"-1"` - No time split (aggregate across entire period)
- `"day"` - Daily breakdown
- `"week"` - Weekly breakdown
- `"month"` - Monthly breakdown

## Error Handling

All methods include comprehensive error handling:

- Automatic token refresh on 401 errors
- Retry logic for transient failures
- Timeout handling for long-running reports
- Graceful fallbacks for optional endpoints

## Examples

See `example_usage.py` for complete working examples of all features.

## Migration Guide

### Old Code:
```python
# Old way - limited filtering
kpis = client.get_channel_kpis(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
)
```

### New Code:
```python
# New way - full filtering
kpis = client.get_channel_kpis(
    date_from="2025-01-01",
    date_to="2025-01-31",
    channel_ids=[1, 2, 3],
    profiles=[1, 2],
    dayparts=[1, 2],
    epg_categories=[1, 2],
    splitby="day",  # Daily breakdown
)
```

## Notes

- Some report types (Top Ten, Reach & Frequency, Daypart Analysis) may not be available in all API versions
- Metadata endpoints (dayparts, profiles, etc.) may return empty lists if not supported
- All methods include try/except blocks with graceful fallbacks
- The unified report manager tracks active reports for monitoring

## Support

For issues or questions, refer to:
- AEOS Data API v2.3.5 documentation
- Example usage file: `example_usage.py`
- Report manager: `report_manager.py`
- Report types: `report_types.py`


