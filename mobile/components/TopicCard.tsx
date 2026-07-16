import { Pressable, Text, StyleSheet, View } from 'react-native'
import { Topic } from '../lib/types'

type Props = { topic: Topic; index?: number; isLast?: boolean; compact?: boolean; onPress: () => void }

export function TopicCard({ topic, index, isLast, compact, onPress }: Props) {
  const num = !compact && index !== undefined ? String(index + 1).padStart(2, '0') : null
  if (compact) {
    return (
      <Pressable style={[styles.compactRow, isLast && styles.rowLast]} onPress={onPress}>
        <Text style={styles.compactName}>{topic.name}</Text>
        <Text style={styles.arrow}>→</Text>
      </Pressable>
    )
  }
  return (
    <Pressable style={[styles.row, isLast && styles.rowLast]} onPress={onPress}>
      {num && <Text style={styles.num}>{num}</Text>}
      <View style={styles.info}>
        <Text style={styles.name}>{topic.name}</Text>
        <Text style={styles.subject}>{topic.subject}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
    gap: 14,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
    gap: 8,
  },
  rowLast: { borderBottomWidth: 0 },
  num: { fontSize: 12, fontWeight: '600', color: '#4A4942', width: 24 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  compactName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  subject: { fontSize: 13, color: '#4A4942', textTransform: 'uppercase', letterSpacing: 0.4 },
  arrow: { fontSize: 15, color: '#4A4942' },
})
