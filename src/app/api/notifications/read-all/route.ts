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

// Helper to get current agent ID
async function getCurrentAgentId(supabase: Awaited<ReturnType<typeof getSupabaseClient>>) {
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

  if (isDevBypass) {
    const { data: agents } = await supabase.from('agents').select('id').limit(1).single()
    return agents?.id || null
  }

  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const currentAgentId = await getCurrentAgentId(supabase)

    if (!currentAgentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Mark all unread notifications as read
    const { error, count } = await supabase
      .from('agent_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('agent_id', currentAgentId)
      .is('read_at', null)

    if (error) {
      console.error('Error marking notifications as read:', error)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      markedCount: count || 0,
    })
  } catch (error) {
    console.error('Mark all read API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
