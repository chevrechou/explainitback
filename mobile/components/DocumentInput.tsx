import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'

type Props = {
  value: string
  label: string
  onChangeValue: (v: string) => void
  onChangeLabel: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function DocumentInput({ value, label, onChangeValue, onChangeLabel, onSubmit, disabled }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Paste text or a URL (https://...)"
        placeholderTextColor="#88887E"
        value={value}
        onChangeText={onChangeValue}
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={styles.input}
        placeholder="Topic name (optional)"
        placeholderTextColor="#88887E"
        value={label}
        onChangeText={onChangeLabel}
      />
      <Pressable
        style={[styles.button, disabled && styles.disabled]}
        onPress={onSubmit}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>Start session →</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingTop: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#D5D1C8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#1A1A1A',
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: { opacity: 0.35 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
})
