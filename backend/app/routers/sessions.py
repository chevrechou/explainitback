import logging
import re
import bleach
from fastapi import APIRouter, HTTPException, UploadFile, File, Request

_TOPIC_TAG_RE = re.compile(r"<topic>(.*?)</topic>", re.DOTALL | re.IGNORECASE)

logger = logging.getLogger(__name__)
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.schemas import (
    SessionStartRequest, SessionStartResponse,
    SessionMessageRequest, SessionMessageResponse,
)
from app.services.ai import chat
from app.services.scoring import extract_assessment
from app.services.scraper import fetch_url_text
from app.prompts.socratic import build_system_prompt, TOPIC_SUBCONCEPTS
from app.config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def sanitize_for_ai(user_message: str) -> str:
    cleaned = bleach.clean(user_message, tags=[], strip=True)[:2000]
    return f"[Student says]: {cleaned}"


@router.post("/start", response_model=SessionStartResponse)
@limiter.limit("10/minute")
async def start_session(request: Request, req: SessionStartRequest):
    document_text: str | None = None
    if req.document_url:
        try:
            document_text = await fetch_url_text(req.document_url)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not fetch URL: {exc}")
    elif req.document_text:
        document_text = req.document_text

    if document_text:
        document_text = document_text[: settings.document_max_tokens * 4]

    system_prompt = build_system_prompt(req.topic, document_text)
    raw = await chat(system_prompt, [], topic=req.topic)

    # Extract derived topic name from custom documents
    topic_match = _TOPIC_TAG_RE.search(raw)
    topic = topic_match.group(1).strip() if (topic_match and document_text) else req.topic
    raw_clean = _TOPIC_TAG_RE.sub("", raw).strip()

    first_message, _ = extract_assessment(raw_clean)
    normalized = req.topic.lower().replace(" ", "_")
    sub_concept_names = TOPIC_SUBCONCEPTS.get(normalized, [])
    return SessionStartResponse(first_message=first_message, topic=topic, sub_concept_names=sub_concept_names)


@router.post("/message", response_model=SessionMessageResponse)
@limiter.limit("30/minute")
async def send_message(request: Request, req: SessionMessageRequest):
    document_text: str | None = None
    if req.document_text:
        document_text = req.document_text[: settings.document_max_tokens * 4]

    user_turns = sum(1 for m in req.messages if m.role == "user")
    turn_count = user_turns + 1

    if turn_count > settings.max_turns_per_session:
        raise HTTPException(status_code=400, detail="Session has reached the maximum number of turns.")

    sanitized = sanitize_for_ai(req.user_message)
    history = [{"role": m.role, "content": m.content} for m in req.messages]
    history.append({"role": "user", "content": sanitized})

    system_prompt = build_system_prompt(req.topic, document_text)
    raw = await chat(system_prompt, history, topic=req.topic)
    visible, assessment = extract_assessment(raw)

    is_complete = assessment is not None or turn_count >= settings.max_turns_per_session

    return SessionMessageResponse(
        response=visible,
        turn_count=turn_count,
        is_complete=is_complete,
        assessment=assessment,
    )


@router.post("/rate")
@limiter.limit("20/minute")
async def rate_session(request: Request, body: dict):
    stars = body.get("stars")
    comment = body.get("comment", "")
    topic = body.get("topic", "")
    logger.info("Session rating — topic: %s | stars: %s | comment: %.200s", topic, stars, comment)
    return {"ok": True}


@router.post("/transcribe")
@limiter.limit("10/minute")
async def transcribe_audio(request: Request, audio: UploadFile = File(...)):
    from app.services.groq import groq_transcribe
    content = await audio.read()
    text = await groq_transcribe(content, audio.filename or "audio.m4a")
    return {"text": text}
