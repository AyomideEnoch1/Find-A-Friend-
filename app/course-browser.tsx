import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getCourses, enrollInCourse, unenrollFromCourse, getMyEnrolledCourses } from '../lib/academic'
import type { Course } from '../lib/academic'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'
import Toast from 'react-native-toast-message'

export default function CourseBrowserScreen() {
  const theme = useTheme()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    const [allRes, myRes] = await Promise.all([
      getCourses(),
      getMyEnrolledCourses()
    ])
    
    if (allRes.data) {
      const myIds = new Set((myRes.data ?? []).map(c => c.id))
      const merged = allRes.data.map(c => ({
        ...c,
        is_enrolled: myIds.has(c.id)
      }))
      setCourses(merged)
    }
    setLoading(false)
  }

  const handleEnrollToggle = async (course: Course) => {
    setProcessingId(course.id)
    try {
      if (course.is_enrolled) {
        const { error } = await unenrollFromCourse(course.id)
        if (error) throw error
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_enrolled: false } : c))
      } else {
        const { error } = await enrollInCourse(course.id)
        if (error) throw error
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_enrolled: true } : c))
        Toast.show({ type: 'success', text1: 'Enrolled in ' + course.code })
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message })
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = courses.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderItem = ({ item }: { item: Course }) => (
    <View style={[s.card, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.code, { color: theme.accent }]}>{item.code}</Text>
        <Text style={[s.name, { color: theme.text }]}>{item.name}</Text>
        {(item.department || item.level) && (
          <Text style={[s.meta, { color: theme.textMuted }]}>
            {[item.department, item.level].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <TouchableOpacity 
        style={[s.btn, item.is_enrolled ? [s.btnActive, { borderColor: theme.accent }] : { backgroundColor: theme.accent }]}
        onPress={() => handleEnrollToggle(item)}
        disabled={processingId === item.id}>
        {processingId === item.id ? (
          <ActivityIndicator size="small" color={item.is_enrolled ? theme.accent : '#fff'} />
        ) : (
          <Text style={[s.btnText, item.is_enrolled ? { color: theme.accent } : { color: '#fff' }]}>
            {item.is_enrolled ? 'Added' : 'Add'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>Browse Courses</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.searchWrap}>
        <View style={[s.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[s.searchInput, { color: theme.text }]}
            placeholder="Search courses..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="book-outline" size={48} color={theme.textFaint} />
              <Text style={[s.emptyText, { color: theme.textMuted }]}>No courses found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: typography.fontBold },
  searchWrap: { padding: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: typography.fontRegular },
  list: { padding: 16, paddingTop: 0, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, padding: 16,
  },
  code: { fontSize: 12, fontFamily: typography.fontBold, marginBottom: 4 },
  name: { fontSize: 16, fontFamily: typography.fontSemiBold, marginBottom: 4 },
  meta: { fontSize: 12, fontFamily: typography.fontRegular },
  btn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', minWidth: 80,
  },
  btnActive: {
    backgroundColor: 'transparent', borderWidth: 1,
  },
  btnText: { fontSize: 13, fontFamily: typography.fontSemiBold },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: typography.fontMedium },
})
