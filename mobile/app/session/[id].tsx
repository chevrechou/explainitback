import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { api } from '../../lib/api'
import { useStore } from '../../lib/store'
import { ChatBubble } from '../../components/ChatBubble'
import { KodaTyping } from '../../components/KodaTyping'
import { VoiceButton } from '../../components/VoiceButton'
import { Message } from '../../lib/types'

function shortConcept(name: string) {
  // Strip parenthetical clarifications to keep pills concise
  return name.replace(/\s*\(.*?\)/, '').trim()
}

function ConceptsPanel({ names }: { names: string[] }) {
  const [open, setOpen] = useState(true)
  if (!names.length) return null
  return (
    <View style={cpStyles.wrapper}>
      <Pressable style={cpStyles.header} onPress={() => setOpen((o) => !o)}>
        <Text style={cpStyles.headerText}>Concepts Koda will quiz you on</Text>
        <Text style={cpStyles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cpStyles.scroll} contentContainerStyle={cpStyles.scrollContent}>
          {names.map((n, i) => (
            <View key={i} style={cpStyles.pill}>
              <View style={cpStyles.circle} />
              <Text style={cpStyles.pillText}>{shortConcept(n)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={cpStyles.tip}>
        <Text style={cpStyles.tipText}>
          💡 Be specific • Use examples • Correct Koda if he's wrong • Explain the WHY
        </Text>
      </View>
    </View>
  )
}

const cpStyles = StyleSheet.create({
  wrapper: { backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderColor: '#bbf7d0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerText: { fontSize: 12, fontWeight: '700', color: '#166534', letterSpacing: 0.3, textTransform: 'uppercase' },
  chevron: { fontSize: 10, color: '#166534' },
  scroll: { paddingBottom: 8 },
  scrollContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#86efac', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
  circle: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#86efac' },
  pillText: { fontSize: 12, color: '#15803d', fontWeight: '500' },
  tip: { paddingHorizontal: 16, paddingBottom: 10 },
  tipText: { fontSize: 11, color: '#166534', opacity: 0.7 },
})

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const { session, user, addUserMessage, addAssistantMessage, completeSession } = useStore()
  // Driven entirely by local state — never synced from store after mount.
  // Each mutation (user send, assistant reply, error) is applied directly here
  // AND to the store. No useEffect sync so there's no race with optimistic updates.
  const [displayMessages, setDisplayMessages] = useState<Message[]>(() => session?.messages ?? [])
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (session?.isComplete && session.scorecard) {
      const timer = setTimeout(() => router.replace(`/scorecard/${id}`), 1500)
      return () => clearTimeout(timer)
    }
  }, [session?.isComplete])

  async function sendMessage(text: string) {
    if (!text.trim() || waiting || !session) return
    const trimmed = text.trim()
    setInput('')
    setWaiting(true)

    const userMsg: Message = { role: 'user', content: trimmed }
    // Show user bubble immediately via local state (don't wait for store re-render)
    setDisplayMessages((prev) => [...prev, userMsg])
    addUserMessage(userMsg)

    try {
      const res = await api.sendMessage(
        session.topic,
        session.messages,
        trimmed,
        session.documentText,
        user?.accessToken,
      )
      const assistantMsg: Message = { role: 'assistant', content: res.response }
      setDisplayMessages(prev => [...prev, assistantMsg])
      addAssistantMessage(assistantMsg, res.turn_count)

      if (res.is_complete) {
        if (res.assessment) {
          completeSession(res.assessment, res.turn_count)
        } else {
          setTimeout(() => router.replace(`/scorecard/${id}`), 1500)
        }
      }
    } catch (err: any) {
      const detail = err?.message ?? 'Unknown error'
      const errMsg: Message = { role: 'assistant', content: `⚠️ ${detail}` }
      setDisplayMessages(prev => [...prev, errMsg])
      addAssistantMessage(errMsg, session.turnCount + 1)
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
        <Text style={styles.turnCount}>{session.turnCount} / 6</Text>
      </View>

      <ConceptsPanel names={session.subConceptNames} />

      <ScrollView
        ref={scrollRef}
        style={styles.messageScroll}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {displayMessages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {waiting && <KodaTyping />}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Explain it to Koda... (Shift+Enter for newline)"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => !Platform.OS || Platform.OS === 'ios' || Platform.OS === 'android' ? sendMessage(input) : undefined}
          returnKeyType="send"
          multiline
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.()
              sendMessage(input)
            }
          }}
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
  messageScroll: { flex: 1 },
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
