import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching notifications:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns in notifications:', Object.keys(data[0]))
    console.log('Sample notification:', data[0])
  } else {
    console.log('No notifications found or table empty.')
  }
}

run()
