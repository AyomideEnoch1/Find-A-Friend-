import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const { data: feedback, error } = await supabase
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('Error:', error)
  console.log('Feedback Count:', feedback?.length || 0)
  if (feedback && feedback.length > 0) {
    console.log('Feedback Entries:')
    console.log(JSON.stringify(feedback, null, 2))
  }
}

run()
