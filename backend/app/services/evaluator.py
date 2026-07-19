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

_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_GROQ_EVAL_MODEL = "llama-3.3-70b-versatile"

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


async def _call_groq_eval(user_message: str) -> str:
    payload = {
        "model": _GROQ_EVAL_MODEL,
        "messages": [
            {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 4096,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(_GROQ_CHAT_URL, json=payload, headers=headers)
        if resp.status_code == 429:
            logger.warning("Groq eval 429 — retrying after 10s")
            await asyncio.sleep(10)
            resp = await client.post(_GROQ_CHAT_URL, json=payload, headers=headers)
        if not resp.is_success:
            raise ValueError(f"Groq eval HTTP {resp.status_code}")
        data = resp.json()
    choices = data.get("choices", [])
    if not choices:
        raise ValueError("Groq eval: no choices in response")
    return choices[0]["message"]["content"]



def _parse_assessment(raw: str, topic: str) -> Optional[Assessment]:
    json_text = raw.strip()

    # Strip markdown fences if the model added them despite instructions
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", json_text, re.DOTALL | re.IGNORECASE)
    if fence_match:
        json_text = fence_match.group(1)

    # Fix common score formatting: "75/100" or "75" (string) → 75
    json_text = re.sub(r'"overall_score"\s*:\s*"?(\d+)\s*/\s*100"?', r'"overall_score": \1', json_text)
    json_text = re.sub(r'"overall_score"\s*:\s*"(\d+)"', r'"overall_score": \1', json_text)

    try:
        data = json.loads(json_text)
        if "topic" not in data:
            data["topic"] = topic
        return Assessment(**data)
    except Exception as e:
        logger.error("Evaluator parse error: %s | raw_preview: %.600s", e, raw[:600])
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
        raw = await _call_groq_eval(user_message)
    except Exception as e:
        logger.error("Groq eval failed: %s", e)
        return None

    logger.info("Evaluator raw response (%d chars): %.600s", len(raw), raw[:600])
    result = _parse_assessment(raw, topic)
    if result is None:
        logger.error("Evaluator _parse_assessment returned None. Full raw: %.1000s", raw[:1000])
    return result
