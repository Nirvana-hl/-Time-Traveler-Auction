import { createClient } from '@supabase/supabase-js'

let supabaseClient = null

export function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.VUE_APP_SUPABASE_URL
    const anonKey = process.env.VUE_APP_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      console.warn('Supabase env not set: VUE_APP_SUPABASE_URL / VUE_APP_SUPABASE_ANON_KEY')
    }
    supabaseClient = createClient(url, anonKey, {
      realtime: { params: { eventsPerSecond: 20 } },
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    })
  }
  return supabaseClient
}
