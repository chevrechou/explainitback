# Explain It Back — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Feynman-technique learning app where users teach topics to Koda (an AI persona) via text or voice, then receive a comprehension scorecard.

**Architecture:** Stateless FastAPI backend handles AI orchestration and Supabase auth proxy. Expo app (web + mobile) owns all session state in Zustand and sends the full conversation history with each request. No session or scorecard data is persisted in MVP. Auth is optional — guests can use the app fully, signed-in users get identity for future features.

**Tech Stack:** Python 3.11+, FastAPI 0.111+, Pydantic v2, httpx, trafilatura, bleach, slowapi, supabase-py; Expo SDK 51+, expo-router, TypeScript strict, Zustand, expo-av, react-native-reanimated; Gemini 2.0 Flash (primary AI), Groq Llama 3.1 8B (fallback), Groq Whisper (voice transcription); Supabase for auth only.

## Global Constraints

- Python 3.11+; FastAPI 0.111+; Pydantic v2 (not v1)
- Expo SDK 51+; TypeScript strict mode (`"strict": true` in tsconfig)
- `AI_PROVIDER` env var: `mock` | `gemini` | `groq` — default `mock`
- All user messages run through `sanitize_for_ai()` before reaching any AI call
- Max 20 turns per session (hard cap, enforced in backend)
- Document text capped at 8 000 tokens (~32 000 chars) before injection
- Auth token passed as `Authorization: Bearer <token>`; omitted for guests — backend allows both
- No session or scorecard tables in DB — Supabase used for auth only
- Voice transcription routes through backend (keeps Groq key server-side)
- Colors: Primary `#0f172a`, Accent `#22c55e`, Surface `#ffffff`, Background `#fafaf9`, Muted `#64748b`, Border `#e2e8f0`, Error `#dc2626`, Warning `#d97706`
- Border radius: cards 12px, bubbles 16px, inputs 10px; no shadows — borders only
- Web Speech API voice: Chrome/Edge only; show text-only fallback notice in Safari

---

## File Map

```
explainitback/
├── .github/workflows/ci.yml
├── .gitignore
├── render.yaml
├── README.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app, CORS, /health, /topics
│   │   ├── config.py                # Pydantic settings from env
│   │   ├── models/
│   │   │   └── schemas.py           # All Pydantic request/response models
│   │   ├── db/
│   │   │   └── supabase.py          # Supabase client singleton
│   │   ├── prompts/
│   │   │   └── socratic.py          # System prompt + topic rubrics + build_system_prompt()
│   │   ├── services/
│   │   │   ├── ai.py                # Provider abstraction + Gemini→Groq failover
│   │   │   ├── mock.py              # Scripted Koda responses for dev
│   │   │   ├── gemini.py            # Gemini 2.0 Flash client
│   │   │   ├── groq.py              # Groq chat + Whisper transcription
│   │   │   ├── scoring.py           # <assessment> block extraction + parsing
│   │   │   └── scraper.py           # URL fetch + readable-text extraction
│   │   └── routers/
│   │       ├── auth.py              # /auth/signup, /auth/login
│   │       └── sessions.py          # /sessions/start, /sessions/message, /sessions/transcribe
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_scoring.py
│   │   ├── test_mock.py
│   │   ├── test_scraper.py
│   │   └── test_sessions.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
└── mobile/
    ├── app/
    │   ├── _layout.tsx              # Root layout; loads user from AsyncStorage
    │   ├── auth.tsx                 # Login / signup screen
    │   ├── index.tsx                # Topic picker (home)
    │   ├── session/[id].tsx         # Chat screen
    │   └── scorecard/[id].tsx       # Scorecard screen
    ├── components/
    │   ├── TopicCard.tsx
    │   ├── DocumentInput.tsx        # Paste text or URL + optional label
    │   ├── ChatBubble.tsx
    │   ├── KodaTyping.tsx           # Animated three-dot indicator
    │   ├── VoiceButton.tsx          # Hold-to-talk; web speech or expo-av
    │   ├── ScorecardView.tsx
    │   └── ConceptPill.tsx
    ├── lib/
    │   ├── types.ts
    │   ├── api.ts
    │   └── store.ts
    ├── app.json
    ├── babel.config.js
    ├── package.json
    └── tsconfig.json
```

---

### Task 1: Repo scaffolding + CI

**Files:**
- Create: `.gitignore`
- Create: `.github/workflows/ci.yml`
- Create: `render.yaml`
- Create: `README.md`

**Interfaces:**
- Produces: green CI pipeline on every PR; Render auto-deploy config

- [ ] **Step 1: Write `.gitignore`**

```
# Python
__pycache__/
*.py[cod]
.venv/
*.egg-info/
.env

# Node / Expo
node_modules/
.expo/
dist/
web-build/
*.orig.*

# OS
.DS_Store
```

- [ ] **Step 2: Write CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: python -m pytest tests/ -v
      - run: python -c "from app.main import app; print('startup ok')"
        env:
          AI_PROVIDER: mock
          SUPABASE_URL: http://localhost
          SUPABASE_ANON_KEY: placeholder
          SUPABASE_SERVICE_KEY: placeholder

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx tsc --noEmit
```

- [ ] **Step 3: Write `render.yaml`**

```yaml
services:
  - type: web
    name: explainitback-api
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: AI_PROVIDER
        value: mock
      - key: GEMINI_API_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore .github/ render.yaml README.md
git commit -m "chore: repo scaffolding and CI"
git push
```

Expected: CI runs, backend job fails (no backend yet) — that's fine for now.

---

### Task 2: Backend scaffold + health check

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/Dockerfile`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

**Interfaces:**
- Produces: `GET /health → {"status": "ok"}`; `settings` object importable everywhere as `from app.config import settings`

- [ ] **Step 1: Write `requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.7.1
pydantic-settings==2.3.0
httpx==0.27.0
trafilatura==1.9.0
bleach==6.1.0
slowapi==0.1.9
supabase==2.5.0
python-multipart==0.0.9
pytest==8.2.2
pytest-asyncio==0.23.7
httpx==0.27.0
```

- [ ] **Step 2: Write `.env.example`**

```env
AI_PROVIDER=mock
GEMINI_API_KEY=
GROQ_API_KEY=
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
AI_MAX_TOKENS=400
MAX_TURNS_PER_SESSION=20
DOCUMENT_MAX_TOKENS=8000
```

- [ ] **Step 3: Write `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ai_provider: str = "mock"
    gemini_api_key: str = ""
    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    ai_max_tokens: int = 400
    max_turns_per_session: int = 20
    document_max_tokens: int = 8000

    model_config = {"env_file": ".env"}

settings = Settings()
```

- [ ] **Step 4: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Explain It Back API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Write `tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)
```

- [ ] **Step 6: Verify health check**

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
# In another terminal:
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: backend scaffold with health check"
git push
```

---

### Task 3: Pydantic schemas

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/schemas.py`

**Interfaces:**
- Produces: `Message`, `SessionStartRequest`, `SessionStartResponse`, `SessionMessageRequest`, `SessionMessageResponse`, `SubConcept`, `Assessment`, `SignupRequest`, `AuthResponse` — all importable from `app.models.schemas`

