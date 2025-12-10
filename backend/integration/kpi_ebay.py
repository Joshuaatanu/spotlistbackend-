"""
Fetch channel KPIs (section 4.3.1 Channel/Event Analysis) for the first 10 channels.

Usage:
    python3 kpi_ebay.py

Prereqs:
    - Install deps: pip install requests python-dotenv
    - Provide AEOS_API_KEY in .env or environment
"""

import csv
from pathlib import Path
from typing import Iterable

from aeos_client import AEOSClient


DATE_FROM = "2025-11-27"
DATE_TO = "2025-12-04"
NUM_CHANNELS = 10  # Get KPIs for first 10 channels

# KPI fields from section 4.3.1 INITIATEDEEPANALYSISCHANNELEVENTREPORT
# Note: "airings" is not a valid variable for this endpoint
# Valid variables: amr-perc, reach (%), reach-avg, share, ats-avg, atv-avg
KPI_FIELDS = [
    "amr-perc",
    "reach (%)",
    "reach-avg",
    "share",
    "ats-avg",
    "atv-avg",
]


def extract_kpi_view(rows: Iterable[dict]) -> list[dict]:
    """
    Project raw KPI rows into a simple table with channel name and KPI columns.
    """
    kpi_rows = []
    for r in rows:
        # Try various field names for channel identifier
        label = (
            r.get("Channel")
            or r.get("channel")
            or r.get("Event")
            or r.get("event")
            or r.get("Name")
            or r.get("name")
            or "Unknown"
        )
        record = {"Channel": label}
        for key in KPI_FIELDS:
            # Try different case variations
            value = r.get(key) or r.get(key.lower()) or r.get(key.upper()) or ""
            record[key] = value
        kpi_rows.append(record)
    return kpi_rows


def main():
    client = AEOSClient()

    print(f"Fetching first {NUM_CHANNELS} analytics channels...")
    analytics_channels = client.get_analytics_channels()
    
    if len(analytics_channels) < NUM_CHANNELS:
        print(f"⚠ Only {len(analytics_channels)} channels available, using all of them.")
        selected_channels = analytics_channels
    else:
        selected_channels = analytics_channels[:NUM_CHANNELS]
    
    channel_ids: list[int] = []
    channel_names: dict[int, str] = {}
    
    for ch in selected_channels:
        channel_id = ch["value"]
        channel_caption = ch["caption"]
        channel_ids.append(channel_id)
        channel_names[channel_id] = channel_caption
        print(f"  ✓ {channel_caption} (ID: {channel_id})")

    print(f"\nFetching KPIs for {len(channel_ids)} channels ({DATE_FROM} to {DATE_TO})...")
    print("This may take a few minutes as the report is generated...")
    
    try:
        raw_kpis = client.get_channel_kpis(
            date_from=DATE_FROM,
            date_to=DATE_TO,
            channel_ids=channel_ids,
            kpis=KPI_FIELDS,
        )
    except Exception as e:
        print(f"✗ Error fetching KPIs: {e}")
        return

    if not raw_kpis:
        print("⚠ No KPI data returned from API.")
        return

    print(f"✓ Received {len(raw_kpis)} KPI rows")
    
    # Extract and format KPI data
    kpi_rows = extract_kpi_view(raw_kpis)

    # Fill in channel names if missing
    for r in kpi_rows:
        if not r.get("Channel") or r.get("Channel") == "Unknown":
            # Try to match by channel ID if available in the row
            for cid, name in channel_names.items():
                if str(cid) in str(r):
                    r["Channel"] = name
                    break

    # Save to CSV
    output_csv = Path(__file__).resolve().parent / f"kpis_first_{NUM_CHANNELS}_channels_{DATE_FROM}_to_{DATE_TO}.csv"
    fieldnames = ["Channel"] + KPI_FIELDS
    
    with output_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kpi_rows)

    print(f"\n✓ Saved {len(kpi_rows)} KPI rows to {output_csv}")
    print("\nSample data (first 3 rows):")
    print("-" * 80)
    for i, sample in enumerate(kpi_rows[:3], 1):
        print(f"\nRow {i}:")
        for key, value in sample.items():
            print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
