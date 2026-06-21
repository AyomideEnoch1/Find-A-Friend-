import { supabase } from './supabase'

export async function sendConnectionRequest(receiverId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('connections')
    .insert({
      requester_id: user.id,
      receiver_id: receiverId,
      status: 'pending'
    })

  if (error && error.code === "23505") return { error: "already_sent" }
  return { error }
}

export async function getMyConnections() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq('status', 'accepted')

  if (error) return []
  return data
}

export async function checkConnectionStatus(otherUserId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('connections')
    .select('*')
    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .maybeSingle()

  return data
}