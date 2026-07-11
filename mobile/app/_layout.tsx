import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useStore } from '../lib/store'

export default function RootLayout() {
  const loadUser = useStore((s) => s.loadUser)

  useEffect(() => {
    loadUser()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="scorecard/[id]" />
    </Stack>
  )
}
