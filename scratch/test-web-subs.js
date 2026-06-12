import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const { data: webSubs, error } = await supabase
    .from('web_push_subscriptions')
    .select('user_id')

  console.log('Error:', error)
  console.log('Web push subscriptions count:', webSubs?.length || 0)
  if (webSubs && webSubs.length > 0) {
    console.log('Sample subscriptions:', webSubs.slice(0, 5))
  }
}

run()
