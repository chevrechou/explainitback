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
        <Text style={styles.emptyEmoji}>🤔</Text>
        <Text style={styles.emptyTitle}>No scorecard this time</Text>
        <Text style={styles.emptyBody}>
          Koda couldn't generate a breakdown — this sometimes happens with custom topics or very short sessions.
        </Text>
        <Pressable style={styles.cta} onPress={handleTryAnother}>
          <Text style={styles.ctaText}>Try Another Topic</Text>
        </Pressable>
      </View>
    )
  }

  const { scorecard } = session
  const color = scoreColor(scorecard.overall_score)
  const grade = scoreGrade(scorecard.overall_score)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: color + '33' }]}>
        <Text style={styles.headerEyebrow}>Session complete</Text>
        <Text style={styles.headerTopic}>{scorecard.topic}</Text>
        <Text style={[styles.headerGrade, { color }]}>{grade} — {scorecard.overall_score}/100</Text>
      </View>

      {/* Scorecard body */}
      <ScorecardView assessment={scorecard} />

      {/* CTA */}
      <Pressable style={styles.cta} onPress={handleTryAnother}>
        <Text style={styles.ctaText}>Try Another Topic</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 52 },

  header: {
    marginBottom: 24, paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerEyebrow: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  headerTopic: { fontSize: 28, fontWeight: '800', color: '#0f172a', lineHeight: 34, marginBottom: 4 },
  headerGrade: { fontSize: 15, fontWeight: '700' },

  cta: {
    marginTop: 32, backgroundColor: '#0f172a',
    borderRadius: 14, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  empty: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21 },
})
