import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all tickets to compute metrics
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, status, priority, ai_handled, created_at, updated_at')

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    const ticketList = tickets || []
    const totalTickets = ticketList.length

    // Count open tickets (open or pending status)
    const openTickets = ticketList.filter(
      (t) => t.status === 'open' || t.status === 'pending'
    ).length

    // Count by status
    const byStatus = {
      open: ticketList.filter((t) => t.status === 'open').length,
      pending: ticketList.filter((t) => t.status === 'pending').length,
      resolved: ticketList.filter((t) => t.status === 'resolved').length,
      escalated: ticketList.filter((t) => t.status === 'escalated').length,
    }

    // Count by priority
    const byPriority = {
      low: ticketList.filter((t) => t.priority === 'low').length,
      normal: ticketList.filter((t) => t.priority === 'normal').length,
      high: ticketList.filter((t) => t.priority === 'high').length,
      urgent: ticketList.filter((t) => t.priority === 'urgent').length,
    }

    // AI vs Human handled
    const aiHandledCount = ticketList.filter((t) => t.ai_handled).length
    const humanHandledCount = ticketList.filter((t) => !t.ai_handled).length

    // Calculate AI resolution rate (% of resolved tickets where ai_handled=true)
    const resolvedTickets = ticketList.filter((t) => t.status === 'resolved')
    let aiResolutionRate: number | null = null
    if (resolvedTickets.length > 0) {
      const aiResolvedCount = resolvedTickets.filter((t) => t.ai_handled).length
      aiResolutionRate = Math.round((aiResolvedCount / resolvedTickets.length) * 100)
    }

    // Calculate average response time
    // For now, we'll calculate the average time between ticket creation and first message response
    // This requires fetching messages data
    let avgResponseTime: string = '--'

    // Fetch first response messages for each ticket to calculate response time
    const ticketIds = ticketList.map((t) => t.id)
    if (ticketIds.length > 0) {
      const { data: messages } = await supabase
        .from('messages')
        .select('ticket_id, created_at, sender_type')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true })

      if (messages && messages.length > 0) {
        // Group messages by ticket and find first non-customer response
        const firstResponses: Map<string, Date> = new Map()

        for (const msg of messages) {
          if (msg.sender_type !== 'customer' && !firstResponses.has(msg.ticket_id)) {
            firstResponses.set(msg.ticket_id, new Date(msg.created_at))
          }
        }

        // Calculate response times
        const responseTimes: number[] = []
        for (const ticket of ticketList) {
          const firstResponse = firstResponses.get(ticket.id)
          if (firstResponse) {
            const ticketCreated = new Date(ticket.created_at)
            const diffMs = firstResponse.getTime() - ticketCreated.getTime()
            if (diffMs > 0) {
              responseTimes.push(diffMs)
            }
          }
        }

        if (responseTimes.length > 0) {
          const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          const avgMinutes = avgMs / 60000

          if (avgMinutes < 1) {
            avgResponseTime = '<1m'
          } else if (avgMinutes < 60) {
            avgResponseTime = `${avgMinutes.toFixed(1)}m`
          } else {
            const avgHours = avgMinutes / 60
            avgResponseTime = `${avgHours.toFixed(1)}h`
          }
        }
      }
    }

    return NextResponse.json({
      openTickets,
      avgResponseTime,
      aiResolutionRate,
      customerSatisfaction: null, // No feedback system yet
      totalTickets,
      byStatus,
      byPriority,
      aiHandledCount,
      humanHandledCount,
    })
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
