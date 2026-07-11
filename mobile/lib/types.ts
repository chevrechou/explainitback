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
