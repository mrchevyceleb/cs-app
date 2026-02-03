import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    if (!url) console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
    if (!key) console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if (url && key) console.log('✅ Supabase client configured:', url.substring(0, 40) + '...')
  }

  _client = createBrowserClient<Database>(url!, key!)
  return _client
}