- [ ] **Step 1: Write `schemas.py`**

```python
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional

class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class SubConcept(BaseModel):
    name: str
    status: str  # "NOT_ADDRESSED" | "SURFACE" | "UNDERSTOOD"
    evidence: str

class Assessment(BaseModel):
    topic: str
    overall_score: int = Field(ge=0, le=100)
    sub_concepts: list[SubConcept]
    biggest_gap: str
    strongest_point: str
    misconceptions: list[str]

class SessionStartRequest(BaseModel):
    topic: str
    document_text: Optional[str] = None
    document_url: Optional[str] = None

class SessionStartResponse(BaseModel):
    first_message: str
    topic: str

class SessionMessageRequest(BaseModel):
    topic: str
    messages: list[Message]
    user_message: str
    document_text: Optional[str] = None

class SessionMessageResponse(BaseModel):
    response: str
    turn_count: int
    is_complete: bool
    assessment: Optional[Assessment] = None

class SignupRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    user_id: str
    access_token: str
```

- [ ] **Step 2: Smoke-test import**

```bash
cd backend
python -c "from app.models.schemas import Assessment, SessionMessageResponse; print('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/
git commit -m "feat: pydantic schemas"
```

---

### Task 4: System prompt + topic rubrics

**Files:**
- Create: `backend/app/prompts/__init__.py`
- Create: `backend/app/prompts/socratic.py`

**Interfaces:**
- Produces: `build_system_prompt(topic: str, document_text: str | None) -> str`; `TOPIC_SUBCONCEPTS: dict[str, list[str]]`

- [ ] **Step 1: Write `socratic.py`**

```python
SOCRATIC_SYSTEM_PROMPT = """You are Koda, a friendly but genuinely curious student
who is trying to learn {topic} from the user. You are NOT an expert. You are NOT
a tutor. You are a student who needs things explained clearly.

## Your personality
- Curious and eager, but not a pushover. You push back when something doesn't
  make sense to you.
- You speak casually. Short sentences. You ask "wait, what?" when confused.
- You're smart enough to spot when an explanation has a gap, but you don't know
  the answer yourself — you just know something feels off.
- You occasionally try to restate what the user said in your own words, sometimes
  getting it slightly wrong on purpose to see if they correct you.

## Your rules (NEVER break these)

1. NEVER explain the concept yourself. You are the student. If you catch yourself
   teaching, stop and say "wait, I'm supposed to be learning from you."

2. NEVER say "great explanation!" unless the user has genuinely covered the core
   sub-concepts. Premature praise kills learning.

3. When the user gives a vague or surface-level explanation, respond with ONE of:
   - "Okay but WHY does that happen?"
   - "Can you give me a specific example of that?"
   - "What would happen if [edge case]?"
   - "I think I get it... so you're saying [deliberate slight misunderstanding]?"

4. Track these sub-concepts internally. Do NOT reveal this list to the user:
{sub_concepts}

   For each sub-concept, internally mark it as:
   - NOT_ADDRESSED: user hasn't mentioned it
   - SURFACE: user mentioned it but didn't explain the mechanism
   - UNDERSTOOD: user explained it clearly enough that you (Koda) genuinely get it

5. When the user has addressed a sub-concept well, naturally move to one they
   haven't covered yet: "Okay that makes sense. But what about [adjacent thing]?"

6. If the user says something WRONG, don't correct them. Instead, follow their
   logic to an absurd or contradictory conclusion:
   - "Wait, so if that's true, then wouldn't [contradiction] also be true?"
   - "Hmm, but I read somewhere that [correct fact]. How does that fit?"

7. After 8-12 exchanges (or when all sub-concepts are UNDERSTOOD), wrap up:
   - "Okay I think I actually get {topic} now. Thanks for explaining!"
   - Then output a hidden assessment block in this exact format:

   <assessment>
   {{
     "topic": "{topic}",
     "sub_concepts": [
       {{
         "name": "sub-concept name",
         "status": "NOT_ADDRESSED | SURFACE | UNDERSTOOD",
         "evidence": "brief quote or paraphrase of what user said"
       }}
     ],
     "overall_score": 0-100,
     "biggest_gap": "the most important thing they didn't explain well",
     "strongest_point": "what they explained best",
     "misconceptions": ["any wrong things they said"]
   }}
   </assessment>

## Conversation flow

Turn 1: "Hey! So I keep hearing about {topic} but I honestly don't really get it.
Can you explain it to me like I'm starting from zero?"

Then: React naturally to what they say. One question per response. Keep responses
under 3 sentences. Be a real conversational partner, not a question machine.

## What makes a GOOD explanation (internal rubric)
- Uses concrete examples, not just definitions
- Explains WHY/HOW, not just WHAT
- Addresses cause and effect
- Can handle edge cases or "what if" scenarios
- Shows actual understanding, not just parroting

## What makes a BAD explanation (push back on these)
- "It's basically just..." (oversimplification)
- Circular definitions
- Jargon without explanation
- Listing facts without connecting them
- "I think..." followed by uncertainty (probe deeper)
"""

TOPIC_SUBCONCEPTS: dict[str, list[str]] = {
    "photosynthesis": [
        "Light is the energy source (not soil/water as 'food')",
        "CO2 is absorbed from air through stomata",
        "Water is split in the light reactions",
        "Chlorophyll's role in capturing light energy",
        "Glucose is the output product (stored energy)",
        "Oxygen is released as a byproduct",
        "Light reactions vs Calvin cycle (two stages)",
    ],
    "pythagorean_theorem": [
        "Only applies to RIGHT triangles",
        "a squared + b squared = c squared where c is the hypotenuse",
        "The hypotenuse is always the longest side, opposite the right angle",
        "Can be used to find any missing side (not just c)",
        "Geometric interpretation: areas of squares on each side",
        "Converse: if a squared + b squared = c squared, the triangle IS a right triangle",
    ],
    "supply_and_demand": [
        "Demand: inverse relationship between price and quantity demanded",
        "Supply: direct relationship between price and quantity supplied",
        "Equilibrium: where supply and demand curves intersect",
        "Surplus: when price is above equilibrium",
        "Shortage: when price is below equilibrium",
        "Shifts vs movements along the curve (different causes)",
        "Real-world example demonstrating the mechanism",
    ],
    "natural_selection": [
        "Variation exists within a population",
        "Some traits provide survival/reproductive advantage",
        "Traits must be heritable (genetic basis)",
        "Differential reproduction over generations",
        "Environment determines which traits are 'fit'",
        "It's not 'survival of the strongest' — it's reproductive success",
        "Distinction from Lamarckism (acquired traits aren't inherited)",
    ],
    "newton_second_law": [
        "F = ma (force equals mass times acceleration)",
        "Force is a push or pull (vector quantity — has direction)",
        "Mass resists acceleration (inertia)",
        "Net force: multiple forces can act on an object",
        "If net force is zero, acceleration is zero (constant velocity or rest)",
        "Units: Newtons (kg times m/s squared)",
        "Concrete example showing the relationship",
    ],
}


def build_system_prompt(topic: str, document_text: str | None = None) -> str:
    normalized = topic.lower().replace(" ", "_")
    sub_concepts = TOPIC_SUBCONCEPTS.get(normalized, [])

    if document_text:
        sub_concept_instruction = (
            "Generate 5-7 key sub-concepts from the source material below and track them."
        )
        doc_section = (
            f"\n\n## Source material\n"
            f"The user is explaining the content of this document:\n"
            f"<document>\n{document_text}\n</document>\n"
            f"Base your sub-concepts and final assessment on this material."
        )
    elif sub_concepts:
        sub_concept_instruction = "\n".join(f"- {c}" for c in sub_concepts)
        doc_section = ""
    else:
        sub_concept_instruction = (
            f"Generate 5-7 key sub-concepts for {topic} and track them the same way."
        )
        doc_section = ""

    return SOCRATIC_SYSTEM_PROMPT.format(
        topic=topic,
        sub_concepts=sub_concept_instruction,
    ) + doc_section
```

