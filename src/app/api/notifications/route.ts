import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types/database'

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

// GET /api/notifications - List notifications for current agent
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const currentAgentId = await getCurrentAgentId(supabase)

    if (!currentAgentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const unreadOnly = url.searchParams.get('unread') === 'true'
    const type = url.searchParams.get('type') as NotificationType | null
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('agent_notifications')
      .select(`
        *,
        from_agent:agents!agent_notifications_from_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `, { count: 'exact' })
      .eq('agent_id', currentAgentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: notifications, error, count } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('agent_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', currentAgentId)
      .is('read_at', null)

    return NextResponse.json({
      notifications,
      total: count || 0,
      unreadCount: unreadCount || 0,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Get notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a notification (internal use)
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

    const body = await request.json()
    const { agent_id, type, title, message, ticket_id } = body

    if (!agent_id || !type || !title) {
      return NextResponse.json(
        { error: 'agent_id, type, and title are required' },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes: NotificationType[] = ['mention', 'handoff', 'assignment', 'escalation', 'feedback']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      )
    }

    const { data: notification, error } = await supabase
      .from('agent_notifications')
      .insert({
        agent_id,
        type,
        title,
        message: message || null,
        ticket_id: ticket_id || null,
        from_agent_id: currentAgentId,
      })
      .select(`
        *,
        from_agent:agents!agent_notifications_from_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `)
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Create notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
