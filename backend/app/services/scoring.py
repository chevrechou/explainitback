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
        data = json.loads(match.group(1).strip())
        return visible, Assessment(**data)
    except Exception as e:
        logger.error("Failed to parse assessment JSON: %s", e)
        return visible, None
