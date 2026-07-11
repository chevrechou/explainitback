import { View, Text, StyleSheet } from 'react-native'
import { Assessment } from '../lib/types'
import { ConceptPill } from './ConceptPill'

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

type Props = { assessment: Assessment }

export function ScorecardView({ assessment }: Props) {
  return (
    <View>
      <View style={styles.scoreBlock}>
        <Text style={[styles.score, { color: scoreColor(assessment.overall_score) }]}>
          {assessment.overall_score}
        </Text>
        <Text style={styles.scoreLabel}>Comprehension Score</Text>
      </View>

      <Text style={styles.sectionTitle}>Concepts</Text>
      <View style={styles.pillsRow}>
        {assessment.sub_concepts.map((c, i) => (
          <ConceptPill key={i} concept={c} />
        ))}
      </View>

      <View style={[styles.card, styles.greenCard]}>
        <Text style={styles.cardTitle}>Strongest point</Text>
        <Text style={styles.cardBody}>{assessment.strongest_point}</Text>
      </View>

      <View style={[styles.card, styles.yellowCard]}>
        <Text style={styles.cardTitle}>Biggest gap</Text>
        <Text style={styles.cardBody}>{assessment.biggest_gap}</Text>
      </View>

      {assessment.misconceptions.length > 0 && (
        <View style={[styles.card, styles.redCard]}>
          <Text style={styles.cardTitle}>Misconceptions</Text>
          {assessment.misconceptions.map((m, i) => (
            <Text key={i} style={styles.cardBody}>• {m}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scoreBlock: { alignItems: 'center', marginVertical: 24 },
  score: { fontSize: 72, fontWeight: '800' },
  scoreLabel: { fontSize: 15, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 8 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: 12, padding: 16, marginTop: 12 },
  greenCard: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  yellowCard: { backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fef08a' },
  redCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  cardBody: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
})
