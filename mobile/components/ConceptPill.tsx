import { View, Text, StyleSheet } from 'react-native'
import { SubConcept } from '../lib/types'

const CONFIG = {
  UNDERSTOOD: { label: 'Got it', bg: '#dcfce7', color: '#166534' },
  SURFACE: { label: 'Surface', bg: '#fef9c3', color: '#854d0e' },
  NOT_ADDRESSED: { label: 'Missed', bg: '#f1f5f9', color: '#475569' },
} as const

type Props = { concept: SubConcept }

export function ConceptPill({ concept }: Props) {
  const cfg = CONFIG[concept.status as keyof typeof CONFIG] ?? CONFIG.NOT_ADDRESSED
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      <Text style={styles.name}>{concept.name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  pillText: { fontSize: 12, fontWeight: '600' },
  name: { fontSize: 14, color: '#0f172a', flex: 1 },
})
