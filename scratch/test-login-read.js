import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  const email = 'tester-temp-123@faf.campus'
  const password = 'Password123!'

  console.log('Attempting to register user:', email)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  })

  if (signUpError) {
    console.log('Signup error (might already exist):', signUpError.message)
  } else {
    console.log('Sign up successful, user ID:', signUpData.user?.id)
  }

  console.log('Logging in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) {
    console.error('Authentication Error:', authError)
    return
  }

  console.log('Successfully authenticated as:', authData.user?.email)

  // Use the authenticated session client to query feedbacks
  const { data: feedbacks, error: dbError } = await supabase
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })

  if (dbError) {
    console.error('Database Error:', dbError)
    return
  }

  console.log('Found feedbacks count:', feedbacks.length)
  console.log(JSON.stringify(feedbacks, null, 2))
}

run()
