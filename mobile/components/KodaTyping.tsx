import { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, Text } from 'react-native'

export function KodaTyping() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(620 - i * 160),
        ])
      )
    )
    anims.forEach((a) => a.start())
    return () => anims.forEach((a) => a.stop())
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Koda</Text>
      <View style={styles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
                transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginVertical: 6 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8401A',
    marginBottom: 4,
    marginLeft: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bubble: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5D1C8',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 5,
  },
  dot: { width: 6, height: 6, backgroundColor: '#1A1A1A' },
})
