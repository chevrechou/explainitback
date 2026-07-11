import { Pressable, Text, StyleSheet } from 'react-native'
import { Topic } from '../lib/types'

type Props = { topic: Topic; onPress: () => void }

export function TopicCard({ topic, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.emoji}>{topic.emoji}</Text>
      <Text style={styles.name}>{topic.name}</Text>
      <Text style={styles.subject}>{topic.subject}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1, margin: 6, padding: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  emoji: { fontSize: 28, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  subject: { fontSize: 12, color: '#64748b' },
})
