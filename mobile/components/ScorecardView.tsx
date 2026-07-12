import { View, Text, StyleSheet } from 'react-native'
import { Assessment, SubConcept } from '../lib/types'

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

const STATUS_CONFIG = {
  UNDERSTOOD:    { label: 'Understood',     bg: '#f0fdf4', border: '#86efac', dot: '#22c55e', text: '#166534' },
  SURFACE:       { label: 'Partial',        bg: '#fefce8', border: '#fde047', dot: '#ca8a04', text: '#854d0e' },
  NOT_ADDRESSED: { label: 'Not covered',    bg: '#fef2f2', border: '#fca5a5', dot: '#dc2626', text: '#991b1b' },
}

function ConceptCard({ concept }: { concept: SubConcept }) {
  const cfg = STATUS_CONFIG[concept.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.NOT_ADDRESSED
  return (
    <View style={[styles.conceptCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={styles.conceptHeader}>
        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
        <Text style={[styles.conceptName, { color: cfg.text }]}>{concept.name}</Text>
        <View style={[styles.statusChip, { backgroundColor: cfg.dot }]}>
          <Text style={styles.statusChipText}>{cfg.label}</Text>
        </View>
      </View>

      {concept.evidence ? (
        <View style={styles.evidenceBox}>
          <Text style={styles.evidenceLabel}>What you said</Text>
          <Text style={styles.evidenceText}>"{concept.evidence}"</Text>
        </View>
      ) : null}

      {concept.correct_explanation ? (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationLabel}>The full picture</Text>
          <Text style={styles.explanationText}>{concept.correct_explanation}</Text>
        </View>
      ) : null}
    </View>
  )
}

type Props = { assessment: Assessment }

export function ScorecardView({ assessment }: Props) {
  return (
    <View>
      <View style={styles.scoreBlock}>
        <Text style={[styles.score, { color: scoreColor(assessment.overall_score) }]}>
          {assessment.overall_score}
        </Text>
        <Text style={styles.scoreLabel}>/ 100 comprehension score</Text>
      </View>

      <View style={[styles.summaryCard, styles.greenCard]}>
        <Text style={styles.summaryLabel}>Strongest point</Text>
        <Text style={styles.summaryBody}>{assessment.strongest_point}</Text>
      </View>

      <View style={[styles.summaryCard, styles.yellowCard]}>
        <Text style={styles.summaryLabel}>Biggest gap</Text>
        <Text style={styles.summaryBody}>{assessment.biggest_gap}</Text>
      </View>

      {assessment.misconceptions.length > 0 && (
        <View style={[styles.summaryCard, styles.redCard]}>
          <Text style={styles.summaryLabel}>Misconceptions</Text>
          {assessment.misconceptions.map((m, i) => (
            <Text key={i} style={styles.summaryBody}>• {m}</Text>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Concept breakdown</Text>
      {assessment.sub_concepts.map((c, i) => (
        <ConceptCard key={i} concept={c} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  scoreBlock: { alignItems: 'center', marginVertical: 24 },
  score: { fontSize: 80, fontWeight: '800', lineHeight: 88 },
  scoreLabel: { fontSize: 14, color: '#64748b', marginTop: 2 },

  summaryCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  greenCard:  { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  yellowCard: { backgroundColor: '#fefce8', borderColor: '#fef08a' },
  redCard:    { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  summaryBody: { fontSize: 14, color: '#0f172a', lineHeight: 21 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 20, marginBottom: 10 },

  conceptCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  conceptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  conceptName: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  statusChip: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  evidenceBox: { paddingHorizontal: 12, paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10 },
  evidenceLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  evidenceText: { fontSize: 13, color: '#475569', lineHeight: 19, fontStyle: 'italic' },

  explanationBox: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', backgroundColor: 'rgba(255,255,255,0.6)' },
  explanationLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  explanationText: { fontSize: 13, color: '#0f172a', lineHeight: 20 },
})
