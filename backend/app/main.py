from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import sessions, auth

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Explain It Back API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/sessions")
app.include_router(auth.router, prefix="/auth")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/topics")
async def get_topics():
    from app.prompts.socratic import TOPIC_SUBCONCEPTS
    _SUBJECTS = {
        "photosynthesis": "Biology",
        "pythagorean_theorem": "Math",
        "supply_and_demand": "Economics",
        "natural_selection": "Biology",
        "newton_second_law": "Physics",
    }
    _EMOJIS = {
        "photosynthesis": "🌿",
        "pythagorean_theorem": "📐",
        "supply_and_demand": "📈",
        "natural_selection": "🦎",
        "newton_second_law": "🍎",
    }
    topics = [
        {
            "id": k,
            "name": k.replace("_", " ").title(),
            "subject": _SUBJECTS.get(k, "General"),
            "emoji": _EMOJIS.get(k, "📚"),
            "sub_concept_count": len(v),
        }
        for k, v in TOPIC_SUBCONCEPTS.items()
    ]
    return {"topics": topics, "custom_allowed": True}
