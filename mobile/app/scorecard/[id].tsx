import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useStore } from '../../lib/store'
import { ScorecardView } from '../../components/ScorecardView'

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, clearSession } = useStore()

  if (!session?.scorecard) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Session complete!</Text>
        <Text style={styles.muted}>
          Koda couldn't generate a scorecard this time. This sometimes happens with custom topics.
        </Text>
        <Pressable style={styles.button} onPress={() => { clearSession(); router.replace('/') }}>
          <Text style={styles.buttonText}>Try Another Topic</Text>
        </Pressable>
      </View>
    )
  }

  function handleTryAnother() {
    clearSession()
    router.replace('/')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Your results for</Text>
      <Text style={styles.topic}>{session.scorecard.topic}</Text>

      <ScorecardView assessment={session.scorecard} />

      <Pressable style={styles.button} onPress={handleTryAnother}>
        <Text style={styles.buttonText}>Try Another Topic</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#fafaf9', justifyContent: 'center', alignItems: 'center', gap: 12 },
  heading: { fontSize: 14, color: '#64748b' },
  topic: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  muted: { color: '#64748b' },
  link: { color: '#22c55e', fontWeight: '600' },
  button: {
    marginTop: 32,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
