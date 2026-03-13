import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("ELEVEN_LABS_API_KEY")
voice_id = "txk8uOzZ0iCh0B9mFSRG" # Personal Clone

if not api_key:
    print("ERROR: ELEVEN_LABS_API_KEY not found in .env")
    exit(1)

print(f"Testing ElevenLabs API key (length: {len(api_key)})")

def test_voice(vid):
    url = f"https://api.elevenlabs.io/v1/voices/{vid}"
    req = urllib.request.Request(url)
    req.add_header("xi-api-key", api_key)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"SUCCESS: Voice ID '{vid}' is accessible. Name: {data.get('name')}")
            return True
    except urllib.error.HTTPError as e:
        print(f"FAILURE: Could not access voice ID '{vid}'. Status: {e.code}")
        try:
            err_data = json.loads(e.read().decode())
            print(f"Detail: {err_data.get('detail')}")
        except:
            pass
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

# Test the personal clone
if not test_voice(voice_id):
    # If fails, list available voices
    print("\nFetching available voices for this API key...")
    req = urllib.request.Request("https://api.elevenlabs.io/v1/voices")
    req.add_header("xi-api-key", api_key)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            voices = data.get('voices', [])
            print(f"Found {len(voices)} available voices:")
            for v in voices[:10]:
                print(f"- {v.get('name')} (ID: {v.get('voice_id')})")
    except Exception as e:
        print(f"Could not list voices: {e}")