- [ ] **Step 2: Verify**

```bash
cd backend
python -c "
from app.prompts.socratic import build_system_prompt
p = build_system_prompt('photosynthesis')
assert '{topic}' not in p
assert 'Light is the energy source' in p
p2 = build_system_prompt('My custom topic', document_text='Some article text here')
assert '<document>' in p2
print('ok')
"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/prompts/
git commit -m "feat: socratic system prompt and topic rubrics"
```

---

### Task 5: Assessment parsing service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/scoring.py`
- Create: `backend/tests/test_scoring.py`

**Interfaces:**
- Produces: `extract_assessment(text: str) -> tuple[str, Assessment | None]`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_scoring.py
import pytest
from app.services.scoring import extract_assessment

VALID_RESPONSE = """Okay I think I get it now!
<assessment>
{
  "topic": "photosynthesis",
  "sub_concepts": [
    {"name": "Light energy", "status": "UNDERSTOOD", "evidence": "User explained chlorophyll"}
  ],
  "overall_score": 75,
  "biggest_gap": "Calvin cycle not mentioned",
  "strongest_point": "Good explanation of chlorophyll",
  "misconceptions": []
}
</assessment>"""

def test_extracts_visible_text():
    visible, _ = extract_assessment(VALID_RESPONSE)
    assert "Okay I think I get it now!" in visible
    assert "<assessment>" not in visible

def test_parses_assessment():
    _, assessment = extract_assessment(VALID_RESPONSE)
    assert assessment is not None
    assert assessment.overall_score == 75
    assert assessment.topic == "photosynthesis"
    assert len(assessment.sub_concepts) == 1
    assert assessment.sub_concepts[0].status == "UNDERSTOOD"

def test_no_assessment_block():
    visible, assessment = extract_assessment("Just a normal Koda response.")
    assert visible == "Just a normal Koda response."
    assert assessment is None

def test_malformed_json_returns_none():
    bad = "Some text <assessment>not valid json{{{</assessment>"
    visible, assessment = extract_assessment(bad)
    assert assessment is None
    assert "Some text" in visible
```

- [ ] **Step 2: Run — expect failure**

```bash
cd backend
python -m pytest tests/test_scoring.py -v
```

Expected: `ModuleNotFoundError` or `ImportError`

- [ ] **Step 3: Write `scoring.py`**

```python
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
```

- [ ] **Step 4: Run — expect pass**

```bash
python -m pytest tests/test_scoring.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ backend/tests/test_scoring.py
git commit -m "feat: assessment parsing service"
```

---

### Task 6: Mock AI service

**Files:**
- Create: `backend/app/services/mock.py`
- Create: `backend/tests/test_mock.py`

**Interfaces:**
- Consumes: `topic: str`, `messages: list[dict]` (each with `role` and `content` keys)
- Produces: `mock_chat(topic: str, messages: list[dict]) -> str`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_mock.py
import pytest
import asyncio
from app.services.mock import mock_chat

def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)

def test_first_response_is_opener():
    result = run(mock_chat("photosynthesis", []))
    assert "photosynthesis" in result
    assert "explain" in result.lower()

def test_later_response_is_different():
    messages = [
        {"role": "assistant", "content": "Hey explain photosynthesis"},
        {"role": "user", "content": "It is when plants make food"},
        {"role": "assistant", "content": "Okay but WHY?"},
        {"role": "user", "content": "Because of sunlight"},
    ]
    result = run(mock_chat("photosynthesis", messages))
    assert isinstance(result, str)
    assert len(result) > 0

def test_final_response_contains_assessment():
    # Build 9 user turns to trigger end-of-session response
    messages = []
    for i in range(9):
        messages.append({"role": "user", "content": f"turn {i}"})
        messages.append({"role": "assistant", "content": "okay"})
    result = run(mock_chat("photosynthesis", messages))
    assert "<assessment>" in result
```

- [ ] **Step 2: Run — expect failure**

```bash
python -m pytest tests/test_mock.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Write `mock.py`**

```python
_MOCK_TURNS = [
    "Hey! So I keep hearing about {topic} but I honestly don't really get it. Can you explain it to me like I'm starting from zero?",
    "Okay so... I think I'm following. But WHY does that happen exactly?",
    "Can you give me a concrete example of that? I learn way better with examples.",
    "Hmm wait — so if I'm understanding right, {topic} is basically just that one thing you mentioned?",
    "I think I get parts of it. But what would happen if you changed one of those factors? Like what breaks?",
    "Okay but I read somewhere there's another side to this. How does that fit with what you're saying?",
    "So you're saying... the main point is what causes the effect, not the effect itself? Did I get that right?",
    "That's starting to make more sense. Can you connect it back to the first part you explained?",
    "Hmm, one more thing — what happens in an edge case, like when conditions aren't normal?",
    (
        "Okay I think I actually get {topic} now. Thanks for explaining!\n"
        "<assessment>\n"
        '{{\n'
        '  "topic": "{topic}",\n'
        '  "sub_concepts": [\n'
        '    {{"name": "Core mechanism", "status": "UNDERSTOOD", "evidence": "User described the process clearly"}},\n'
        '    {{"name": "Cause and effect", "status": "SURFACE", "evidence": "Mentioned but not fully explained"}}\n'
        '  ],\n'
        '  "overall_score": 68,\n'
        '  "biggest_gap": "Edge cases and exceptions not addressed",\n'
        '  "strongest_point": "Good use of concrete examples",\n'
        '  "misconceptions": []\n'
        "}}\n"
        "</assessment>"
    ),
]


async def mock_chat(topic: str, messages: list[dict]) -> str:
    user_turns = sum(1 for m in messages if m.get("role") == "user")
    idx = min(user_turns, len(_MOCK_TURNS) - 1)
    return _MOCK_TURNS[idx].replace("{topic}", topic)
