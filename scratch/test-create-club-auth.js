import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function run() {
  const email = `clubtester-${Date.now()}@faf.campus`
  const password = 'Password123!'

  console.log('Registering user:', email)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  })

  if (signUpError) {
    console.error('Signup error:', signUpError)
    return
  }

  const userId = signUpData.user?.id
  console.log('Registered. User ID:', userId)

  // Wait for profile trigger to finish
  await new Promise(r => setTimeout(r, 2000))

  console.log('Logging in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) {
    console.error('Login error:', authError)
    return
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session?.access_token}`
      }
    }
  })

  console.log('Attempting to create club...')
  const { data: clubData, error: clubError } = await client
    .from('clubs')
    .insert({
      name: 'Test Club ' + Date.now(),
      slug: 'test-club-' + Date.now(),
      description: 'Test description',
      category: 'Tech',
      color: '#a78bfa',
      is_active: true,
      created_by: userId,
      member_count: 1,
    })
    .select()
    .single()

  console.log('Insert Club Result:', clubData)
  if (clubError) {
    console.log('Club Error:', clubError)
    return
  }

  console.log('Attempting to auto-join as admin...')
  const { data: memberData, error: memberError } = await client
    .from('club_members')
    .insert({
      club_id: clubData.id,
      user_id: userId,
      role: 'admin',
    })
    .select()

  console.log('Insert Member Result:', memberData)
  console.log('Member Error:', memberError)
}

run()
