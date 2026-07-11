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
