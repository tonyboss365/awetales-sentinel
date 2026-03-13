with open('.env', 'rb') as f:
    content = f.read()
    print("Raw Bytes:", content)
    import os
    from dotenv import load_dotenv
    load_dotenv()
    key = os.getenv("ELEVEN_LABS_API_KEY")
    print(f"Loaded Key: '{key}'")
    if key:
        print(f"Key Length: {len(key)}")
        print("Hex chars:", [hex(ord(c)) for c in key])
