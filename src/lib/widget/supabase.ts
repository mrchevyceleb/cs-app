// Widget Supabase client singleton
// Prevents "Multiple GoTrueClient" warnings and "AbortError: signal is aborted"
// by reusing a single client instance across all widget components.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getWidgetSupabase(): SupabaseClient | null {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null

  _client = createClient(url, anonKey)
  return _client
}
