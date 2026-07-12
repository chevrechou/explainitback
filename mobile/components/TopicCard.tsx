import { Pressable, Text, StyleSheet, View } from 'react-native'
import { Topic } from '../lib/types'

type Props = { topic: Topic; index?: number; onPress: () => void }

export function TopicCard({ topic, index, onPress }: Props) {
  const num = index !== undefined ? String(index + 1).padStart(2, '0') : null
  return (
    <Pressable style={styles.row} onPress={onPress}>
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
    borderBottomWidth: 1,
    borderBottomColor: '#D5D1C8',
    gap: 14,
  },
  num: { fontSize: 12, fontWeight: '600', color: '#88887E', width: 24 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  subject: { fontSize: 12, color: '#88887E', textTransform: 'uppercase', letterSpacing: 0.4 },
  arrow: { fontSize: 16, color: '#88887E' },
})
