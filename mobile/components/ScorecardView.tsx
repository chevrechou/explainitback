import { View, Text, StyleSheet } from 'react-native'
import { Assessment, SubConcept } from '../lib/types'

const DIAGRAM_CHARS = /[│─┌┐└┘├┤┬┴┼╔╗╚╝║═▲▼◄►|+\-\/\\^]/

function isDiagramLine(line: string) {
  const matches = (line.match(new RegExp(DIAGRAM_CHARS.source, 'g')) ?? []).length
  return matches >= 3
}

function ExplanationText({ text }: { text: string }) {
  const lines = text.split('\n')
  const segments: { type: 'text' | 'diagram'; content: string }[] = []
  let buf: string[] = []
  let mode: 'text' | 'diagram' = 'text'

  for (const line of lines) {
    const lineMode = isDiagramLine(line) ? 'diagram' : 'text'
    if (lineMode !== mode && buf.length) {
      segments.push({ type: mode, content: buf.join('\n') })
      buf = []
    }
    mode = lineMode
    buf.push(line)
  }
  if (buf.length) segments.push({ type: mode, content: buf.join('\n') })

  return (
    <View>
      {segments.map((seg, i) =>
        seg.type === 'diagram' ? (
          <View key={i} style={diagramStyles.block}>
            <Text style={diagramStyles.text}>{seg.content}</Text>
          </View>
        ) : (
          <Text key={i} style={explanationTextStyle}>{seg.content}</Text>
        )
      )}
    </View>
  )
}

const diagramStyles = StyleSheet.create({
  block: {
    backgroundColor: '#EDECEA',
    borderLeftWidth: 2,
    borderLeftColor: '#D5D1C8',
    padding: 10,
    marginVertical: 6,
  },
  text: { fontFamily: 'monospace', fontSize: 12, color: '#1A1A1A', lineHeight: 18 },
})

const explanationTextStyle = { fontSize: 15, color: '#1A1A1A', lineHeight: 23 } as const

export function scoreColor(score: number) {
  if (score >= 70) return '#1A6B3C'
  if (score >= 40) return '#7A4A10'
  return '#B83030'
}

export function scoreGrade(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Getting there'
  return 'Keep practicing'
}

const STATUS = {
  UNDERSTOOD:    { label: 'Understood',   color: '#1A6B3C', bg: '#E8F5EE', bar: '#1A6B3C' },
  SURFACE:       { label: 'Partial',      color: '#7A4A10', bg: '#F5EDDF', bar: '#C8401A' },
  NOT_ADDRESSED: { label: 'Missed',       color: '#5A5A52', bg: '#EDECEA', bar: '#AAAAAA' },
}

function ConceptRow({ concept, index }: { concept: SubConcept; index: number }) {
  const cfg = STATUS[concept.status as keyof typeof STATUS] ?? STATUS.NOT_ADDRESSED

  return (
    <View style={styles.conceptBlock}>
      <View style={styles.conceptHeader}>
        <View style={[styles.statusBar, { backgroundColor: cfg.bar }]} />
        <Text style={styles.conceptIndex}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={styles.conceptName}>{concept.name}</Text>
        <View style={[styles.statusTag, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusTagText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.conceptBody}>
        {concept.correct_explanation ? (
          <View style={styles.explanationBlock}>
            <Text style={styles.bodyLabel}>A good answer looks like</Text>
            <ExplanationText text={concept.correct_explanation} />
          </View>
        ) : null}
        {concept.evidence ? (
          <View style={styles.evidenceBlock}>
            <Text style={styles.bodyLabel}>What you said</Text>
            <Text style={styles.evidenceText}>"{concept.evidence}"</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

type Props = { assessment: Assessment }

export function ScorecardView({ assessment }: Props) {
  const color = scoreColor(assessment.overall_score)
  const understood = assessment.sub_concepts.filter(c => c.status === 'UNDERSTOOD').length
  const partial    = assessment.sub_concepts.filter(c => c.status === 'SURFACE').length
  const missed     = assessment.sub_concepts.filter(c => c.status === 'NOT_ADDRESSED').length

  return (
    <View>
      {/* Score row */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color }]}>{assessment.overall_score}</Text>
        <View style={styles.scoreRight}>
          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#1A6B3C' }]}>{understood}</Text>
              <Text style={styles.statLbl}>Understood</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#C8401A' }]}>{partial}</Text>
              <Text style={styles.statLbl}>Partial</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#5A5A52' }]}>{missed}</Text>
              <Text style={styles.statLbl}>Missed</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Summary rows */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Strongest point</Text>
          <Text style={styles.summaryText}>{assessment.strongest_point}</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#D5D1C8' }]}>
          <Text style={styles.summaryLabel}>Biggest gap</Text>
          <Text style={styles.summaryText}>{assessment.biggest_gap}</Text>
        </View>
        {assessment.misconceptions.length > 0 && (
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#D5D1C8' }]}>
            <Text style={styles.summaryLabel}>Misconceptions</Text>
            {assessment.misconceptions.map((m, i) => (
              <Text key={i} style={styles.summaryText}>— {m}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Concept breakdown */}
      <Text style={styles.sectionHeader}>Concept breakdown</Text>
      <View style={styles.conceptList}>
        {assessment.sub_concepts.map((c, i) => (
          <ConceptRow key={i} concept={c} index={i} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Score
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
    marginBottom: 0,
  },
  scoreNumber: { fontSize: 72, fontWeight: '800', lineHeight: 76, letterSpacing: -2 },
  scoreRight: { flex: 1 },
  statGrid: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#D5D1C8' },
  statNum: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  statLbl: { fontSize: 10, color: '#88887E', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  // Summary
  summarySection: { borderBottomWidth: 1, borderBottomColor: '#D5D1C8', marginBottom: 24 },
  summaryRow: { paddingVertical: 16 },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  summaryText: { fontSize: 16, color: '#1A1A1A', lineHeight: 24 },

  // Section header
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  // Concept rows
  conceptList: { gap: 0 },
  conceptBlock: {
    borderTopWidth: 1,
    borderTopColor: '#D5D1C8',
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingBottom: 8,
    gap: 10,
  },
  statusBar: { width: 3, height: 32, flexShrink: 0 },
  conceptIndex: { fontSize: 11, fontWeight: '700', color: '#88887E', width: 22, flexShrink: 0 },
  conceptName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A1A', lineHeight: 22 },
  statusTag: { paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  statusTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  // Body
  conceptBody: {
    paddingBottom: 16,
    paddingLeft: 13,
    gap: 12,
  },
  evidenceBlock: {},
  explanationBlock: {
    borderLeftWidth: 2,
    borderLeftColor: '#D5D1C8',
    paddingLeft: 12,
  },
  bodyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#88887E',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  evidenceText: { fontSize: 15, color: '#5A5A52', lineHeight: 22, fontStyle: 'italic' },
})
