import { useState, useRef, useEffect } from 'react'
import { Platform, Pressable, StyleSheet, Text, ActivityIndicator, Animated, View } from 'react-native'
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

type Props = { onTranscript: (text: string) => void; disabled?: boolean }

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const recordingRef = useRef<Audio.Recording | null>(null)     // native
  const mediaRecorderRef = useRef<any>(null)                    // web
  const chunksRef = useRef<BlobPart[]>([])
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
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
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    })
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
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
    const uri = recording.getURI()
    recordingRef.current = null
    if (!uri) { setState('idle'); return }
    try {
      const blob = await (await fetch(uri)).blob()
      const { text } = await api.transcribeAudio(blob, 'audio.m4a', user?.accessToken)
      if (text?.trim()) onTranscriptRef.current(text.trim())
    } catch {
      // silently ignore transcription errors
    } finally {
      setState('idle')
    }
  }

  // ── Web — MediaRecorder → Groq Whisper (no browser timeout) ─────────
  function handleWebVoice() {
    if (state === 'recording') {
      mediaRecorderRef.current?.stop()
      return
    }

    // @ts-ignore — navigator not typed for RN
    navigator.mediaDevices?.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    })
      .then((stream: MediaStream) => {
        chunksRef.current = []
        // @ts-ignore
        const mr = new MediaRecorder(stream)
        mediaRecorderRef.current = mr

        mr.ondataavailable = (e: any) => {
          if (e.data?.size > 0) chunksRef.current.push(e.data)
        }

        mr.onstop = async () => {
          stream.getTracks().forEach((t: any) => t.stop())
          setState('transcribing')
          try {
            // @ts-ignore
            const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
            const mimeType: string = (mr as any).mimeType || 'audio/webm'
            const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
            const { text } = await api.transcribeAudio(blob, `audio.${ext}`, user?.accessToken)
            if (text?.trim()) onTranscriptRef.current(text.trim())
          } catch (err: any) {
            onTranscriptRef.current(`⚠️ Transcription failed: ${err?.message ?? 'unknown error'}`)
          } finally {
            setState('idle')
          }
        }

        mr.start()
        setState('recording')
      })
      .catch(() => alert('Microphone access denied. Allow it in your browser settings.'))
  }

  function handlePressIn() {
    if (disabled) return
    if (Platform.OS === 'web') {
      handleWebVoice()   // toggle: start or stop
    } else if (state === 'idle') {
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
    width: 56, height: 56,
    backgroundColor: '#C8401A',
  },
  button: {
    width: 56, height: 56,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  recording: { backgroundColor: '#C8401A', borderColor: '#A03010' },
  faded: { opacity: 0.3 },
  icon: { fontSize: 20 },
})
