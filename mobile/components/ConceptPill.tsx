import { View, Text, StyleSheet } from 'react-native'
import { SubConcept } from '../lib/types'

const CONFIG = {
  UNDERSTOOD: { label: 'Done',    color: '#1A6B3C', bg: '#E8F5EE' },
  SURFACE:    { label: 'Partial', color: '#7A4A10', bg: '#F5EDDF' },
  NOT_ADDRESSED: { label: 'Missed', color: '#5A5A52', bg: '#EDECEA' },
} as const

type Props = { concept: SubConcept }

export function ConceptPill({ concept }: Props) {
  const cfg = CONFIG[concept.status as keyof typeof CONFIG] ?? CONFIG.NOT_ADDRESSED
  return (
    <View style={styles.row}>
      <View style={[styles.tag, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.tagText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      <Text style={styles.name}>{concept.name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  name: { fontSize: 14, color: '#1A1A1A', flex: 1, lineHeight: 20 },
})
