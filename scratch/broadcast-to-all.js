import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'
const EDGE_FUNC_URL = `${SUPABASE_URL}/functions/v1/send-push-notification`

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const messageBody = process.argv[2] || 'Hello! This is a test broadcast notification from FAF.'
  console.log(`Starting broadcast with message: "${messageBody}"\n`)

  // 1. Fetch Expo Push Token users
  const { data: expoUsers, error: expoErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .not('push_token', 'is', null)

  if (expoErr) {
    console.error('Error fetching Expo users:', expoErr)
    return
  }

  // 2. Fetch Web Push Subscription users
  const { data: webUsers, error: webErr } = await supabase
    .from('web_push_subscriptions')
    .select('user_id')

  if (webErr) {
    console.error('Error fetching Web Push users:', webErr)
    return
  }

  // Combine and deduplicate
  const allUserIds = new Set()
  expoUsers.forEach(u => allUserIds.add(u.id))
  webUsers.forEach(u => allUserIds.add(u.user_id))

  console.log(`Found ${expoUsers.length} Expo device(s) and ${webUsers.length} Web Push subscriber(s).`)
  console.log(`Total unique recipients: ${allUserIds.size}\n`)

  if (allUserIds.size === 0) {
    console.log('No registered devices found.')
    return
  }

  let success = 0
  let failed = 0

  for (const userId of allUserIds) {
    const payload = {
      record: {
        id: crypto.randomUUID(),
        user_id: userId,
        actor_id: null,
        type: 'announcement',
        entity_type: 'announcement',
        entity_id: null,
        body: messageBody,
        is_read: false,
        created_at: new Date().toISOString()
      }
    }

    try {
      const resp = await fetch(EDGE_FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify(payload)
      })

      const resJson = await resp.json()
      if (resJson.ok) {
        console.log(`✅ Sent notification to user ID: ${userId}`)
        success++
      } else {
        console.warn(`❌ Failed for user ID: ${userId} - Reason:`, resJson.reason)
        failed++
      }
    } catch (err) {
      console.error(`❌ HTTP Error for user ID: ${userId} -`, err.message)
      failed++
    }
  }

  console.log(`\nBroadcast complete: ${success} successful, ${failed} failed.`)
}

run()
