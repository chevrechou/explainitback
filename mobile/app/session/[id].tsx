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
