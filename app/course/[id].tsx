import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getMyEnrolledCourses, getResources, getStudyGroups, getMyJoinedStudyGroups } from '../../lib/academic'
import type { AcademicResource, StudyGroup } from '../../lib/academic'
import { useTheme } from '../../lib/theme'
import { typography } from '../../lib/typography'
import { getTimeAgo } from '../../lib/matching'
import StudyGroupCard from '../../components/academic/StudyGroupCard'

type Tab = 'groups' | 'resources'

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  note: '#8b5cf6',
  past_question: '#3b82f6',
  textbook: '#10b981',
  slide: '#f59e0b',
  other: '#6b7280',
}

export default function CourseDetailScreen() {
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('groups')
  const [refreshing, setRefreshing] = useState(false)
  
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [resources, setResources] = useState<AcademicResource[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadCourse()
    }
  }, [id])

  useEffect(() => {
    if (id && course) {
      loadTabData(activeTab)
    }
  }, [activeTab, course, id])

  const loadCourse = async () => {
    setLoading(true)
    try {
      const { data } = await getMyEnrolledCourses()
      const found = (data ?? []).find(c => c.id === id) ?? null
      setCourse(found)
    } catch {
      // Non-fatal
    } finally {
      setLoading(false)
    }
  }

  const loadTabData = async (tab: Tab, isRef = false) => {
    if (!isRef) setTabLoading(true)
    try {
      if (tab === 'groups') {
        const [groupsRes, joinedRes] = await Promise.all([
          getStudyGroups(id),
          getMyJoinedStudyGroups()
        ])
        const joinedIds = new Set(joinedRes.data ?? [])
        const mapped = (groupsRes.data ?? []).map(g => ({
          ...g,
          is_member: joinedIds.has(g.id)
        }))
        setStudyGroups(mapped)
      } else if (tab === 'resources') {
        const { data } = await getResources({ courseId: id })
        setResources(data ?? [])
      }
    } catch {
      // Non-fatal
    } finally {
      setTabLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadTabData(activeTab, true)
  }, [activeTab])

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={s.centeredWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    )
  }

  if (!course) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={s.centeredWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[s.errorText, { color: theme.text }]}>Course not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={[s.retryBtn, { backgroundColor: theme.accent }]}>
            <Text style={s.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const renderTabContent = () => {
    if (tabLoading) {
      return (
        <View style={s.tabLoadingContainer}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      )
    }

    if (activeTab === 'groups') {
      return (
        <FlatList
          data={studyGroups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <StudyGroupCard group={item} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color={theme.textFaint} />
              <Text style={[s.emptyTitle, { color: theme.textMuted }]}>No study groups</Text>
              <Text style={[s.emptySub, { color: theme.textFaint }]}>Be the first to create a study group for this course!</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
          contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
          scrollEnabled={false}
        />
      )
    }

    // Resources Tab
    return (
      <FlatList
        data={resources}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ResourceRow resource={item} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="document-outline" size={40} color={theme.textFaint} />
            <Text style={[s.emptyTitle, { color: theme.textMuted }]}>No resources shared</Text>
            <Text style={[s.emptySub, { color: theme.textFaint }]}>Upload course lecture slides, past questions, or study notes.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
        scrollEnabled={false}
      />
    )
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: theme.card }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[s.headerCode, { color: theme.accent }]} numberOfLines={1}>{course.code}</Text>
          <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{course.name}</Text>
        </View>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: theme.card }]}
          onPress={() => {
            if (activeTab === 'groups') {
              router.push({ pathname: '/create-study-group', params: { courseId: id } } as any)
            } else {
              router.push('/upload-resource' as any)
            }
          }}
        >
          <Ionicons name="add" size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* Course Info Cards */}
      <View style={s.courseDetailsHeader}>
        {(course.department || course.level) && (
          <Text style={[s.courseMetaText, { color: theme.textMuted }]}>
            {[course.department, course.level ? `Level ${course.level}` : null].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={[s.tabBar, { borderBottomColor: theme.border2 }]}>
        {(['groups', 'resources'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              s.tab,
              { backgroundColor: theme.card, borderColor: theme.border },
              activeTab === tab && { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              s.tabText,
              { color: theme.textMuted, fontFamily: typography.fontMedium },
              activeTab === tab && { color: theme.accent, fontFamily: typography.fontBold }
            ]}>
              {tab === 'groups' ? 'Study Groups' : 'Shared Resources'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'empty'}
        renderItem={() => null}
        ListHeaderComponent={renderTabContent()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  )
}

function ResourceRow({ resource }: { resource: AcademicResource }) {
  const theme = useTheme()
  const sizeLabel = resource.file_size_kb
    ? resource.file_size_kb >= 1024
      ? `${(resource.file_size_kb / 1024).toFixed(1)} MB`
      : `${resource.file_size_kb} KB`
    : null

  const handlePress = () => {
    router.push(`/resource/${resource.id}` as any)
  }

  const typeColor = theme.dark
    ? theme.accent
    : (RESOURCE_TYPE_COLORS[resource.resource_type] ?? theme.textMuted)

  return (
    <TouchableOpacity
      style={[s.resourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={[s.resourceIcon, { backgroundColor: typeColor + '18' }]}>
        <Ionicons name="document-text-outline" size={20} color={typeColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.resourceTitle, { color: theme.text }]} numberOfLines={1}>{resource.title}</Text>
        <View style={s.resourceMeta}>
          <Text style={[s.resourceTime, { color: theme.textMuted }]}>{getTimeAgo(resource.created_at)}</Text>
          {sizeLabel && <Text style={[s.resourceSize, { color: theme.textFaint }]}>{sizeLabel}</Text>}
        </View>
      </View>
      <View style={s.downloadCountContainer}>
        <Ionicons name="download-outline" size={11} color={theme.textMuted} />
        <Text style={[s.downloadCount, { color: theme.textMuted }]}>{resource.download_count}</Text>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centeredWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontFamily: typography.fontRegular },
  retryBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  retryText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCode: { fontSize: 11, fontFamily: typography.fontMedium },
  headerTitle: { fontSize: 15, fontFamily: typography.fontBold, marginTop: 1 },
  createBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  courseDetailsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  courseMetaText: {
    fontSize: 12,
    fontFamily: typography.fontMedium,
  },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    gap: 8, borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center',
    borderWidth: 0.5,
  },
  tabText: { fontSize: 11 },
  tabLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 14, fontFamily: typography.fontSemiBold },
  emptySub: { fontSize: 12, textAlign: 'center', fontFamily: typography.fontRegular },
  // Resources Styles
  resourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 0.5,
    marginHorizontal: 16, marginBottom: 8,
  },
  resourceIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  resourceTitle: { fontSize: 13, fontFamily: typography.fontMedium, marginBottom: 4 },
  resourceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resourceTime: { fontSize: 10, fontFamily: typography.fontRegular },
  resourceSize: { fontSize: 10, fontFamily: typography.fontRegular },
  downloadCountContainer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  downloadCount: { fontSize: 10, fontFamily: typography.fontRegular },
})
