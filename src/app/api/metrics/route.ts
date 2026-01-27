import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper to convert data to CSV
function toCSV(data: Record<string, unknown>[], headers: string[]): string {
  const rows = [headers.join(',')]
  for (const item of data) {
    const row = headers.map((h) => {
      const val = item[h]
      if (val === null || val === undefined) return ''
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return String(val)
    })
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

// Helper to get date range from period
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  let start: Date

  switch (period) {
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'all':
    default:
      start = new Date(0) // Beginning of time
      break
  }

  return { start, end }
}

// Helper to get previous period range for trend calculation
function getPreviousPeriodRange(period: string): { start: Date; end: Date } {
  const currentRange = getDateRange(period)
  const duration = currentRange.end.getTime() - currentRange.start.getTime()

  return {
    start: new Date(currentRange.start.getTime() - duration),
    end: currentRange.start,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const period = searchParams.get('period') || '30d'
    const format = searchParams.get('format') || 'json'

    const { start, end } = getDateRange(period)
    const prevPeriod = getPreviousPeriodRange(period)

    // Fetch all tickets within the date range
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        status,
        priority,
        ai_handled,
        created_at,
        updated_at,
        assigned_agent_id,
        first_response_at,
        first_response_due_at,
        resolution_due_at,
        first_response_breached,
        resolution_breached,
        customer:customers(id, name, email)
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

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
    let avgResponseTime: string = '--'
    const ticketIds = ticketList.map((t) => t.id)

    if (ticketIds.length > 0) {
      const { data: messages } = await supabase
        .from('messages')
        .select('ticket_id, created_at, sender_type')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true })

      if (messages && messages.length > 0) {
        const firstResponses: Map<string, Date> = new Map()

        for (const msg of messages) {
          if (msg.sender_type !== 'customer' && !firstResponses.has(msg.ticket_id)) {
            firstResponses.set(msg.ticket_id, new Date(msg.created_at))
          }
        }

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

    // ========================================
    // CSAT Metrics
    // ========================================
    const { data: feedback, error: feedbackError } = await supabase
      .from('ticket_feedback')
      .select('*')
      .not('submitted_at', 'is', null)
      .gte('submitted_at', start.toISOString())
      .lte('submitted_at', end.toISOString())
      .order('submitted_at', { ascending: false })

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError)
    }

    const feedbackList = feedback || []

    // Calculate CSAT metrics
    const csatTotal = feedbackList.length
    const csatDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    let csatSum = 0

    for (const fb of feedbackList) {
      if (fb.rating >= 1 && fb.rating <= 5) {
        csatDistribution[fb.rating]++
        csatSum += fb.rating
      }
    }

    const csatAverage = csatTotal > 0 ? Math.round((csatSum / csatTotal) * 100) / 100 : null

    // Get previous period feedback for trend calculation
    const { data: prevFeedback } = await supabase
      .from('ticket_feedback')
      .select('rating')
      .not('submitted_at', 'is', null)
      .gte('submitted_at', prevPeriod.start.toISOString())
      .lt('submitted_at', prevPeriod.end.toISOString())

    let csatTrend: number | null = null
    if (prevFeedback && prevFeedback.length > 0) {
      const prevSum = prevFeedback.reduce((acc, fb) => acc + fb.rating, 0)
      const prevAvg = prevSum / prevFeedback.length
      if (csatAverage !== null && prevAvg > 0) {
        csatTrend = Math.round(((csatAverage - prevAvg) / prevAvg) * 100)
      }
    }

    // Recent feedback with comments
    const recentFeedback = feedbackList
      .filter((fb) => fb.comment && fb.comment.trim().length > 0)
      .slice(0, 5)
      .map((fb) => ({
        id: fb.id,
        ticket_id: fb.ticket_id,
        rating: fb.rating,
        comment: fb.comment,
        submitted_at: fb.submitted_at,
      }))

    // ========================================
    // SLA Metrics
    // ========================================
    const ticketsWithSla = ticketList.filter((t) => t.first_response_due_at || t.resolution_due_at)

    // First Response SLA
    const ticketsWithFirstResponseDue = ticketList.filter((t) => t.first_response_due_at !== null)
    const firstResponseMet = ticketsWithFirstResponseDue.filter((t) => !t.first_response_breached).length
    const firstResponseBreached = ticketsWithFirstResponseDue.filter((t) => t.first_response_breached).length
    const firstResponseCompliance = ticketsWithFirstResponseDue.length > 0
      ? Math.round((firstResponseMet / ticketsWithFirstResponseDue.length) * 100)
      : null

    // Resolution SLA (only for resolved tickets)
    const resolvedWithSla = resolvedTickets.filter((t) => t.resolution_due_at !== null)
    const resolutionMet = resolvedWithSla.filter((t) => !t.resolution_breached).length
    const resolutionBreached = resolvedWithSla.filter((t) => t.resolution_breached).length
    const resolutionCompliance = resolvedWithSla.length > 0
      ? Math.round((resolutionMet / resolvedWithSla.length) * 100)
      : null

    // Tickets currently at risk (approaching SLA deadline)
    const now = new Date()
    const ticketsAtRisk = ticketList.filter((t) => {
      if (t.status === 'resolved') return false

      // Check if first response is due soon and not yet responded
      if (!t.first_response_at && t.first_response_due_at) {
        const dueDate = new Date(t.first_response_due_at)
        const timeLeft = dueDate.getTime() - now.getTime()
        const hoursLeft = timeLeft / (1000 * 60 * 60)
        if (hoursLeft > 0 && hoursLeft <= 1) return true
      }

      // Check if resolution is due soon
      if (t.resolution_due_at) {
        const dueDate = new Date(t.resolution_due_at)
        const timeLeft = dueDate.getTime() - now.getTime()
        const hoursLeft = timeLeft / (1000 * 60 * 60)
        if (hoursLeft > 0 && hoursLeft <= 2) return true
      }

      return false
    }).length

    // ========================================
    // Agent Performance Comparison
    // ========================================
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, email, avatar_url')

    const agentMap = new Map(agents?.map((a) => [a.id, a]) || [])
    const agentPerformance: Record<string, {
      id: string
      name: string
      avatar_url: string | null
      ticketsHandled: number
      ticketsResolved: number
      avgRating: number | null
      feedbackCount: number
      slaComplianceRate: number | null
    }> = {}

    // Initialize agent performance
    for (const agent of agents || []) {
      agentPerformance[agent.id] = {
        id: agent.id,
        name: agent.name,
        avatar_url: agent.avatar_url,
        ticketsHandled: 0,
        ticketsResolved: 0,
        avgRating: null,
        feedbackCount: 0,
        slaComplianceRate: null,
      }
    }

    // Count tickets per agent
    for (const ticket of ticketList) {
      if (ticket.assigned_agent_id && agentPerformance[ticket.assigned_agent_id]) {
        agentPerformance[ticket.assigned_agent_id].ticketsHandled++
        if (ticket.status === 'resolved') {
          agentPerformance[ticket.assigned_agent_id].ticketsResolved++
        }
      }
    }

    // Get feedback per agent
    const ticketAgentMap = new Map(ticketList.map((t) => [t.id, t.assigned_agent_id]))
    for (const fb of feedbackList) {
      const agentId = ticketAgentMap.get(fb.ticket_id)
      if (agentId && agentPerformance[agentId]) {
        agentPerformance[agentId].feedbackCount++
        if (agentPerformance[agentId].avgRating === null) {
          agentPerformance[agentId].avgRating = fb.rating
        } else {
          // Recalculate average
          const currentAvg = agentPerformance[agentId].avgRating!
          const count = agentPerformance[agentId].feedbackCount
          agentPerformance[agentId].avgRating = ((currentAvg * (count - 1)) + fb.rating) / count
        }
      }
    }

    // Calculate SLA compliance per agent
    for (const agentId of Object.keys(agentPerformance)) {
      const agentTickets = ticketList.filter((t) => t.assigned_agent_id === agentId)
      const agentTicketsWithSla = agentTickets.filter((t) => t.first_response_due_at || t.resolution_due_at)
      const slaMet = agentTicketsWithSla.filter((t) => !t.first_response_breached && !t.resolution_breached).length

      if (agentTicketsWithSla.length > 0) {
        agentPerformance[agentId].slaComplianceRate = Math.round((slaMet / agentTicketsWithSla.length) * 100)
      }
    }

    // Convert agent performance to array and sort by tickets handled
    const agentPerformanceList = Object.values(agentPerformance)
      .filter((a) => a.ticketsHandled > 0)
      .sort((a, b) => b.ticketsHandled - a.ticketsHandled)

    // ========================================
    // Build Response
    // ========================================
    const metricsResponse = {
      openTickets,
      avgResponseTime,
      aiResolutionRate,
      customerSatisfaction: csatAverage ? Math.round(csatAverage * 20) : null, // Convert 1-5 to percentage
      totalTickets,
      byStatus,
      byPriority,
      aiHandledCount,
      humanHandledCount,
      csat: {
        average: csatAverage,
        total: csatTotal,
        distribution: csatDistribution,
        trend: csatTrend,
        recentFeedback,
      },
      sla: {
        firstResponse: {
          met: firstResponseMet,
          breached: firstResponseBreached,
          compliance: firstResponseCompliance,
          total: ticketsWithFirstResponseDue.length,
        },
        resolution: {
          met: resolutionMet,
          breached: resolutionBreached,
          compliance: resolutionCompliance,
          total: resolvedWithSla.length,
        },
        ticketsAtRisk,
      },
      agentPerformance: agentPerformanceList,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: period,
      },
    }

    // Return CSV if requested
    if (format === 'csv') {
      const csvData = toCSV(
        [metricsResponse].map((m) => ({
          period_start: m.period.start,
          period_end: m.period.end,
          total_tickets: m.totalTickets,
          open_tickets: m.openTickets,
          avg_response_time: m.avgResponseTime,
          ai_resolution_rate: m.aiResolutionRate,
          csat_average: m.csat.average,
          csat_total: m.csat.total,
          first_response_compliance: m.sla.firstResponse.compliance,
          resolution_compliance: m.sla.resolution.compliance,
        })),
        [
          'period_start',
          'period_end',
          'total_tickets',
          'open_tickets',
          'avg_response_time',
          'ai_resolution_rate',
          'csat_average',
          'csat_total',
          'first_response_compliance',
          'resolution_compliance',
        ]
      )

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="metrics-${period}.csv"`,
        },
      })
    }

    return NextResponse.json(metricsResponse)
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
