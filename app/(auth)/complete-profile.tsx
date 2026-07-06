import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/theme'
import { typography } from '../../lib/typography'
import { useThemeStore } from '../../store/themeStore'

type Gender = 'male' | 'female' | 'prefer_not_to_say'

interface University {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  domain?: string | null
}

export default function CompleteProfileScreen() {
  const theme = useTheme()
  const { setActiveUniversity } = useThemeStore()

  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<Gender | null>(null)
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedUni, setSelectedUni] = useState<University | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [uniSearchQuery, setUniSearchQuery] = useState('')
  const [idCardImage, setIdCardImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'student' | 'guest' | 'vendor' | 'admin'>('student')

  useEffect(() => {
    supabase
      .from('universities')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setUniversities(data)
      })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email) setEmail(user.email)
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.role) setRole(data.role as any)
          })
      }
    })
  }, [])

  const getFilteredUnis = () => {
    if (!email.trim()) return universities;
    const parts = email.split('@');
    if (parts.length < 2) return universities;
    const domain = parts[1].toLowerCase().trim();
    const matched = universities.filter(uni => uni.domain?.toLowerCase() === domain);
    if (matched.length > 0) return matched;
    return universities;
  };

  const filteredUnis = getFilteredUnis();

  useEffect(() => {
    if (email && universities.length > 0) {
      const parts = email.split('@');
      if (parts.length >= 2) {
        const domain = parts[1].toLowerCase().trim();
        const matched = universities.filter(uni => uni.domain?.toLowerCase() === domain);
        if (matched.length > 0) {
          if (!selectedUni || !matched.some(uni => uni.id === selectedUni.id)) {
            setSelectedUni(matched[0]);
          }
        }
      }
    }
  }, [email, universities, selectedUni]);

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/welcome')
  }

  const handlePickIdCard = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload your ID card.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images || 'images' as any,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setIdCardImage(result.assets[0].uri)
    }
  }

  const handleComplete = async () => {
    if (!gender || !selectedUni) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let idCardUrl: string | null = null
      let idCardStatus: 'not_uploaded' | 'pending' = 'not_uploaded'

      if (idCardImage) {
        const ext = idCardImage.split('.').pop() ?? 'jpg'
        const path = `id-cards/${user.id}.${ext}`
        
        let fileBody: any;
        if (Platform.OS === 'web') {
          const response = await fetch(idCardImage)
          fileBody = await response.blob()
        } else {
          fileBody = new FormData() as any
          fileBody.append('file', {
            uri: idCardImage,
            name: `${user.id}.${ext}`,
            type: `image/${ext}`,
          })
        }

        const { error: uploadError } = await supabase.storage
          .from('id-cards')
          .upload(path, fileBody, { contentType: `image/${ext}`, upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('id-cards').getPublicUrl(path)
          idCardUrl = urlData.publicUrl
          idCardStatus = 'pending'
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          gender,
          university_id: selectedUni.id,
          ...(idCardUrl ? { id_card_url: idCardUrl, id_card_status: idCardStatus } : {}),
        })
        .eq('id', user.id)

      if (error) throw error

      setActiveUniversity(selectedUni)
      Toast.show({
        type: 'success',
        text1: '🎉 Profile complete!',
        text2: `Welcome to the ${selectedUni.short_name} campus.`,
      })
      router.replace('/(tabs)')
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.message ?? 'Could not save profile.' })
    } finally {
      setSaving(false)
    }
  }

  const genderOptions: { id: Gender; label: string; emoji: string }[] = [
    { id: 'male', label: 'Male', emoji: '👨‍🎓' },
    { id: 'female', label: 'Female', emoji: '👩‍🎓' },
    { id: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🎓' },
  ]

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: theme.text }]}>Complete Your Profile</Text>
          <Text style={[s.headerSub, { color: theme.textMuted }]}>Step {step} of 3</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={[s.signOutBtn, { borderColor: theme.border }]}>
          <Ionicons name="log-out-outline" size={16} color={theme.textMuted} />
          <Text style={[s.signOutText, { color: theme.textMuted }]}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[s.progressTrack, { backgroundColor: theme.card }]}>
        <View style={[s.progressFill, { width: `${(step / 3) * 100}%` as any, backgroundColor: theme.accent }]} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Step 1: Gender */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <Text style={[s.stepTitle, { color: theme.text }]}>What's your gender?</Text>
            <Text style={[s.stepSub, { color: theme.textMuted }]}>
              This helps us personalise your experience and connect you better.
            </Text>
            <View style={s.optionsGrid}>
              {genderOptions.map((g) => {
                const isSelected = gender === g.id
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setGender(g.id)}
                    style={[
                      s.genderCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      isSelected && { borderColor: theme.accent, backgroundColor: theme.accentBg },
                    ]}
                  >
                    <Text style={s.genderEmoji}>{g.emoji}</Text>
                    <Text style={[s.genderLabel, { color: isSelected ? theme.accent : theme.text }]}>
                      {g.label}
                    </Text>
                    {isSelected && (
                      <View style={[s.checkMark, { backgroundColor: theme.accent }]}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
            <TouchableOpacity
              style={[s.nextBtn, { backgroundColor: gender ? theme.accent : theme.card }]}
              onPress={() => gender && setStep(2)}
              disabled={!gender}
            >
              <Text style={[s.nextBtnText, { color: gender ? '#fff' : theme.textFaint }]}>
                Continue →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: University */}
        {step === 2 && (
          <View style={s.stepWrap}>
            <Text style={[s.stepTitle, { color: theme.text }]}>Select your university</Text>
            <Text style={[s.stepSub, { color: theme.textMuted }]}>
              You'll be placed into your school's dedicated campus interface.
            </Text>
            <View style={{ marginBottom: 20, zIndex: 1000 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                }}
                onPress={() => setDropdownOpen(!dropdownOpen)}
              >
                <Text style={{ fontSize: 14, fontFamily: typography.fontSemiBold, color: selectedUni ? theme.text : theme.textMuted }}>
                  {selectedUni ? `${selectedUni.name} (${selectedUni.short_name})` : 'Select a university...'}
                </Text>
                <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
              </TouchableOpacity>
              {dropdownOpen && (
                <View style={{
                  marginTop: 4,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 4,
                  maxHeight: 280,
                }}>
                  {/* Search Input */}
                  <View style={{ padding: 8, borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
                    <TextInput
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 0.5,
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.card2,
                        fontSize: 13,
                        fontFamily: typography.fontMedium,
                      }}
                      placeholder="Search university..."
                      placeholderTextColor={theme.textMuted}
                      value={uniSearchQuery}
                      onChangeText={setUniSearchQuery}
                    />
                  </View>
                  {/* Scrollable list */}
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {filteredUnis
                      .filter(uni => 
                        uni.name.toLowerCase().includes(uniSearchQuery.toLowerCase()) || 
                        uni.short_name.toLowerCase().includes(uniSearchQuery.toLowerCase())
                      )
                      .map((uni) => (
                        <TouchableOpacity
                          key={uni.id}
                          style={{
                            padding: 14,
                            borderBottomWidth: 0.5,
                            borderBottomColor: theme.border,
                            backgroundColor: selectedUni?.id === uni.id ? `${uni.primary_color}12` : 'transparent',
                          }}
                          onPress={() => {
                            setSelectedUni(uni);
                            setDropdownOpen(false);
                            setUniSearchQuery('');
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: typography.fontSemiBold, color: theme.text }}>
                            {uni.name} ({uni.short_name})
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={s.rowBtns}>
              <TouchableOpacity
                style={[s.backBtn, { borderColor: theme.border }]}
                onPress={() => setStep(1)}
              >
                <Text style={[s.backBtnText, { color: theme.textMuted }]}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.nextBtn, { flex: 1, backgroundColor: selectedUni ? theme.accent : theme.card }]}
                onPress={() => selectedUni && setStep(3)}
                disabled={!selectedUni}
              >
                <Text style={[s.nextBtnText, { color: selectedUni ? '#fff' : theme.textFaint }]}>
                  Continue →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: ID Card */}
        {step === 3 && (
          <View style={s.stepWrap}>
            <Text style={[s.stepTitle, { color: theme.text }]}>Upload your student ID</Text>
            <Text style={[s.stepSub, { color: theme.textMuted }]}>
              Optional but recommended — verify your student status to unlock a{' '}
              <Text style={{ color: theme.accent, fontFamily: typography.fontSemiBold }}>✅ Verified</Text>
              {' '}badge. Our team reviews IDs within 24–48 hours.
            </Text>

            <TouchableOpacity
              onPress={handlePickIdCard}
              style={[
                s.uploadArea,
                { borderColor: idCardImage ? theme.accent : theme.border, backgroundColor: theme.card },
              ]}
            >
              {idCardImage ? (
                <>
                  <Image source={{ uri: idCardImage }} style={s.idPreview} resizeMode="cover" />
                  <View style={[s.changeOverlay]}>
                    <Ionicons name="camera-outline" size={22} color="#fff" />
                    <Text style={s.changeText}>Change photo</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="id-card-outline" size={48} color={theme.textFaint} />
                  <Text style={[s.uploadPrompt, { color: theme.textMuted }]}>Tap to upload your student ID card</Text>
                  <Text style={[s.uploadHint, { color: theme.textFaint }]}>JPG or PNG, max 5MB</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={[s.privacyNote, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.textMuted} />
              <Text style={[s.privacyText, { color: theme.textMuted }]}>
                Your ID is stored securely and only visible to our verification team. It is never shared publicly.
              </Text>
            </View>

            <View style={s.rowBtns}>
              <TouchableOpacity
                style={[s.backBtn, { borderColor: theme.border }]}
                onPress={() => setStep(2)}
              >
                <Text style={[s.backBtnText, { color: theme.textMuted }]}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.nextBtn, { flex: 1, backgroundColor: (role === 'guest' && !idCardImage) ? theme.card : theme.accent }]}
                onPress={handleComplete}
                disabled={saving || (role === 'guest' && !idCardImage)}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[s.nextBtnText, { color: (role === 'guest' && !idCardImage) ? theme.textFaint : '#fff' }]}>
                    {idCardImage ? 'Submit & Enter App 🚀' : (role === 'guest' ? 'ID Upload Required ⚠️' : 'Skip & Enter App →')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontFamily: typography.fontBold },
  headerSub: { fontSize: 12, fontFamily: typography.fontRegular, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  signOutText: { fontSize: 12, fontFamily: typography.fontMedium },
  progressTrack: { height: 4, marginHorizontal: 20, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 4, borderRadius: 4 },
  content: { padding: 20, paddingBottom: 60 },
  stepWrap: { gap: 16 },
  stepTitle: { fontSize: 24, fontFamily: typography.fontBold, lineHeight: 32 },
  stepSub: { fontSize: 14, fontFamily: typography.fontRegular, lineHeight: 22 },
  optionsGrid: { gap: 12, marginTop: 8 },
  genderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
  },
  genderEmoji: { fontSize: 28 },
  genderLabel: { fontSize: 16, fontFamily: typography.fontSemiBold },
  checkMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uniList: { gap: 10, marginTop: 8 },
  uniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  uniSwatch: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uniSwatchText: { color: '#fff', fontFamily: typography.fontBold, fontSize: 14 },
  uniName: { fontSize: 14, fontFamily: typography.fontSemiBold },
  uniShort: { fontSize: 12, fontFamily: typography.fontRegular, marginTop: 2 },
  nextBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 15, fontFamily: typography.fontBold },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 14, fontFamily: typography.fontMedium },
  uploadArea: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 10,
  },
  idPreview: { width: '100%', height: '100%', position: 'absolute' },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  changeText: { color: '#fff', fontFamily: typography.fontSemiBold, fontSize: 13 },
  uploadPrompt: { fontSize: 14, fontFamily: typography.fontMedium, textAlign: 'center' },
  uploadHint: { fontSize: 12, fontFamily: typography.fontRegular },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyText: { flex: 1, fontSize: 12, fontFamily: typography.fontRegular, lineHeight: 18 },
})
