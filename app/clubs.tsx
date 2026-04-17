import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { router } from 'expo-router'

const clubs = [
  {
    icon: '💻', name: 'Tech Innovators Club',
    category: 'Technology', members: 342,
    description: 'Building the future through code and innovation',
    announcement: 'Hackathon signup is now open!',
    color: '#a78bfa', joined: true,
  },
  {
    icon: '🎭', name: 'Drama & Arts Society',
    category: 'Arts', members: 198,
    description: 'Bringing stories to life through performance',
    announcement: 'Auditions this Friday at 5pm!',
    color: '#f472b6', joined: true,
  },
  {
    icon: '📸', name: 'Photography Circle',
    category: 'Arts', members: 87,
    description: 'Capturing campus life one shot at a time',
    announcement: 'Monthly shoot this Saturday 8am',
    color: '#60a5fa', joined: false,
  },
  {
    icon: '⚽', name: 'Football Association',
    category: 'Sports', members: 410,
    description: 'The official campus football league',
    announcement: 'Finals today at the Sports Complex!',
    color: '#34d399', joined: false,
  },
  {
    icon: '🎵', name: 'Music Society',
    category: 'Arts', members: 156,
    description: 'For lovers of all genres of music',
    announcement: null, color: '#fbbf24', joined: false,
  },
  {
    icon: '🏛️', name: 'Debate Club',
    category: 'Academic', members: 94,
    description: 'Sharpening minds through structured debate',
    announcement: 'Open night this Wednesday!',
    color: '#f87171', joined: false,
  },
]

const categories = ['All', 'Technology', 'Arts', 'Sports', 'Academic', 'Culture']

export default function ClubsScreen() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [joinedClubs, setJoinedClubs] = useState(
    clubs.filter(c => c.joined).map(c => c.name)
  )

  const filtered = clubs.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'All' || c.category === activeCategory
    return matchSearch && matchCat
  })

  const toggleJoin = (name: string) => {
    setJoinedClubs(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Clubs & societies</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search clubs..."
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
        {filtered.map((club, i) => {
          const isJoined = joinedClubs.includes(club.name)
          return (
            <TouchableOpacity key={i} style={s.clubCard}>
              <View style={s.clubTop}>
                <View style={[s.clubIcon, {
                  backgroundColor: club.color + '18',
                  borderColor: club.color + '35',
                }]}>
                  <Text style={s.clubIconText}>{club.icon}</Text>
                </View>
                <View style={s.clubInfo}>
                  <Text style={s.clubName}>{club.name}</Text>
                  <Text style={s.clubMeta}>
                    {club.category} · {club.members} members
                  </Text>
                  <Text style={s.clubDesc} numberOfLines={2}>
                    {club.description}
                  </Text>
                </View>
              </View>
              {club.announcement && (
                <View style={[s.announcement, { borderColor: club.color + '30' }]}>
                  <Text style={s.announcementIcon}>📢</Text>
                  <Text style={[s.announcementText, { color: club.color }]}>
                    {club.announcement}
                  </Text>
                </View>
              )}
              <View style={s.clubActions}>
                <TouchableOpacity
                  style={[
                    s.joinBtn,
                    isJoined
                      ? { backgroundColor: club.color + '20', borderColor: club.color + '40' }
                      : { backgroundColor: club.color, borderColor: club.color },
                  ]}
                  onPress={() => toggleJoin(club.name)}>
                  <Text style={[
                    s.joinText,
                    { color: isJoined ? club.color : '#fff' },
                  ]}>
                    {isJoined ? 'Joined ✓' : 'Join club'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.viewBtn}>
                  <Text style={s.viewText}>View page</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
  title: { fontSize: 18, fontWeight: '700', color: '#f0f0ff' },
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
  clubCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1c1c2e', borderRadius: 16, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  clubTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  clubIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, flexShrink: 0,
  },
  clubIconText: { fontSize: 24 },
  clubInfo: { flex: 1 },
  clubName: { fontSize: 14, fontWeight: '600', color: '#f0f0ff', marginBottom: 2 },
  clubMeta: { fontSize: 11, color: 'rgba(240,240,255,0.35)', marginBottom: 4 },
  clubDesc: { fontSize: 12, color: 'rgba(240,240,255,0.5)', lineHeight: 18 },
  announcement: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 0.5,
  },
  announcementIcon: { fontSize: 14 },
  announcementText: { fontSize: 12, fontWeight: '500', flex: 1 },
  clubActions: { flexDirection: 'row', gap: 8 },
  joinBtn: {
    flex: 1, borderRadius: 22, paddingVertical: 9,
    alignItems: 'center', borderWidth: 0.5,
  },
  joinText: { fontSize: 13, fontWeight: '600' },
  viewBtn: {
    flex: 1, borderRadius: 22, paddingVertical: 9,
    alignItems: 'center', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewText: { fontSize: 13, color: 'rgba(240,240,255,0.4)' },
})