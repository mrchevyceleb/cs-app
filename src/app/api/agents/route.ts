import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Helper to get appropriate client based on auth mode
async function getSupabaseClient() {
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

  if (isDevBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  return await createClient()
}

// GET /api/agents - List all agents
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'online' | 'away' | 'offline' | null
    const excludeId = url.searchParams.get('exclude') // Exclude specific agent ID

    let query = supabase
      .from('agents')
      .select('id, name, email, avatar_url, status, created_at')
      .order('name', { ascending: true })

    if (status && ['online', 'away', 'offline'].includes(status)) {
      query = query.eq('status', status)
    }

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data: agents, error } = await query

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Get agents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
