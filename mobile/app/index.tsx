import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { TopicCard } from '../components/TopicCard'
import { DocumentInput } from '../components/DocumentInput'
import { Topic } from '../lib/types'

const DEFAULT_TOPICS: Topic[] = [
  { id: 'photosynthesis',      name: 'Photosynthesis',       subject: 'Biology',    emoji: '', sub_concept_count: 7 },
  { id: 'pythagorean_theorem', name: 'Pythagorean Theorem',  subject: 'Math',       emoji: '', sub_concept_count: 6 },
  { id: 'supply_and_demand',   name: 'Supply & Demand',      subject: 'Economics',  emoji: '', sub_concept_count: 7 },
  { id: 'natural_selection',   name: 'Natural Selection',    subject: 'Biology',    emoji: '', sub_concept_count: 7 },
  { id: 'newton_second_law',   name: "Newton's Second Law",  subject: 'Physics',    emoji: '', sub_concept_count: 7 },
]

export default function TopicPicker() {
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS)
  const [docValue, setDocValue] = useState('')
  const [docLabel, setDocLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, startSession } = useStore()

  useEffect(() => {
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

      {/* Hero */}
      <Text style={styles.subtitle}>
        The fastest way to find out if you actually understand something is to explain it to someone who doesn't. Koda is that someone.
      </Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Topics */}
      <Text style={styles.sectionLabel}>Topics</Text>
      {loading && <ActivityIndicator style={{ marginVertical: 20 }} color="#1A1A1A" />}
      <View style={styles.topicList}>
        {topics.map((t, i) => (
          <TopicCard
            key={t.id}
            topic={t}
            index={i}
            onPress={() => !loading && handleStart(t.name)}
          />
        ))}
      </View>

      {/* Custom material */}
      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>Your own material</Text>
      <Text style={styles.customHint}>
        Paste notes, a textbook excerpt, or drop in a URL. Koda will quiz you on it.
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
  container: { flex: 1, backgroundColor: '#F4F2EC' },
  content: { padding: 24, paddingBottom: 64 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  tagline: { fontSize: 12, color: '#88887E', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  authLink: { fontSize: 13, color: '#C8401A', fontWeight: '600', marginTop: 4 },

  subtitle: { fontSize: 17, color: '#1A1A1A', lineHeight: 28, marginBottom: 28 },

  divider: { height: 1, backgroundColor: '#D5D1C8', marginBottom: 20 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  topicList: { marginBottom: 8 },

  customHint: { fontSize: 13, color: '#88887E', lineHeight: 20, marginTop: 6, marginBottom: 16 },
})
