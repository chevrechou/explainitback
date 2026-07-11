# Explain It Back — Design Spec
**Date:** 2026-07-10

---

## What We're Building

A Feynman-technique learning app. The user picks a topic (or pastes a document/URL) and teaches it to an AI persona named Koda via text or voice. Koda acts as a curious but skeptical student — asking follow-up questions, poking at weak explanations, surfacing gaps. After 8–12 exchanges, the user gets a comprehension scorecard. Auth is optional (users can use the app as guests); sessions are stateless (not persisted).

---

## Approach

Option A: spec-faithful, full-stack from day one. Monorepo. Backend and web deploy immediately on push to `main`. Mock AI mode (`AI_PROVIDER=mock`) lets the full app run before real API keys are set up.

---

## Architecture

### Monorepo layout
```
explainitback/
├── mobile/          # Expo app — iOS, Android, Web
├── backend/         # FastAPI (Python)
├── .github/
│   └── workflows/   # CI: lint, type-check, startup check
├── .gitignore
└── README.md
```

### Deploy targets
| Layer | Service | Trigger |
|---|---|---|
| Backend | Render (free tier) | Auto-deploy on push to `main` |
| Web | Vercel (free tier) | Auto-deploy on push to `main` |
| Mobile | Expo EAS | Manual `eas build` on demand |
| Auth + DB | Supabase (free tier) | Schema applied via dashboard |

### Mock AI mode
`AI_PROVIDER=mock` returns scripted Koda responses keyed to turn count — no real keys needed during development. Swap to `gemini` once keys are set up.

---

## Backend

**Stack:** FastAPI + uvicorn, Pydantic v2, Supabase auth, httpx, trafilatura (URL scraping), slowapi (rate limiting), bleach (input sanitization).

### Project structure
```
backend/
├── app/
│   ├── main.py              # FastAPI entry + CORS
│   ├── config.py            # Pydantic settings, env vars
│   ├── routers/
│   │   ├── auth.py          # Supabase auth proxy (signup, login)
│   │   └── sessions.py      # Session start + message
│   ├── services/
│   │   ├── ai.py            # Provider abstraction + failover
│   │   ├── gemini.py        # Gemini 2.0 Flash client
│   │   ├── groq.py          # Groq Llama fallback client
│   │   ├── mock.py          # Mock AI for development
│   │   ├── scoring.py       # Assessment block parsing
│   │   └── scraper.py       # URL fetch + text extraction
│   ├── prompts/
│   │   └── socratic.py      # System prompt + topic rubrics
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models
│   └── db/
│       └── supabase.py      # Supabase client init
├── requirements.txt
├── .env.example
└── Dockerfile
```

### Auth
Every protected route depends on `get_current_user` — validates Supabase JWT from `Authorization: Bearer <token>`. User ID always derived from token, never from request body.

### Stateless sessions
No session data stored in DB. The client sends the full message history with every request:
```json
{
  "topic": "photosynthesis",
  "messages": [{"role": "user", "content": "..."}, ...],
  "user_message": "...",
  "document_text": "..."   // optional, included every turn if document mode
}
```
The backend constructs the AI prompt from the incoming history.

### Document / URL mode
- `POST /sessions/start` accepts optional `document_url` or `document_text`
- If `document_url`: fetch server-side with `httpx`, extract readable text with `trafilatura`
- Extracted/pasted content injected into system prompt: `<document>...</document>`
- Capped at 8,000 tokens before injection
- Sub-concepts auto-derived by the AI from the document content
- Document text returned to client in session start response; client includes it every turn

### API endpoints
```
POST /auth/signup     { email, password } → { user_id, access_token }
POST /auth/login      { email, password } → { user_id, access_token }
POST /sessions/start  { topic, document_text?, document_url? } → { first_message, topic, document_text? }
POST /sessions/message { topic, messages, user_message, document_text? } → { response, turn_count, is_complete, assessment? }
GET  /topics          → { topics: [...], custom_allowed: true }
GET  /health          → { status: "ok" }
```

### AI provider abstraction
```
AI_PROVIDER=mock    → scripted Koda responses (dev)
AI_PROVIDER=gemini  → Gemini 2.0 Flash (primary)
AI_PROVIDER=groq    → Groq Llama 3.1 8B (fallback)
```
Gemini 429 → retry once after 5s → fall back to Groq automatically. Exponential backoff with jitter (max 3 retries).

### Rate limiting (slowapi)
- `/auth/*` — 10 req/min per IP
- `/sessions/start` — 10 req/min per user
- `/sessions/message` — 30 req/min per user

### Input sanitization
All user messages run through `sanitize_for_ai()`: strip HTML, truncate at 2,000 chars, wrap with `[Student says]: ` prefix.

### Assessment parsing
Regex checks every AI response for `<assessment>...</assessment>`. If found: strip from visible response, parse JSON, return as `assessment` field in response. If JSON malformed: log it, continue conversation silently.

---

## Frontend

**Stack:** Expo SDK 51+, expo-router, TypeScript, Zustand, expo-av (voice recording), react-native-reanimated, AsyncStorage.

