# TODOS

Known items deferred from the initial build. All are post-MVP.

## P1 — Ship soon

- [ ] **SSRF protection in scraper** — `services/scraper.py` fetches user-provided URLs without validating against private IP ranges. Add hostname blocklist for RFC-1918 addresses before production at scale.
- [ ] **Integration tests for AI providers** — `services/gemini.py` and `services/groq.py` have 0% test coverage. Add tests with httpx mocking.
- [ ] **Auth endpoint tests** — `/auth/signup` and `/auth/login` are completely untested.
- [ ] **Rate limiting tests** — slowapi decorators on sessions and auth are untested.

## P2 — Nice to have

- [ ] **Native audio transcription** — `VoiceButton.tsx` native path creates a `Blob` from the recording URI, but Expo FileSystem returns a `file://` URI that needs to be read as bytes before creating a FormData blob. Current native voice input may fail silently.
- [ ] **Groq retry wrapper** — The Groq fallback path in `services/ai.py` has no retry logic (Gemini's `_retry()` wraps only the Gemini call). Add retry on Groq 429s.
- [ ] **getTopics error handling** — `api.getTopics()` in the frontend swallows errors silently; a failed request shows an empty topic list with no user feedback.
- [ ] **Persistent sessions** — In-memory session dict means sessions are lost on Render restart. Add Redis or Supabase-backed storage for production resilience.
- [ ] **User history** — Auth is wired but no history UI exists. Add a "My sessions" screen.
