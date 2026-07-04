import React, { useState, useEffect, useRef, useCallback, type ComponentProps } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Image, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getCurrentProfile, getProfileStats, updateProfile } from '../lib/profiles'
import type { Profile, ProfileStats } from '../lib/profiles'
import { getUserFeedPosts, getBookmarkedPosts } from '../lib/feed'
import { getMyVendor } from '../lib/vendors'
import type { FeedPost } from '../lib/feed'
import { getInitials } from '../lib/matching'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'
import { supabase } from '../lib/supabase'
import NeuralBackground from '../components/NeuralBackground'
import ScreenLoader from '../components/ScreenLoader'
import { Skeleton } from '../components/ui/Skeleton'
import PostCard from '../components/feed/PostCard'
import VerifiedBadge, { BADGE_COLORS, BADGE_LABELS } from '../components/ui/VerifiedBadge'
import Toast from 'react-native-toast-message'
import { useThemeStore } from '../store/themeStore'
import { useFeedStore } from '../store/feedStore'

type IoniconsName = ComponentProps<typeof Ionicons>['name']
type ProfileTab = 'posts' | 'bookmarks'

const ALL_INTERESTS = [
  'Music', 'Tech', 'Art', 'Sports', 'Gaming', 'Photography',
  'Dance', 'Debate', 'Fitness', 'Poetry', 'Hiking', 'Chess',
  'Fashion', 'Film', 'Reading', 'Cooking', 'Travel', 'Design',
  'Robotics', 'Open Source', 'Drama', 'Journalism', 'Business',
]

const ACCOUNT_MENU: { icon: IoniconsName; label: string; route: string }[] = [
  { icon: 'notifications-outline',  label: 'Notifications',    route: '/notifications' },
  { icon: 'lock-closed-outline',    label: 'Privacy settings', route: '/privacy-settings' },
  { icon: 'moon-outline',           label: 'Appearance',       route: '/appearance' },
  { icon: 'help-circle-outline',    label: 'Help & support',   route: '/help' },
]

