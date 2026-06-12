import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  const { data: clubs, error: cErr } = await supabase.from('clubs').select('*')
  if (cErr) {
    console.error(cErr)
    return
  }

  console.log(`Found ${clubs.length} clubs:`)
  for (const club of clubs) {
    console.log(`Club: "${club.name}" (ID: ${club.id}) created_by: ${club.created_by}`)
    const { data: members, error: mErr } = await supabase
      .from('club_members')
      .select('user_id, role, profiles(full_name, email)')
      .eq('club_id', club.id)
    if (mErr) {
      console.error(mErr)
      continue
    }
    for (const mem of members) {
      console.log(`  - Member: "${mem.profiles?.full_name}" (${mem.profiles?.email || mem.user_id}) | Role: ${mem.role}`)
    }
  }
}

run()
