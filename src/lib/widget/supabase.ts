// Widget Supabase client singleton
// Prevents "Multiple GoTrueClient" warnings and "AbortError: signal is aborted"
// by reusing a single client instance across all widget components.
// Uses globalThis to survive HMR module reloads during development.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const GLOBAL_KEY = '__cs_widget_supabase' as const

export function getWidgetSupabase(): SupabaseClient | null {
  // Check globalThis first to survive HMR reloads
  const existing = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as SupabaseClient | undefined
  if (existing) return existing

  const url = process.env.NEXT_PUBLIC_SB_URL
  const anonKey = process.env.NEXT_PUBLIC_SB_ANON_KEY

  if (!url || !anonKey) return null

  // Widget uses its own token auth — disable GoTrueClient session/lock management
  // to prevent "Multiple GoTrueClient" warnings and "AbortError: signal is aborted" errors
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = client
  return client
}
