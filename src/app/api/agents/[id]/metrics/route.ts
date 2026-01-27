import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface AgentMetrics {
  agent_id: string
  agent_name: string
  agent_email: string
  avatar_url: string | null
  status: 'online' | 'away' | 'offline'
  total_tickets_handled: number
  tickets_resolved: number
  sla_first_response_met: number
  sla_resolution_met: number
  avg_csat_rating: number | null
  feedback_count: number
  avg_first_response_minutes: number | null
  avg_resolution_hours: number | null
  ticket_breakdown: {
    open: number
    pending: number
    resolved: number
    escalated: number
  }
  period: string
}

// GET /api/agents/[id]/metrics - Get agent performance metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Parse date range from query params
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30' // '7', '30', or 'all'

    // Get agent info
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, email, avatar_url, status')
      .eq('id', id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Build date filter
    let dateFilter: Date | null = null
    if (period !== 'all') {
      const days = parseInt(period, 10)
      if (!isNaN(days)) {
        dateFilter = new Date()
        dateFilter.setDate(dateFilter.getDate() - days)
      }
    }

    // Fetch tickets assigned to this agent
    let ticketsQuery = supabase
      .from('tickets')
      .select('id, status, priority, created_at, first_response_at, first_response_due_at, resolution_due_at, first_response_breached, resolution_breached, updated_at')
      .eq('assigned_agent_id', id)

    if (dateFilter) {
      ticketsQuery = ticketsQuery.gte('created_at', dateFilter.toISOString())
    }

    const { data: tickets, error: ticketsError } = await ticketsQuery

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    const ticketList = tickets || []
    const totalTickets = ticketList.length

    // Count by status
    const ticketBreakdown = {
      open: ticketList.filter((t) => t.status === 'open').length,
      pending: ticketList.filter((t) => t.status === 'pending').length,
      resolved: ticketList.filter((t) => t.status === 'resolved').length,
      escalated: ticketList.filter((t) => t.status === 'escalated').length,
    }

    // Count resolved tickets
    const ticketsResolved = ticketBreakdown.resolved

    // Calculate SLA metrics
    const ticketsWithSla = ticketList.filter(
      (t) => t.first_response_due_at || t.resolution_due_at
    )

    const slaFirstResponseMet = ticketList.filter(
      (t) => t.first_response_at && !t.first_response_breached
    ).length

    const slaResolutionMet = ticketList.filter(
      (t) => t.status === 'resolved' && !t.resolution_breached
    ).length

    // Calculate average first response time
    let avgFirstResponseMinutes: number | null = null
    const ticketsWithFirstResponse = ticketList.filter(
      (t) => t.first_response_at && t.created_at
    )

    if (ticketsWithFirstResponse.length > 0) {
      const totalMinutes = ticketsWithFirstResponse.reduce((sum, t) => {
        const created = new Date(t.created_at)
        const firstResponse = new Date(t.first_response_at!)
        const diffMs = firstResponse.getTime() - created.getTime()
        return sum + diffMs / 60000 // Convert to minutes
      }, 0)
      avgFirstResponseMinutes = Math.round(totalMinutes / ticketsWithFirstResponse.length)
    }

    // Calculate average resolution time (for resolved tickets)
    let avgResolutionHours: number | null = null
    const resolvedTickets = ticketList.filter((t) => t.status === 'resolved')

    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at)
        const resolved = new Date(t.updated_at)
        const diffMs = resolved.getTime() - created.getTime()
        return sum + diffMs / 3600000 // Convert to hours
      }, 0)
      avgResolutionHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10
    }

    // Fetch feedback/CSAT data if available
    // Note: The feedback table may not exist yet, so we handle this gracefully
    let avgCsatRating: number | null = null
    let feedbackCount = 0

    try {
      // Query ticket_feedback table for CSAT data
      const ticketIds = ticketList.map((t) => t.id)
      if (ticketIds.length > 0) {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('ticket_feedback')
          .select('rating')
          .in('ticket_id', ticketIds)

        if (!feedbackError && feedbackData && feedbackData.length > 0) {
          feedbackCount = feedbackData.length
          const totalRating = feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0)
          avgCsatRating = Math.round((totalRating / feedbackCount) * 10) / 10
        }
      }
    } catch {
      // Feedback table doesn't exist yet - that's fine
    }

    const metrics: AgentMetrics = {
      agent_id: agent.id,
      agent_name: agent.name,
      agent_email: agent.email,
      avatar_url: agent.avatar_url,
      status: agent.status,
      total_tickets_handled: totalTickets,
      tickets_resolved: ticketsResolved,
      sla_first_response_met: slaFirstResponseMet,
      sla_resolution_met: slaResolutionMet,
      avg_csat_rating: avgCsatRating,
      feedback_count: feedbackCount,
      avg_first_response_minutes: avgFirstResponseMinutes,
      avg_resolution_hours: avgResolutionHours,
      ticket_breakdown: ticketBreakdown,
      period: period === 'all' ? 'all' : `${period}d`,
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Agent metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
