import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getMyEnrolledCourses, getResources } from '../../lib/academic'
import { useTheme } from '../../lib/theme'
import { typography } from '../../lib/typography'

export default function CourseDetailScreen() {
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For now just fetch all courses and find the matching one
    const fetch = async () => {
      const { data } = await getMyEnrolledCourses()
      if (data) setCourse(data.find(c => c.id === id))
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  if (!course) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={s.center}>
          <Ionicons name="alert-circle" size={48} color={theme.textMuted} />
          <Text style={[s.title, { color: theme.text }]}>Course not found</Text>
          <Text style={[s.sub, { color: theme.textMuted }]}>The requested course does not exist.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={s.content}>
        <Text style={[s.title, { color: theme.text }]}>{course.name}</Text>
        <Text style={[s.code, { color: theme.accent }]}>{course.code}</Text>
        {course.department && <Text style={[s.meta, { color: theme.textMuted }]}>Dept: {course.department}</Text>}
        {course.level && <Text style={[s.meta, { color: theme.textMuted }]}>Level: {course.level}</Text>}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  title: { fontSize: 24, fontFamily: typography.fontBold, marginBottom: 8 },
  code: { fontSize: 18, fontFamily: typography.fontSemiBold, marginBottom: 8 },
  meta: { fontSize: 14, fontFamily: typography.fontRegular, marginBottom: 4 },
  sub: { fontSize: 16, fontFamily: typography.fontRegular, marginTop: 12 },
})
