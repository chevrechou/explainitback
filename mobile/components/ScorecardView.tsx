import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Assessment, SubConcept } from '../lib/types'

export function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

export function scoreGrade(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Getting there'
  return 'Keep practicing'
}

const STATUS = {
  UNDERSTOOD:    { label: 'Understood',   accent: '#22c55e', light: '#f0fdf4', textColor: '#166534', icon: '✓' },
  SURFACE:       { label: 'Partial',      accent: '#f59e0b', light: '#fffbeb', textColor: '#92400e', icon: '~' },
  NOT_ADDRESSED: { label: 'Not covered',  accent: '#ef4444', light: '#fef2f2', textColor: '#991b1b', icon: '✗' },
}

function ConceptCard({ concept, index }: { concept: SubConcept; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS[concept.status as keyof typeof STATUS] ?? STATUS.NOT_ADDRESSED

  return (
    <View style={[styles.conceptCard, { borderLeftColor: cfg.accent }]}>
      <Pressable style={styles.conceptRow} onPress={() => setExpanded(e => !e)}>
        <View style={[styles.iconBadge, { backgroundColor: cfg.light }]}>
          <Text style={[styles.iconText, { color: cfg.accent }]}>{cfg.icon}</Text>
        </View>
        <Text style={styles.conceptName} numberOfLines={expanded ? undefined : 2}>{concept.name}</Text>
        <View style={[styles.statusPill, { backgroundColor: cfg.accent }]}>
          <Text style={styles.statusPillText}>{cfg.label}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.conceptBody}>
          {concept.evidence ? (
            <View style={styles.evidenceBlock}>
              <Text style={styles.blockLabel}>What you said</Text>
              <Text style={styles.evidenceText}>"{concept.evidence}"</Text>
            </View>
          ) : null}
          {concept.correct_explanation ? (
            <View style={[styles.explanationBlock, { borderLeftColor: cfg.accent }]}>
              <Text style={styles.blockLabel}>The full picture</Text>
              <Text style={styles.explanationText}>{concept.correct_explanation}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}

type Props = { assessment: Assessment }

export function ScorecardView({ assessment }: Props) {
  const color = scoreColor(assessment.overall_score)
  const grade = scoreGrade(assessment.overall_score)
  const understood = assessment.sub_concepts.filter(c => c.status === 'UNDERSTOOD').length
  const partial    = assessment.sub_concepts.filter(c => c.status === 'SURFACE').length
  const missed     = assessment.sub_concepts.filter(c => c.status === 'NOT_ADDRESSED').length

  return (
    <View>
      {/* Score ring */}
      <View style={styles.heroRow}>
        <View style={[styles.ring, { borderColor: color }]}>
          <Text style={[styles.ringScore, { color }]}>{assessment.overall_score}</Text>
          <Text style={styles.ringMax}>/ 100</Text>
        </View>
        <View style={styles.heroRight}>
          <Text style={[styles.grade, { color }]}>{grade}</Text>
          <View style={styles.statRow}>
            <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.statNum, { color: '#22c55e' }]}>{understood}</Text>
              <Text style={styles.statLbl}>Got it</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#fffbeb' }]}>
              <Text style={[styles.statNum, { color: '#f59e0b' }]}>{partial}</Text>
              <Text style={styles.statLbl}>Partial</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.statNum, { color: '#ef4444' }]}>{missed}</Text>
              <Text style={styles.statLbl}>Missed</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Summary cards */}
      <View style={[styles.summaryCard, { borderLeftColor: '#22c55e' }]}>
        <Text style={styles.summaryIcon}>💪</Text>
        <View style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Strongest point</Text>
          <Text style={styles.summaryBody}>{assessment.strongest_point}</Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { borderLeftColor: '#f59e0b' }]}>
        <Text style={styles.summaryIcon}>🎯</Text>
        <View style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Biggest gap</Text>
          <Text style={styles.summaryBody}>{assessment.biggest_gap}</Text>
        </View>
      </View>

      {assessment.misconceptions.length > 0 && (
        <View style={[styles.summaryCard, { borderLeftColor: '#ef4444' }]}>
          <Text style={styles.summaryIcon}>⚠️</Text>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Misconceptions to fix</Text>
            {assessment.misconceptions.map((m, i) => (
              <Text key={i} style={styles.summaryBody}>• {m}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Concept breakdown */}
      <Text style={styles.sectionHeader}>Concept breakdown</Text>
      <Text style={styles.sectionHint}>Tap any concept for the full explanation</Text>
      {assessment.sub_concepts.map((c, i) => (
        <ConceptCard key={i} concept={c} index={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  // Score hero
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  ring: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ringScore: { fontSize: 42, fontWeight: '800', lineHeight: 46 },
  ringMax: { fontSize: 12, color: '#94a3b8', marginTop: -2 },
  heroRight: { flex: 1, gap: 10 },
  grade: { fontSize: 22, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 1 },

  // Summary cards
  summaryCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  summaryIcon: { fontSize: 20, marginTop: 1 },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryBody: { fontSize: 14, color: '#0f172a', lineHeight: 21 },

  // Section header
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 20, marginBottom: 2 },
  sectionHint: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },

  // Concept cards
  conceptCard: {
    backgroundColor: '#fff', borderRadius: 12, borderLeftWidth: 4,
    marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  conceptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  iconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 13, fontWeight: '800' },
  conceptName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 18 },
  statusPill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  chevron: { fontSize: 9, color: '#94a3b8', flexShrink: 0 },

  // Expanded body
  conceptBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  evidenceBlock: { padding: 12, backgroundColor: '#f8fafc' },
  explanationBlock: { padding: 12, borderLeftWidth: 3, margin: 12, borderRadius: 4 },
  blockLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  evidenceText: { fontSize: 13, color: '#475569', lineHeight: 19, fontStyle: 'italic' },
  explanationText: { fontSize: 13, color: '#0f172a', lineHeight: 20 },
})
