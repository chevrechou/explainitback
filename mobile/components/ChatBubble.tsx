import { View, Text, StyleSheet } from 'react-native'
import { Message } from '../lib/types'

type Props = { message: Message }

export function ChatBubble({ message }: Props) {
  const isKoda = message.role === 'assistant'
  return (
    <View style={[styles.row, isKoda ? styles.rowLeft : styles.rowRight]}>
      {isKoda && <Text style={styles.kodaLabel}>Koda</Text>}
      <View style={[styles.bubble, isKoda ? styles.kodaBubble : styles.userBubble]}>
        <Text style={[styles.text, !isKoda && styles.userText]}>{message.content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { marginVertical: 6, maxWidth: '82%' },
  rowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  rowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  kodaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8401A',
    marginBottom: 4,
    marginLeft: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 11 },
  kodaBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5D1C8',
  },
  userBubble: { backgroundColor: '#1A1A1A' },
  text: { fontSize: 17, color: '#1A1A1A', lineHeight: 26 },
  userText: { color: '#FFFFFF' },
})