```

- [ ] **Step 4: Run — expect pass**

```bash
python -m pytest tests/test_mock.py -v
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/mock.py backend/tests/test_mock.py
git commit -m "feat: mock AI service for development"
```

---

### Task 7: AI provider clients + abstraction

**Files:**
- Create: `backend/app/services/gemini.py`
- Create: `backend/app/services/groq.py`
- Create: `backend/app/services/ai.py`

**Interfaces:**
- Produces: `chat(system_prompt: str, messages: list[dict], topic: str = "") -> str`; `groq_transcribe(audio_bytes: bytes, filename: str) -> str`

- [ ] **Step 1: Write `gemini.py`**

```python
import httpx
from app.config import settings

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)


async def gemini_chat(system_prompt: str, messages: list[dict]) -> str:
    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
    ]
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": settings.ai_max_tokens},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_GEMINI_URL}?key={settings.gemini_api_key}", json=payload
        )
        resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
```

- [ ] **Step 2: Write `groq.py`**

```python
import httpx
from app.config import settings

_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_GROQ_AUDIO_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


async def groq_chat(system_prompt: str, messages: list[dict]) -> str:
    msgs = [{"role": "system", "content": system_prompt}] + messages
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": msgs,
        "max_tokens": settings.ai_max_tokens,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            _GROQ_CHAT_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        )
        resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


async def groq_transcribe(audio_bytes: bytes, filename: str = "audio.m4a") -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _GROQ_AUDIO_URL,
            files={"file": (filename, audio_bytes, "audio/m4a")},
            data={"model": "whisper-large-v3"},
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        )
        resp.raise_for_status()
    return resp.json()["text"]
```

- [ ] **Step 3: Write `ai.py`**

```python
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
```

- [ ] **Step 4: Smoke test**

```bash
cd backend
AI_PROVIDER=mock python -c "
import asyncio
from app.services.ai import chat
result = asyncio.run(chat('system', [], topic='photosynthesis'))
print(result[:80])
"
```

Expected: first line of mock opener printed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/gemini.py backend/app/services/groq.py backend/app/services/ai.py
git commit -m "feat: AI provider clients and abstraction layer with Gemini→Groq failover"
```

---

### Task 8: URL scraper service

**Files:**
- Create: `backend/app/services/scraper.py`
- Create: `backend/tests/test_scraper.py`

**Interfaces:**
- Produces: `fetch_url_text(url: str) -> str` (raises `ValueError` if no text extractable)

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_scraper.py
import pytest
import respx
import httpx
import asyncio
from app.services.scraper import fetch_url_text

SAMPLE_HTML = """
<html><body>
<nav>Nav junk</nav>
<article>
  <h1>Photosynthesis Explained</h1>
  <p>Photosynthesis is the process by which plants convert sunlight into glucose.</p>
  <p>It happens in the chloroplasts using carbon dioxide and water.</p>
</article>
<footer>Footer junk</footer>
</body></html>
"""

@respx.mock
def test_extracts_article_text():
    respx.get("https://example.com/article").mock(
        return_value=httpx.Response(200, text=SAMPLE_HTML)
    )
    result = asyncio.get_event_loop().run_until_complete(
        fetch_url_text("https://example.com/article")
    )
    assert "Photosynthesis" in result
    assert "Nav junk" not in result

@respx.mock
def test_raises_on_empty_extraction():
    respx.get("https://example.com/empty").mock(
        return_value=httpx.Response(200, text="<html><body></body></html>")
    )
    with pytest.raises(ValueError, match="Could not extract"):
        asyncio.get_event_loop().run_until_complete(
            fetch_url_text("https://example.com/empty")
        )
```

- [ ] **Step 2: Run — expect failure**

```bash
python -m pytest tests/test_scraper.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Write `scraper.py`**

```python
import httpx
import trafilatura


async def fetch_url_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "ExplainItBack/1.0"})
        resp.raise_for_status()
        html = resp.text

    text = trafilatura.extract(html, include_comments=False, include_tables=False)
    if not text:
        raise ValueError("Could not extract readable text from URL")
    return text
```

- [ ] **Step 4: Run — expect pass**

```bash
python -m pytest tests/test_scraper.py -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/scraper.py backend/tests/test_scraper.py
git commit -m "feat: URL scraper service"
```

---

### Task 9: Sessions router + transcription endpoint

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/sessions.py`
- Create: `backend/tests/test_sessions.py`
- Modify: `backend/app/main.py` — mount sessions router, add `/topics`

**Interfaces:**
- Consumes: `chat()` from `app.services.ai`; `extract_assessment()` from `app.services.scoring`; `fetch_url_text()` from `app.services.scraper`; `build_system_prompt()` from `app.prompts.socratic`
- Produces: `POST /sessions/start`, `POST /sessions/message`, `POST /sessions/transcribe`, `GET /topics`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_sessions.py
import pytest
import os
os.environ["AI_PROVIDER"] = "mock"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_start_session():
    resp = client.post("/sessions/start", json={"topic": "photosynthesis"})
    assert resp.status_code == 200
    data = resp.json()
    assert "first_message" in data
    assert data["topic"] == "photosynthesis"
    assert "photosynthesis" in data["first_message"].lower()

def test_send_message():
    resp = client.post("/sessions/message", json={
        "topic": "photosynthesis",
        "messages": [
            {"role": "assistant", "content": "Hey explain photosynthesis"},
        ],
        "user_message": "Plants use sunlight to make food",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert isinstance(data["turn_count"], int)
    assert isinstance(data["is_complete"], bool)

def test_topics_endpoint():
    resp = client.get("/topics")
    assert resp.status_code == 200
    data = resp.json()
    assert "topics" in data
    assert len(data["topics"]) >= 5
    assert data["custom_allowed"] is True

def test_max_turns_enforced():
    messages = []
    for i in range(20):
        messages.append({"role": "user", "content": f"turn {i}"})
        messages.append({"role": "assistant", "content": "okay"})
    resp = client.post("/sessions/message", json={
        "topic": "photosynthesis",
        "messages": messages,
        "user_message": "one more",
    })
    assert resp.status_code == 400
```

- [ ] **Step 2: Run — expect failure**

```bash
python -m pytest tests/test_sessions.py -v
```

Expected: failures because router doesn't exist yet

- [ ] **Step 3: Write `sessions.py`**

```python
import bleach
from fastapi import APIRouter, HTTPException, UploadFile, File
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


def sanitize_for_ai(user_message: str) -> str:
    cleaned = bleach.clean(user_message, tags=[], strip=True)[:2000]
    return f"[Student says]: {cleaned}"


@router.post("/start", response_model=SessionStartResponse)
async def start_session(req: SessionStartRequest):
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
async def send_message(req: SessionMessageRequest):
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
```

- [ ] **Step 4: Update `main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sessions

app = FastAPI(title="Explain It Back API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/sessions")


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
```

- [ ] **Step 5: Run tests — expect pass**

```bash
python -m pytest tests/ -v
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/ backend/app/main.py backend/tests/test_sessions.py
git commit -m "feat: sessions router with start, message, and transcribe endpoints"
git push
```

---

### Task 10: Supabase client + auth router

**Files:**
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/supabase.py`
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py` — mount auth router

**Interfaces:**
- Produces: `GET /auth/signup`, `POST /auth/login`; `get_supabase() -> Client`

