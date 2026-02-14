import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface AgentPerformanceSummary {
  agent_id: string
  agent_name: string
  agent_email: string
  avatar_url: string | null
  status: 'online' | 'away' | 'offline'
  total_tickets_handled: number
  tickets_resolved: number
  resolution_rate: number
  avg_csat_rating: number | null
  avg_first_response_minutes: number | null
  avg_resolution_hours: number | null
  rank?: number
}

export interface AgentsPerformanceResponse {
  agents: AgentPerformanceSummary[]
  team_summary: {
    total_agents: number
    total_tickets: number
    total_resolved: number
    avg_resolution_rate: number
    avg_csat: number | null
  }
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

type SortField = 'tickets' | 'resolved' | 'resolution_rate' | 'csat' | 'response_time' | 'resolution_time'
type SortOrder = 'asc' | 'desc'

// GET /api/agents/performance - Get all agents' performance for leaderboard
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30' // '7', '30', or 'all'
    const sortBy = (searchParams.get('sort') || 'resolved') as SortField
    const order = (searchParams.get('order') || 'desc') as SortOrder
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Build date filter
    let dateFilter: Date | null = null
    if (period !== 'all') {
      const days = parseInt(period, 10)
      if (!isNaN(days)) {
        dateFilter = new Date()
        dateFilter.setDate(dateFilter.getDate() - days)
      }
    }

