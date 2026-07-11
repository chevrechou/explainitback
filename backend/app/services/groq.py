import httpx
from app.config import settings

_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_GROQ_AUDIO_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


async def groq_chat(system_prompt: str, messages: list[dict]) -> str:
    msgs = [{"role": "system", "content": system_prompt}] + messages
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": msgs,
        "max_tokens": settings.ai_max_tokens,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            _GROQ_CHAT_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        )
        resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


async def groq_transcribe(audio_bytes: bytes, filename: str = "audio.m4a") -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _GROQ_AUDIO_URL,
            files={"file": (filename, audio_bytes, "audio/m4a")},
            data={"model": "whisper-large-v3"},
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        )
        resp.raise_for_status()
    return resp.json()["text"]
