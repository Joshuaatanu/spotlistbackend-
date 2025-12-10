import csv
from datetime import date, timedelta
from pathlib import Path

from aeos_client import AEOSClient
from aeos_metadata import AEOSMetadata
from spotlist_checker import SpotlistChecker
from utils import flatten_spotlist_report


def fetch_channel_spotlist(channel_name: str, days_back: int = 7):
    """Fetch spotlist for a single channel and save to CSV."""
    client = AEOSClient()
    checker = SpotlistChecker(client)

    channel_id = client.get_channel_id(channel_name)
    if not channel_id:
        print(f"Channel not found: {channel_name}")
        return

    date_to = date.today()
    date_from = date_to - timedelta(days=days_back)

    print(f"✔ Channel found: {channel_name} (ID {channel_id})")
    print(f"→ Fetching spotlist from {date_from} to {date_to}")

    try:
        report = checker.get_spotlist(
            channel_id=channel_id,
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
        )
    except Exception as exc:
        print(f"✗ Failed to fetch spotlist: {exc}")
        return

    rows = flatten_spotlist_report(report)
    if rows:
        print("Available columns in report:")
        print(list(rows[0].keys()))
    if not rows:
        print("⚠ No rows returned for this range.")
        return

    output_csv = Path(__file__).resolve().parent / f"spotlist_{channel_name.lower()}.csv"
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = list(rows[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        writer.writerows(rows)

    print(f"✓ Saved {len(rows)} rows to {output_csv}")
    print("Sample rows:")
    for sample in rows[:3]:
        print(sample)


def fetch_ads_by_advertiser(advertiser_substring: str, days_back: int = 7):
    """Fetch ads across all channels where advertiser contains the substring."""
    client = AEOSClient()
    checker = SpotlistChecker(client)

    date_to = date.today()
    date_from = date_to - timedelta(days=days_back)

    print(f"→ Fetching ads containing '{advertiser_substring}' from {date_from} to {date_to}")

    rows = checker.get_spots_for_advertiser_substring(
        advertiser_substring=advertiser_substring,
        date_from=date_from.isoformat(),
        date_to=date_to.isoformat(),
        channels=None,
    )

    if not rows:
        print(" No matching ads found.")
        return

    safe_name = advertiser_substring.lower().replace(" ", "_")
    output_csv = Path(__file__).resolve().parent / f"spotlist_{safe_name}.csv"
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Saved {len(rows)} rows to {output_csv}")
    print("Sample rows:")
    for sample in rows[:3]:
        print(sample)

def fetch_ads_by_company(company_name: str, days_back: int = 7, channels=None):
    """
    Fetch all ads aired by a specific company,
    using only channels that have ad harvesting (analytics channels).
    restricted to a chosen set of channels (if provided).
    
    Example:
        fetch_ads_by_company("Amazon", channels=["RTL", "VOX"])
    """
    client = AEOSClient()
    checker = SpotlistChecker(client)

    # 1. Date range
    date_to = date.today()
    date_from = date_to - timedelta(days=days_back)
    print(f"→ Fetching ads for company '{company_name}' from {date_from} to {date_to}")

    # 2. Load analytics channels
    all_channels = client.get_analytics_channels()

    # 3. Filter channels if user provided a channel list
    if channels:
        wanted = {name.lower() for name in channels}
        filtered = [
            ch for ch in all_channels 
            if ch["caption"].lower() in wanted
        ]
        print(f"✔ Restricting to {len(filtered)} channels: {channels}")
    else:
        filtered = all_channels
        print(f"✔ Searching across ALL {len(filtered)} analytics channels")

    target = company_name.lower()
    all_rows = []

    # 4. Fetch spotlists for each channel
    for ch in filtered:
        channel_id = ch["value"]
        channel_caption = ch["caption"]
        print(f"→ Checking channel {channel_caption} (ID {channel_id})")

        try:
            report = checker.get_spotlist(
                channel_id=channel_id,
                date_from=date_from.isoformat(),
                date_to=date_to.isoformat(),
            )
        except Exception as e:
            print(f"  ✗ Failed to fetch spotlist for {channel_caption}: {e}")
            continue

        rows = flatten_spotlist_report(report)
        if not rows:
            print(f"  ⚠ No rows for {channel_caption} in this period.")
            continue

        for r in rows:
            company = str(r.get("Company") or r.get("Kunde") or "").lower()
            if target in company:
                all_rows.append(r)

    if not all_rows:
        print(f"⚠ No ads found for company '{company_name}' in selected channels.")
        return

    # 5. Save CSV
    safe_name = company_name.lower().replace(" ", "_")
    if channels:
        suffix = "_".join([c.lower() for c in channels])
        outname = f"spotlist_company_{safe_name}_{suffix}.csv"
    else:
        outname = f"spotlist_company_{safe_name}.csv"

    output_csv = Path(__file__).resolve().parent / outname

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(all_rows[0].keys()))
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"✓ Saved {len(all_rows)} rows to {output_csv}")
    print("Sample rows:")
    for r in all_rows[:3]:
        print(r)

