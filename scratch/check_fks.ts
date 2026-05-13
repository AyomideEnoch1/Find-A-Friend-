import { supabase } from './lib/supabase'

async function checkFKs() {
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'feedbacks' })
  console.log('Constraints:', data)
  console.log('Error:', error)
}
checkFKs()