- [ ] **Step 1: Write `supabase.py`**

```python
from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client
```

- [ ] **Step 2: Write `auth.py`**

```python
from fastapi import APIRouter, HTTPException
from app.models.schemas import SignupRequest, AuthResponse
from app.db.supabase import get_supabase

router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    try:
        result = get_supabase().auth.sign_up({"email": req.email, "password": req.password})
        return AuthResponse(user_id=result.user.id, access_token=result.session.access_token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/login", response_model=AuthResponse)
async def login(req: SignupRequest):
    try:
        result = get_supabase().auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        return AuthResponse(user_id=result.user.id, access_token=result.session.access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
```

- [ ] **Step 3: Mount auth router in `main.py`** — add after existing `sessions` import:

```python
from app.routers import sessions, auth   # add auth here

# after existing include_router line:
app.include_router(auth.router, prefix="/auth")
```

- [ ] **Step 4: Verify startup**

```bash
AI_PROVIDER=mock uvicorn app.main:app --reload
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add backend/app/db/ backend/app/routers/auth.py backend/app/main.py
git commit -m "feat: Supabase client and auth router"
git push
```

---

### Task 11: Deploy backend to Render

**Files:**
- Create: `backend/Dockerfile` (for reference; Render uses native Python runtime)

**Interfaces:**
- Produces: live API at `https://explainitback-api.onrender.com/health`

- [ ] **Step 1: Write Dockerfile (for local Docker use)**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Connect Render to GitHub**

1. Go to https://render.com → New → Web Service
2. Connect GitHub → select `chevrechou/explainitback`
3. Root directory: `backend`
4. Runtime: Python 3
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Set env vars in Render dashboard:
   - `AI_PROVIDER` = `mock`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (leave blank for now)

- [ ] **Step 3: Verify live health check**

```bash
curl https://explainitback-api.onrender.com/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Note the URL**

Save the Render URL — you'll need it as `EXPO_PUBLIC_API_URL` in the frontend.

- [ ] **Step 5: Commit Dockerfile**

```bash
git add backend/Dockerfile
git commit -m "chore: add Dockerfile"
git push
```

---

### Task 12: Expo project scaffold

**Files:**
- Create: `mobile/` — entire Expo project

**Interfaces:**
- Produces: `npx expo start --web` serves a blank app at `localhost:8081`

- [ ] **Step 1: Scaffold**

```bash
cd ~/Desktop/explainitback
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
npx expo install expo-router expo-av react-native-reanimated @react-native-async-storage/async-storage expo-crypto
npm install zustand
```

- [ ] **Step 2: Update `app.json`**

Replace the contents:

```json
{
  "expo": {
    "name": "Explain It Back",
    "slug": "explainitback",
    "version": "1.0.0",
    "scheme": "explainitback",
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "plugins": [
      "expo-router",
      "expo-av"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 3: Update `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 4: Update `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

- [ ] **Step 5: Add `.env` for the API URL**

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 6: Verify**

```bash
npx expo start --web
```

Open `http://localhost:8081` — blank Expo app should load.

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/
git commit -m "feat: Expo project scaffold with expo-router"
git push
```

---

### Task 13: Shared types + API client + Zustand store

**Files:**
- Create: `mobile/lib/types.ts`
- Create: `mobile/lib/api.ts`
- Create: `mobile/lib/store.ts`

**Interfaces:**
- Produces: `useStore` hook; `api` object; all shared TypeScript types

- [ ] **Step 1: Write `types.ts`**

```typescript
export type Message = {
  role: 'user' | 'assistant'
  content: string
}

export type SubConcept = {
  name: string
  status: 'NOT_ADDRESSED' | 'SURFACE' | 'UNDERSTOOD'
  evidence: string
}

export type Assessment = {
  topic: string
  overall_score: number
  sub_concepts: SubConcept[]
  biggest_gap: string
  strongest_point: string
  misconceptions: string[]
}

export type Topic = {
  id: string
  name: string
  subject: string
  emoji: string
  sub_concept_count: number
}

export type User = {
  id: string
  accessToken: string
}

export type SessionState = {
  sessionId: string
  topic: string
  messages: Message[]
  turnCount: number
  documentText: string | null
  scorecard: Assessment | null
  isComplete: boolean
}
```

- [ ] **Step 2: Write `api.ts`**

```typescript
import { Assessment, Message, Topic } from './types'

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  signup: (email: string, password: string) =>
    request<{ user_id: string; access_token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user_id: string; access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getTopics: () =>
    request<{ topics: Topic[]; custom_allowed: boolean }>('/topics'),

  startSession: (
    topic: string,
    documentText?: string | null,
    documentUrl?: string | null,
    token?: string | null,
  ) =>
    request<{ first_message: string; topic: string }>(
      '/sessions/start',
      {
        method: 'POST',
        body: JSON.stringify({
          topic,
          document_text: documentText ?? undefined,
          document_url: documentUrl ?? undefined,
        }),
      },
      token,
    ),

  sendMessage: (
    topic: string,
    messages: Message[],
    userMessage: string,
    documentText?: string | null,
    token?: string | null,
  ) =>
    request<{
      response: string
      turn_count: number
      is_complete: boolean
      assessment?: Assessment
    }>(
      '/sessions/message',
      {
        method: 'POST',
        body: JSON.stringify({
          topic,
          messages,
          user_message: userMessage,
          document_text: documentText ?? undefined,
        }),
      },
      token,
    ),

  transcribeAudio: async (audioBlob: Blob, filename: string, token?: string | null) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, filename)
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}/sessions/transcribe`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) throw new Error(`Transcription failed: HTTP ${res.status}`)
    return res.json() as Promise<{ text: string }>
  },
}
```

- [ ] **Step 3: Write `store.ts`**

```typescript
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Assessment, Message, SessionState, User } from './types'

type Store = {
  user: User | null
  session: SessionState | null
  setUser: (user: User | null) => Promise<void>
  loadUser: () => Promise<void>
  startSession: (
    sessionId: string,
    topic: string,
    firstMessage: string,
    documentText?: string | null,
  ) => void
  addMessages: (userMsg: Message, assistantMsg: Message, turnCount: number) => void
  completeSession: (scorecard: Assessment, turnCount: number) => void
  clearSession: () => void
}

export const useStore = create<Store>((set) => ({
  user: null,
  session: null,

  setUser: async (user) => {
    set({ user })
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user))
    } else {
      await AsyncStorage.removeItem('user')
    }
  },

  loadUser: async () => {
    const raw = await AsyncStorage.getItem('user')
    if (raw) set({ user: JSON.parse(raw) as User })
  },

  startSession: (sessionId, topic, firstMessage, documentText = null) =>
    set({
      session: {
        sessionId,
        topic,
        messages: [{ role: 'assistant', content: firstMessage }],
        turnCount: 0,
        documentText,
        scorecard: null,
        isComplete: false,
      },
    }),

  addMessages: (userMsg, assistantMsg, turnCount) =>
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            messages: [...state.session.messages, userMsg, assistantMsg],
            turnCount,
          }
        : null,
    })),

  completeSession: (scorecard, turnCount) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, scorecard, turnCount, isComplete: true }
        : null,
    })),

  clearSession: () => set({ session: null }),
}))
```

- [ ] **Step 4: Type-check**

```bash
cd mobile
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/lib/
git commit -m "feat: shared types, API client, Zustand store"
```

---

### Task 14: Root layout + auth screen

**Files:**
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/auth.tsx`

**Interfaces:**
- Consumes: `useStore` — `loadUser`, `setUser`, `user`; `api.signup`, `api.login`
- Produces: navigation shell; working signup/login form

- [ ] **Step 1: Write `_layout.tsx`**

```tsx
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useStore } from '../lib/store'

export default function RootLayout() {
  const loadUser = useStore((s) => s.loadUser)

  useEffect(() => {
    loadUser()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="scorecard/[id]" />
    </Stack>
  )
}
```

- [ ] **Step 2: Write `auth.tsx`**

```tsx
import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useStore((s) => s.setUser)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const result = mode === 'login'
        ? await api.login(email, password)
        : await api.signup(email, password)
      await setUser({ id: result.user_id, accessToken: result.access_token })
      router.back()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={styles.toggle}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.skip}>
        <Text style={styles.skipText}>Continue as guest</Text>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 14, marginBottom: 12, fontSize: 16, backgroundColor: '#fff',
  },
  error: { color: '#dc2626', marginBottom: 12 },
  button: {
    backgroundColor: '#22c55e', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggle: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  skip: { marginTop: 16, alignItems: 'center' },
  skipText: { color: '#64748b', textDecorationLine: 'underline' },
})
```

- [ ] **Step 3: Verify**

```bash
cd mobile && npx expo start --web
```

Navigate to `/auth` — login form should render with email, password fields and "Continue as guest."

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/app/
git commit -m "feat: root layout and auth screen"
```

