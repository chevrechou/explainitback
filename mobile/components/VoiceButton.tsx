import { useState, useRef, useEffect } from 'react'
import { Platform, Pressable, StyleSheet, Text, ActivityIndicator, Animated, View } from 'react-native'
import { Audio } from 'expo-av'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

type Props = { onTranscript: (text: string) => void; disabled?: boolean }

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const user = useStore((s) => s.user)
  const ring1 = useRef(new Animated.Value(0)).current
  const ring2 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (state !== 'recording') {
      ring1.setValue(0)
      ring2.setValue(0)
      return
    }

    const ripple = (anim: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(400),
        ])
      )

    ripple(ring1).start()
    const t = setTimeout(() => ripple(ring2).start(), 700)
    return () => {
      clearTimeout(t)
      ring1.stopAnimation(); ring1.setValue(0)
      ring2.stopAnimation(); ring2.setValue(0)
    }
  }, [state])

  // ── Native (iOS/Android) ──────────────────────────────────────────────
  async function startNativeRecording() {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) return
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    )
    recordingRef.current = recording
    setState('recording')
  }

  async function stopNativeRecording() {
    const recording = recordingRef.current
    if (!recording) return
    setState('transcribing')
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    recordingRef.current = null
    if (!uri) { setState('idle'); return }
    try {
      const blob = await (await fetch(uri)).blob()
      const { text } = await api.transcribeAudio(blob, 'audio.m4a', user?.accessToken)
      onTranscript(text)
    } catch {
      // silently ignore transcription errors
    } finally {
      setState('idle')
    }
  }

  // ── Web (Chrome / Edge) ───────────────────────────────────────────────
  function handleWebVoice() {
    // @ts-ignore — Web Speech API not in TS lib
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is not supported in this browser. Use Chrome or Edge.')
      return
    }
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setState('recording')
    recognition.onend = () => setState('idle')
    recognition.onerror = () => setState('idle')
    recognition.onresult = (e: any) => onTranscript(e.results[0][0].transcript)
    recognition.start()
  }

  function handlePressIn() {
    if (disabled || state !== 'idle') return
    if (Platform.OS === 'web') {
      handleWebVoice()
    } else {
      startNativeRecording()
    }
  }

  function handlePressOut() {
    if (Platform.OS !== 'web' && state === 'recording') {
      stopNativeRecording()
    }
  }

  const isRecording = state === 'recording'
  const isTranscribing = state === 'transcribing'

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] }),
  })

  return (
    <View style={styles.wrapper}>
      {isRecording && (
        <>
          <Animated.View style={[styles.ring, ringStyle(ring1)]} />
          <Animated.View style={[styles.ring, ringStyle(ring2)]} />
        </>
      )}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isTranscribing}
        style={[
          styles.button,
          isRecording && styles.recording,
          (disabled || isTranscribing) && styles.faded,
        ]}
      >
        {isTranscribing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.icon}>{isRecording ? '⏹' : '🎙'}</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#dc2626',
  },
  button: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#16a34a',
  },
  recording: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
  faded: { opacity: 0.4 },
  icon: { fontSize: 22 },
})
