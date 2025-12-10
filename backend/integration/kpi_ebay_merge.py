"""
Fetch KPIs for all channels where eBay has ads.

Usage:
    python3 kpi_ebay_merge.py
"""

import csv
from pathlib import Path
from collections import defaultdict

from aeos_client import AEOSClient
from spotlist_checker import SpotlistChecker
from utils import flatten_spotlist_report


DATE_FROM = "2025-11-27"
DATE_TO = "2025-12-04"

# KPI fields from section 4.3.1
KPI_FIELDS = [
    "amr-perc",
    "reach (%)",
    "reach-avg",
    "share",
    "ats-avg",
    "atv-avg",
]


def extract_channels_from_spotlist(spotlist_csv_path: str) -> tuple[list[str], dict[str, int]]:
    """
    Extract unique channels from spotlist CSV.
    Returns tuple of (list of channel names, dict mapping name to ID if available).
    """
    channels = set()
    channel_ids = {}
    
    with open(spotlist_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            channel_name = row.get("Channel", "").strip()
            if channel_name and channel_name not in channels:
                channels.add(channel_name)
                # Try to get channel ID if available
                channel_id = row.get("Channel ID") or row.get("channel_id")
                if channel_id:
                    try:
                        channel_ids[channel_name] = int(channel_id)
                    except ValueError:
                        pass
    
    print(f"✓ Found {len(channels)} unique channels in spotlist")
    return sorted(list(channels)), channel_ids


def get_channel_ids_by_name(client: AEOSClient, channel_names: list[str]) -> dict[str, int]:
    """
    Map channel names to channel IDs using the API.
    """
    all_channels = client.get_analytics_channels()
    name_to_id = {}
    name_lower_to_id = {}
    
    # Build lookup maps
    for ch in all_channels:
        channel_id = ch["value"]
        channel_caption = ch["caption"]
        name_to_id[channel_caption] = channel_id
        name_lower_to_id[channel_caption.lower()] = channel_id
    
    # Match spotlist channel names to IDs
    matched = {}
    unmatched = []
    
    for name in channel_names:
        # Try exact match first
        if name in name_to_id:
            matched[name] = name_to_id[name]
        # Try case-insensitive match
        elif name.lower() in name_lower_to_id:
            matched[name] = name_lower_to_id[name.lower()]
        else:
            unmatched.append(name)
    
    if unmatched:
        print(f"⚠ Could not find IDs for {len(unmatched)} channels: {unmatched[:5]}")
        if len(unmatched) > 5:
            print(f"   ... and {len(unmatched) - 5} more")
    
    return matched


def extract_kpi_view(rows: list[dict]) -> list[dict]:
    """Extract KPI data into a simple table format."""
    kpi_rows = []
    for r in rows:
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
            value = r.get(key) or r.get(key.lower()) or r.get(key.upper()) or ""
            record[key] = value
        kpi_rows.append(record)
    return kpi_rows


def merge_kpis_to_spotlist(
    kpi_data: dict[str, dict],
    spotlist_csv_path: str,
    output_csv_path: str | None = None
):
    """
    Merge KPI data into spotlist CSV.
    
    Args:
        kpi_data: Dict mapping channel name to KPI values
        spotlist_csv_path: Path to spotlist CSV
        output_csv_path: Optional output path (default: overwrite input)
    """
    enriched_rows = []
    
    with open(spotlist_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        original_fieldnames = list(reader.fieldnames or [])
        
        # Add KPI columns if not present
        new_fieldnames = list(original_fieldnames)
        for col in KPI_FIELDS:
            if col not in new_fieldnames:
                new_fieldnames.append(col)
        
        for row in reader:
            channel_name = row.get("Channel", "").strip()
            
            # Find matching KPI data (case-insensitive)
            kpi_values = None
            if channel_name in kpi_data:
                kpi_values = kpi_data[channel_name]
            else:
                # Try case-insensitive match
                channel_lower = channel_name.lower()
                for kpi_channel, kpi_vals in kpi_data.items():
                    if kpi_channel.lower() == channel_lower:
                        kpi_values = kpi_vals
                        break
            
            # Add KPI columns
            if kpi_values:
                for col in KPI_FIELDS:
                    row[col] = kpi_values.get(col, "")
            else:
                for col in KPI_FIELDS:
                    row[col] = ""
            
            enriched_rows.append(row)
    
    # Write enriched CSV
    output_path = output_csv_path or spotlist_csv_path
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=new_fieldnames)
        writer.writeheader()
        writer.writerows(enriched_rows)
    
    matched_count = sum(1 for row in enriched_rows if any(row.get(col) for col in KPI_FIELDS))
    print(f"✓ Enriched {len(enriched_rows)} spotlist rows")
    print(f"  → {matched_count} rows matched with KPI data")
    print(f"✓ Saved to {output_path}")


def main():
    base_dir = Path(__file__).resolve().parent
    COMPANY_NAME = "eBay"
    
    client = AEOSClient()
    checker = SpotlistChecker(client)
    
    # 1. Fetch spotlist data from API for eBay
    print(f"Step 1: Fetching spotlist data for '{COMPANY_NAME}' from API...")
    print(f"  Date range: {DATE_FROM} to {DATE_TO}")
    
    all_channels = client.get_analytics_channels()
    print(f"  Checking {len(all_channels)} analytics channels...")
    
    target = COMPANY_NAME.lower()
    all_rows = []
    channels_with_ebay = set()
    channel_id_to_name = {}
    
    for ch in all_channels:
        channel_id = ch["value"]
        channel_caption = ch["caption"]
        channel_id_to_name[channel_id] = channel_caption
        
        try:
            report = checker.get_spotlist(
                channel_id=channel_id,
                date_from=DATE_FROM,
                date_to=DATE_TO,
            )
        except Exception as e:
            print(f"  ⚠ {channel_caption}: {e}")
            continue
        
        rows = flatten_spotlist_report(report)
        if not rows:
            continue
        
        # Filter for eBay ads
        for r in rows:
            company = str(r.get("Company") or r.get("Kunde") or "").lower()
            if target in company:
                all_rows.append(r)
                channels_with_ebay.add(channel_id)
    
    if not all_rows:
        print(f"✗ No {COMPANY_NAME} ads found in any channel.")
        return
    
    print(f"✓ Found {len(all_rows)} {COMPANY_NAME} ads across {len(channels_with_ebay)} channels")
    
    # Extract unique channel names from spotlist data
    channel_names = []
    name_to_id = {}
    for channel_id in channels_with_ebay:
        channel_name = channel_id_to_name[channel_id]
        channel_names.append(channel_name)
        name_to_id[channel_name] = channel_id
    
    print(f"  Channels with {COMPANY_NAME} ads: {', '.join(sorted(channel_names)[:10])}")
    if len(channel_names) > 10:
        print(f"  ... and {len(channel_names) - 10} more")
    
    # 2. Fetch KPIs for all channels where eBay has ads
    print(f"\nStep 2: Fetching KPIs for {len(channels_with_ebay)} channels ({DATE_FROM} to {DATE_TO})...")
    print("This may take several minutes as the report is generated...")
    
    channel_id_list = list(channels_with_ebay)
    
    try:
        raw_kpis = client.get_channel_kpis(
            date_from=DATE_FROM,
            date_to=DATE_TO,
            channel_ids=channel_id_list,
            kpis=KPI_FIELDS,
        )
    except Exception as e:
        print(f"✗ Error fetching KPIs: {e}")
        import traceback
        traceback.print_exc()
        return
    
    if not raw_kpis:
        print("⚠ No KPI data returned from API.")
        return
    
    print(f"✓ Received {len(raw_kpis)} KPI rows")
    
    # Debug: print raw KPI response structure
    print(f"\nDebug: First KPI row structure:")
    if raw_kpis:
        print(f"  Keys: {list(raw_kpis[0].keys())}")
        print(f"  Sample row: {raw_kpis[0]}")
    
    # 3. Process KPI data
    # Create reverse mapping: ID -> spotlist channel name
    id_to_name = {v: k for k, v in name_to_id.items()}
    
    # Build lookup: try to match KPI rows to spotlist channel names
    kpi_lookup = {}
    
    # Get all API channel info for matching
    all_api_channels = client.get_analytics_channels()
    api_name_to_id = {ch["caption"]: ch["value"] for ch in all_api_channels}
    api_id_to_name = {ch["value"]: ch["caption"] for ch in all_api_channels}
    
    for row in raw_kpis:
        # Try to extract channel identifier from KPI row
        kpi_channel_name = (
            row.get("Channel") or 
            row.get("channel") or 
            row.get("Event") or 
            row.get("event") or 
            row.get("Name") or 
            row.get("name") or 
            ""
        ).strip()
        
        # Try to find matching spotlist channel name
        matched_spotlist_name = None
        
        # Strategy 1: Direct name match
        if kpi_channel_name in channel_names:
            matched_spotlist_name = kpi_channel_name
        else:
            # Strategy 2: Case-insensitive match
            kpi_lower = kpi_channel_name.lower()
            for spotlist_name in channel_names:
                if spotlist_name.lower() == kpi_lower:
                    matched_spotlist_name = spotlist_name
                    break
        
        # Strategy 3: Match via API channel lookup
        if not matched_spotlist_name and kpi_channel_name in api_name_to_id:
            channel_id = api_name_to_id[kpi_channel_name]
            if channel_id in id_to_name:
                matched_spotlist_name = id_to_name[channel_id]
        
        # Strategy 4: Try to find channel ID in row data
        if not matched_spotlist_name:
            for key, value in row.items():
                if isinstance(value, (int, str)) and str(value).isdigit():
                    try:
                        test_id = int(value)
                        if test_id in id_to_name:
                            matched_spotlist_name = id_to_name[test_id]
                            break
                    except (ValueError, TypeError):
                        pass
        
        # Store KPI values
        kpi_values = {k: str(row.get(k, "") or row.get(k.lower(), "") or "") for k in KPI_FIELDS}
        
        if matched_spotlist_name:
            kpi_lookup[matched_spotlist_name] = kpi_values
            print(f"  ✓ Matched KPI '{kpi_channel_name}' -> spotlist '{matched_spotlist_name}'")
        else:
            # Store with original name as fallback
            if kpi_channel_name:
                kpi_lookup[kpi_channel_name] = kpi_values
                print(f"  ⚠ Could not match KPI channel '{kpi_channel_name}' to spotlist channel")
    
    print(f"\n✓ Processed KPIs for {len(kpi_lookup)} channels")
    matched_channels = [k for k in kpi_lookup.keys() if k in channel_names]
    unmatched_channels = [k for k in kpi_lookup.keys() if k not in channel_names]
    print(f"  Matched channels: {matched_channels}")
    if unmatched_channels:
        print(f"  Unmatched channels: {unmatched_channels}")
    
    # Show sample
    if kpi_lookup:
        sample_channel = list(kpi_lookup.keys())[0]
        print(f"\nSample KPI data for '{sample_channel}':")
        for k, v in kpi_lookup[sample_channel].items():
            print(f"  {k}: {v}")
    
    # 4. Save KPIs to CSV
    print("\nStep 4: Saving KPIs to CSV...")
    
    # Convert kpi_lookup to list of rows for CSV
    kpi_rows = []
    for channel_name in sorted(channel_names):
        if channel_name in kpi_lookup:
            row = {"Channel": channel_name}
            row.update(kpi_lookup[channel_name])
            kpi_rows.append(row)
        else:
            # Channel without KPI data
            row = {"Channel": channel_name}
            for col in KPI_FIELDS:
                row[col] = ""
            kpi_rows.append(row)
    
    output_csv = base_dir / f"kpis_ebay_channels_{DATE_FROM}_to_{DATE_TO}.csv"
    fieldnames = ["Channel"] + KPI_FIELDS
    
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kpi_rows)
    
    print(f"✓ Saved KPIs for {len(kpi_rows)} channels to {output_csv}")
    print(f"\n✓ Complete! KPI data saved to CSV.")


if __name__ == "__main__":
    main()

