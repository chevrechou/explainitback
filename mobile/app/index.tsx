import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Pressable, FlatList, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { TopicCard } from '../components/TopicCard'
import { DocumentInput } from '../components/DocumentInput'
import { Topic } from '../lib/types'

const DEFAULT_TOPICS: Topic[] = [
  { id: 'photosynthesis', name: 'Photosynthesis', subject: 'Biology', emoji: '🌿', sub_concept_count: 7 },
  { id: 'pythagorean_theorem', name: 'Pythagorean Theorem', subject: 'Math', emoji: '📐', sub_concept_count: 6 },
  { id: 'supply_and_demand', name: 'Supply And Demand', subject: 'Economics', emoji: '📈', sub_concept_count: 7 },
  { id: 'natural_selection', name: 'Natural Selection', subject: 'Biology', emoji: '🦎', sub_concept_count: 7 },
  { id: 'newton_second_law', name: 'Newton Second Law', subject: 'Physics', emoji: '🍎', sub_concept_count: 7 },
]

const HOW_IT_WORKS = [
  { icon: '🎯', title: 'Pick a topic', body: 'Choose one of the built-in topics or paste your own notes / a URL.' },
  { icon: '🗣️', title: 'Teach Koda', body: 'Explain the topic to Koda, an AI student who asks real questions.' },
  { icon: '📊', title: 'Get scored', body: 'After 8–20 exchanges you receive a comprehension scorecard.' },
]

export default function TopicPicker() {
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS)
  const [docValue, setDocValue] = useState('')
  const [docLabel, setDocLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, startSession } = useStore()

  useEffect(() => {
    // Pre-warm the backend (Render free tier cold starts take ~30s)
    fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/health`).catch(() => {})
    api.getTopics().then((r) => setTopics(r.topics)).catch(() => {})
  }, [])

  async function handleStart(topic: string, documentText?: string) {
    setLoading(true)
    try {
      const isUrl = documentText?.startsWith('http')
      const res = await api.startSession(
        topic,
        isUrl ? null : documentText,
        isUrl ? documentText : null,
        user?.accessToken,
      )
      const sessionId = randomUUID()
      startSession(sessionId, res.topic, res.first_message, isUrl ? null : (documentText ?? null), res.sub_concept_names ?? [])
      router.push(`/session/${sessionId}`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Explain It Back</Text>
          <Text style={styles.tagline}>Learn by teaching</Text>
        </View>
        {user ? (
          <Pressable onPress={() => useStore.getState().setUser(null)}>
            <Text style={styles.authLink}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/auth')}>
            <Text style={styles.authLink}>Sign in</Text>
          </Pressable>
        )}
      </View>

      {/* Hero blurb */}
      <Text style={styles.subtitle}>
        The best way to know if you actually understand something is to explain it to someone who doesn't. Koda is that someone.
      </Text>

      {/* How it works */}
      <View style={styles.howSection}>
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.steps}>
          {HOW_IT_WORKS.map((s, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepIcon}>{s.icon}</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Tips */}
      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>Tips for a better score</Text>
        <Text style={styles.tip}>• Explain the WHY, not just the WHAT</Text>
        <Text style={styles.tip}>• Give concrete examples</Text>
        <Text style={styles.tip}>• If Koda misunderstands, correct him — that's part of the test</Text>
        <Text style={styles.tip}>• You have 6 turns — make every answer count</Text>
      </View>

      {/* Topics */}
      <Text style={styles.sectionLabel}>PICK A TOPIC</Text>
      {loading && <ActivityIndicator style={{ marginVertical: 16 }} color="#22c55e" />}
      <FlatList
        data={topics}
        numColumns={2}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TopicCard topic={item} onPress={() => !loading && handleStart(item.name)} />
        )}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
      />

      {/* Custom topic */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>OR USE YOUR OWN MATERIAL</Text>
      <Text style={styles.customHint}>
        Paste notes, a textbook excerpt, or a URL to an article. Koda will quiz you on it.
      </Text>
      <DocumentInput
        value={docValue}
        label={docLabel}
        onChangeValue={setDocValue}
        onChangeLabel={setDocLabel}
        onSubmit={() => handleStart(docLabel || 'Custom Topic', docValue)}
        disabled={loading || !docValue.trim()}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content: { padding: 20, paddingBottom: 48 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  tagline: { fontSize: 13, color: '#22c55e', fontWeight: '600', marginTop: 2 },
  authLink: { color: '#22c55e', fontWeight: '600', marginTop: 6 },

  subtitle: { color: '#475569', fontSize: 15, lineHeight: 22, marginBottom: 24 },

  howSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginBottom: 10 },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  stepBody: { fontSize: 13, color: '#64748b', lineHeight: 18 },

  tipsBox: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#bbf7d0' },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 8 },
  tip: { fontSize: 13, color: '#15803d', lineHeight: 20 },

  row: { marginHorizontal: -6 },

  customHint: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 12 },
})
