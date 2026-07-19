import { Assessment, Message, Topic } from './types'

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

async function attempt<T>(
  path: string,
  options: RequestInit,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).detail ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Server is taking a while to wake up — please try again.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  timeoutMs = 90_000,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  // TypeError = network-level failure (Render free tier cold-starting).
  // Retry every 8s for up to ~56s total before giving up.
  const MAX_RETRIES = 7
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await attempt<T>(path, options, headers, timeoutMs)
    } catch (err: any) {
      if (err instanceof TypeError && i < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 8000))
        continue
      }
      throw err
    }
  }
  throw new Error('Network error')
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
    request<{ first_message: string; topic: string; sub_concept_names: string[] }>(
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

  evaluate: (
    topic: string,
    messages: Message[],
    documentText?: string | null,
    token?: string | null,
  ) =>
    request<{ assessment: Assessment | null }>(
      '/sessions/evaluate',
      {
        method: 'POST',
        body: JSON.stringify({
          topic,
          messages,
          user_message: '',
          document_text: documentText ?? undefined,
        }),
      },
      token,
      120_000, // 2 min timeout for evaluation
    ),

  rateSession: (stars: number, topic: string, comment?: string, token?: string | null) =>
    request<{ ok: boolean }>('/sessions/rate', {
      method: 'POST',
      body: JSON.stringify({ stars, topic, comment: comment ?? '' }),
    }, token),

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
