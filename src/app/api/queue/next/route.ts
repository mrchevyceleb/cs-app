import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Priority ranking: urgent=1, high=2, normal=3, low=4
const PRIORITY_ORDER = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
} as const

// Helper to get appropriate client based on auth mode
async function getSupabaseClient() {
  const cookieStore = await cookies()
  const devBypassCookie = cookieStore.get('dev_bypass')
  const isDevBypass = process.env.NODE_ENV === 'development' && devBypassCookie?.value === 'true'

  if (isDevBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Use service role in dev mode with auth bypass
    return {
      client: createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      ),
      isDevBypass: true,
    }
  }

  // Use normal authenticated client
  return {
    client: await createClient(),
    isDevBypass: false,
  }
}

// POST /api/queue/next - Get and assign the next available ticket
export async function POST() {
  try {
    const { client: supabase, isDevBypass } = await getSupabaseClient()

    // Get current user/agent
    let agentId: string

    if (isDevBypass) {
      // In dev bypass mode, get the first available agent
      const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .limit(1)
        .single()

      if (agentError || !agents) {
        console.error('Error finding dev agent:', agentError)
        return NextResponse.json(
          { error: 'No agent found for dev bypass' },
          { status: 500 }
        )
      }
      agentId = agents.id
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('Auth error:', authError || 'No user session')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      agentId = user.id
    }

    // Find the next unassigned ticket
    // Priority: urgent > high > normal > low
    // Then by age: oldest first (created_at ASC)
    // Status must be 'open' or 'escalated'
    // Not already assigned to someone
    const { data: tickets, error: findError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('queue_type', 'human')
      .in('status', ['open', 'escalated'])
      .is('assigned_agent_id', null)
      .order('created_at', { ascending: true })
      .limit(100) // Get more tickets to sort by priority

    if (findError) {
      console.error('Error finding tickets:', findError)
      return NextResponse.json(
        { error: 'Failed to find tickets' },
        { status: 500 }
      )
    }

    if (!tickets || tickets.length === 0) {
      // No tickets available - return 204 No Content
      return new NextResponse(null, { status: 204 })
    }

    // Sort by priority rank, then by created_at (already sorted by created_at from query)
    const sortedTickets = [...tickets].sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] || 3
      const priorityB = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] || 3

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // Already sorted by created_at from query, but ensure consistency
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const nextTicket = sortedTickets[0]

    // Assign the ticket to the current agent
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        assigned_agent_id: agentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', nextTicket.id)
      .is('assigned_agent_id', null) // Ensure it's still unassigned (race condition protection)
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents!assigned_agent_id(id, name, avatar_url)
      `)
      .single()

    if (updateError) {
      // If update fails, another agent may have grabbed this ticket
      // Try to find another one recursively or return error
      console.error('Error assigning ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to assign ticket. It may have been assigned to another agent.' },
        { status: 409 }
      )
    }

    if (!updatedTicket) {
      // Ticket was assigned by someone else between query and update
      return NextResponse.json(
        { error: 'Ticket was assigned to another agent' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      ticket: updatedTicket,
      message: 'Ticket assigned successfully',
    })
  } catch (error) {
    console.error('Get next ticket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
