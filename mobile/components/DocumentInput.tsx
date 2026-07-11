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
      <Text style={styles.heading}>Or paste a document / URL</Text>
      <TextInput
        style={[styles.textarea, styles.input]}
        placeholder="Paste text or a URL (https://...)"
        value={value}
        onChangeText={onChangeValue}
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={styles.input}
        placeholder="Topic name (optional)"
        value={label}
        onChangeText={onChangeLabel}
      />
      <Pressable
        style={[styles.button, disabled && styles.disabled]}
        onPress={onSubmit}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>Start →</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderColor: '#e2e8f0' },
  heading: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, marginBottom: 10, backgroundColor: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  button: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
