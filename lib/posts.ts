import { supabase } from './supabase'

export async function getFeedPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles (
        id,
        full_name,
        department,
        level,
        avatar_url
      )
    `)
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data
}

export async function createPost(body: string, tags: string[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in' }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      body,
      tags,
    })
    .select()
    .single()

  return { data, error }
}

export async function likePost(postId: string) {
  const { error } = await supabase.rpc('increment_likes', {
    post_id: postId,
  })
  return { error }
}

export async function getConfessionPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_anonymous', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data
}