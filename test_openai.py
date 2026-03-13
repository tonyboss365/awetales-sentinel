import os
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=os.getenv("OPENAI_API_KEY")
)

async def test():
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        print("Success:", response)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
