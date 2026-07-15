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
      <Text style={styles.wakeupNote}>
        First load may take 30–60 seconds while the server wakes up. Subsequent messages will be fast.
      </Text>

      {/* How it works panel */}
      <View style={styles.howPanel}>
        <View style={styles.howSection}>
          <Text style={styles.howLabel}>How to use it</Text>
          <View style={styles.howSteps}>
            <View style={styles.howStep}>
              <Text style={styles.howNum}>1</Text>
              <Text style={styles.howText}>Pick a topic or paste your own notes. Koda will ask you to explain it from scratch.</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howNum}>2</Text>
              <Text style={styles.howText}>Answer Koda's follow-up questions in your own words — no looking things up, no hints.</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howNum}>3</Text>
              <Text style={styles.howText}>After ~8 turns, get a scorecard: what you understood, what was surface-level, what you missed.</Text>
            </View>
          </View>
        </View>

        <View style={styles.howDivider} />

        <View style={styles.howSection}>
          <Text style={styles.howLabel}>Why it works</Text>
          <Text style={styles.howBody}>
            When you try to teach something, gaps that felt invisible while reading become obvious. This is the protégé effect — explaining forces you to find and fill the holes in your own understanding, which is far more effective than re-reading.
          </Text>
        </View>

        <View style={styles.howDivider} />

        <View style={styles.howSection}>
          <Text style={styles.howLabel}>How to score well</Text>
          <View style={styles.howTips}>
            <View style={styles.howTip}>
              <Text style={styles.howTipDot}>▸</Text>
              <Text style={styles.howText}><Text style={styles.howBold}>Explain mechanisms, not just names.</Text> "Chlorophyll absorbs light to kick off electron transfer" beats "chlorophyll is involved in photosynthesis."</Text>
            </View>
            <View style={styles.howTip}>
              <Text style={styles.howTipDot}>▸</Text>
              <Text style={styles.howText}><Text style={styles.howBold}>Use cause and effect.</Text> Words like "because," "which causes," and "so that" signal real understanding.</Text>
            </View>
            <View style={styles.howTip}>
              <Text style={styles.howTipDot}>▸</Text>
              <Text style={styles.howText}><Text style={styles.howBold}>Don't just agree when Koda follows up.</Text> If Koda asks why, explain the why — don't restate the question back.</Text>
            </View>
            <View style={styles.howTip}>
              <Text style={styles.howTipDot}>▸</Text>
              <Text style={styles.howText}><Text style={styles.howBold}>Informal language is fine.</Text> "Plants eat sunlight" can earn full marks if the mechanism is right.</Text>
            </View>
          </View>
        </View>
      </View>

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
  tagline: { fontSize: 12, color: '#88887E', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  authLink: { fontSize: 13, color: '#C8401A', fontWeight: '600', marginTop: 4 },

  subtitle: { fontSize: 17, color: '#1A1A1A', lineHeight: 28, marginBottom: 10 },
  wakeupNote: { fontSize: 12, color: '#88887E', lineHeight: 18, marginBottom: 20, fontStyle: 'italic' },

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

  howPanel: {
    backgroundColor: '#EDECEA',
    borderLeftWidth: 3,
    borderLeftColor: '#C8401A',
    marginBottom: 28,
  },
  howSection: { padding: 16, paddingBottom: 14 },
  howDivider: { height: 1, backgroundColor: '#D5D1C8', marginHorizontal: 16 },
  howLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 12,
  },
  howBody: { fontSize: 14, color: '#1A1A1A', lineHeight: 22 },
  howSteps: { gap: 10 },
  howStep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  howNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8401A',
    width: 16,
    marginTop: 2,
  },
  howTips: { gap: 10 },
  howTip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  howTipDot: { fontSize: 12, color: '#C8401A', marginTop: 2, width: 12 },
  howText: { flex: 1, fontSize: 14, color: '#1A1A1A', lineHeight: 22 },
  howBold: { fontWeight: '700' },
})
