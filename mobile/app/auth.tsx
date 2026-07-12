import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useStore((s) => s.setUser)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const result = mode === 'login'
        ? await api.login(email, password)
        : await api.signup(email, password)
      await setUser({ id: result.user_id, accessToken: result.access_token })
      router.back()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#88887E"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#88887E"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.buttonText}>{mode === 'login' ? 'Sign in →' : 'Create account →'}</Text>}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={styles.toggle}>
          {mode === 'login' ? "No account? Sign up" : 'Have an account? Sign in'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.skip}>
        <Text style={styles.skipText}>Continue as guest</Text>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EC', justifyContent: 'center', padding: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 32, letterSpacing: -0.3 },
  input: {
    borderWidth: 1,
    borderColor: '#D5D1C8',
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
  },
  error: { color: '#B83030', marginBottom: 12, fontSize: 13 },
  button: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  toggle: { color: '#88887E', textAlign: 'center', marginTop: 22, fontSize: 14 },
  skip: { marginTop: 14, alignItems: 'center' },
  skipText: { color: '#C8401A', fontSize: 14, fontWeight: '600' },
})
