import { supabase } from './supabase'

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) {
    console.log('Profile error:', error)
    return null
  }
  return data
}

export async function updateProfile(updates: {
  full_name?: string
  bio?: string
  department?: string
  level?: string
  interests?: string[]
  avatar_url?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in' }
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
  return { error }
}

export async function getAllProfiles() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user?.id ?? '')
    .limit(20)
  if (error) return []
  return data
}

export async function getProfileStats(): Promise<{ posts: number; friends: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { posts: 0, friends: 0 }

  const [postsResult, connectionsResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', user.id),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted'),
  ])

  return {
    posts: postsResult.count ?? 0,
    friends: connectionsResult.count ?? 0,
  }
}

export async function setOnlineStatus(isOnline: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('profiles')
    .update({ is_online: isOnline })
    .eq('id', user.id)
}