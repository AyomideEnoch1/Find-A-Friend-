import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { getCurrentProfile } from '../lib/profiles'
import type { Profile } from '../lib/profiles'
import { uploadFile } from '../lib/upload'
import { typography } from '../lib/typography'
import VerifiedBadge, { BADGE_COLORS, BADGE_LABELS } from '../components/ui/VerifiedBadge'

const BADGE_DESCRIPTIONS: Record<string, string> = {
  verified: 'Verified student identity. Automatically granted to accounts signed up with official university email domains.',
  official: 'Official institution, university departments, administration or student government accounts.',
  moderator: 'Community moderators who help moderate social feed, posts, and clubs.',
  vendor: 'Approved campus vendors, shops, food spots, or student entrepreneurs.',
  staff: 'University faculty, lecturers, staff, or department administrators.',
  alumni: 'FAF alumni who graduated but remain connected to the campus community.',
  guest: 'Guest visitor account for external speakers, prospective students, or campus guests.',
}

export default function VerificationScreen() {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  
  // Verification states
  const [status, setStatus] = useState<'not_uploaded' | 'pending' | 'verified' | 'rejected'>('not_uploaded')
  const [idCardImage, setIdCardImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchProfileData = async () => {
    try {
      const p = await getCurrentProfile()
      if (p) {
        setProfile(p)
        // If the user's role is student/admin/vendor and badge_type is verified/official, they are verified
        if (p.id_card_status === 'verified' || p.badge_type === 'verified') {
          setStatus('verified')
        } else if (p.id_card_status === 'pending') {
          setStatus('pending')
        } else if (p.id_card_status === 'rejected') {
          setStatus('rejected')
        } else {
          setStatus('not_uploaded')
        }
      }
    } catch (err) {
      console.warn('Error fetching profile:', err)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
      setCreatedAt(data.user?.created_at ?? '')
    })
    fetchProfileData()
  }, [])

  const handlePickIdCard = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Please grant permission to access your photo library to upload your ID.')
      return
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setIdCardImage(pickerResult.assets[0].uri)
    }
  }

  const handleUploadIdCard = async () => {
    if (!idCardImage) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = idCardImage.split('.').pop() ?? 'jpg'
      
      // Upload file directly to S3
      const publicUrl = await uploadFile('id-cards', `${user.id}.${ext}`, idCardImage, `image/${ext}`, true)

      // Update database profile
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          id_card_url: publicUrl,
          id_card_status: 'pending',
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      setStatus('pending')
      setIdCardImage(null)
      Alert.alert('Submission Successful', 'Your student ID has been submitted for manual verification. Our team will review it within 24–48 hours.')
      fetchProfileData()
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'An error occurred during upload.')
    } finally {
      setUploading(false)
    }
  }

  const joinDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const isUniversity = email.includes('.edu') || email.includes('ac.uk')
    || email.includes('edu.ng') || email.includes('ac.za') || email.includes('.edu.')

  const badgeType = profile?.badge_type || 'guest'
  const badgeColor = profile?.badge_color || BADGE_COLORS[badgeType]

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: theme.card }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        
        {/* Verification Status Cards */}
        {status === 'verified' && (
          <View style={[s.badge, { backgroundColor: `${badgeColor}08`, borderColor: `${badgeColor}30` }]}>
            <View style={[s.badgeIcon, { backgroundColor: `${badgeColor}15` }]}>
              <VerifiedBadge type={badgeType} customColor={badgeColor} size={38} />
            </View>
            <Text style={[s.badgeTitle, { color: theme.text }]}>{BADGE_LABELS[badgeType] ?? 'Verified'}</Text>
            <Text style={[s.badgeSub, { color: theme.textMuted }]}>
              {BADGE_DESCRIPTIONS[badgeType]}
            </Text>
          </View>
        )}

        {status === 'pending' && (
          <View style={[s.statusCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="time" size={32} color="#D97706" />
            <Text style={[s.statusTitle, { color: '#92400E' }]}>Verification Pending</Text>
            <Text style={[s.statusText, { color: '#B45309' }]}>
              Your student ID is under review. Our administrators verify submissions within 24–48 hours. You will receive an in-app notification when verified.
            </Text>
          </View>
        )}

        {status === 'rejected' && (
          <View style={[s.statusCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444', marginBottom: 4 }]}>
            <Ionicons name="close-circle" size={32} color="#DC2626" />
            <Text style={[s.statusTitle, { color: '#991B1B' }]}>Verification Rejected</Text>
            <Text style={[s.statusText, { color: '#B91C1C' }]}>
              Unfortunately, your manual verification request was rejected. This usually happens if the student ID photo was blurry, cut off, expired, or did not match your account name. Please review your details and re-submit a clear document below.
            </Text>
          </View>
        )}

        {/* Upload Action Interface for Unverified / Rejected Users */}
        {(status === 'not_uploaded' || status === 'rejected') && (
          <View style={[s.uploadBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.uploadBoxTitle, { color: theme.text }]}>
              {status === 'rejected' ? 'Re-submit Verification ID' : 'Manual Student Verification'}
            </Text>
            <Text style={[s.uploadBoxDesc, { color: theme.textMuted }]}>
              If you registered with a personal email, upload a clear photo of your student ID card or admission letter to unlock your campus badge.
            </Text>

            <TouchableOpacity
              onPress={handlePickIdCard}
              style={[
                s.uploadArea,
                { borderColor: idCardImage ? theme.accent : theme.border, backgroundColor: theme.bg },
              ]}
            >
              {idCardImage ? (
                <>
                  <Image source={{ uri: idCardImage }} style={s.idPreview} resizeMode="cover" />
                  <View style={s.changeOverlay}>
                    <Ionicons name="camera-outline" size={20} color="#fff" />
                    <Text style={s.changeText}>Change Photo</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="id-card-outline" size={40} color={theme.textFaint} />
                  <Text style={[s.uploadPrompt, { color: theme.textMuted }]}>Tap to select ID photo</Text>
                  <Text style={[s.uploadHint, { color: theme.textFaint }]}>Clear JPG/PNG image up to 5MB</Text>
                </>
              )}
            </TouchableOpacity>

            {idCardImage && (
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: theme.accent }]}
                onPress={handleUploadIdCard}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>Submit ID for Verification 🚀</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Details */}
        <Text style={[s.sectionLabel, { color: theme.textMuted }]}>ACCOUNT DETAILS</Text>
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { icon: '👤', label: 'Name',      value: profile?.full_name || '—' },
            { icon: '📧', label: 'Email',     value: email || '—' },
            { icon: '🎓', label: 'Email type', value: isUniversity ? 'University email' : 'Standard email' },
            { icon: '📅', label: 'Joined',    value: joinDate },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[s.row, i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border2 }]}>
              <Text style={s.icon}>{item.icon}</Text>
              <Text style={[s.rowLabel, { color: theme.textMuted }]}>{item.label}</Text>
              <Text style={[s.rowValue, { color: theme.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Badge Manual Guide */}
        <Text style={[s.sectionLabel, { color: theme.textMuted }]}>BADGE DIRECTORY</Text>
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {Object.keys(BADGE_DESCRIPTIONS).map((type, i, arr) => {
            const color = BADGE_COLORS[type]
            return (
              <View
                key={type}
                style={[s.badgeManualRow, i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border2 }]}>
                <View style={[s.manualBadgeIcon, { backgroundColor: `${color}12` }]}>
                  <VerifiedBadge type={type} customColor={color} size={16} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.manualBadgeLabel, { color: theme.text }]}>
                    {BADGE_LABELS[type]}
                  </Text>
                  <Text style={[s.manualBadgeDesc, { color: theme.textMuted }]}>
                    {BADGE_DESCRIPTIONS[type]}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* How it works */}
        <Text style={[s.sectionLabel, { color: theme.textMuted }]}>HOW VERIFICATION WORKS</Text>
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { icon: '1️⃣', text: 'Sign up with your university email address or upload student ID card' },
            { icon: '2️⃣', text: 'FAF team checks student details and ID validity' },
            { icon: '3️⃣', text: 'Verified badge is granted automatically upon approval' },
            { icon: '4️⃣', text: 'Only verified profiles can post feeds, comments, and join student clubs' },
          ].map((step, i, arr) => (
            <View
              key={i}
              style={[s.step, i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border2 }]}>
              <Text style={s.icon}>{step.icon}</Text>
              <Text style={[s.stepText, { color: theme.textMuted }]}>{step.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  badge: {
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 10,
    borderWidth: 0.5, marginBottom: 4,
  },
  badgeIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { fontSize: 20, fontWeight: '700' },
  badgeSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  statusCard: {
    padding: 16, borderRadius: 16, borderLeftWidth: 4, gap: 8,
  },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusText: { fontSize: 13, lineHeight: 18 },
  uploadBox: {
    padding: 16, borderRadius: 16, borderWidth: 0.5, gap: 12,
  },
  uploadBoxTitle: { fontSize: 15, fontWeight: '700' },
  uploadBoxDesc: { fontSize: 12, lineHeight: 18 },
  uploadArea: {
    height: 140, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  idPreview: { width: '100%', height: '100%' },
  changeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  changeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  uploadPrompt: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  uploadHint: { fontSize: 11, marginTop: 4 },
  submitBtn: {
    paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  icon: { fontSize: 18, width: 26, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  step: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
  badgeManualRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  manualBadgeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  manualBadgeLabel: { fontSize: 13, fontWeight: '600' },
  manualBadgeDesc: { fontSize: 12, lineHeight: 17 },
})
