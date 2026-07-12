import { useState } from 'react'
import { ScrollView, View, Text, Pressable, StyleSheet, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '../../lib/store'
import { ScorecardView, scoreColor, scoreGrade } from '../../components/ScorecardView'
import { api } from '../../lib/api'

function RatingBlock({ topic }: { topic: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const user = useStore((s) => s.user)

  async function submit() {
    if (selected === null) return
    setSubmitting(true)
    try {
      await api.rateSession(selected, topic, comment, user?.accessToken)
      setSubmitted(true)
    } catch {
      setSubmitted(true) // fail silently — rating is best-effort
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <View style={styles.ratingDone}>
        <Text style={styles.ratingDoneText}>Thanks — your feedback helps Koda improve.</Text>
      </View>
    )
  }

  return (
    <View style={styles.ratingBlock}>
      <Text style={styles.ratingLabel}>Rate this session</Text>
      <Text style={styles.ratingHint}>How well did Koda challenge your understanding?</Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setSelected(n)} style={styles.starBtn}>
            <Text style={[styles.starChar, selected !== null && n <= selected && styles.starActive]}>
              {n <= (selected ?? 0) ? '★' : '☆'}
            </Text>
          </Pressable>
        ))}
      </View>

      {selected !== null && (
        <>
          <TextInput
            style={styles.commentInput}
            placeholder="What could Koda do better? (optional)"
            placeholderTextColor="#88887E"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          <Pressable
            style={[styles.submitBtn, submitting && styles.submitDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Submit feedback →'}</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

export default function ScorecardScreen() {
  const { session, clearSession } = useStore()

  function handleTryAnother() {
    clearSession()
    router.replace('/')
  }

  if (!session?.scorecard) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No scorecard</Text>
        <Text style={styles.emptyBody}>
          Koda couldn't generate a breakdown — this sometimes happens with very short sessions.
        </Text>
        <Pressable style={styles.cta} onPress={handleTryAnother}>
          <Text style={styles.ctaText}>Try another topic</Text>
        </Pressable>
      </View>
    )
  }

  const { scorecard } = session
  const color = scoreColor(scorecard.overall_score)
  const grade = scoreGrade(scorecard.overall_score)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Session complete</Text>
        <Text style={styles.topic}>{scorecard.topic}</Text>
        <Text style={[styles.grade, { color }]}>{grade}</Text>
      </View>

      <ScorecardView assessment={scorecard} />

      <View style={styles.divider} />
      <RatingBlock topic={scorecard.topic} />

      <Pressable style={styles.cta} onPress={handleTryAnother}>
        <Text style={styles.ctaText}>Try another topic →</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EC' },
  content: { padding: 24, paddingBottom: 64 },

  header: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
    marginBottom: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  topic: { fontSize: 30, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, lineHeight: 36, marginBottom: 4 },
  grade: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: '#D5D1C8', marginTop: 32, marginBottom: 28 },

  // Rating
  ratingBlock: { marginBottom: 32 },
  ratingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  ratingHint: { fontSize: 14, color: '#1A1A1A', marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  starBtn: { padding: 4 },
  starChar: { fontSize: 32, color: '#D5D1C8' },
  starActive: { color: '#C8401A' },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D5D1C8',
    backgroundColor: '#FFFFFF',
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  submitBtn: { backgroundColor: '#1A1A1A', padding: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
  ratingDone: { paddingVertical: 20, marginBottom: 32 },
  ratingDoneText: { fontSize: 14, color: '#88887E', fontStyle: 'italic' },

  cta: {
    backgroundColor: '#1A1A1A',
    padding: 17,
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },

  empty: {
    flex: 1,
    backgroundColor: '#F4F2EC',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  emptyBody: { fontSize: 14, color: '#88887E', lineHeight: 22 },
})
