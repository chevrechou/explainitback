import re
import json
import logging
from typing import Optional
from app.models.schemas import Assessment

logger = logging.getLogger(__name__)
_ASSESSMENT_RE = re.compile(r"<assessment>(.*?)</assessment>", re.DOTALL)


def extract_assessment(text: str) -> tuple[str, Optional[Assessment]]:
    match = _ASSESSMENT_RE.search(text)
    if not match:
        return text, None

    visible = (text[: match.start()] + text[match.end() :]).strip()

    try:
        raw = match.group(1).strip()
        # Strip markdown code fences Gemini sometimes wraps around JSON
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
        return visible, Assessment(**data)
    except Exception as e:
        logger.error("Failed to parse assessment JSON: %s | raw: %.300s", e, match.group(1))
        return visible, None
