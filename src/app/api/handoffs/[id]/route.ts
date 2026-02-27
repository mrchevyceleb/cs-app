import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to get appropriate client based on auth mode
async function getSupabaseClient() {
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

  if (isDevBypass && process.env.SB_SERVICE_ROLE_KEY) {
    return createAdminClient(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.SB_SERVICE_ROLE_KEY!
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

// GET /api/handoffs/[id] - Get a single handoff
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await getSupabaseClient()

    const { data: handoff, error } = await supabase
      .from('ticket_handoffs')
      .select(`
        *,
        from_agent:agents!ticket_handoffs_from_agent_id_fkey(id, name, avatar_url),
        to_agent:agents!ticket_handoffs_to_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `)
      .eq('id', id)
      .single()

    if (error || !handoff) {
      return NextResponse.json(
        { error: 'Handoff not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ handoff })
  } catch (error) {
    console.error('Get handoff API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/handoffs/[id] - Accept or decline a handoff
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

    const body = await request.json()
    const { status } = body

    if (!status || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "accepted" or "declined"' },
        { status: 400 }
      )
    }

    // Get current handoff
    const { data: handoff, error: handoffError } = await supabase
      .from('ticket_handoffs')
      .select(`
        *,
        from_agent:agents!ticket_handoffs_from_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority, assigned_agent_id)
      `)
      .eq('id', id)
      .single()

    if (handoffError || !handoff) {
      return NextResponse.json(
        { error: 'Handoff not found' },
        { status: 404 }
      )
    }

    // Verify this agent is the recipient
    if (handoff.to_agent_id !== currentAgentId) {
      return NextResponse.json(
        { error: 'Only the receiving agent can accept or decline this handoff' },
        { status: 403 }
      )
    }

    // Verify handoff is still pending
    if (handoff.status !== 'pending') {
      return NextResponse.json(
        { error: 'This handoff has already been processed' },
        { status: 409 }
      )
    }

    // Get current agent name
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('name')
      .eq('id', currentAgentId)
      .single()

    // Update handoff status
    const updateData: Record<string, unknown> = { status }
    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    }

    const { data: updatedHandoff, error: updateError } = await supabase
      .from('ticket_handoffs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        from_agent:agents!ticket_handoffs_from_agent_id_fkey(id, name, avatar_url),
        to_agent:agents!ticket_handoffs_to_agent_id_fkey(id, name, avatar_url),
        ticket:tickets(id, subject, status, priority)
      `)
      .single()

    if (updateError) {
      console.error('Error updating handoff:', updateError)
      return NextResponse.json(
        { error: 'Failed to update handoff' },
        { status: 500 }
      )
    }

    // If accepted, update ticket assignment
    if (status === 'accepted') {
      const { error: ticketUpdateError } = await supabase
        .from('tickets')
        .update({
          assigned_agent_id: currentAgentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoff.ticket_id)

      if (ticketUpdateError) {
        console.error('Error updating ticket assignment:', ticketUpdateError)
        // Don't fail - handoff was already updated
      }

      // Create ticket event for handoff accepted
      await supabase.from('ticket_events').insert({
        ticket_id: handoff.ticket_id,
        agent_id: currentAgentId,
        event_type: 'handoff_accepted',
        old_value: handoff.from_agent_id,
        new_value: currentAgentId,
        metadata: {
          from_agent_name: (handoff.from_agent as { name?: string })?.name,
          to_agent_name: currentAgent?.name,
          handoff_id: id,
        },
      })

      // Also create reassigned event
      await supabase.from('ticket_events').insert({
        ticket_id: handoff.ticket_id,
        agent_id: currentAgentId,
        event_type: 'reassigned',
        old_value: handoff.from_agent_id,
        new_value: currentAgentId,
        metadata: {
          previous_agent_name: (handoff.from_agent as { name?: string })?.name,
          new_agent_name: currentAgent?.name,
          reason: 'handoff_accepted',
        },
      })

      // Notify original agent that handoff was accepted
      await supabase.from('agent_notifications').insert({
        agent_id: handoff.from_agent_id,
        type: 'assignment',
        title: 'Handoff Accepted',
        message: `${currentAgent?.name || 'An agent'} accepted your handoff request for "${(handoff.ticket as { subject?: string })?.subject}"`,
        ticket_id: handoff.ticket_id,
        from_agent_id: currentAgentId,
      })
    } else {
      // Handoff declined - create event
      await supabase.from('ticket_events').insert({
        ticket_id: handoff.ticket_id,
        agent_id: currentAgentId,
        event_type: 'handoff_declined',
        old_value: handoff.from_agent_id,
        new_value: currentAgentId,
        metadata: {
          from_agent_name: (handoff.from_agent as { name?: string })?.name,
          to_agent_name: currentAgent?.name,
          handoff_id: id,
        },
      })

      // Notify original agent that handoff was declined
      await supabase.from('agent_notifications').insert({
        agent_id: handoff.from_agent_id,
        type: 'assignment',
        title: 'Handoff Declined',
        message: `${currentAgent?.name || 'An agent'} declined your handoff request for "${(handoff.ticket as { subject?: string })?.subject}"`,
        ticket_id: handoff.ticket_id,
        from_agent_id: currentAgentId,
      })
    }

    return NextResponse.json({ handoff: updatedHandoff })
  } catch (error) {
    console.error('Update handoff API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
