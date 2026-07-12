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
  return name.replace(/\s*\(.*?\)/, '').trim()
}

function ConceptsPanel({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false)
  if (!names.length) return null
  return (
    <View style={cpStyles.wrapper}>
      <Pressable style={cpStyles.header} onPress={() => setOpen((o) => !o)}>
        <Text style={cpStyles.headerText}>Concepts being tested</Text>
        <Text style={cpStyles.chevron}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open && (
        <View style={cpStyles.list}>
          {names.map((n, i) => (
            <Text key={i} style={cpStyles.item}>
              <Text style={cpStyles.num}>{String(i + 1).padStart(2, '0')}{'  '}</Text>
              {shortConcept(n)}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

const cpStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#EDECEA',
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: { fontSize: 11, fontWeight: '700', color: '#88887E', textTransform: 'uppercase', letterSpacing: 0.6 },
  chevron: { fontSize: 16, color: '#88887E', fontWeight: '400' },
  list: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  num: { fontSize: 11, color: '#C8401A', fontWeight: '700' },
  item: { fontSize: 13, color: '#1A1A1A', lineHeight: 20 },
})

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const { session, user, addUserMessage, addAssistantMessage, completeSession } = useStore()
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
      const errMsg: Message = { role: 'assistant', content: `Error: ${detail}` }
      setDisplayMessages(prev => [...prev, errMsg])
      addAssistantMessage(errMsg, session.turnCount + 1)
    } finally {
      setWaiting(false)
    }
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Session not found.</Text>
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
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>{session.topic}</Text>
        <Text style={styles.turnCount}>Turn {session.turnCount}</Text>
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
          placeholder="Explain it to Koda..."
          placeholderTextColor="#88887E"
          value={input}
          onChangeText={setInput}
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
  container: { flex: 1, backgroundColor: '#F4F2EC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#88887E', textAlign: 'center', marginBottom: 12 },
  link: { color: '#C8401A', fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
    backgroundColor: '#F4F2EC',
    gap: 12,
  },
  back: { fontSize: 18, color: '#1A1A1A', fontWeight: '400' },
  topBarTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  turnCount: { fontSize: 12, color: '#88887E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  messageScroll: { flex: 1 },
  list: { padding: 16, paddingBottom: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#D5D1C8',
    backgroundColor: '#F4F2EC',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D5D1C8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    maxHeight: 140,
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.25 },
  sendText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
})
