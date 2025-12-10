import requests
import os
from dotenv import load_dotenv
import json
# Load environment variables
load_dotenv()

BASE_URL = "https://api.adscanner.tv"
API_KEY = os.getenv("AEOS_API_KEY")

def authenticate():
    url = f"{BASE_URL}/auth/login"
    payload = {
        "authparams": API_KEY,
        "authmethod": "apikey",
        "app": "apiv4"
    }

    response = requests.post(url, json=payload)
    response.raise_for_status()
    data = response.json()

    return data["token"]  # session token



def get_channels(token, flag):
    url = f"{BASE_URL}/APIv4/helper/getChannels"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    payload = {
        "analytics": bool(flag)
    }

    response = requests.post(url, json=payload, headers=headers)
    print("Status:", response.status_code)
    print("Body:", response.text)
    response.raise_for_status()
    return response.json()

def main():
    token = authenticate()
    channels = get_channels(token, False)  # or False

  
    print(json.dumps(channels, indent=2))
    return channels
if __name__ == "__main__":
    channels = main() 
