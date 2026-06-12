import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: '4ecf283a-3a40-462d-a3bd-4912e0923b18', // Doma
        actor_id: '4ecf283a-3a40-462d-a3bd-4912e0923b18',
        type: 'announcement',
        entity_type: 'announcement',
        body: 'This is a test notification payload to verify triggering logic.'
      }
    ])
    .select()

  console.log('Error:', error)
  console.log('Inserted:', data)
}

run()