export default function ProfileScreen() {
  const theme = useTheme()
  const { signOut } = useAuthStore()

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [stats,    setStats]    = useState<ProfileStats>({ posts: 0, friends: 0, followers: 0, following: 0, clubs: 0 })
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio,      setBio]      = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [uniSearchQuery, setUniSearchQuery] = useState('')

  const activeUniversity = useThemeStore((s) => s.activeUniversity)
  const setActiveUniversity = useThemeStore((s) => s.setActiveUniversity)

  useEffect(() => {
    supabase
      .from('universities')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setUniversities(data)
      })
  }, [])

  const [activeTab,  setActiveTab]  = useState<ProfileTab>('posts')
  const [userPosts,  setUserPosts]  = useState<FeedPost[]>([])
  const [bookmarks,  setBookmarks]  = useState<FeedPost[]>([])
  const [hasVendor,  setHasVendor]  = useState(false)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s, v] = await Promise.all([getCurrentProfile(), getProfileStats(), getMyVendor()])
      setProfile(p)
      setStats(s)
      if (v.data) setHasVendor(true)
      setFullName(p?.full_name ?? '')
      setBio(p?.bio ?? '')
      setInterests(p?.interests ?? [])

      if (p?.id) {
        const [postsRes, bmRes] = await Promise.all([
          getUserFeedPosts(p.id),
          getBookmarkedPosts(),
        ])
        setUserPosts(postsRes.data ?? [])
        setBookmarks(bmRes.data ?? [])
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload profile every time the screen comes into focus (e.g. returning from edit-profile)
  useFocusEffect(useCallback(() => {
    loadAll()
  }, [loadAll]))

  useEffect(() => {

    // Subscribe to follower_count / following_count changes on our own profile row
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channelRef.current = supabase
        .channel(`profile-counts-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, (payload: any) => {
          // Update both for safety, though stats is the primary source now
          setProfile(prev => prev
            ? { ...prev, follower_count: payload.new.follower_count, following_count: payload.new.following_count }
            : prev
          )
          setStats(prev => ({
            ...prev,
            followers: payload.new.follower_count,
            following: payload.new.following_count
          }))
        })
        .subscribe()
    })

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  const saveChanges = async () => {
    setSaving(true)
    const { error } = await updateProfile({ full_name: fullName, bio, interests })
    setSaving(false)
    if (error) Alert.alert('Error', String(error))
    else { setEditing(false); loadAll() }
  }

  const toggleInterest = (item: string) =>
    setInterests(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : prev.length < 8 ? [...prev, item] : prev
    )

  const handleSignOut = () =>
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut(); router.replace('/(auth)/welcome')
      }},
    ])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Header bar placeholder */}
        <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between' }}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={120} height={18} />
          <Skeleton width={32} height={32} borderRadius={16} />
        </View>
        
        {/* Cover image banner placeholder */}
        <View style={{ height: 120, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginTop: 10 }}>
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
        
        {/* Profile card placeholder */}
        <View style={{ marginHorizontal: 16, marginTop: -40, borderRadius: 16, padding: 16, backgroundColor: theme.card, borderWidth: 0.5, borderColor: theme.border, alignItems: 'center' }}>
          {/* Avatar */}
          <Skeleton width={80} height={80} borderRadius={40} />
          
          {/* Name / Department */}
          <View style={{ marginTop: 12, width: '100%', alignItems: 'center', gap: 6 }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={12} />
            <Skeleton width="50%" height={10} />
          </View>

          {/* Bio */}
          <View style={{ marginTop: 12, width: '90%', gap: 4, alignItems: 'center' }}>
            <Skeleton width="90%" height={10} />
            <Skeleton width="75%" height={10} />
          </View>
        </View>
        
        {/* Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={{ alignItems: 'center', gap: 4 }}>
              <Skeleton width={45} height={16} />
              <Skeleton width={35} height={10} />
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: theme.border, marginTop: 24 }}>
          <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}>
            <Skeleton width="50%" height={14} />
          </View>
          <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}>
            <Skeleton width="50%" height={14} />
          </View>
        </View>

        {/* Mock list items */}
        <View style={{ padding: 16, gap: 16, marginTop: 10 }}>
          {[1, 2].map(i => (
            <View key={i} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Skeleton width={36} height={36} borderRadius={18} />
                <View style={{ gap: 4, flex: 1 }}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="20%" height={8} />
                </View>
              </View>
              <Skeleton width="100%" height={50} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  const tabData = activeTab === 'posts' ? userPosts : bookmarks

  // ── Header ──────────────────────────────────────────────────────────────────
  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={[s.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="arrow-back" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.pageTitle, { color: theme.text }]}>My Profile</Text>
        <TouchableOpacity
          style={[s.editPill, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}
          onPress={() => editing ? saveChanges() : setEditing(true)}>
          {saving
            ? <ActivityIndicator size="small" color={theme.accent} />
            : <Text style={[s.editPillText, { color: theme.accent }]}>{editing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      {/* Cover image banner */}
      <View style={[s.coverContainer, { borderColor: theme.border }]}>
        {profile?.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={s.coverImg} resizeMode="cover" />
        ) : (
          <View style={[s.coverPlaceholder, { backgroundColor: `${theme.accent}08` }]}>
            <Ionicons name="image-outline" size={24} color={`${theme.accent}20`} />
            <Text style={[s.coverPlaceholderText, { color: `${theme.accent}30` }]}>No cover image</Text>
          </View>
        )}
      </View>

      {/* Profile card */}
      <View style={[s.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Avatar */}
        <View style={[s.avatarRing, { borderColor: theme.accentBorder }]}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
            : <View style={[s.avatarInner, { backgroundColor: theme.cardSolid }]}>
                <Text style={[s.avatarInitials, { color: theme.accent }]}>
                  {getInitials(profile?.full_name ?? profile?.email ?? '??')}
                </Text>
              </View>}
        </View>

        {/* Verified badge */}
        {profile?.badge_type && profile.badge_type !== 'none' && (
          <View style={s.verifiedRow}>
            <VerifiedBadge type={profile.badge_type} customColor={profile.badge_color} size={14} />
            <Text style={[s.verifiedText, { color: profile.badge_color || BADGE_COLORS[profile.badge_type.toLowerCase()] || '#3b82f6' }]}>
              {BADGE_LABELS[profile.badge_type.toLowerCase()] ?? 'Verified'}
            </Text>
          </View>
        )}

        {editing ? (
          <View style={s.editFields}>
            <Text style={[s.fieldLabel, { color: theme.textFaint }]}>Full name</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              value={fullName} onChangeText={setFullName}
              placeholderTextColor={theme.textFaint}
            />
            <Text style={[s.fieldLabel, { color: theme.textFaint }]}>Bio</Text>
            <TextInput
              style={[s.fieldInput, s.bioInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              value={bio} onChangeText={setBio}
              multiline maxLength={160}
              placeholderTextColor={theme.textFaint}
              placeholder="Tell other students about yourself…"
            />

            {/* Interest picker */}
            <Text style={[s.fieldLabel, { color: theme.textFaint, marginTop: 8 }]}>
              Interests (max 8, {interests.length}/8 selected)
            </Text>
            <View style={s.interestGrid}>
              {ALL_INTERESTS.map(item => {
                const active = interests.includes(item)
                return (
                  <TouchableOpacity key={item}
                    style={[s.chip, { backgroundColor: theme.card, borderColor: theme.border },
                      active && { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}
                    onPress={() => toggleInterest(item)}>
                    <Text style={[s.chipText, { color: theme.textMuted }, active && { color: theme.accent }]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ) : (
          <View style={s.profileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Text style={[s.profileName, { color: theme.text }]}>{profile?.full_name ?? 'Your name'}</Text>
              <VerifiedBadge type={profile?.badge_type} customColor={profile?.badge_color} size={18} />
              {profile?.role === 'admin' && (
                <View style={{ backgroundColor: theme.accentBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.5, borderColor: theme.accentBorder }}>
                  <Text style={{ fontSize: 10, color: theme.accent, fontWeight: '500' }}>👑 Admin</Text>
                </View>
              )}
            </View>
            <Text style={[s.profileDept, { color: theme.textMuted }]}>
              {profile?.department ?? 'Department'}{profile?.level ? ' · ' + profile.level : ''}
            </Text>
            <Text style={[s.profileEmail, { color: theme.textFaint }]}>{profile?.email}</Text>
            {profile?.bio ? (
              <Text style={[s.profileBio, { color: theme.textMuted }]}>{profile.bio}</Text>
            ) : null}

            {profile && universities.length > 0 && (
              <View style={{ marginTop: 14, width: '100%', paddingHorizontal: 20, zIndex: 1000 }}>
                <Text style={{ fontSize: 11, fontFamily: typography.fontSemiBold, textTransform: 'uppercase', color: theme.accent, letterSpacing: 0.8, marginBottom: 8, textAlign: 'center' }}>
                  Select / Switch Active Campus
                </Text>
                <View>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      width: '100%',
                    }}
                    onPress={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <Text style={{ fontSize: 13, fontFamily: typography.fontSemiBold, color: activeUniversity ? theme.text : theme.textFaint }}>
                      {activeUniversity ? `${activeUniversity.name} (${activeUniversity.short_name})` : 'Select a campus...'}
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
                      width: '100%',
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
                        {universities
                          .filter(uni => 
                            uni.name.toLowerCase().includes(uniSearchQuery.toLowerCase()) || 
                            uni.short_name.toLowerCase().includes(uniSearchQuery.toLowerCase())
                          )
                          .map((uni) => (
                            <TouchableOpacity
                              key={uni.id}
                              style={{
                                padding: 12,
                                borderBottomWidth: 0.5,
                                borderBottomColor: theme.border,
                                backgroundColor: activeUniversity?.id === uni.id ? `${uni.primary_color}12` : 'transparent',
                              }}
                              onPress={async () => {
                                setDropdownOpen(false);
                                setUniSearchQuery('');
                                setActiveUniversity(uni);
                                await supabase
                                  .from('profiles')
                                  .update({ university_id: uni.id })
                                  .eq('id', profile.id);
                                useFeedStore.getState().refresh();
                                loadAll();
                                Toast.show({
                                  type: 'success',
                                  text1: 'Campus Switched',
                                  text2: `Branding active for ${uni.name}`,
                                });
                              }}
                            >
                              <Text style={{ fontSize: 12, fontFamily: typography.fontSemiBold, color: theme.text }}>
                                {uni.name} ({uni.short_name})
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        {[
          { label: 'Posts',      value: stats.posts, route: null },
          { label: 'Followers',  value: stats.followers, route: `/followers/${profile?.id}` },
          { label: 'Following',  value: stats.following, route: `/following/${profile?.id}` },
          { label: 'Streak',     value: `🔥 ${Math.max(1, profile?.current_streak ?? 1)}`, route: null },
        ].map(stat => (
          <TouchableOpacity 
            key={stat.label} 
            disabled={!stat.route}
            onPress={() => stat.route && router.push(stat.route as any)}
            style={[s.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.statValue, { color: theme.accent }]}>{stat.value}</Text>
            <Text style={[s.statLabel, { color: theme.textFaint }]}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Interests (view mode) */}
      {!editing && profile?.interests && profile.interests.length > 0 && (
        <View style={s.interestsSection}>
          <Text style={[s.sectionLabel, { color: theme.textMuted }]}>Interests</Text>
          <View style={s.interestGrid}>
            {profile.interests.map(item => (
              <View key={item} style={[s.chip, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                <Text style={[s.chipText, { color: theme.accent }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: theme.border }]}>
        {(['posts', 'bookmarks'] as ProfileTab[]).map(tab => (
          <TouchableOpacity key={tab} style={s.tabItem} onPress={() => setActiveTab(tab)}>
            {activeTab === tab
              ? <View style={[s.tabPill, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Ionicons
                    name={tab === 'posts' ? 'grid-outline' : 'bookmark-outline'}
                    size={13} color={theme.accent}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[s.tabText, { color: theme.accent, fontWeight: '700' }]}>
                    {tab === 'posts' ? 'Posts' : 'Bookmarks'}
                  </Text>
                </View>
              : <View style={s.tabInactive}>
                  <Ionicons
                    name={tab === 'posts' ? 'grid-outline' : 'bookmark-outline'}
                    size={13} color={theme.textMuted}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[s.tabText, { color: theme.textMuted }]}>
                    {tab === 'posts' ? 'Posts' : 'Bookmarks'}
                  </Text>
                </View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  // ── Footer ──────────────────────────────────────────────────────────────────
  const ListFooter = (
    <View style={{ paddingTop: 8 }}>
      <Text style={[s.sectionLabel, { color: theme.textMuted, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 }]}>
        Account
      </Text>
      <View style={[s.menuList, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {hasVendor && (
          <TouchableOpacity style={[s.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/manage-vendor' as any)}>
            <Ionicons name="storefront-outline" size={19} color={theme.accent} />
            <Text style={[s.menuLabel, { color: theme.text, fontFamily: typography.fontSemiBold }]}>Vendor Dashboard</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textFaint} />
          </TouchableOpacity>
        )}
        {ACCOUNT_MENU.map((item, i) => (
          <TouchableOpacity key={i} style={[s.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push(item.route as any)}>
            <Ionicons name={item.icon} size={19} color={theme.textMuted} />
            <Text style={[s.menuLabel, { color: theme.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textFaint} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.signOutBtn, { borderColor: 'rgba(239,68,68,0.25)' }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={17} color="#ef4444" />
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 48 }} />
    </View>
  )

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = (
    <View style={s.emptyWrap}>
      <Ionicons
        name={activeTab === 'posts' ? 'create-outline' : 'bookmark-outline'}
        size={40} color={theme.textFaint}
      />
      <Text style={[s.emptyTitle, { color: theme.textMuted }]}>
        {activeTab === 'posts' ? 'No posts yet' : 'No bookmarks yet'}
      </Text>
      <Text style={[s.emptyHint, { color: theme.textFaint }]}>
        {activeTab === 'posts'
          ? 'Your posts will appear here'
          : 'Save posts to read them later'}
      </Text>
      {activeTab === 'posts' && (
        <TouchableOpacity
          style={[s.emptyBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/create-post' as any)}>
          <Text style={s.emptyBtnText}>Create your first post</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <NeuralBackground intensity="light" />
      <FlatList
        data={tabData}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      />
    </SafeAreaView>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1 },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Top bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5,
  },
  pageTitle: { fontSize: 16, fontFamily: typography.fontSemiBold },
  editPill: {
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 0.5,
  },
  editPillText: { fontSize: 13, fontFamily: typography.fontMedium },

  /* Profile card */
  profileCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 16,
    borderRadius: 24, padding: 24,
    alignItems: 'center', borderWidth: 0.5,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, padding: 3, marginBottom: 12,
  },
  avatarImg:      { width: '100%', height: '100%', borderRadius: 40 },
  avatarInner:    { width: '100%', height: '100%', borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 30, fontFamily: typography.fontBold },
  verifiedRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  verifiedText:   { fontSize: 11, color: '#34d399', fontFamily: typography.fontMedium },
  profileInfo:    { alignItems: 'center', gap: 5 },
  profileName:    { fontSize: 21, fontFamily: typography.fontBold },
  profileDept:    { fontSize: 13, fontFamily: typography.fontRegular },
  profileEmail:   { fontSize: 12, fontFamily: typography.fontRegular },
  profileBio:     { fontSize: 14, fontFamily: typography.fontRegular, textAlign: 'center', lineHeight: 21, marginTop: 8 },

  /* Edit form */
  editFields:  { width: '100%', gap: 8 },
  fieldLabel:  { fontSize: 11, fontFamily: typography.fontMedium, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput:  { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: typography.fontRegular, borderWidth: 0.5 },
  bioInput:    { height: 88, textAlignVertical: 'top' },

  /* Stats */
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, gap: 10,
  },
  statCard: {
    flex: 1, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', borderWidth: 0.5,
  },
  statValue: { fontSize: 20, fontFamily: typography.fontBold, marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: typography.fontRegular },

  /* Interests */
  interestsSection: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel:     { fontSize: 12, fontFamily: typography.fontSemiBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  interestGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:             { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5 },
  chipText:         { fontSize: 13, fontFamily: typography.fontMedium },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 0.5,
    marginBottom: 8, paddingHorizontal: 8,
  },
  tabItem:    { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 18, paddingVertical: 6,
  },
  tabInactive: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 6 },
  tabText:     { fontSize: 13, fontFamily: typography.fontMedium },

  /* Empty */
  emptyWrap:   { alignItems: 'center', paddingVertical: 52, gap: 10 },
  emptyTitle:  { fontSize: 16, fontFamily: typography.fontSemiBold },
  emptyHint:   { fontSize: 13, fontFamily: typography.fontRegular },
  emptyBtn:    { marginTop: 8, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  emptyBtnText:{ fontSize: 13, fontFamily: typography.fontSemiBold, color: '#fff' },

  /* Account menu */
  menuList: {
    marginHorizontal: 16, borderRadius: 18, borderWidth: 0.5, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15,
    gap: 14, borderBottomWidth: 0.5,
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: typography.fontRegular },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 16, borderRadius: 18,
    paddingVertical: 15, borderWidth: 0.5,
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  signOutText: { fontSize: 14, fontFamily: typography.fontSemiBold, color: '#ef4444' },
  coverContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 130,
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  coverPlaceholderText: {
    fontSize: 11,
    fontFamily: typography.fontRegular,
  },
})