### Project structure
```
mobile/
├── app/
│   ├── _layout.tsx           # Root layout + auth gate
│   ├── auth.tsx              # Login / signup screen
│   ├── index.tsx             # Topic picker (home)
│   ├── session/[id].tsx      # Chat screen
│   └── scorecard/[id].tsx    # Scorecard screen
├── components/
│   ├── TopicCard.tsx
│   ├── ChatBubble.tsx
│   ├── KodaTyping.tsx        # Animated three-dot indicator
│   ├── ScorecardView.tsx
│   ├── ConceptPill.tsx
│   ├── VoiceButton.tsx       # Hold-to-talk
│   └── DocumentInput.tsx     # Paste text or URL
├── lib/
│   ├── api.ts                # All backend calls
│   ├── store.ts              # Zustand store
│   └── types.ts              # Shared TypeScript types
├── app.json
├── package.json
└── tsconfig.json
```

### Auth gate
Auth is optional. Users can use the full app without an account. `_layout.tsx` checks AsyncStorage for a token on load — if none, the user proceeds as a guest. A persistent "Sign up / Log in" prompt appears on the topic picker. On login/signup success, token stored in AsyncStorage. Authenticated requests include the JWT; unauthenticated requests omit the header and the backend allows them through for MVP.

### Zustand store
```ts
type Message = { role: "user" | "assistant"; content: string }
type SessionState = {
  topic: string
  messages: Message[]
  turnCount: number
  documentText: string | null
  scorecard: Scorecard | null
}
```
Session state lives in Zustand, cleared when the user starts a new session or navigates home. Not persisted to AsyncStorage.

### Screen 1 — Topic Picker
- Header: "Explain It Back" + user avatar/logout
- 2-column grid of pre-built topic cards (emoji, name, subject tag)
- Below grid: document/URL input area (`DocumentInput`) — paste text or URL, optional topic name field
- "Start →" button
- Auto-detects URL vs. pasted text (starts with `http`)

### Screen 2 — Chat Session
- Top bar: back arrow, "Teaching Koda: {topic}", turn count
- Scrollable message area: Koda bubbles left (green KODA label, light bg), user bubbles right (dark bg, white text)
- Typing indicator while waiting for AI response
- **Voice is primary input on mobile:** large hold-to-talk `VoiceButton` centered in bottom bar
  - Web: Web Speech API (Chrome/Edge)
  - Mobile: `expo-av` records audio → sends to Groq Whisper endpoint for transcription
- Text input alongside voice button as secondary input
- Optimistic UI: user message appears immediately, then typing indicator, then Koda's response
- On `is_complete = true`: auto-navigate to scorecard after 1.5s

### Screen 3 — Scorecard
- Large score (0–100), color-coded: red < 40, yellow 40–69, green 70+
- Concept pills: "Got it" (green), "Surface" (yellow), "Missed" (gray)
- Strongest Point card (green bg)
- Biggest Gap card (yellow bg)
- Misconceptions card (red bg) — only shown if present
- "Try Another Topic" button

### Design tokens
```
Primary:     #0f172a
Accent:      #22c55e  (Koda's color)
Surface:     #ffffff
Background:  #fafaf9
Text muted:  #64748b
Border:      #e2e8f0
Error:       #dc2626
Warning:     #d97706
Success:     #22c55e

Border radius: cards 12px, chat bubbles 16px, inputs 10px
Font: system font stack (Inter if loading custom)
No shadows — use borders for separation
```

---

## Data Model

Supabase is used for auth only. One table:

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  display_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users see own profile" on profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
```

No `teaching_sessions` or `scorecards` tables in MVP. Sessions are ephemeral — cleared on navigate away. Scorecard displayed in-session but not stored.

---

## Environment Variables

```env
# AI Providers
AI_PROVIDER=mock             # mock | gemini | groq
GEMINI_API_KEY=
GROQ_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# App config
AI_MAX_TOKENS=400
MAX_TURNS_PER_SESSION=20
DOCUMENT_MAX_TOKENS=8000
```

---

## CI / GitHub Actions

On every PR:
- Backend: `pip install -r requirements.txt` + FastAPI startup check
- Frontend: `npm ci` + `npx tsc --noEmit`

On push to `main`: Render and Vercel auto-deploy via their GitHub integrations.

---

## Developer Boot Sequence

```bash
git clone https://github.com/<user>/explainitback
cd explainitback/backend
cp .env.example .env          # fill in keys (or leave AI_PROVIDER=mock)
pip install -r requirements.txt
uvicorn app.main:app --reload  # backend at localhost:8000

cd ../mobile
npm install
npx expo start --web           # web at localhost:8081
```

No Supabase needed until you set up real auth.

---

## What's Explicitly Out of MVP

- Session history / scorecard persistence
- Rate limiting per user (free tier session cap)
- Account deletion endpoint
- Native mobile builds (EAS) — web-first, mobile when ready
- Share scorecard as image
- Rematch / spaced repetition
- Teacher dashboard
- Leaderboard
- Sentry / structured logging (add before public launch)
