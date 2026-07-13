import logging
import re
import bleach
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.schemas import (
    SessionStartRequest, SessionStartResponse,
    SessionMessageRequest, SessionMessageResponse,
)
from app.services.ai import chat
from app.services.scoring import extract_assessment
from app.services.evaluator import run_evaluation
from app.services.scraper import fetch_url_text
from app.prompts.socratic import build_system_prompt, TOPIC_SUBCONCEPTS
from app.config import settings

logger = logging.getLogger(__name__)

_TOPIC_TAG_RE  = re.compile(r"<topic>(.*?)</topic>", re.DOTALL | re.IGNORECASE)
_DONE_TAG_RE   = re.compile(r"<done\s*/?>", re.IGNORECASE)
_DONE_PHRASE   = "got it, that makes sense now. thanks"

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

    # Strip any leftover <assessment> blocks (old behaviour) and <done/> tag
    visible, legacy_assessment = extract_assessment(raw)
    done_signal = (
        bool(_DONE_TAG_RE.search(visible))
        or _DONE_PHRASE in visible.lower()
    )
    visible = _DONE_TAG_RE.sub("", visible).strip()

    is_complete = done_signal or legacy_assessment is not None or turn_count >= settings.max_turns_per_session

    # Do NOT run evaluation here — return immediately and let the client call
    # /sessions/evaluate separately to avoid combined timeout on Render free tier.
    return SessionMessageResponse(
        response=visible,
        turn_count=turn_count,
        is_complete=is_complete,
        assessment=legacy_assessment,  # only set if model accidentally output JSON
    )


@router.post("/evaluate")
@limiter.limit("10/minute")
async def evaluate_session(request: Request, req: SessionMessageRequest):
    """Run the dedicated evaluator on a completed conversation. Called separately
    from /message so the HTTP response isn't blocked by the evaluation time."""
    document_text: str | None = None
    if req.document_text:
        document_text = req.document_text[: settings.document_max_tokens * 4]

    normalized = req.topic.lower().replace(" ", "_")
    sub_concepts = TOPIC_SUBCONCEPTS.get(normalized, [])

    history = [{"role": m.role, "content": m.content} for m in req.messages]
    if req.user_message:
        history.append({"role": "user", "content": req.user_message})

    assessment = await run_evaluation(
        topic=req.topic,
        sub_concepts=sub_concepts,
        conversation=history,
        document_text=document_text,
    )
    return {"assessment": assessment}




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
