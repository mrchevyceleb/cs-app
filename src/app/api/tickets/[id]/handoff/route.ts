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
    // Return first agent for dev mode
    const { data: agents } = await supabase.from('agents').select('id').limit(1).single()
    return agents?.id || null
  }

  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// POST /api/tickets/[id]/handoff - Create a handoff request
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params
    const supabase = await getSupabaseClient()
    const currentAgentId = await getCurrentAgentId(supabase)

    if (!currentAgentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to_agent_id, reason, notes } = body

    if (!to_agent_id || !reason) {
      return NextResponse.json(
        { error: 'to_agent_id and reason are required' },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, subject, assigned_agent_id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Verify receiving agent exists
    const { data: toAgent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', to_agent_id)
      .single()

    if (agentError || !toAgent) {
      return NextResponse.json(
        { error: 'Receiving agent not found' },
        { status: 404 }
      )
    }

    // Check for existing pending handoff
    const { data: existingHandoff } = await supabase
      .from('ticket_handoffs')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('status', 'pending')
      .single()

    if (existingHandoff) {
      return NextResponse.json(
        { error: 'A pending handoff already exists for this ticket' },
        { status: 409 }
      )
    }

    // Get current agent name for notification
    const { data: fromAgent } = await supabase
      .from('agents')
      .select('name')
      .eq('id', currentAgentId)
      .single()

    // Create handoff request
    const { data: handoff, error: handoffError } = await supabase
      .from('ticket_handoffs')
      .insert({
        ticket_id: ticketId,
        from_agent_id: currentAgentId,
        to_agent_id,
        reason,
        notes: notes || null,
        status: 'pending',
      })
      .select(`
        *,
        from_agent:agents!ticket_handoffs_from_agent_id_fkey(id, name, avatar_url),
        to_agent:agents!ticket_handoffs_to_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `)
      .single()

    if (handoffError) {
      console.error('Error creating handoff:', handoffError)
      return NextResponse.json(
        { error: 'Failed to create handoff' },
        { status: 500 }
      )
    }

    // Create notification for receiving agent
    const { error: notificationError } = await supabase
      .from('agent_notifications')
      .insert({
        agent_id: to_agent_id,
        type: 'handoff',
        title: 'Ticket Handoff Request',
        message: `${fromAgent?.name || 'An agent'} wants to hand off ticket "${ticket.subject}" to you. Reason: ${reason}`,
        ticket_id: ticketId,
        from_agent_id: currentAgentId,
      })

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't fail the request, handoff was created successfully
    }

    // Create ticket event for handoff request
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      agent_id: currentAgentId,
      event_type: 'handoff_requested',
      old_value: null,
      new_value: to_agent_id,
      metadata: {
        to_agent_name: toAgent.name,
        reason,
        handoff_id: handoff.id,
      },
    })

    return NextResponse.json({ handoff })
  } catch (error) {
    console.error('Create handoff API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/tickets/[id]/handoff - Get handoff history for a ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params
    const supabase = await getSupabaseClient()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'pending' | 'accepted' | 'declined' | null

    let query = supabase
      .from('ticket_handoffs')
      .select(`
        *,
        from_agent:agents!ticket_handoffs_from_agent_id_fkey(id, name, avatar_url),
        to_agent:agents!ticket_handoffs_to_agent_id_fkey(id, name, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    if (status && ['pending', 'accepted', 'declined'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: handoffs, error } = await query

    if (error) {
      console.error('Error fetching handoffs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch handoffs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ handoffs })
  } catch (error) {
    console.error('Get handoffs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
