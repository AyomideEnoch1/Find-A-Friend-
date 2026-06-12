import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  // Try inserting directly
  const testUserId = 'd37e0d67-9e83-4fd6-9ff9-78cf5aab4059' // Ayomide Enoch
  const { data, error } = await supabase
    .from('events')
    .insert({
      organizer_id: testUserId,
      organiser_id: testUserId, // try setting both to avoid constraints issues
      title: "Test Event " + Date.now(),
      venue: "Test Venue",
      starts_at: new Date().toISOString(),
      is_public: true,
      rsvp_count: 0
    })
    .select()

  console.log('Insert Result:', data)
  console.log('Error:', error)
}

run()
