import { supabase } from './lib/supabase'

async function check() {
  const { data, error } = await supabase.from('events').select('*').limit(1)
  console.log('Events row:', data?.[0])
  console.log('Error:', error)
}
check()
