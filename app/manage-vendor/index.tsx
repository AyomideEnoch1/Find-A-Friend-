import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { getMyVendor, deleteDeal } from '../../lib/vendors'
import type { VendorWithDeals, VendorDeal } from '../../lib/vendors'
import { useTheme } from '../../lib/theme'
import { typography } from '../../lib/typography'

export default function ManageVendorScreen() {
  const theme = useTheme()
  const [vendor, setVendor] = useState<VendorWithDeals | null>(null)
  const [loading, setLoading] = useState(true)

  const loadVendor = useCallback(async () => {
    setLoading(true)
    const { data } = await getMyVendor()
    setVendor(data)
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadVendor()
    }, [loadVendor])
  )

  const handleDelete = (dealId: string) => {
    Alert.alert('Delete Deal', 'Are you sure you want to delete this deal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await deleteDeal(dealId)
          if (!error) {
            setVendor(prev => prev ? { ...prev, vendor_deals: prev.vendor_deals.filter(d => d.id !== dealId) } : prev)
          } else {
            Alert.alert('Error', 'Could not delete deal')
          }
      }}
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    )
  }

  if (!vendor) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={s.center}>
          <Text style={[s.errorText, { color: theme.textMuted }]}>Vendor profile not found.</Text>
          <TouchableOpacity style={[s.btn, { backgroundColor: theme.card }]} onPress={() => router.back()}>
            <Text style={[s.btnText, { color: theme.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!vendor.is_approved) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>Vendor Dashboard</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={s.center}>
          <Ionicons name="time-outline" size={64} color={theme.accent} style={{ marginBottom: 16 }} />
          <Text style={[s.pendingTitle, { color: theme.text }]}>Application Pending</Text>
          <Text style={[s.pendingSub, { color: theme.textMuted }]}>
            Your vendor application for {vendor.name} is currently under review by the admins. You will be able to post deals once approved.
          </Text>
          <TouchableOpacity style={[s.btn, { backgroundColor: theme.card, marginTop: 24 }]} onPress={() => router.back()}>
            <Text style={[s.btnText, { color: theme.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const renderDeal = ({ item }: { item: VendorDeal }) => {
    const isExpired = item.valid_until ? new Date(item.valid_until) < new Date() : false
    
    return (
      <View style={[s.dealCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <View style={s.dealHeader}>
            <Text style={[s.dealTitle, { color: theme.text }]}>{item.title}</Text>
            {isExpired && (
              <View style={[s.expiredBadge, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                <Text style={s.expiredText}>Expired</Text>
              </View>
            )}
          </View>
          <Text style={[s.dealDiscount, { color: theme.accent }]}>{item.discount}</Text>
          {item.description ? (
             <Text style={[s.dealDesc, { color: theme.textMuted }]} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <Text style={[s.dealRedeem, { color: theme.textFaint }]}>Redeem: {item.how_to_redeem}</Text>
        </View>
        <View style={s.dealActions}>
          <TouchableOpacity 
            style={[s.actionBtn, { backgroundColor: theme.bg }]}
            onPress={() => router.push(`/manage-vendor/deal?id=${item.id}` as any)}
          >
            <Ionicons name="pencil" size={14} color={theme.textMuted} />
            <Text style={[s.actionText, { color: theme.textMuted }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash" size={14} color="#ef4444" />
            <Text style={[s.actionText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { borderBottomColor: theme.border, borderBottomWidth: 0.5 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>Manage Store</Text>
        <TouchableOpacity 
          style={s.addBtn} 
          onPress={() => router.push('/manage-vendor/deal' as any)}
        >
          <Ionicons name="add" size={24} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vendor.vendor_deals || []}
        keyExtractor={item => item.id}
        renderItem={renderDeal}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View style={s.vendorInfo}>
            <View style={s.vendorRow}>
              {vendor.logo_url ? (
                <Image source={{ uri: vendor.logo_url }} style={s.vendorLogo} />
              ) : (
                <View style={[s.vendorLogoPlaceholder, { backgroundColor: theme.cardSolid }]}>
                  <Text style={{ fontSize: 24 }}>{vendor.icon || '🏪'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.vendorName, { color: theme.text }]}>{vendor.name}</Text>
                <Text style={[s.vendorCategory, { color: theme.accent }]}>{vendor.category}</Text>
                <Text style={[s.vendorLocation, { color: theme.textFaint }]}>{vendor.location_text}</Text>
              </View>
            </View>
            <View style={[s.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: theme.text }]}>{vendor.vendor_deals?.length || 0}</Text>
                <Text style={[s.statLabel, { color: theme.textMuted }]}>Total Deals</Text>
              </View>
              <View style={[s.statDivider, { backgroundColor: theme.border }]} />
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: theme.text }]}>{vendor.vendor_deals?.filter(d => d.is_active && (!d.valid_until || new Date(d.valid_until) >= new Date())).length || 0}</Text>
                <Text style={[s.statLabel, { color: theme.textMuted }]}>Active</Text>
              </View>
            </View>
            <Text style={[s.sectionTitle, { color: theme.text }]}>Your Deals</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="pricetag-outline" size={48} color={theme.textFaint} />
            <Text style={[s.emptyTitle, { color: theme.textMuted }]}>No deals yet</Text>
            <Text style={[s.emptySub, { color: theme.textFaint }]}>Create your first deal to attract students!</Text>
            <TouchableOpacity 
              style={[s.createBtn, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/manage-vendor/deal' as any)}
            >
              <Text style={s.createBtnText}>Create Deal</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  headerTitle: { fontSize: 16, fontFamily: typography.fontSemiBold },
  errorText: { fontSize: 15, fontFamily: typography.fontMedium, marginBottom: 16 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { fontSize: 14, fontFamily: typography.fontSemiBold },
  pendingTitle: { fontSize: 20, fontFamily: typography.fontBold, marginBottom: 8 },
  pendingSub: { fontSize: 14, fontFamily: typography.fontRegular, textAlign: 'center', lineHeight: 20 },
  listContent: { padding: 16, paddingBottom: 40 },
  vendorInfo: { marginBottom: 24 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  vendorLogo: { width: 64, height: 64, borderRadius: 16 },
  vendorLogoPlaceholder: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vendorName: { fontSize: 20, fontFamily: typography.fontBold, marginBottom: 2 },
  vendorCategory: { fontSize: 13, fontFamily: typography.fontSemiBold, marginBottom: 2 },
  vendorLocation: { fontSize: 12, fontFamily: typography.fontRegular },
  statsRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 24 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 0.5, height: '100%' },
  statNum: { fontSize: 24, fontFamily: typography.fontBold, marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: typography.fontMedium },
  sectionTitle: { fontSize: 18, fontFamily: typography.fontSemiBold, marginBottom: 12 },
  dealCard: { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 12 },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  dealTitle: { fontSize: 15, fontFamily: typography.fontSemiBold, flex: 1 },
  expiredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  expiredText: { fontSize: 10, fontFamily: typography.fontBold, color: '#ef4444' },
  dealDiscount: { fontSize: 14, fontFamily: typography.fontBold, marginBottom: 6 },
  dealDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  dealRedeem: { fontSize: 11, fontFamily: typography.fontMedium },
  dealActions: { gap: 8, justifyContent: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  actionText: { fontSize: 12, fontFamily: typography.fontSemiBold },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: typography.fontSemiBold },
  emptySub: { fontSize: 13, fontFamily: typography.fontRegular, textAlign: 'center' },
  createBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#000', fontSize: 14, fontFamily: typography.fontBold },
})
