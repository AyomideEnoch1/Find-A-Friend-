import React from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStreakStore } from '../store/streakStore'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'

export function StreakModal() {
  const { currentStreak, showCelebration, closeCelebration } = useStreakStore()
  const theme = useTheme()

  if (!showCelebration) return null

  return (
    <Modal transparent animationType="fade" visible={showCelebration} onRequestClose={closeCelebration}>
      <View style={s.overlay}>
        <View style={[s.modalContent, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
          <View style={s.iconBg}>
            <Ionicons name="flame" size={64} color="#f97316" />
          </View>
          
          <Text style={[s.title, { color: theme.text }]}>Streak Extended!</Text>
          <Text style={[s.subtitle, { color: theme.textMuted }]}>
            You're on a <Text style={{ color: '#f97316', fontFamily: typography.fontBold }}>{currentStreak} day</Text> streak!
          </Text>
          <Text style={[s.body, { color: theme.textFaint }]}>
            Come back tomorrow to keep it going. Consistency is the key to success.
          </Text>

          <TouchableOpacity style={s.button} onPress={closeCelebration}>
            <Text style={s.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontExtraBold,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontMedium,
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontFamily: typography.fontRegular,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: typography.fontBold,
  },
})
