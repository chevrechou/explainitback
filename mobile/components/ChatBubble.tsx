import { View, Text, StyleSheet } from 'react-native'
import { Message } from '../lib/types'

type Props = { message: Message }

export function ChatBubble({ message }: Props) {
  const isKoda = message.role === 'assistant'
  return (
    <View style={[styles.row, isKoda ? styles.rowLeft : styles.rowRight]}>
      {isKoda && <Text style={styles.kodaLabel}>KODA</Text>}
      <View style={[styles.bubble, isKoda ? styles.kodaBubble : styles.userBubble]}>
        <Text style={[styles.text, !isKoda && styles.userText]}>{message.content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, maxWidth: '80%' },
  rowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  rowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  kodaLabel: { fontSize: 10, fontWeight: '700', color: '#22c55e', marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  kodaBubble: { backgroundColor: '#f0fdf4', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  userBubble: { backgroundColor: '#0f172a', borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: '#0f172a', lineHeight: 22 },
  userText: { color: '#fff' },
})
