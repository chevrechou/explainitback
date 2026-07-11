import { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'

export function KodaTyping() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    )
    anims.forEach((a) => a.start())
    return () => anims.forEach((a) => a.stop())
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginVertical: 4 },
  bubble: { flexDirection: 'row', backgroundColor: '#f0fdf4', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
})
