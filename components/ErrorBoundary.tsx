import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  children: React.ReactNode
  fallbackLabel?: string
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <View style={s.container}>
        <Text style={s.emoji}>⚠️</Text>
        <Text style={s.title}>{this.props.fallbackLabel ?? 'Something went wrong'}</Text>
        <Text style={s.message}>{this.state.message}</Text>
        <TouchableOpacity style={s.btn} onPress={this.reset}>
          <Text style={s.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    )
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 40, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#f0f0ff', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13, color: 'rgba(240,240,255,0.4)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)' },
  btnText: { fontSize: 14, color: '#a78bfa', fontWeight: '600' },
})
