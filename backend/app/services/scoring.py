import re
import json
import logging
from typing import Optional
from app.models.schemas import Assessment

logger = logging.getLogger(__name__)

_OPEN_TAG = "<assessment>"
_CLOSE_TAGS = ["</assessment>", "<assessment>"]  # model sometimes repeats opening tag as closer


def _sanitize_json(raw: str) -> str:
    # Strip markdown code fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```\s*$", "", raw, flags=re.MULTILINE)
    # Fix "overall_score": 40 / 100  or  "overall_score": "40/100"
    raw = re.sub(r'"overall_score"\s*:\s*"?(\d+)\s*/\s*100"?', r'"overall_score": \1', raw)
    # Fix "overall_score": "75"  (string instead of int)
    raw = re.sub(r'"overall_score"\s*:\s*"(\d+)"', r'"overall_score": \1', raw)
    return raw.strip()


def extract_assessment(text: str) -> tuple[str, Optional[Assessment]]:
    open_idx = text.find(_OPEN_TAG)
    if open_idx == -1:
        return text, None

    # Visible text is ONLY what comes before <assessment> — drop anything after
    visible = text[:open_idx].strip()
    # Strip Koda's wrap-up phrase if it's the only thing left (keep chat clean)
    visible = re.sub(r"(?i)^got it[,.]?\s*(that makes sense now\.?\s*)?thanks!?\s*$", "", visible).strip()

    after_open = text[open_idx + len(_OPEN_TAG):]

    # Find the earliest closing marker
    close_idx = len(after_open)
    for tag in _CLOSE_TAGS:
        idx = after_open.find(tag)
        if idx != -1 and idx < close_idx:
            close_idx = idx

    json_text = after_open[:close_idx]

    try:
        raw = _sanitize_json(json_text)
        data = json.loads(raw)
        return visible, Assessment(**data)
    except Exception as e:
        logger.error("Failed to parse assessment JSON: %s | raw: %.500s", e, json_text[:500])
        return visible, None