KPI_FIELDS = [
    "amr-perc",      # Average percentage of households watching
    "reach (%)",     # Percentage of households that saw at least 5 seconds
    "reach-avg",     # Average daily reach over selected period
    "share",         # Share of viewing vs total TV
    "ats-avg",       # Average time spent (based on reach)
    "atv-avg",       # Average time viewed (all households)
    "airings",       # Total number of aired ads
]


def extract_kpi_view(rows):
    """Project a report result into a compact KPI table.

    Expects `rows` to be a list of dicts, such as the output from
    `flatten_spotlist_report` or a Channel/Event Analysis report.

    Returns a list of dicts with one record per row containing:
      - Channel/Event label (if present)
      - amr-perc, reach (%), reach-avg, share, ats-avg, atv-avg, airings
    Any KPI that is not present in the source row will be set to None.
    """
    kpi_rows = []
    for r in rows:
        # Try to infer a label: Channel name or Event name
        label = (
            r.get("Channel")
            or r.get("channel")
            or r.get("Event")
            or r.get("event")
            or r.get("Name")
            or r.get("name")
        )

        record = {"label": label}
        for key in KPI_FIELDS:
            record[key] = r.get(key)
        kpi_rows.append(record)

    return kpi_rows

def fetch_channel_kpis(date_from: str, date_to: str, channels=None):
    """
    Fetch channel-level KPIs (amr-perc, reach (%), reach-avg, share, ats-avg,
    atv-avg, airings) for the given period, optionally restricted to a subset
    of channel names.
    """
    client = AEOSClient()

    # 1. Get analytics channels (with harvesting) and optionally filter by name
    analytics_channels = client.get_analytics_channels()
    if channels:
        wanted = {name.lower() for name in channels}
        channel_objects = [
            ch for ch in analytics_channels
            if isinstance(ch, dict)
            and ch.get("caption", "").lower() in wanted
        ]
        print(f"✔ Restricting KPI analysis to channels: {channels}")
    else:
        channel_objects = analytics_channels
        print(f"✔ KPI analysis across ALL {len(channel_objects)} analytics channels")

    if not channel_objects:
        print("⚠ No matching analytics channels for KPI analysis.")
        return []

    channel_ids = [ch["value"] for ch in channel_objects]

    # 2. Call Channel/Event Analysis KPI helper on the client
    rows = client.get_channel_kpis(
        date_from=date_from,
        date_to=date_to,
        channel_ids=channel_ids,
    )

    if not rows:
        print("⚠ Channel/Event Analysis returned no rows.")
        return []

    kpi_rows = extract_kpi_view(rows)

    # 4. Save to a CSV
    output_csv = Path(__file__).resolve().parent / f"kpis_{date_from}_to_{date_to}.csv"
    fieldnames = ["label"] + KPI_FIELDS
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kpi_rows)

    print(f"✓ Saved {len(kpi_rows)} KPI rows to {output_csv}")
    print("Sample KPI rows:")
    for r in kpi_rows[:3]:
        print(r)

    return kpi_rows

if __name__ == "__main__":
    # 1) Ad-level data (RCH/XRP/Spend per airing)
    fetch_ads_by_company("eBay", days_back=7)

    # 2) Channel-level KPIs for the same period
    today = date.today()
    date_to = today
    date_from = today - timedelta(days=7)
    fetch_channel_kpis(date_from=date_from.isoformat(), date_to=date_to.isoformat())