---

### Task 15: Topic picker screen + components

**Files:**
- Create: `mobile/components/TopicCard.tsx`
- Create: `mobile/components/DocumentInput.tsx`
- Create: `mobile/app/index.tsx`

**Interfaces:**
- Consumes: `api.getTopics()`, `api.startSession()`; `useStore` — `startSession`, `user`
- Produces: home screen where user picks a topic or pastes a document/URL and starts a session

- [ ] **Step 1: Write `TopicCard.tsx`**

```tsx
import { Pressable, Text, StyleSheet, View } from 'react-native'
import { Topic } from '../lib/types'

type Props = { topic: Topic; onPress: () => void }

export function TopicCard({ topic, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.emoji}>{topic.emoji}</Text>
      <Text style={styles.name}>{topic.name}</Text>
      <Text style={styles.subject}>{topic.subject}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1, margin: 6, padding: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  emoji: { fontSize: 28, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  subject: { fontSize: 12, color: '#64748b' },
})
```

- [ ] **Step 2: Write `DocumentInput.tsx`**

```tsx
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'

type Props = {
  value: string
  label: string
  onChangeValue: (v: string) => void
  onChangeLabel: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function DocumentInput({ value, label, onChangeValue, onChangeLabel, onSubmit, disabled }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Or paste a document / URL</Text>
      <TextInput
        style={[styles.textarea, styles.input]}
        placeholder="Paste text or a URL (https://...)"
        value={value}
        onChangeText={onChangeValue}
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={styles.input}
        placeholder="Topic name (optional)"
        value={label}
        onChangeText={onChangeLabel}
      />
      <Pressable
        style={[styles.button, disabled && styles.disabled]}
        onPress={onSubmit}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>Start →</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderColor: '#e2e8f0' },
  heading: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, marginBottom: 10, backgroundColor: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  button: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
```

- [ ] **Step 3: Write `app/index.tsx`**

```tsx
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Pressable, FlatList, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { TopicCard } from '../components/TopicCard'
import { DocumentInput } from '../components/DocumentInput'
import { Topic } from '../lib/types'

export default function TopicPicker() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [docValue, setDocValue] = useState('')
  const [docLabel, setDocLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, startSession } = useStore()

  useEffect(() => {
    api.getTopics().then((r) => setTopics(r.topics)).catch(() => {})
  }, [])

  async function handleStart(topic: string, documentText?: string) {
    setLoading(true)
    try {
      const isUrl = documentText?.startsWith('http')
      const res = await api.startSession(
        topic,
        isUrl ? null : documentText,
        isUrl ? documentText : null,
        user?.accessToken,
      )
      const sessionId = randomUUID()
      startSession(sessionId, res.topic, res.first_message, isUrl ? null : (documentText ?? null))
      router.push(`/session/${sessionId}`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Explain It Back</Text>
        {user ? (
          <Pressable onPress={() => useStore.getState().setUser(null)}>
            <Text style={styles.authLink}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/auth')}>
            <Text style={styles.authLink}>Sign in</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.subtitle}>
        Pick a topic and teach it to Koda. He'll ask questions until he gets it — or until he finds out you don't.
      </Text>

      {loading && <ActivityIndicator style={{ marginVertical: 24 }} color="#22c55e" />}

      <FlatList
        data={topics}
        numColumns={2}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TopicCard topic={item} onPress={() => !loading && handleStart(item.name)} />
        )}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
      />

      <DocumentInput
        value={docValue}
        label={docLabel}
        onChangeValue={setDocValue}
        onChangeLabel={setDocLabel}
        onSubmit={() => handleStart(docLabel || 'Custom Topic', docValue)}
        disabled={loading || !docValue.trim()}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  authLink: { color: '#22c55e', fontWeight: '600' },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  row: { marginHorizontal: -6 },
})
```

- [ ] **Step 4: Verify**

```bash
npx expo start --web
```

Home screen should show topic grid and document input. Tapping a topic should call the backend (mock mode) and navigate to `/session/<uuid>`.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/components/TopicCard.tsx mobile/components/DocumentInput.tsx mobile/app/index.tsx
git commit -m "feat: topic picker screen"
```

---

### Task 16: Chat components

**Files:**
- Create: `mobile/components/ChatBubble.tsx`
- Create: `mobile/components/KodaTyping.tsx`

**Interfaces:**
- Produces: `<ChatBubble message={Message} />`, `<KodaTyping />`

- [ ] **Step 1: Write `ChatBubble.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { Message } from '../lib/types'

type Props = { message: Message }

