import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("ELEVEN_LABS_API_KEY")
voice_id = "txk8uOzZ0iCh0B9mFSRG" # Personal Clone

if not api_key:
    print("ERROR: ELEVEN_LABS_API_KEY not found in .env")
    exit(1)

print(f"Testing ElevenLabs API key (length: {len(api_key)})")

url = f"https://api.elevenlabs.io/v1/voices/{voice_id}"
headers = {
    "xi-api-key": api_key
}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    print(f"SUCCESS: Voice ID '{voice_id}' is accessible and valid.")
    voice_data = response.json()
    print(f"Voice Name: {voice_data.get('name')}")
else:
    print(f"FAILURE: Could not access voice ID '{voice_id}'.")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    # List available voices
    print("\nFetching available voices for this API key...")
    voices_url = "https://api.elevenlabs.io/v1/voices"
    v_response = requests.get(voices_url, headers=headers)
    if v_response.status_code == 200:
        v_list = v_response.json().get('voices', [])
        print(f"Found {len(v_list)} voices:")
        for v in v_list[:10]:
            print(f"- {v.get('name')} (ID: {v.get('voice_id')})")
    else:
        print(f"Error listing voices: {v_response.status_code}")
