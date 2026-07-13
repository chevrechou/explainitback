import asyncio
import json
import logging
import re
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import Assessment
from app.prompts.evaluator import EVALUATOR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

_EVAL_MODEL = "gemini-2.0-flash"
_EVAL_FALLBACK_MODEL = "gemini-1.5-flash"
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# Strip the sanitization wrapper added by sanitize_for_ai()
_SANITIZE_PREFIX = re.compile(r"^\[Student says\]:\s*", re.IGNORECASE)


def _clean_student_content(content: str) -> str:
    return _SANITIZE_PREFIX.sub("", content).strip()


def _build_eval_user_message(
    topic: str,
    sub_concepts: list[str],
    conversation: list[dict],
    document_text: Optional[str] = None,
) -> str:
    lines = [
        f"Topic: {topic}",
        "",
        "Sub-concepts to evaluate:",
    ]
    for i, sc in enumerate(sub_concepts, 1):
        lines.append(f"  {i}. {sc}")

    lines += ["", "Conversation transcript:", ""]

    student_index = 0
    for m in conversation:
        if m["role"] == "user":
            student_index += 1
            label = f"[S{student_index}] Student"
            content = _clean_student_content(m["content"])
        else:
            label = "Koda"
            content = m["content"]
        lines.append(f"{label}: {content}")

    if document_text:
        lines += [
            "",
            "Source material the student was explaining:",
            f"<document>\n{document_text[:4000]}\n</document>",
        ]
    return "\n".join(lines)


async def _call_gemini_eval(user_message: str, model: str, retry_on_429: bool = True) -> str:
    url = f"{_GEMINI_BASE}/{model}:generateContent?key={settings.gemini_api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": EVALUATOR_SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {
            "maxOutputTokens": 4096,
            "temperature": 0.1,
        },
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 429 and retry_on_429:
            logger.warning("Gemini eval 429 rate limit on %s — retrying after 25s", model)
            await asyncio.sleep(25)
            resp = await client.post(url, json=payload)
        if not resp.is_success:
            raise ValueError(f"Gemini eval HTTP {resp.status_code} on model {model}")
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError(f"Evaluator: no candidates from {model}: {data.get('promptFeedback')}")
    return candidates[0]["content"]["parts"][0]["text"]


def _parse_assessment(raw: str, topic: str) -> Optional[Assessment]:
    # Primary: extract ```json ... ``` fence (scratchpad-then-JSON format)
    fence_match = re.search(r"```json\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence_match:
        json_text = fence_match.group(1)
    else:
        # Fallback: model output bare JSON (old behaviour)
        json_text = raw.strip()
        # Strip any remaining fences
        json_text = re.sub(r"^```(?:json)?\s*", "", json_text, flags=re.MULTILINE)
        json_text = re.sub(r"\s*```\s*$", "", json_text, flags=re.MULTILINE)

    # Fix common score formatting issues
    json_text = re.sub(r'"overall_score"\s*:\s*"?(\d+)\s*/\s*100"?', r'"overall_score": \1', json_text)
    json_text = re.sub(r'"overall_score"\s*:\s*"(\d+)"', r'"overall_score": \1', json_text)

    try:
        data = json.loads(json_text.strip())
        if "topic" not in data:
            data["topic"] = topic
        return Assessment(**data)
    except Exception as e:
        logger.error("Evaluator parse error: %s | fence_found: %s | raw: %.800s", e, bool(fence_match), raw[:800])
        return None


async def run_evaluation(
    topic: str,
    sub_concepts: list[str],
    conversation: list[dict],
    document_text: Optional[str] = None,
) -> Optional[Assessment]:
    if not conversation:
        return None

    user_message = _build_eval_user_message(topic, sub_concepts, conversation, document_text)

    try:
        raw = await _call_gemini_eval(user_message, _EVAL_MODEL)
    except Exception as e:
        logger.warning("Evaluator primary model failed (%s), falling back to %s", e, _EVAL_FALLBACK_MODEL)
        try:
            raw = await _call_gemini_eval(user_message, _EVAL_FALLBACK_MODEL)
        except Exception as e2:
            logger.error("Evaluator fallback also failed: %s", e2)
            return None

    return _parse_assessment(raw, topic)