export function ChatBubble({ message }: Props) {
  const isKoda = message.role === 'assistant'
  return (
    <View style={[styles.row, isKoda ? styles.rowLeft : styles.rowRight]}>
      {isKoda && <Text style={styles.kodaLabel}>KODA</Text>}
      <View style={[styles.bubble, isKoda ? styles.kodaBubble : styles.userBubble]}>
        <Text style={[styles.text, !isKoda && styles.userText]}>{message.content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, maxWidth: '80%' },
  rowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  rowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  kodaLabel: { fontSize: 10, fontWeight: '700', color: '#22c55e', marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  kodaBubble: { backgroundColor: '#f0fdf4', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  userBubble: { backgroundColor: '#0f172a', borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: '#0f172a', lineHeight: 22 },
  userText: { color: '#fff' },
})
```

- [ ] **Step 2: Write `KodaTyping.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'

export function KodaTyping() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    )
    anims.forEach((a) => a.start())
    return () => anims.forEach((a) => a.stop())
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginVertical: 4 },
  bubble: { flexDirection: 'row', backgroundColor: '#f0fdf4', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
})
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/components/ChatBubble.tsx mobile/components/KodaTyping.tsx
git commit -m "feat: chat bubble and typing indicator components"
```

---

### Task 17: Voice button

**Files:**
- Create: `mobile/components/VoiceButton.tsx`

**Interfaces:**
- Consumes: `api.transcribeAudio()`; `useStore` — `user`
- Produces: `<VoiceButton onTranscript={(text) => void} disabled? />` — hold-to-talk on native, click-to-talk on web

- [ ] **Step 1: Write `VoiceButton.tsx`**

```tsx
import { useState, useRef } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { Audio } from 'expo-av'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

