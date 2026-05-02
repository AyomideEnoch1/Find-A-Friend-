import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vcbtvhociaioeyhhsczh.supabase.co'
const supabaseAnonKey = 'sb_publishable_oN3ImQ-mtGa2QgnBXQ-xqA_gP3GfVwe'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})