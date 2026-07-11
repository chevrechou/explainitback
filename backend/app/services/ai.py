import asyncio
import logging
import random

from app.config import settings

logger = logging.getLogger(__name__)


async def _retry(fn, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as exc:
            is_rate_limit = "429" in str(exc) or "rate_limit" in str(exc).lower()
            if not is_rate_limit or attempt == max_retries - 1:
                raise
            wait = (2**attempt) + random.uniform(0, 1)
            await asyncio.sleep(wait)


async def chat(system_prompt: str, messages: list[dict], topic: str = "") -> str:
    provider = settings.ai_provider

    if provider == "mock":
        from app.services.mock import mock_chat
        return await mock_chat(topic, messages)

    if provider == "gemini":
        from app.services.gemini import gemini_chat
        try:
            return await _retry(lambda: gemini_chat(system_prompt, messages))
        except Exception as exc:
            if "429" in str(exc):
                logger.warning("Gemini rate-limited; falling back to Groq")
                from app.services.groq import groq_chat
                return await groq_chat(system_prompt, messages)
            raise

    if provider == "groq":
        from app.services.groq import groq_chat
        return await groq_chat(system_prompt, messages)

    raise ValueError(f"Unknown AI_PROVIDER: {provider!r}")
