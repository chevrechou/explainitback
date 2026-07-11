import httpx
from app.config import settings

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)


async def gemini_chat(system_prompt: str, messages: list[dict]) -> str:
    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
    ]
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": settings.ai_max_tokens},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_GEMINI_URL}?key={settings.gemini_api_key}", json=payload
        )
        resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