type Props = { onTranscript: (text: string) => void; disabled?: boolean }

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const user = useStore((s) => s.user)

  // ── Native (iOS/Android) ──────────────────────────────────────────────
  async function startNativeRecording() {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) return
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    )
    recordingRef.current = recording
    setState('recording')
  }

  async function stopNativeRecording() {
    const recording = recordingRef.current
    if (!recording) return
    setState('transcribing')
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    recordingRef.current = null
    if (!uri) { setState('idle'); return }
    try {
      const blob = await (await fetch(uri)).blob()
      const { text } = await api.transcribeAudio(blob, 'audio.m4a', user?.accessToken)
      onTranscript(text)
    } catch {
      // silently ignore transcription errors
    } finally {
      setState('idle')
    }
  }

  // ── Web (Chrome / Edge) ───────────────────────────────────────────────
  function handleWebVoice() {
    // @ts-ignore — Web Speech API not in TS lib
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is not supported in this browser. Use Chrome or Edge.')
      return
    }
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setState('recording')
    recognition.onend = () => setState('idle')
    recognition.onresult = (e: any) => onTranscript(e.results[0][0].transcript)
    recognition.start()
  }

  function handlePressIn() {
    if (disabled || state !== 'idle') return
    if (Platform.OS === 'web') {
      handleWebVoice()
    } else {
      startNativeRecording()
    }
  }

  function handlePressOut() {
    if (Platform.OS !== 'web' && state === 'recording') {
      stopNativeRecording()
    }
  }

  const isRecording = state === 'recording'
  const isTranscribing = state === 'transcribing'

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isTranscribing}
      style={[
        styles.button,
        isRecording && styles.recording,
        (disabled || isTranscribing) && styles.faded,
      ]}
    >
      {isTranscribing ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.icon}>{isRecording ? '⏹' : '🎙'}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#16a34a',
  },
  recording: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
  faded: { opacity: 0.4 },
  icon: { fontSize: 22 },
})
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/components/VoiceButton.tsx
git commit -m "feat: voice button (Web Speech API + expo-av + Groq Whisper)"
```

---

### Task 18: Chat session screen

**Files:**
- Create: `mobile/app/session/[id].tsx`

**Interfaces:**
- Consumes: `useStore` — `session`, `addMessages`, `completeSession`; `api.sendMessage()`; `ChatBubble`, `KodaTyping`, `VoiceButton`
- Produces: full conversation screen; navigates to `/scorecard/<sessionId>` when `is_complete = true`

- [ ] **Step 1: Write `session/[id].tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { api } from '../../lib/api'
import { useStore } from '../../lib/store'
import { ChatBubble } from '../../components/ChatBubble'
import { KodaTyping } from '../../components/KodaTyping'
import { VoiceButton } from '../../components/VoiceButton'
import { Message } from '../../lib/types'

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const listRef = useRef<FlatList>(null)
  const { session, user, addMessages, completeSession } = useStore()

  useEffect(() => {
    if (session?.isComplete && session.scorecard) {
      const timer = setTimeout(() => router.replace(`/scorecard/${id}`), 1500)
      return () => clearTimeout(timer)
    }
  }, [session?.isComplete])

  async function sendMessage(text: string) {
    if (!text.trim() || waiting || !session) return
    setInput('')
    setWaiting(true)

    const userMsg: Message = { role: 'user', content: text.trim() }

    try {
      const res = await api.sendMessage(
        session.topic,
        session.messages,
        text.trim(),
        session.documentText,
        user?.accessToken,
      )
      const assistantMsg: Message = { role: 'assistant', content: res.response }

      if (res.is_complete && res.assessment) {
        addMessages(userMsg, assistantMsg, res.turn_count)
        completeSession(res.assessment, res.turn_count)
      } else {
        addMessages(userMsg, assistantMsg, res.turn_count)
      }
    } catch (e: any) {
      const errMsg: Message = { role: 'assistant', content: "Sorry, I zoned out for a sec. Can you say that again?" }
      addMessages(userMsg, errMsg, session.turnCount + 1)
    } finally {
      setWaiting(false)
    }
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Session not found. Go back and start a new one.</Text>
        <Pressable onPress={() => router.replace('/')}><Text style={styles.link}>Go home</Text></Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace('/')}><Text style={styles.back}>←</Text></Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>Teaching Koda: {session.topic}</Text>
        <Text style={styles.turnCount}>{session.turnCount} / 20</Text>
      </View>

      <FlatList
        ref={listRef}
        data={session.messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ChatBubble message={item} />}
        ListFooterComponent={waiting ? <KodaTyping /> : null}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your explanation..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          multiline
        />
        <VoiceButton onTranscript={(t) => sendMessage(t)} disabled={waiting} />
        <Pressable
          style={[styles.sendButton, (!input.trim() || waiting) && styles.sendDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || waiting}
        >
          <Text style={styles.sendText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#64748b', textAlign: 'center', marginBottom: 16 },
  link: { color: '#22c55e', fontWeight: '600' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    gap: 12,
  },
  back: { fontSize: 20, color: '#0f172a' },
  topBarTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  turnCount: { fontSize: 13, color: '#64748b' },
  list: { padding: 16, paddingBottom: 8 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  textInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120, backgroundColor: '#fafaf9',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.3 },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
```

- [ ] **Step 2: Verify end-to-end**

```bash
npx expo start --web
```

1. Pick a topic → chat screen opens with Koda's opener
2. Send a few messages → Koda responds (mock AI)
3. After ~9 turns → session completes, auto-navigates to `/scorecard/<id>` (page will 404 until Task 19)

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/app/session/
git commit -m "feat: chat session screen with voice input"
git push
```

---

### Task 19: Scorecard components + screen

**Files:**
- Create: `mobile/components/ConceptPill.tsx`
- Create: `mobile/components/ScorecardView.tsx`
- Create: `mobile/app/scorecard/[id].tsx`

**Interfaces:**
- Consumes: `useStore` — `session.scorecard`, `clearSession`
- Produces: full scorecard display; "Try Another Topic" resets session and returns home

- [ ] **Step 1: Write `ConceptPill.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { SubConcept } from '../lib/types'

const CONFIG = {
  UNDERSTOOD: { label: 'Got it', bg: '#dcfce7', color: '#166534' },
  SURFACE:    { label: 'Surface', bg: '#fef9c3', color: '#854d0e' },
  NOT_ADDRESSED: { label: 'Missed', bg: '#f1f5f9', color: '#64748b' },
} as const

type Props = { concept: SubConcept }

export function ConceptPill({ concept }: Props) {
  const cfg = CONFIG[concept.status as keyof typeof CONFIG] ?? CONFIG.NOT_ADDRESSED
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      <Text style={styles.name}>{concept.name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  pillText: { fontSize: 12, fontWeight: '600' },
  name: { fontSize: 14, color: '#0f172a', flex: 1 },
})
```

- [ ] **Step 2: Write `ScorecardView.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { Assessment } from '../lib/types'
import { ConceptPill } from './ConceptPill'

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

type Props = { assessment: Assessment }

export function ScorecardView({ assessment }: Props) {
  return (
    <View>
      <View style={styles.scoreBlock}>
        <Text style={[styles.score, { color: scoreColor(assessment.overall_score) }]}>
          {assessment.overall_score}
        </Text>
        <Text style={styles.scoreLabel}>Comprehension Score</Text>
      </View>

      <Text style={styles.sectionTitle}>Concepts</Text>
      {assessment.sub_concepts.map((c, i) => <ConceptPill key={i} concept={c} />)}

      <View style={[styles.card, styles.greenCard]}>
        <Text style={styles.cardTitle}>Strongest point</Text>
        <Text style={styles.cardBody}>{assessment.strongest_point}</Text>
      </View>

      <View style={[styles.card, styles.yellowCard]}>
        <Text style={styles.cardTitle}>Biggest gap</Text>
        <Text style={styles.cardBody}>{assessment.biggest_gap}</Text>
      </View>

      {assessment.misconceptions.length > 0 && (
        <View style={[styles.card, styles.redCard]}>
          <Text style={styles.cardTitle}>Misconceptions</Text>
          {assessment.misconceptions.map((m, i) => (
            <Text key={i} style={styles.cardBody}>• {m}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scoreBlock: { alignItems: 'center', marginVertical: 24 },
  score: { fontSize: 72, fontWeight: '800' },
  scoreLabel: { fontSize: 15, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 8 },
  card: { borderRadius: 12, padding: 16, marginTop: 12 },
  greenCard: { backgroundColor: '#dcfce7' },
  yellowCard: { backgroundColor: '#fef9c3' },
  redCard: { backgroundColor: '#fee2e2' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  cardBody: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
})
```

- [ ] **Step 3: Write `scorecard/[id].tsx`**

```tsx
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '../../lib/store'
import { ScorecardView } from '../../components/ScorecardView'

export default function ScorecardScreen() {
  const { session, clearSession } = useStore()

  if (!session?.scorecard) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No scorecard yet.</Text>
        <Pressable onPress={() => router.replace('/')}><Text style={styles.link}>Go home</Text></Pressable>
      </View>
    )
  }

  function handleTryAnother() {
    clearSession()
    router.replace('/')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Your results for</Text>
      <Text style={styles.topic}>{session.scorecard.topic}</Text>

      <ScorecardView assessment={session.scorecard} />

      <Pressable style={styles.button} onPress={handleTryAnother}>
        <Text style={styles.buttonText}>Try Another Topic</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  heading: { fontSize: 14, color: '#64748b' },
  topic: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  muted: { color: '#64748b' },
  link: { color: '#22c55e', fontWeight: '600' },
  button: {
    marginTop: 32, backgroundColor: '#0f172a', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 4: Full end-to-end test**

```bash
npx expo start --web
```

1. Pick "Photosynthesis" → chat with Koda for ~9 turns → scorecard shows with score, pills, gap card
2. "Try Another Topic" → returns home, session cleared

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/components/ConceptPill.tsx mobile/components/ScorecardView.tsx mobile/app/scorecard/
git commit -m "feat: scorecard components and screen"
git push
```

---

### Task 20: Deploy web to Vercel

**Files:**
- Create: `mobile/vercel.json`

**Interfaces:**
- Produces: live web app at `https://explainitback.vercel.app` (or similar)

- [ ] **Step 1: Write `mobile/vercel.json`**

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Set env vars in Vercel**

In the Vercel dashboard (or via CLI) set:
```
EXPO_PUBLIC_API_URL=https://explainitback-api.onrender.com
```

- [ ] **Step 3: Connect Vercel to GitHub**

1. Go to vercel.com → New Project → Import `chevrechou/explainitback`
2. Set root directory to `mobile`
3. Framework: Other
4. Add the env var above
5. Deploy

- [ ] **Step 4: Verify**

Open the Vercel URL → topic picker loads → pick a topic → chat works against live Render API.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/explainitback
git add mobile/vercel.json
git commit -m "chore: Vercel deploy config"
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| React Native + Expo web + mobile | Task 12 |
| FastAPI backend | Task 2 |
| Gemini primary + Groq fallback | Task 7 |
| Mock AI mode | Task 6 |
| Supabase auth (optional) | Tasks 10, 14 |
| `/topics` endpoint | Task 9 |
| `/sessions/start` + `/sessions/message` | Task 9 |
| `/sessions/transcribe` | Task 9 |
| Input sanitization (`sanitize_for_ai`) | Task 9 |
| `<assessment>` block parsing | Task 5 |
| Document/URL paste mode | Tasks 9, 15 |
| Server-side URL scraping | Task 8 |
| Voice (Web Speech + expo-av + Groq Whisper) | Task 17 |
| Topic picker screen | Task 15 |
| Chat session screen | Task 18 |
| Scorecard screen | Task 19 |
| Max turns (20) enforced | Task 9 |
| Deploy Render + Vercel | Tasks 11, 20 |
| CI (GitHub Actions) | Task 1 |
| Rate limiting (slowapi) | **Missing — add below** |

**Missing: Rate limiting** — `slowapi` is in `requirements.txt` but not wired up. Add it in `main.py` as part of Task 9 follow-up:

```python
# Add to main.py after imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Then decorate in sessions.py:
@router.post("/start")
@limiter.limit("10/minute")
async def start_session(request: Request, req: SessionStartRequest):
    ...

@router.post("/message")
@limiter.limit("30/minute")
async def send_message(request: Request, req: SessionMessageRequest):
    ...

# And in auth.py:
@router.post("/signup")
@limiter.limit("10/minute")
async def signup(request: Request, req: SignupRequest):
    ...
```

Add `from fastapi import Request` to both router files when adding rate limiting.

**Type consistency check:** `Message.role` is `str` in backend Pydantic but `'user' | 'assistant'` in frontend TypeScript — consistent in practice, no collision. `Assessment` fields match between `schemas.py` and `types.ts`. `api.sendMessage` passes `messages: Message[]` which matches `SessionMessageRequest.messages: list[Message]`. ✓

**Placeholder scan:** No TBDs or TODOs found. ✓
