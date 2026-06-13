import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { createListing, updateDeal, getMyVendor } from '../../lib/vendors'
import type { VendorDeal } from '../../lib/vendors'
import { useTheme } from '../../lib/theme'
import { typography } from '../../lib/typography'

export default function DealFormScreen() {
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const isEditing = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState('')
  const [howToRedeem, setHowToRedeem] = useState('Show FAF app')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [vendorId, setVendorId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: vData } = await getMyVendor()
    if (vData) {
      setVendorId(vData.id)
      if (isEditing) {
        const deal = vData.vendor_deals.find(d => d.id === id)
        if (deal) {
          setTitle(deal.title)
          setDescription(deal.description || '')
          setDiscount(deal.discount)
          setHowToRedeem(deal.how_to_redeem)
        }
      }
    }
    setLoading(false)
  }

  const canSubmit = title.trim().length > 0 && discount.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit || !vendorId) return
    setSubmitting(true)
    try {
      if (isEditing) {
        const { error } = await updateDeal(id as string, {
          title: title.trim(),
          description: description.trim() || undefined,
          discount: discount.trim(),
          howToRedeem: howToRedeem.trim(),
        })
        if (error) throw error
        Alert.alert('Success', 'Deal updated successfully', [{ text: 'OK', onPress: () => router.back() }])
      } else {
        const { error } = await createListing({
          vendorId,
          title: title.trim(),
          description: description.trim() || undefined,
          discount: discount.trim(),
          howToRedeem: howToRedeem.trim(),
        })
        if (error) throw error
        Alert.alert('Success', 'Deal created successfully', [{ text: 'OK', onPress: () => router.back() }])
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.header, { borderBottomColor: theme.border, borderBottomWidth: 0.5 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>{isEditing ? 'Edit Deal' : 'New Deal'}</Text>
          <TouchableOpacity 
            style={[s.saveBtn, { backgroundColor: canSubmit ? theme.accent : theme.cardSolid }]} 
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[s.saveBtnText, { color: canSubmit ? '#000' : theme.textMuted }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Text style={[s.label, { color: theme.textMuted }]}>Deal Title <Text style={{ color: '#ef4444' }}>*</Text></Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. 20% off all Burgers"
            placeholderTextColor={theme.textFaint}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />

          <Text style={[s.label, { color: theme.textMuted }]}>Discount Value <Text style={{ color: '#ef4444' }}>*</Text></Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. 20% OFF or $5 OFF"
            placeholderTextColor={theme.textFaint}
            value={discount}
            onChangeText={setDiscount}
            maxLength={20}
          />

          <Text style={[s.label, { color: theme.textMuted }]}>Description <Text style={{ color: theme.textFaint, fontWeight: '400' }}>(optional)</Text></Text>
          <TextInput
            style={[s.input, s.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Details about this deal..."
            placeholderTextColor={theme.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />

          <Text style={[s.label, { color: theme.textMuted }]}>How to Redeem <Text style={{ color: '#ef4444' }}>*</Text></Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Show FAF app or Use code FAF20"
            placeholderTextColor={theme.textFaint}
            value={howToRedeem}
            onChangeText={setHowToRedeem}
            maxLength={100}
          />
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  headerTitle: { fontSize: 16, fontFamily: typography.fontSemiBold },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 13, fontFamily: typography.fontBold },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontFamily: typography.fontSemiBold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: typography.fontRegular, borderWidth: 0.5,
    marginBottom: 20,
  },
  textArea: { minHeight: 90, lineHeight: 20 },
})
