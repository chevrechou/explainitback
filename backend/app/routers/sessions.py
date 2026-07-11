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
from app.services.scraper import fetch_url_text
from app.prompts.socratic import build_system_prompt
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
    first_message, _ = extract_assessment(raw)
    return SessionStartResponse(first_message=first_message, topic=req.topic)


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


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    from app.services.groq import groq_transcribe
    content = await audio.read()
    text = await groq_transcribe(content, audio.filename or "audio.m4a")
    return {"text": text}
