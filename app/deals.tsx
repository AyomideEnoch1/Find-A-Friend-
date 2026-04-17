import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { router } from 'expo-router'

const deals = [
  {
    icon: '🍛', name: "Mama Cee's Kitchen",
    distance: '80m from Engineering Gate',
    deal: '20% off all meals',
    code: 'Show FAF app',
    discount: '-20%',
    color: '#fbbf24',
    category: 'Food',
  },
  {
    icon: '🖨️', name: 'SpeedPrint Hub',
    distance: 'Next to Main Library',
    deal: '30% off printing & binding',
    code: 'Show FAF app',
    discount: '-30%',
    color: '#60a5fa',
    category: 'Print',
  },
  {
    icon: '💈', name: 'Fade & Glow Salon',
    distance: 'Student Union basement',
    deal: '₦500 off any haircut',
    code: 'Students only',
    discount: '-₦500',
    color: '#a78bfa',
    category: 'Beauty',
  },
  {
    icon: '☕', name: 'Bean & Brew Café',
    distance: 'Arts faculty courtyard',
    deal: 'Free refill with any purchase',
    code: 'Show FAF app',
    discount: 'Free',
    color: '#34d399',
    category: 'Food',
  },
  {
    icon: '📚', name: 'Campus Bookstore',
    distance: 'Admin block ground floor',
    deal: '15% off all textbooks',
    code: 'Show student ID + FAF',
    discount: '-15%',
    color: '#f472b6',
    category: 'Academic',
  },
  {
    icon: '🏋️', name: 'FitZone Gym',
    distance: 'Sports Complex annex',
    deal: 'First week free trial',
    code: 'Show FAF app',
    discount: 'Free',
    color: '#f87171',
    category: 'Health',
  },
]

const categories = ['All', 'Food', 'Print', 'Beauty', 'Academic', 'Health']

export default function DealsScreen() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [savedDeals, setSavedDeals] = useState<string[]>([])

  const filtered = deals.filter(d => {
    const matchCat = activeCategory === 'All' || d.category === activeCategory
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const toggleSave = (name: string) => {
    setSavedDeals(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Campus deals</Text>
          <Text style={s.subtitle}>Student-only discounts near you</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search deals..."
          placeholderTextColor="rgba(240,240,255,0.3)"
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 14 }}>
        {categories.map((cat, i) => (
          <TouchableOpacity
            key={i}
            style={[s.chip, activeCategory === cat && s.chipActive]}
            onPress={() => setActiveCategory(cat)}>
            <Text style={[s.chipText, activeCategory === cat && s.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((deal, i) => {
          const isSaved = savedDeals.includes(deal.name)
          return (
            <View key={i} style={s.dealCard}>
              <View style={s.dealTop}>
                <View style={[s.dealIcon, {
                  backgroundColor: deal.color + '18',
                  borderColor: deal.color + '35',
                }]}>
                  <Text style={s.dealIconText}>{deal.icon}</Text>
                </View>
                <View style={s.dealInfo}>
                  <Text style={s.dealName}>{deal.name}</Text>
                  <Text style={s.dealDistance}>📍 {deal.distance}</Text>
                  <Text style={[s.dealOffer, { color: deal.color }]}>
                    {deal.deal}
                  </Text>
                </View>
                <View style={[s.discountBadge, {
                  backgroundColor: deal.color + '18',
                  borderColor: deal.color + '35',
                }]}>
                  <Text style={[s.discountText, { color: deal.color }]}>
                    {deal.discount}
                  </Text>
                </View>
              </View>

              <View style={s.dealFooter}>
                <View style={s.codeWrap}>
                  <Text style={s.codeLabel}>How to redeem:</Text>
                  <Text style={s.codeText}>{deal.code}</Text>
                </View>
                <TouchableOpacity
                  style={[s.saveBtn, isSaved && {
                    backgroundColor: deal.color + '20',
                    borderColor: deal.color,
                  }]}
                  onPress={() => toggleSave(deal.name)}>
                  <Text style={[s.saveText, isSaved && { color: deal.color }]}>
                    {isSaved ? '✓ Saved' : '🔖 Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 8, paddingBottom: 12,
  },
  back: { fontSize: 14, color: '#a78bfa' },
  title: { fontSize: 16, fontWeight: '700', color: '#f0f0ff', textAlign: 'center' },
  subtitle: { fontSize: 10, color: 'rgba(240,240,255,0.3)', textAlign: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#1c1c2e', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#f0f0ff' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#1c1c2e', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderColor: 'rgba(167,139,250,0.35)',
  },
  chipText: { fontSize: 12, color: 'rgba(240,240,255,0.4)' },
  chipTextActive: { color: '#a78bfa', fontWeight: '500' },
  dealCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1c1c2e', borderRadius: 16, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  dealTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dealIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, flexShrink: 0,
  },
  dealIconText: { fontSize: 24 },
  dealInfo: { flex: 1 },
  dealName: { fontSize: 14, fontWeight: '600', color: '#f0f0ff', marginBottom: 2 },
  dealDistance: { fontSize: 11, color: 'rgba(240,240,255,0.35)', marginBottom: 3 },
  dealOffer: { fontSize: 13, fontWeight: '600' },
  discountBadge: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 0.5, alignSelf: 'flex-start',
  },
  discountText: { fontSize: 13, fontWeight: '700' },
  dealFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  codeWrap: { flex: 1 },
  codeLabel: { fontSize: 10, color: 'rgba(240,240,255,0.3)', marginBottom: 2 },
  codeText: { fontSize: 12, color: 'rgba(240,240,255,0.6)', fontWeight: '500' },
  saveBtn: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  saveText: { fontSize: 12, color: 'rgba(240,240,255,0.4)', fontWeight: '500' },
})