import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  TextInput, Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect, useCallback } from 'react'
import { getFeedPosts, createPost } from '../../lib/posts'
import { getAllProfiles, getCurrentProfile } from '../../lib/profiles'
import { calculateMatchScore, getInitials, getTimeAgo } from '../../lib/matching'

export default function HomeScreen() {
  const [posts, setPosts] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [myProfile, setMyProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostBody, setNewPostBody] = useState('')
  const [newPostTags, setNewPostTags] = useState('')
  const [posting, setPosting] = useState(false)

  const loadData = useCallback(async () => {
    const [feedPosts, profiles, profile] = await Promise.all([
      getFeedPosts(),
      getAllProfiles(),
      getCurrentProfile(),
    ])
    setPosts(feedPosts)
    setMyProfile(profile)
    const withScores = profiles.map((p: any) => ({
      ...p,
      matchScore: calculateMatchScore(
        profile?.interests ?? [],
        p.interests ?? []
      ),
    })).sort((a: any, b: any) => b.matchScore - a.matchScore)
    setPeople(withScores)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  const submitPost = async () => {
    if (!newPostBody.trim()) return
    setPosting(true)
    const tags = newPostTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    await createPost(newPostBody.trim(), tags)
    setNewPostBody('')
    setNewPostTags('')
    setPosting(false)
    setShowNewPost(false)
    loadData()
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text style={styles.loadingText}>Loading FAF...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
          />
        }>

        <View style={styles.header}>
          <Text style={styles.logo}>FAF</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowNewPost(true)}>
              <Text style={styles.iconText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.iconText}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetSub}>{greeting()},</Text>
          <Text style={styles.greetMain}>
            {myProfile?.full_name
              ? myProfile.full_name.split(' ')[0] + ' 👋'
              : 'Welcome to FAF 👋'}
          </Text>
        </View>

        {people.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>People you may know</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.peopleScroll}
              contentContainerStyle={{ paddingHorizontal: 16 }}>
              {people.slice(0, 8).map((person: any, i: number) => (
                <TouchableOpacity key={person.id ?? i} style={styles.personCard}>
                  <View style={styles.personAvatar}>
                    <Text style={styles.personInitials}>
                      {getInitials(person.full_name ?? person.email)}
                    </Text>
                    {person.is_online && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={styles.personName} numberOfLines={1}>
                    {person.full_name
                      ? person.full_name.split(' ')[0]
                      : person.email?.split('@')[0]}
                  </Text>
                  <Text style={styles.personDept} numberOfLines={1}>
                    {person.department ?? 'Student'}
                  </Text>
                  <Text style={styles.personMatch}>
                    {person.matchScore}% match
                  </Text>
                  <View style={styles.connectBtn}>
                    <Text style={styles.connectText}>+ Add</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Campus feed</Text>
          <TouchableOpacity onPress={() => setShowNewPost(true)}>
            <Text style={styles.seeAll}>+ Post</Text>
          </TouchableOpacity>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to post something on campus!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowNewPost(true)}>
              <Text style={styles.emptyBtnText}>Create first post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map((post: any, i: number) => (
            <View key={post.id ?? i} style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <View style={styles.feedAvatar}>
                  <Text style={styles.feedAvatarText}>
                    {getInitials(post.profiles?.full_name ?? 'AN')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedName}>
                    {post.profiles?.full_name ?? 'Anonymous'}
                  </Text>
                  <Text style={styles.feedTime}>
                    {getTimeAgo(post.created_at)}
                    {post.profiles?.department
                      ? ` · ${post.profiles.department}`
                      : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.feedBody}>{post.body}</Text>
              {post.tags?.length > 0 && (
                <View style={styles.feedTags}>
                  {post.tags.map((tag: string, j: number) => (
                    <View key={j} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.feedActions}>
                <Text style={styles.feedAction}>❤️ {post.likes_count ?? 0}</Text>
                <Text style={styles.feedAction}>
                  💬 {post.comments_count ?? 0} replies
                </Text>
                <Text style={styles.feedAction}>🔗 Share</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={showNewPost} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New post</Text>
              <TouchableOpacity onPress={() => setShowNewPost(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind? Share with campus..."
              placeholderTextColor="rgba(240,240,255,0.3)"
              value={newPostBody}
              onChangeText={setNewPostBody}
              multiline
              maxLength={500}
              autoFocus
            />
            <TextInput
              style={styles.tagInput}
              placeholder="Tags — separate with commas (e.g. Study, CS, Events)"
              placeholderTextColor="rgba(240,240,255,0.3)"
              value={newPostTags}
              onChangeText={setNewPostTags}
            />
            <TouchableOpacity
              style={[styles.postBtn, posting && { opacity: 0.6 }]}
              onPress={submitPost}
              disabled={posting}>
              {posting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.postBtnText}>Post to campus feed</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: 'rgba(240,240,255,0.4)' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 8, paddingBottom: 12,
  },
  logo: { fontSize: 24, fontWeight: '800', color: '#a78bfa' },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1c1c2e', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 16 },
  greeting: { paddingHorizontal: 16, paddingBottom: 16 },
  greetSub: { fontSize: 12, color: 'rgba(240,240,255,0.4)' },
  greetMain: { fontSize: 18, fontWeight: '600', color: '#f0f0ff' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: 'rgba(240,240,255,0.6)' },
  seeAll: { fontSize: 12, color: '#a78bfa' },
  peopleScroll: { marginBottom: 20 },
  personCard: {
    width: 90, backgroundColor: '#1c1c2e', borderRadius: 14,
    padding: 10, alignItems: 'center', marginRight: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  personAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a1e40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    position: 'relative',
  },
  personInitials: { fontSize: 14, fontWeight: '600', color: '#c4b5fd' },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#34d399',
    position: 'absolute', bottom: 0, right: 0,
    borderWidth: 1.5, borderColor: '#1c1c2e',
  },
  personName: {
    fontSize: 10, fontWeight: '500', color: '#f0f0ff',
    marginBottom: 1, width: '100%', textAlign: 'center',
  },
  personDept: {
    fontSize: 8, color: 'rgba(240,240,255,0.3)',
    marginBottom: 4, width: '100%', textAlign: 'center',
  },
  personMatch: { fontSize: 9, fontWeight: '600', color: '#a78bfa', marginBottom: 6 },
  connectBtn: {
    width: '100%', backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: 20, paddingVertical: 4,
    borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)', alignItems: 'center',
  },
  connectText: { fontSize: 9, color: '#a78bfa', fontWeight: '500' },
  feedCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1c1c2e',
    borderRadius: 16, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  feedAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a1e40',
    alignItems: 'center', justifyContent: 'center',
  },
  feedAvatarText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  feedName: { fontSize: 12, fontWeight: '500', color: '#f0f0ff' },
  feedTime: { fontSize: 10, color: 'rgba(240,240,255,0.35)' },
  feedBody: {
    fontSize: 13, color: 'rgba(240,240,255,0.7)',
    lineHeight: 20, marginBottom: 10,
  },
  feedTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  tag: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 10, color: '#a78bfa', fontWeight: '500' },
  feedActions: { flexDirection: 'row', gap: 16 },
  feedAction: { fontSize: 11, color: 'rgba(240,240,255,0.35)' },
  emptyFeed: {
    margin: 16, backgroundColor: '#1c1c2e', borderRadius: 16,
    padding: 32, alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#f0f0ff', marginBottom: 6 },
  emptyText: {
    fontSize: 13, color: 'rgba(240,240,255,0.4)',
    textAlign: 'center', lineHeight: 20, marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: '#a78bfa', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1c1c2e', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#f0f0ff' },
  modalClose: { fontSize: 18, color: 'rgba(240,240,255,0.4)' },
  postInput: {
    backgroundColor: '#0d0d14', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#f0f0ff',
    minHeight: 120, textAlignVertical: 'top',
    marginBottom: 10, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagInput: {
    backgroundColor: '#0d0d14', borderRadius: 12,
    padding: 14, fontSize: 13, color: '#f0f0ff',
    marginBottom: 14, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  postBtn: {
    backgroundColor: '#a78bfa', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  postBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})