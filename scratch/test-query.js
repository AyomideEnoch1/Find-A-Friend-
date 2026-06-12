import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  const clubId = '99a2428a-8301-4883-b939-c0685d33a5ce'; // Developers Hub
  const res1 = await supabase
    .from('club_members')
    .select('*, profiles!user_id(id, full_name, avatar_url, department, level)')
    .eq('club_id', clubId)

  console.log('Query 1 (profiles!user_id) error:', res1.error ? res1.error.message : 'None')
  console.log('Query 1 data length:', res1.data ? res1.data.length : 0)

  const res2 = await supabase
    .from('club_members')
    .select('*, profiles(id, full_name, avatar_url, department, level)')
    .eq('club_id', clubId)

  console.log('Query 2 (profiles) error:', res2.error ? res2.error.message : 'None')
  console.log('Query 2 data length:', res2.data ? res2.data.length : 0)
}

run()
