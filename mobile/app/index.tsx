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
  const [error, setError] = useState<{ msg: string; retry: () => void } | null>(null)
  const { user, startSession } = useStore()

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/health`).catch(() => {})
    api.getTopics().then((r) => setTopics(r.topics)).catch(() => {})
  }, [])

  async function handleStart(topic: string, documentText?: string) {
    setLoading(true)
    setError(null)
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
      const isNetwork = e instanceof TypeError || e?.message === 'Network error'
      setError({
        msg: isNetwork
          ? 'Could not reach the server. It may still be waking up.'
          : e.message,
        retry: () => handleStart(topic, documentText),
      })
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

      <Text style={styles.subtitle}>
        The fastest way to find out if you actually understand something is to explain it to someone who doesn't.
      </Text>

      <View style={styles.wakeupNotice}>
        <Text style={styles.wakeupText}>
          <Text style={styles.wakeupBold}>First load may take 30–60 seconds</Text>
          {' '}while the server wakes up. Subsequent messages will be fast.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorMsg}>{error.msg}</Text>
          <Pressable onPress={error.retry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {/* Two-column: instructions + topics */}
      <View style={styles.twoCol}>

        {/* How it works */}
        <View style={styles.colLeft}>
          <View style={styles.howPanel}>
            <View style={styles.howPanelAccent} />
            <View style={styles.howSection}>
              <Text style={styles.howLabel}>How it works</Text>
              <View style={styles.howSteps}>
                <View style={styles.howStep}>
                  <Text style={styles.howNum}>1</Text>
                  <Text style={styles.howText}>Pick a topic — or paste your own notes.</Text>
                </View>
                <View style={styles.howStep}>
                  <Text style={styles.howNum}>2</Text>
                  <Text style={styles.howText}>Explain it to Koda in your own words.</Text>
                </View>
                <View style={styles.howStep}>
                  <Text style={styles.howNum}>3</Text>
                  <Text style={styles.howText}>Get a scorecard after ~8 turns.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Topics */}
        <View style={styles.colRight}>
          <Text style={styles.sectionLabel}>Topics</Text>
          {loading && <ActivityIndicator style={{ marginVertical: 10 }} color="#1A1A1A" />}
          <View style={styles.topicList}>
            {topics.map((t, i) => (
              <TopicCard
                key={t.id}
                topic={t}
                onPress={() => !loading && handleStart(t.name)}
                isLast={i === topics.length - 1}
                compact
              />
            ))}
          </View>
        </View>

      </View>

      {/* Custom material */}
      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>Your own material</Text>
      <Text style={styles.customHint}>
        Paste notes, a textbook excerpt, or a URL. Koda will quiz you on it.
      </Text>
      <DocumentInput
        value={docValue}
        label={docLabel}
        onChangeValue={setDocValue}
        onChangeLabel={setDocLabel}
        onSubmit={() => handleStart(docLabel.trim() || '', docValue)}
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
  tagline: { fontSize: 12, color: '#4A4942', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  authLink: { fontSize: 13, color: '#C8401A', fontWeight: '600', marginTop: 4 },

  subtitle: { fontSize: 18, color: '#1A1A1A', lineHeight: 28, marginBottom: 20 },

  divider: { height: 1, backgroundColor: '#D5D1C8', marginBottom: 20 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A4942',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    alignItems: 'flex-start',
  },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },

  topicList: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EDECEA',
  },

  wakeupNotice: {
    borderLeftWidth: 3,
    borderLeftColor: '#C8401A',
    paddingLeft: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  wakeupText: { fontSize: 15, color: '#4A4942', lineHeight: 22 },
  wakeupBold: { fontWeight: '700', color: '#1A1A1A' },

  customHint: { fontSize: 15, color: '#4A4942', lineHeight: 22, marginBottom: 16 },

  errorBanner: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: '#E8C4BC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorMsg: { flex: 1, fontSize: 14, color: '#7A2010', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#C8401A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  howPanel: {
    backgroundColor: '#EDECEA',
    borderRadius: 14,
    overflow: 'hidden',
  },
  howPanelAccent: { height: 4, backgroundColor: '#C8401A' },
  howSection: { padding: 14, paddingBottom: 16 },
  howLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 14,
  },
  howSteps: { gap: 14 },
  howStep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  howNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    width: 20,
    height: 20,
    lineHeight: 20,
    textAlign: 'center',
    backgroundColor: '#C8401A',
    borderRadius: 10,
    marginTop: 1,
    overflow: 'hidden',
  },
  howText: { flex: 1, fontSize: 15, color: '#1A1A1A', lineHeight: 22 },
})
