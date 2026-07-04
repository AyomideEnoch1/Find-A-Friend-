import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-toast-message'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'
import { validatePasswordStrength } from '../lib/security'

export default function SecurityCenterScreen() {
  const theme = useTheme()

  // MFA states
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)

  // Password test states
  const [testPassword, setTestPassword] = useState('')
  const [pwdStrength, setPwdStrength] = useState<string | null>(null)
  const [pwdColor, setPwdColor] = useState('#ef4444')

  // Reporting Form states
  const [reportedUser, setReportedUser] = useState('')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  useEffect(() => {
    // Load persisted MFA state
    AsyncStorage.getItem('mfa_enabled_totp').then(val => {
      if (val) setMfaEnabled(val === 'true')
    })
  }, [])

  const handleMfaToggle = async (val: boolean) => {
    setMfaLoading(true)
    try {
      await AsyncStorage.setItem('mfa_enabled_totp', String(val))
      setMfaEnabled(val)
      Toast.show({
        type: 'success',
        text1: val ? '🔒 MFA Enabled' : '🔓 MFA Disabled',
        text2: val
          ? 'Authenticator app protection is now active.'
          : 'Multi-factor authentication has been disabled.',
      })
    } catch (e) {
      console.warn('Failed to save MFA preference:', e)
    } finally {
      setMfaLoading(false)
    }
  }

  const handlePasswordCheck = (text: string) => {
    setTestPassword(text)
    if (!text) {
      setPwdStrength(null)
      return
    }
    const err = validatePasswordStrength(text)
    if (!err) {
      setPwdStrength('Strong')
      setPwdColor('#10b981')
    } else if (text.length >= 8) {
      setPwdStrength('Medium (Missing complexity)')
      setPwdColor('#f59e0b')
    } else {
      setPwdStrength('Weak')
      setPwdColor('#ef4444')
    }
  }

  const submitReport = async () => {
    if (!reportedUser.trim() || !reason.trim()) {
      Alert.alert('Missing Info', 'Please specify the username and reason for reporting.')
      return
    }

    setSubmittingReport(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Not Authenticated', 'You must be signed in to report activity.')
        setSubmittingReport(false)
        return
      }

      const { error } = await supabase
        .from('security_reports')
        .insert({
          reporter_id: user.id,
          reported_user: reportedUser.trim(),
          reason: reason.trim(),
          details: details.trim() || null,
        })

      if (error) throw error

      Toast.show({
        type: 'success',
        text1: '✅ Report Submitted',
        text2: 'Thank you. Our security team will investigate.',
      })
      setReportedUser('')
      setReason('')
      setDetails('')
    } catch (err: any) {
      Alert.alert('Report Failed', err.message || 'An error occurred.')
    } finally {
      setSubmittingReport(false)
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: theme.card }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>Security Center</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
        {/* Section 1: Multi-Factor Authentication */}
        <View>
          <Text style={[s.sectionLabel, { color: theme.textMuted }]}>Access Security</Text>
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.row}>
              <Text style={s.icon}>🔑</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: theme.text }]}>Authenticator MFA</Text>
                <Text style={[s.sub, { color: theme.textMuted }]}>Protect logins with verification codes</Text>
              </View>
              {mfaLoading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Switch
                  value={mfaEnabled}
                  onValueChange={handleMfaToggle}
                  thumbColor={mfaEnabled ? theme.accent : '#ccc'}
                  trackColor={{ false: theme.card2, true: theme.accentBg }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Section 2: Live Password Strength Check */}
        <View>
          <Text style={[s.sectionLabel, { color: theme.textMuted }]}>Password Diagnostics</Text>
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 14, gap: 10 }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Test Password Strength</Text>
            <TextInput
              style={[
                s.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card2,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Type a password to test..."
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={testPassword}
              onChangeText={handlePasswordCheck}
            />
            {pwdStrength && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>Result:</Text>
                <Text style={{ fontSize: 13, fontFamily: typography.fontBold, color: pwdColor }}>
                  {pwdStrength}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 11, color: theme.textMuted, lineHeight: 16 }}>
              A strong password requires: at least 8 characters, an uppercase letter, a lowercase letter, a number, and a symbol.
            </Text>
          </View>
        </View>

        {/* Section 3: Phishing and Safety Warnings */}
        <View>
          <Text style={[s.sectionLabel, { color: theme.textMuted }]}>Security Tips & Awareness</Text>
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 14, gap: 12 }]}>
            <View style={s.tipItem}>
              <Text style={s.tipIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipTitle, { color: theme.text }]}>Admins will NEVER ask for passwords</Text>
                <Text style={[s.tipDesc, { color: theme.textMuted }]}>
                  Admins or support staff will never ask for your password, email OTP, or MFA codes. Never share these with anyone.
                </Text>
              </View>
            </View>

            <View style={s.tipItem}>
              <Text style={s.tipIcon}>🛑</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipTitle, { color: theme.text }]}>Phishing scam warnings</Text>
                <Text style={[s.tipDesc, { color: theme.textMuted }]}>
                  Beware of posts or messages promising free airtime, cash giveaways, early access to exam questions, or asking you to sign up on external websites.
                </Text>
              </View>
            </View>

            <View style={s.tipItem}>
              <Text style={s.tipIcon}>🎭</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipTitle, { color: theme.text }]}>Verify credentials before matching</Text>
                <Text style={[s.tipDesc, { color: theme.textMuted }]}>
                  Check for verified badges (purple/university colors) to avoid matching with fake or impersonator student profiles.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 4: Secure Incident Reporting */}
        <View>
          <Text style={[s.sectionLabel, { color: theme.textMuted }]}>Incident Reporting</Text>
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 14, gap: 12 }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Report Phishing / Impersonation</Text>
            <View style={{ gap: 8 }}>
              <TextInput
                style={[
                  s.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.card2,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Suspicious Username / Profile Name..."
                placeholderTextColor={theme.textMuted}
                value={reportedUser}
                onChangeText={setReportedUser}
              />
              <TextInput
                style={[
                  s.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.card2,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Reason (e.g. Phishing links, Fake profile)..."
                placeholderTextColor={theme.textMuted}
                value={reason}
                onChangeText={setReason}
              />
              <TextInput
                style={[
                  s.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.card2,
                    borderColor: theme.border,
                    height: 80,
                    textAlignVertical: 'top',
                  },
                ]}
                placeholder="Additional details (optional)..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                value={details}
                onChangeText={setDetails}
              />
            </View>
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.accent,
                  opacity: submittingReport ? 0.7 : 1,
                },
              ]}
              disabled={submittingReport}
              onPress={submitReport}
            >
              {submittingReport ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.buttonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontFamily: typography.fontSemiBold },
  sectionLabel: {
    fontSize: 11,
    fontFamily: typography.fontSemiBold,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  cardTitle: { fontSize: 14, fontFamily: typography.fontSemiBold, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  icon: { fontSize: 18 },
  label: { fontSize: 14, fontFamily: typography.fontMedium, marginBottom: 2 },
  sub: { fontSize: 12, fontFamily: typography.fontRegular },
  input: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    fontSize: 13,
    fontFamily: typography.fontMedium,
  },
  tipItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipIcon: { fontSize: 16, marginTop: 1 },
  tipTitle: { fontSize: 13, fontFamily: typography.fontSemiBold, marginBottom: 2 },
  tipDesc: { fontSize: 11, fontFamily: typography.fontRegular, lineHeight: 16 },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { fontSize: 13, fontFamily: typography.fontBold, color: '#fff' },
})
