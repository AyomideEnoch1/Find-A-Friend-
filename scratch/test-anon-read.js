import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, push_token')
    .not('push_token', 'is', null)

  console.log('Error:', error)
  console.log('Profiles with push token:', profiles?.length || 0)
  if (profiles && profiles.length > 0) {
    console.log('Sample profiles:', profiles.slice(0, 5))
  }
}

run()
