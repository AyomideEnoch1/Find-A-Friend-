/**
 * lib/profiles.ts
 * Profile helpers — updated to include follower/following counts and
 * follow/unfollow operations.
 *
 * Backwards-compatible: existing callers of getCurrentProfile, updateProfile,
 * getAllProfiles, getProfileStats, and setOnlineStatus continue to work.
 */
import { supabase } from './supabase'
import { uploadFile } from './upload'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  bio: string | null
  department: string | null
  level: string | null
  interests: string[] | null
  avatar_url: string | null
  push_token: string | null
  role: 'student' | 'admin' | 'vendor'
  follower_count: number
  following_count: number
  is_online?: boolean
  is_verified?: boolean
  cover_url?: string | null
  badge_type?: string | null
  badge_color?: string | null
  current_streak?: number
  longest_streak?: number
  last_active_date?: string | null
  university_id?: string | null
  universities?: {
    id: string
    name: string
    short_name: string
    primary_color: string
    secondary_color: string
    logo_url: string | null
  } | null
  gender?: string | null
  id_card_url?: string | null
  id_card_status?: 'not_uploaded' | 'pending' | 'verified' | 'rejected' | null
  invite_code?: string | null
  invited_by?: string | null
  forced_signout_at?: string | null
  joined_global_hub?: boolean
  global_full_name?: string | null
  global_bio?: string | null
  global_avatar_url?: string | null
  global_interests?: string[] | null
}

export interface ProfileStats {
  posts: number
  friends: number
  followers: number
  following: number
  clubs: number
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*, universities(*)')
    .eq('id', user.id)
    .single()

  if (error) {
    console.log('Profile error:', error)
    return null
  }
  return data as Profile
}

export async function updateProfile(updates: {
  full_name?: string
  bio?: string
  department?: string
  level?: string
  interests?: string[]
  avatar_url?: string
  cover_url?: string | null
  university_id?: string | null
  gender?: string | null
  id_card_url?: string | null
  id_card_status?: 'not_uploaded' | 'pending' | 'verified' | 'rejected'
  joined_global_hub?: boolean
  global_full_name?: string | null
  global_bio?: string | null
  global_avatar_url?: string | null
  global_interests?: string[] | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  return { error }
}

// ---------------------------------------------------------------------------
// Profiles list
// ---------------------------------------------------------------------------

export async function getAllProfiles(universityId?: string | null, globalHubOnly?: boolean) {
  const { data: { user } } = await supabase.auth.getUser()

  const fromTarget = globalHubOnly ? 'global_profiles' : 'profiles'
  let query = supabase
    .from(fromTarget)
    .select('id, full_name, department, level, interests, avatar_url, follower_count, following_count, badge_type, badge_color, university_id, universities(*)')
    .neq('id', user?.id ?? '')
    .limit(20)

  if (!globalHubOnly && universityId) {
    query = query.eq('university_id', universityId)
  }

  const { data, error } = await query

  if (error) return []
  return data ?? []
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, universities(*)')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as Profile
}

// ---------------------------------------------------------------------------
// Profile stats
// ---------------------------------------------------------------------------

export async function getProfileStats(): Promise<ProfileStats> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { posts: 0, friends: 0, followers: 0, following: 0, clubs: 0 }

  const [postsResult, connectionsResult, followerRes, followingRes, clubsResult] =
    await Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', user.id),
      supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id),
      supabase
        .from('club_members')
        .select('club_id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

  return {
    posts: postsResult.count ?? 0,
    friends: connectionsResult.count ?? 0,
    followers: followerRes.count ?? 0,
    following: followingRes.count ?? 0,
    clubs: clubsResult.count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Online status
// ---------------------------------------------------------------------------

export async function setOnlineStatus(isOnline: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ is_online: isOnline })
    .eq('id', user.id)
}

// ---------------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------------

export async function uploadAvatar(uri: string): Promise<{
  data: string | null
  error: Error | null
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const cleanUri = uri.split('?')[0].split('#')[0]
    let ext = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      ext = 'jpg'
    }
    const path = `${user.id}/${user.id}.${ext}`
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`

    const publicUrl = await uploadFile('avatars', path, uri, mimeType, true)

    // Persist the URL to the profile
    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    return { data: publicUrl, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function uploadCover(uri: string): Promise<{
  data: string | null
  error: Error | null
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const cleanUri = uri.split('?')[0].split('#')[0]
    let ext = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      ext = 'jpg'
    }
    const path = `${user.id}/cover-${Date.now()}.${ext}`
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`

    const publicUrl = await uploadFile('avatars', path, uri, mimeType, true)

    // Persist the URL to the profile
    await supabase
      .from('profiles')
      .update({ cover_url: publicUrl })
      .eq('id', user.id)

    return { data: publicUrl, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

// ---------------------------------------------------------------------------
// User posts (for public profile page)
// ---------------------------------------------------------------------------

export async function getUserPosts(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, body, tags, image_url, is_anonymous, likes_count, comments_count, created_at')
    .eq('author_id', userId)
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}
