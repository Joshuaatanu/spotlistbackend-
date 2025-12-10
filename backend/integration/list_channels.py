"""
Simple script to list all available channels from AEOS API.
"""
from aeos_client import AEOSClient


def list_channels():
    """List all available channels (analytics and EPG)."""
    client = AEOSClient()
    client.authenticate()
    
    print("=" * 60)
    print("Fetching channels from AEOS API...")
    print("=" * 60)
    
    try:
        # Get analytics channels (for ad harvesting)
        print("\n📺 Analytics Channels (for ad harvesting):")
        print("-" * 60)
        analytics = client.get_channels(True)
        
        # Handle different response formats
        try:
            analytics_list = extract_channel_list(analytics)
        except RuntimeError as e:
            print(f"  ❌ {e}")
            analytics_list = []
        
        if analytics_list:
            for idx, ch in enumerate(analytics_list, 1):
                if isinstance(ch, dict):
                    channel_id = ch.get("value", "N/A")
                    caption = ch.get("caption", "N/A")
                    print(f"  {idx:3d}. {caption:30s} (ID: {channel_id})")
            print(f"\n✓ Found {len(analytics_list)} analytics channels")
        else:
            print("  ⚠ No analytics channels found")
            print(f"  Response type: {type(analytics)}")
            if isinstance(analytics, dict):
                print(f"  Response keys: {list(analytics.keys())}")
        
        # Get EPG channels (for events)
        print("\n📺 EPG Channels (for events):")
        print("-" * 60)
        epg = client.get_channels(False)
        
        # Handle different response formats
        try:
            epg_list = extract_channel_list(epg)
        except RuntimeError as e:
            print(f"  ❌ {e}")
            epg_list = []
        
        if epg_list:
            for idx, ch in enumerate(epg_list, 1):
                if isinstance(ch, dict):
                    channel_id = ch.get("value", "N/A")
                    caption = ch.get("caption", "N/A")
                    print(f"  {idx:3d}. {caption:30s} (ID: {channel_id})")
            print(f"\n✓ Found {len(epg_list)} EPG channels")
        else:
            print("  ⚠ No EPG channels found")
            print(f"  Response type: {type(epg)}")
            if isinstance(epg, dict):
                print(f"  Response keys: {list(epg.keys())}")
        
        print("\n" + "=" * 60)
        print(f"Total channels: {len(analytics_list) + len(epg_list)}")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error fetching channels: {e}")
        import traceback
        traceback.print_exc()


def extract_channel_list(response):
    """Extract channel list from API response (handles dict or list)."""
    if isinstance(response, list):
        return response
    if isinstance(response, dict):
        # Check for error responses
        if response.get("status") == "false" or "message" in response:
            error_msg = response.get("message", "Unknown error")
            raise RuntimeError(f"API error: {error_msg}")
        
        # Check if response has "all" key
        if "all" in response and isinstance(response["all"], list):
            return response["all"]
        # Check for other common keys
        for key in ["data", "channels", "items", "results"]:
            if key in response and isinstance(response[key], list):
                return response[key]
        # Try to find any list value that looks like channels
        for value in response.values():
            if isinstance(value, list) and len(value) > 0:
                if isinstance(value[0], dict) and "value" in value[0] and "caption" in value[0]:
                    return value
        return []
    return []


if __name__ == "__main__":
    list_channels()

