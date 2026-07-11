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
