import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Pressable, FlatList, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { TopicCard } from '../components/TopicCard'
import { DocumentInput } from '../components/DocumentInput'
import { Topic } from '../lib/types'

const DEFAULT_TOPICS: Topic[] = [
  { id: 'photosynthesis', name: 'Photosynthesis', subject: 'Biology', emoji: '🌿', sub_concept_count: 7 },
  { id: 'pythagorean_theorem', name: 'Pythagorean Theorem', subject: 'Math', emoji: '📐', sub_concept_count: 6 },
  { id: 'supply_and_demand', name: 'Supply And Demand', subject: 'Economics', emoji: '📈', sub_concept_count: 7 },
  { id: 'natural_selection', name: 'Natural Selection', subject: 'Biology', emoji: '🦎', sub_concept_count: 7 },
  { id: 'newton_second_law', name: 'Newton Second Law', subject: 'Physics', emoji: '🍎', sub_concept_count: 7 },
]

export default function TopicPicker() {
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS)
  const [docValue, setDocValue] = useState('')
  const [docLabel, setDocLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, startSession } = useStore()

  useEffect(() => {
    api.getTopics().then((r) => setTopics(r.topics)).catch(() => {})
  }, [])

  async function handleStart(topic: string, documentText?: string) {
    setLoading(true)
    try {
      const isUrl = documentText?.startsWith('http')
      const res = await api.startSession(
        topic,
        isUrl ? null : documentText,
        isUrl ? documentText : null,
        user?.accessToken,
      )
      const sessionId = randomUUID()
      startSession(sessionId, res.topic, res.first_message, isUrl ? null : (documentText ?? null), res.sub_concept_names ?? [])
      router.push(`/session/${sessionId}`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Explain It Back</Text>
        {user ? (
          <Pressable onPress={() => useStore.getState().setUser(null)}>
            <Text style={styles.authLink}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/auth')}>
            <Text style={styles.authLink}>Sign in</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.subtitle}>
        Pick a topic and teach it to Koda. He'll ask questions until he gets it — or until he finds out you don't.
      </Text>

      {loading && <ActivityIndicator style={{ marginVertical: 24 }} color="#22c55e" />}

      <FlatList
        data={topics}
        numColumns={2}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TopicCard topic={item} onPress={() => !loading && handleStart(item.name)} />
        )}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
      />

      <DocumentInput
        value={docValue}
        label={docLabel}
        onChangeValue={setDocValue}
        onChangeLabel={setDocLabel}
        onSubmit={() => handleStart(docLabel || 'Custom Topic', docValue)}
        disabled={loading || !docValue.trim()}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  authLink: { color: '#22c55e', fontWeight: '600' },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  row: { marginHorizontal: -6 },
})
