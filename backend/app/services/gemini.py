import asyncio
import logging

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

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
    url = f"{_GEMINI_URL}?key={settings.gemini_api_key}"
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 429:
            logger.warning("Gemini chat 429 — retrying after 25s")
            await asyncio.sleep(25)
            resp = await client.post(url, json=payload)
        if not resp.is_success:
            raise ValueError(f"Gemini HTTP {resp.status_code}")
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError(f"Gemini returned no candidates: {data.get('promptFeedback')}")
    return candidates[0]["content"]["parts"][0]["text"]