    // Fetch all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, email, avatar_url, status')

    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        agents: [],
        team_summary: {
          total_agents: 0,
          total_tickets: 0,
          total_resolved: 0,
          avg_resolution_rate: 0,
          avg_csat: null,
        },
        pagination: {
          page: 1,
          limit,
          total: 0,
          total_pages: 0,
        },
      } as AgentsPerformanceResponse)
    }

    // Fetch all tickets with agent assignments
    let ticketsQuery = supabase
      .from('tickets')
      .select('id, status, assigned_agent_id, created_at, updated_at')
      .not('assigned_agent_id', 'is', null)

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

    // Group tickets by agent
    const ticketsByAgent: Record<string, typeof ticketList> = {}
    for (const ticket of ticketList) {
      if (ticket.assigned_agent_id) {
        if (!ticketsByAgent[ticket.assigned_agent_id]) {
          ticketsByAgent[ticket.assigned_agent_id] = []
        }
        ticketsByAgent[ticket.assigned_agent_id].push(ticket)
      }
    }

    // Fetch feedback data if available
    const feedbackByAgent: Record<string, { count: number; totalRating: number }> = {}
    try {
      const { data: feedbackData } = await supabase
        .from('ticket_feedback')
        .select('ticket_id, rating')

      if (feedbackData && feedbackData.length > 0) {
        // Map feedback to agents via tickets
        for (const feedback of feedbackData) {
          const ticket = ticketList.find((t) => t.id === feedback.ticket_id)
          if (ticket?.assigned_agent_id) {
            if (!feedbackByAgent[ticket.assigned_agent_id]) {
              feedbackByAgent[ticket.assigned_agent_id] = { count: 0, totalRating: 0 }
            }
            feedbackByAgent[ticket.assigned_agent_id].count++
            feedbackByAgent[ticket.assigned_agent_id].totalRating += feedback.rating || 0
          }
        }
      }
    } catch {
      // Feedback table doesn't exist yet - that's fine
    }

    // Calculate metrics for each agent
    const agentMetrics: AgentPerformanceSummary[] = agents.map((agent) => {
      const agentTickets = ticketsByAgent[agent.id] || []
      const totalTickets = agentTickets.length
      const resolvedTickets = agentTickets.filter((t) => t.status === 'resolved')
      const ticketsResolved = resolvedTickets.length

      const resolutionRate = totalTickets > 0
        ? Math.round((ticketsResolved / totalTickets) * 100)
        : 0

      // Calculate average first response time
      let avgFirstResponseMinutes: number | null = null

      // Calculate average resolution time
      let avgResolutionHours: number | null = null
      if (resolvedTickets.length > 0) {
        const totalHours = resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.created_at)
          const resolved = new Date(t.updated_at)
          const diffMs = resolved.getTime() - created.getTime()
          return sum + diffMs / 3600000
        }, 0)
        avgResolutionHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10
      }

      // Get CSAT rating
      const feedback = feedbackByAgent[agent.id]
      const avgCsatRating = feedback && feedback.count > 0
        ? Math.round((feedback.totalRating / feedback.count) * 10) / 10
        : null

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_email: agent.email,
        avatar_url: agent.avatar_url,
        status: agent.status,
        total_tickets_handled: totalTickets,
        tickets_resolved: ticketsResolved,
        resolution_rate: resolutionRate,
        avg_csat_rating: avgCsatRating,
        avg_first_response_minutes: avgFirstResponseMinutes,
        avg_resolution_hours: avgResolutionHours,
      }
    })

    // Sort agents
    const sortedAgents = [...agentMetrics].sort((a, b) => {
      let aVal: number
      let bVal: number

      switch (sortBy) {
        case 'tickets':
          aVal = a.total_tickets_handled
          bVal = b.total_tickets_handled
          break
        case 'resolved':
          aVal = a.tickets_resolved
          bVal = b.tickets_resolved
          break
        case 'resolution_rate':
          aVal = a.resolution_rate
          bVal = b.resolution_rate
          break
        case 'csat':
          aVal = a.avg_csat_rating ?? -1
          bVal = b.avg_csat_rating ?? -1
          break
        case 'response_time':
          // Lower is better, so invert for default desc sort
          aVal = a.avg_first_response_minutes ?? Infinity
          bVal = b.avg_first_response_minutes ?? Infinity
          // For response time, lower is better, so reverse the comparison
          if (order === 'desc') {
            return aVal - bVal // Ascending (lower first when sorted "desc" by performance)
          }
          return bVal - aVal
        case 'resolution_time':
          aVal = a.avg_resolution_hours ?? Infinity
          bVal = b.avg_resolution_hours ?? Infinity
          if (order === 'desc') {
            return aVal - bVal
          }
          return bVal - aVal
        default:
          aVal = a.tickets_resolved
          bVal = b.tickets_resolved
      }

      return order === 'desc' ? bVal - aVal : aVal - bVal
    })

    // Add rank
    sortedAgents.forEach((agent, index) => {
      agent.rank = index + 1
    })

    // Calculate team summary
    const totalTeamTickets = agentMetrics.reduce((sum, a) => sum + a.total_tickets_handled, 0)
    const totalTeamResolved = agentMetrics.reduce((sum, a) => sum + a.tickets_resolved, 0)
    const avgResolutionRate = totalTeamTickets > 0
      ? Math.round((totalTeamResolved / totalTeamTickets) * 100)
      : 0

    const agentsWithCsat = agentMetrics.filter((a) => a.avg_csat_rating !== null)
    const avgCsat = agentsWithCsat.length > 0
      ? Math.round((agentsWithCsat.reduce((sum, a) => sum + (a.avg_csat_rating || 0), 0) / agentsWithCsat.length) * 10) / 10
      : null

    // Paginate
    const totalAgents = sortedAgents.length
    const totalPages = Math.ceil(totalAgents / limit)
    const startIndex = (page - 1) * limit
    const paginatedAgents = sortedAgents.slice(startIndex, startIndex + limit)

    const response: AgentsPerformanceResponse = {
      agents: paginatedAgents,
      team_summary: {
        total_agents: agents.length,
        total_tickets: totalTeamTickets,
        total_resolved: totalTeamResolved,
        avg_resolution_rate: avgResolutionRate,
        avg_csat: avgCsat,
      },
      pagination: {
        page,
        limit,
        total: totalAgents,
        total_pages: totalPages,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Agents performance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
