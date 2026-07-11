# Changelog

All notable changes to Explain It Back are documented here.

## [1.0.0.0] - 2026-07-11

**Initial release of Explain It Back — the Feynman-technique learning app where you teach an AI student called Koda.**

Explain It Back is now buildable and deployable end-to-end. You pick a topic (or paste your own document), explain it to Koda in a chat, and get a scored comprehension report. The backend runs on Render, the web app deploys to Vercel, and the mobile app runs via Expo Go.

### The numbers that matter

This is the first release — benchmarks are the scope of what shipped.

| Area | Metric |
|------|--------|
| Backend tests | 13/13 passing |
| API endpoints | 6 (topics, start session, chat, transcribe audio, signup, login) |
| Topics built-in | 5 (Photosynthesis, Newton's Laws, Supply & Demand, French Revolution, Pythagorean Theorem) |
| AI providers | Gemini 2.0 Flash (primary) + Groq Llama (fallback) |
| Max session turns | 20 before auto-assessment |

### What this means for learners

You can now run Explain It Back from `npm start` (web) or Expo Go (mobile), pick any of the 5 built-in science and history topics, and get a structured comprehension scorecard after a Socratic conversation with Koda. Paste in your own notes or a URL to study custom material.

### Itemized changes

#### Added
- **FastAPI backend** — stateless session management, Socratic AI prompt with per-topic rubrics, assessment JSON parsing
- **Gemini 2.0 Flash** primary AI with automatic Groq Llama fallback on any failure
- **5 built-in topics** — each with subconcept rubrics for structured assessment
- **Custom document support** — paste text or provide a URL (web scraping via trafilatura)
- **Voice input** — Web Speech API on web, hold-to-talk via expo-av + Groq Whisper on native
- **Expo React Native frontend** — topic picker, Koda chat, scorecard with concept pills
- **Supabase optional auth** — users can explore the app as guests; sign up to save history
- **Vercel deployment config** for the web app; Render config for the backend
- **Rate limiting** — 10/min on session start, 30/min on messages, 5/min on auth endpoints
- **Input sanitization** via bleach on all user messages before AI processing
- **CI workflow** — GitHub Actions runs backend tests on every push

#### For contributors
- Mock AI provider (`AI_PROVIDER=mock`) for local development without API keys
- 13 backend tests covering sessions, scoring, scraping, and mock AI
- `backend/.env.example` with all required environment variables
