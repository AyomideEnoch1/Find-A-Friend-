import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

// VAPID credentials for Web Push
const VAPID_CONTACT = Deno.env.get('VAPID_CONTACT') || 'mailto:ayomidenoch15@gmail.com'
const VAPID_PUBLIC_KEY =
  Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ||
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BMW-cNs21tNNic2idPQjGlKXCMPtk_sgzd-K5zbrlM6ftDQlBJJB7FJcBx_lsE8fj7VMde6qYHHvYLiPB6JWke4'
const VAPID_PRIVATE_KEY =
  Deno.env.get('VAPID_PRIVATE_KEY') ||
  'Vqg_x7sX5hqGSQLMaBcLXHnIQlCUqlETcmSeJSVp0HM'

// Initialize VAPID
webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

function buildBody(type: string, actorName: string, customBody?: string | null): string {
  if (customBody) {
    if (customBody.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(customBody)
        if (obj?._type === 'game_challenge') {
          return `${actorName} challenged you to a game of ${obj.label || 'Games'} ${obj.emoji || '🎮'}`
        }
        if (obj?._type === 'challenge_accepted') {
          return `${actorName} accepted your challenge to play ${obj.label || 'Games'} ${obj.emoji || '🎮'}!`
        }
      } catch {
        // Fall back to returning raw customBody on JSON parse error
      }
    }
    return customBody
  }
  switch (type) {
    case 'like':               return `${actorName} liked your post`
    case 'comment':            return `${actorName} commented on your post`
    case 'repost':             return `${actorName} reposted your post`
    case 'follow':             return `${actorName} started following you`
    case 'connection_request': return `${actorName} sent you a connection request`
    case 'event_rsvp':         return `${actorName} is attending your event`
    case 'club_announcement':  return 'New announcement in your club'
    case 'story_view':         return `${actorName} viewed your story`
    case 'mention':            return `${actorName} mentioned you in a post`
    case 'new_message':        return `${actorName} sent you a message`
    case 'feedback_comment':   return `${actorName} commented on your Campus Voice post`
    case 'feedback_upvote':    return `${actorName} upvoted your Campus Voice post`
    default:                   return 'You have a new notification'
  }
}

function buildRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null
  switch (entityType) {
    case 'post':     return `/post/${entityId}`
    case 'event':    return `/event/${entityId}`
    case 'club':     return `/club/${entityId}`
    case 'feedback': return `/feedback`
    default:         return null
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    // Handles both net.http_post (body is the row directly) and
    // Supabase Dashboard DB Webhooks (body has { record: {...} })
    const record = payload.record ?? payload

    if (!record?.user_id || !record?.type) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_payload' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Fetch recipient's push token (Expo) and unread count
    const [{ data: profile }, { count: unreadCount }] = await Promise.all([
      supabase
        .from('profiles')
        .select('push_token')
        .eq('id', record.user_id)
        .single(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', record.user_id)
        .eq('is_read', false)
    ])

    // Fetch actor name for notification body
    let actorName = 'Someone'
    if (record.actor_id) {
      const { data: actor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', record.actor_id)
        .single()
      if (actor?.full_name) actorName = actor.full_name
    }

    const body = buildBody(record.type, actorName, record.body)
    const route = buildRoute(record.entity_type, record.entity_id)

    let expoSuccess = false
    let webSuccessCount = 0

    // 1. Send to Expo Push if there is an Expo token
    if (profile?.push_token && (profile.push_token.startsWith('ExponentPushToken[') || profile.push_token.startsWith('ExpoPushToken['))) {
      try {
        const message = {
          to: profile.push_token,
          title: 'FAF',
          body,
          sound: 'default',
          badge: unreadCount ?? 1,
          channelId: 'default',
          data: {
            notificationId: record.id,
            ...(route ? { route } : {}),
            ...(record.actor_id ? { actorId: record.actor_id } : {}),
          },
        }

        const expoResp = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(message),
        })

        const result = await expoResp.json()
        console.log('✅ Expo push sent. Result:', JSON.stringify(result))
        expoSuccess = true
      } catch (err) {
        console.error('❌ Expo push failed:', err.message)
      }
    }

    // 2. Send Web Push to all active web push subscriptions for this user
    const { data: webSubs } = await supabase
      .from('web_push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', record.user_id)

    if (webSubs && webSubs.length > 0) {
      const webPayload = JSON.stringify({
        title: 'FAF',
        body,
        type: record.type,
        url: route || '/',
        timestamp: new Date().toISOString(),
      })

      for (const sub of webSubs) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }, webPayload)
          console.log('✅ Web push sent to endpoint:', sub.endpoint)
          webSuccessCount++
        } catch (err) {
          console.error('❌ Web push failed for endpoint:', sub.endpoint, err.message)
          // Clean up expired subscriptions (410 Gone / 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('web_push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      expoSent: expoSuccess,
      webSentCount: webSuccessCount
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
