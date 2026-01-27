import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

// GET /api/notifications/[id] - Get a single notification
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await getSupabaseClient()
    const currentAgentId = await getCurrentAgentId(supabase)

    if (!currentAgentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: notification, error } = await supabase
      .from('agent_notifications')
      .select(`
        *,
        from_agent:agents!agent_notifications_from_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `)
      .eq('id', id)
      .eq('agent_id', currentAgentId)
      .single()

    if (error || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Get notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await getSupabaseClient()
    const currentAgentId = await getCurrentAgentId(supabase)

    if (!currentAgentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify notification belongs to current agent
    const { data: existing } = await supabase
      .from('agent_notifications')
      .select('id, agent_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    if (existing.agent_id !== currentAgentId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { data: notification, error } = await supabase
      .from('agent_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        from_agent:agents!agent_notifications_from_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `)
      .single()

    if (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Update notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Dismiss notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await getSupabaseClient()
    const currentAgentId = await getCurrentAgentId(supabase)

    if (!currentAgentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify notification belongs to current agent
    const { data: existing } = await supabase
      .from('agent_notifications')
      .select('id, agent_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    if (existing.agent_id !== currentAgentId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('agent_notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
