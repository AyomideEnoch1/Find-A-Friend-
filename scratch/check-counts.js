import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  // Fetch profiles that have follower_count column
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, full_name, follower_count, following_count')

  if (pError) {
    console.error('Error:', pError)
    return
  }

  // Fetch follows records
  const { data: follows, error: fError } = await supabase
    .from('follows')
    .select('*')

  if (fError) {
    console.error('Error follows:', fError)
    return
  }

  console.log(`Profiles: ${profiles.length}, Follows rows: ${follows.length}`)

  for (const p of profiles) {
    const actualFollowers = follows.filter(f => f.following_id === p.id).length
    const actualFollowing = follows.filter(f => f.follower_id === p.id).length
    if (p.follower_count !== actualFollowers || p.following_count !== actualFollowing) {
      console.log(`Profile ${p.full_name} (${p.id}):`)
      console.log(`  Col follower_count: ${p.follower_count} | Actual in follows table: ${actualFollowers}`)
      console.log(`  Col following_count: ${p.following_count} | Actual in follows table: ${actualFollowing}`)
    }
  }
}

run()
