import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '../../lib/store'
import { ScorecardView, scoreColor, scoreGrade } from '../../components/ScorecardView'

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

  cta: {
    marginTop: 36,
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
