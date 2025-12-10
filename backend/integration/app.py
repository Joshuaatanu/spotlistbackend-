import requests
import os
import json
import csv
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Global token management
_token_cache = {
    'token': None,
    'expires_at': None
}

def get_valid_token():
    """Get a valid token, refreshing if necessary"""
    global _token_cache
    
    # Check if we have a valid token
    if _token_cache['token'] and _token_cache['expires_at']:
        # Add 30 second buffer to avoid edge cases
        if datetime.now() < _token_cache['expires_at'] - timedelta(seconds=30):
            return _token_cache['token']
    
    # Token expired or doesn't exist, get a new one
    print("⟳ Refreshing authentication token...")
    token = authenticate()
    if token:
        _token_cache['token'] = token
        # Token expires in 600 seconds (10 minutes)
        _token_cache['expires_at'] = datetime.now() + timedelta(seconds=600)
    
    return token


def authenticate():
    """Authenticate with AEOS API and return token"""
    auth_url = 'https://api.adscanner.tv/auth/login'
    auth_data = {
        "authparams": os.getenv("AEOS_API_KEY"),
        "authmethod": "apikey",
        "app": "apiv4"
    }
    try:
        response = requests.post(auth_url, json=auth_data)
        response.raise_for_status()
        token = response.json()['token']
        print("✓ Authentication successful")
        print("ℹ Token expires in 600 seconds (10 minutes)")
        return token
    except requests.exceptions.RequestException as e:
        print(f"✗ Authentication failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None


def initiate_advertisement_spotlist_report(token, params):
    """Initiate advertisement spotlist report"""
    endpoint = "https://api.adscanner.tv/APIv4/report/initiateAdvertisementSpotlistReport"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(endpoint, headers=headers, json=params)
        response.raise_for_status()
        result = response.json()
        print(f"✓ Report initiated")
        print(f"  Response: {result}")
        report_id = result.get('report_id') or result.get('reportId') or result.get('id')
        if report_id:
            print(f"  Report ID: {report_id}")
        return result
    except requests.exceptions.RequestException as e:
        print(f"✗ Report initiation failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None


def get_report_status(token, report_id):
    """Check report status"""
    endpoint = "https://api.adscanner.tv/APIv4/report/getReportStatus"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"report_id": report_id}
    
    try:
        response = requests.post(endpoint, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"✗ Status check failed: {e}")
        return None


def get_report_data(token, report_id):
    """Retrieve completed report data"""
    endpoint = "https://api.adscanner.tv/APIv4/report/getReportData"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"report_id": report_id}
    
    try:
        response = requests.post(endpoint, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"✗ Report data retrieval failed: {e}")
        return None


def wait_for_report(token, report_id, max_wait=300, poll_interval=5):
    """Poll report status until completed or timeout"""
    print(f"⏳ Waiting for report to complete...")
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        # Refresh token if needed (reports can take longer than 10 minutes)
        current_token = get_valid_token()
        if not current_token:
            print("✗ Failed to refresh token")
            return False
            
        status_response = get_report_status(current_token, report_id)
        
        if not status_response:
            return False
            
        status = status_response.get('status')
        print(f"  Status: {status}")
        
        if status == 'completed':
            print("✓ Report completed!")
            return True
        elif status == 'failed':
            print("✗ Report generation failed")
            return False
            
        time.sleep(poll_interval)
    
    print(f"✗ Timeout: Report not completed after {max_wait} seconds")
    return False


def save_spotlist_data(data, output_json="spotlist.json", output_csv="spotlist.csv"):
    """Save spotlist data to JSON and CSV files"""
    # Save raw JSON
    with open(output_json, "w") as json_file:
        json.dump(data, json_file, indent=4)
    print(f"✓ Saved raw data to {output_json}")
    
    # Parse and save to CSV
    header = data.get("header", [])
    body = data.get("body", [])
    
    if not header or not body:
        print("⚠ No data to save to CSV")
        return
    
    # Extract column names from header
    column_names = [h.get("item", h.get("key", f"col_{i}")) for i, h in enumerate(header)]
    
    with open(output_csv, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(column_names)
        writer.writerows(body)
    
    print(f"✓ Saved {len(body)} records to {output_csv}")


def get_brands_spotlist(channels, brands, date_from, date_to, **kwargs):
    """
    Get spotlist of advertisements for specific brands on specific channels
    
    Args:
        channels: List of channel IDs
        brands: List of brand IDs (or empty list for all brands)
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        **kwargs: Optional filters (companies, products, industries, categories, etc.)
    
    Returns:
        Dictionary with 'header' and 'body' containing spotlist data
    """
    # Build request parameters according to API spec (Table 15)
    params = {
        "channels": channels,
        "date_from": date_from,
        "date_to": date_to,
        "brands": brands,
        "dayparts": kwargs.get("dayparts", []),
        "epg_categories": kwargs.get("epg_categories", None),
        "weekdays": kwargs.get("weekdays", []),
        "companies": kwargs.get("companies", []),
        "products": kwargs.get("products", []),
        "industries": kwargs.get("industries", []),
        "categories": kwargs.get("categories", []),
        "subcategories": kwargs.get("subcategories", [])
    }
    
    # Step 1: Initiate the spotlist report (ensure fresh token)
    current_token = get_valid_token()
    if not current_token:
        return None
        
    report_response = initiate_advertisement_spotlist_report(current_token, params)
    if not report_response:
        return None
    
    report_id = report_response.get("report_id")
    if not report_id:
        print("✗ No report ID in response")
        return None
    
    # Step 2: Wait for report to complete (handles token refresh internally)
    if not wait_for_report(current_token, report_id):
        return None
    
    # Step 3: Retrieve the completed report data (ensure fresh token)
    current_token = get_valid_token()
    if not current_token:
        return None
        
    report_data = get_report_data(current_token, report_id)
    return report_data


def get_channels_test(token):
    """Test getChannels endpoint"""
    endpoint = "https://api.adscanner.tv/APIv4/helper/getChannels"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"analytics": False}
    
    try:
        print(f"Testing endpoint: {endpoint}")
        print(f"Payload: {payload}")
        response = requests.post(endpoint, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        print(f"✓ Success! Received {len(data) if isinstance(data, list) else 'data'}")
        return data
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None


def main():
    """Main execution function - Testing getChannels only"""
    print("=" * 60)
    print("AEOS API - Testing getChannels Endpoint")
    print("=" * 60)
    
    # Step 1: Authenticate
    print("\nStep 1: Authentication")
    token = get_valid_token()
    if not token:
        print("✗ Authentication failed, cannot proceed")
        return
    
    # Step 2: Test getChannels endpoint
    print("\nStep 2: Testing getChannels")
    channels = get_channels_test(token)
    
    if not channels:
        print("✗ Failed to retrieve channels")
        return
    
    # Step 3: Save the channels data
    print("\nStep 3: Saving channels data")
    with open("available_channels.json", "w") as f:
        json.dump(channels, f, indent=2)
    print(f"✓ Saved to available_channels.json")
    
    # Print summary
    if isinstance(channels, list):
        print(f"\n✓ Retrieved {len(channels)} channels")
        if len(channels) > 0 and len(channels) <= 5:
            print("\nChannels:")
            for ch in channels:
                print(f"  - {ch}")
        elif len(channels) > 5:
            print("\nFirst 5 channels:")
            for ch in channels[:5]:
                print(f"  - {ch}")
    
    print("\n" + "=" * 60)
    print("✓ getChannels test completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
