import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getCurrentProfile } from '../lib/profiles'

export default function AcademicScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentProfile().then(p => {
      setProfile(p)
      setLoading(false)
    })
  }, [])

  const courses = [
    {
      code: profile?.department === 'Computer Science' ? 'CSC 301' : 'GEN 301',
      name: 'Data Structures & Algorithms',
      lecturer: 'Prof. Adeyemi',
      time: 'Mon/Wed 8am',
      coursemates: 24,
      color: '#a78bfa',
    },
    {
      code: profile?.department === 'Computer Science' ? 'CSC 305' : 'GEN 305',
      name: 'Database Management',
      lecturer: 'Prof. Okafor',
      time: 'Tue/Thu 10am',
      coursemates: 18,
      color: '#60a5fa',
    },
    {
      code: 'GEN 201',
      name: 'Technical Writing',
      lecturer: 'Prof. Nwosu',
      time: 'Fri 2pm',
      coursemates: 42,
      color: '#34d399',
    },
  ]

  const studyGroups = [
    {
      name: 'DSA Final Prep',
      members: 6,
      venue: 'Library Room 3',
      time: 'Today 7pm',
      color: '#a78bfa',
    },
    {
      name: 'Database Project Group',
      members: 4,
      venue: 'Online — Google Meet',
      time: 'Sat 3pm',
      color: '#60a5fa',
    },
    {
      name: 'GEN 201 Study Circle',
      members: 8,
      venue: 'SUB Room 2',
      time: 'Sun 2pm',
      color: '#34d399',
    },
  ]

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Academic hub</Text>
          <TouchableOpacity style={s.addBtn}>
            <Text style={s.addText}>+ Course</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#a78bfa" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={s.profileBanner}>
              <Text style={s.bannerName}>
                {profile?.full_name ?? 'Student'}
              </Text>
              <Text style={s.bannerDept}>
                {profile?.department ?? 'Student'} · {profile?.level ?? ''}
              </Text>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Your courses this semester</Text>
            </View>

            {courses.map((c, i) => (
              <View key={i} style={s.courseCard}>
                <View style={[s.courseAccent, { backgroundColor: c.color }]} />
                <View style={s.courseBody}>
                  <View style={s.courseTop}>
                    <View>
                      <Text style={s.courseCode}>{c.code}</Text>
                      <Text style={s.courseName}>{c.name}</Text>
                      <Text style={s.courseLecturer}>
                        {c.lecturer} · {c.time}
                      </Text>
                    </View>
                    <View style={[s.coursemateBadge, { borderColor: c.color }]}>
                      <Text style={[s.coursemateText, { color: c.color }]}>
                        {c.coursemates} in common
                      </Text>
                    </View>
                  </View>
                  <View style={s.courseActions}>
                    <TouchableOpacity style={[s.courseBtn, { borderColor: c.color }]}>
                      <Text style={[s.courseBtnText, { color: c.color }]}>
                        Study group
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.courseBtnGray}>
                      <Text style={s.courseBtnGrayText}>Past questions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <View style={s.section}>
              <Text style={s.sectionTitle}>Active study groups</Text>
            </View>

            {studyGroups.map((g, i) => (
              <TouchableOpacity key={i} style={s.groupCard}>
                <View style={[s.groupIcon, { backgroundColor: g.color + '20', borderColor: g.color + '40' }]}>
                  <Text style={s.groupIconText}>📖</Text>
                </View>
                <View style={s.groupInfo}>
                  <Text style={s.groupName}>{g.name}</Text>
                  <Text style={s.groupDetails}>
                    {g.members} members · {g.venue}
                  </Text>
                  <Text style={[s.groupTime, { color: g.color }]}>{g.time}</Text>
                </View>
                <TouchableOpacity style={[s.joinBtn, { borderColor: g.color }]}>
                  <Text style={[s.joinText, { color: g.color }]}>Join</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <View style={{ height: 30 }} />
          </>
        )}
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
  addBtn: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)',
  },
  addText: { fontSize: 12, color: '#a78bfa', fontWeight: '500' },
  profileBanner: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#1c1c2e', borderRadius: 14,
    padding: 14, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bannerName: { fontSize: 16, fontWeight: '600', color: '#f0f0ff', marginBottom: 3 },
  bannerDept: { fontSize: 12, color: 'rgba(240,240,255,0.4)' },
  section: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: 'rgba(240,240,255,0.5)' },
  courseCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1c1c2e', borderRadius: 14,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  courseAccent: { width: 4 },
  courseBody: { flex: 1, padding: 12 },
  courseTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  courseCode: { fontSize: 11, color: 'rgba(240,240,255,0.4)', marginBottom: 2 },
  courseName: { fontSize: 13, fontWeight: '600', color: '#f0f0ff', marginBottom: 3 },
  courseLecturer: { fontSize: 11, color: 'rgba(240,240,255,0.35)' },
  coursemateBadge: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 0.5,
  },
  coursemateText: { fontSize: 9, fontWeight: '500' },
  courseActions: { flexDirection: 'row', gap: 8 },
  courseBtn: {
    flex: 1, borderRadius: 20, paddingVertical: 6,
    alignItems: 'center', borderWidth: 0.5,
    backgroundColor: 'transparent',
  },
  courseBtnText: { fontSize: 11, fontWeight: '500' },
  courseBtnGray: {
    flex: 1, borderRadius: 20, paddingVertical: 6,
    alignItems: 'center', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  courseBtnGrayText: { fontSize: 11, color: 'rgba(240,240,255,0.4)' },
  groupCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1c1c2e', borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  groupIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5,
  },
  groupIconText: { fontSize: 20 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 13, fontWeight: '600', color: '#f0f0ff', marginBottom: 2 },
  groupDetails: { fontSize: 11, color: 'rgba(240,240,255,0.35)', marginBottom: 2 },
  groupTime: { fontSize: 11, fontWeight: '500' },
  joinBtn: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 0.5,
  },
  joinText: { fontSize: 12, fontWeight: '500' },
})