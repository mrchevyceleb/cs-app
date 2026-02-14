import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper to convert data to CSV with proper escaping
function toCSV(data: Record<string, unknown>[], headers: string[]): string {
  const rows = [headers.join(',')]
  for (const item of data) {
    const row = headers.map((h) => {
      const val = item[h]
      if (val === null || val === undefined) return ''
      const strVal = String(val)
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`
      }
      return strVal
    })
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

// Helper to get date range from period
function getDateRange(period: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
    }
  }

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const exportType = searchParams.get('type') || 'tickets'
    const period = searchParams.get('period') || '30d'
    const startDate = searchParams.get('start') || undefined
    const endDate = searchParams.get('end') || undefined

    const { start, end } = getDateRange(period, startDate, endDate)

    let csvData: string
    let filename: string

    switch (exportType) {
      case 'tickets': {
        const { data: tickets, error } = await supabase
          .from('tickets')
          .select(`
            id,
            subject,
            status,
            priority,
            ai_handled,
            created_at,
            updated_at,
            follow_up_at,
            auto_close_at,
            customer:customers(name, email),
            agent:agents!tickets_assigned_agent_id_fkey(name, email)
          `)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching tickets:', error)
          return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
        }

        const ticketRows = (tickets || []).map((t) => ({
          id: t.id,
          subject: t.subject,
          customer_name: (t.customer as { name: string | null } | null)?.name || '',
          customer_email: (t.customer as { email: string | null } | null)?.email || '',
          status: t.status,
          priority: t.priority,
          ai_handled: t.ai_handled ? 'Yes' : 'No',
          assigned_agent: (t.agent as { name: string } | null)?.name || 'Unassigned',
          created_at: t.created_at,
          follow_up_at: t.follow_up_at || '',
          auto_close_at: t.auto_close_at || '',
          updated_at: t.updated_at,
        }))

        csvData = toCSV(ticketRows, [
          'id',
          'subject',
          'customer_name',
          'customer_email',
          'status',
          'priority',
          'ai_handled',
          'assigned_agent',
          'created_at',
          'follow_up_at',
          'auto_close_at',
          'updated_at',
        ])
        filename = `tickets-export-${period}.csv`
        break
      }

      case 'messages': {
        // Get tickets in range first, then get their messages
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())

        const ticketIds = (tickets || []).map((t) => t.id)

        if (ticketIds.length === 0) {
          csvData = 'ticket_id,sender_type,content_preview,created_at\n'
          filename = `messages-export-${period}.csv`
          break
        }

        const { data: messages, error } = await supabase
          .from('messages')
          .select('id, ticket_id, sender_type, content, created_at')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: false })
          .limit(10000) // Limit to prevent huge exports

        if (error) {
          console.error('Error fetching messages:', error)
          return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
        }

        // Anonymize content - only show first 100 chars and mask potential PII
        const messageRows = (messages || []).map((m) => {
          let preview = m.content.substring(0, 100)
          // Basic PII masking
          preview = preview.replace(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, '[EMAIL]')
          preview = preview.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
          preview = preview.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CARD]')

          return {
            ticket_id: m.ticket_id,
            sender_type: m.sender_type,
            content_preview: preview + (m.content.length > 100 ? '...' : ''),
            created_at: m.created_at,
          }
        })

        csvData = toCSV(messageRows, ['ticket_id', 'sender_type', 'content_preview', 'created_at'])
        filename = `messages-export-${period}.csv`
        break
      }

      case 'feedback': {
        const { data: feedback, error } = await supabase
          .from('ticket_feedback')
          .select(`
            id,
            ticket_id,
            rating,
            comment,
            submitted_at,
            ticket:tickets(subject, priority, status)
          `)
          .not('submitted_at', 'is', null)
          .gte('submitted_at', start.toISOString())
          .lte('submitted_at', end.toISOString())
          .order('submitted_at', { ascending: false })

        if (error) {
          console.error('Error fetching feedback:', error)
          return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
        }

        const feedbackRows = (feedback || []).map((f) => ({
          ticket_id: f.ticket_id,
          ticket_subject: (f.ticket as { subject: string } | null)?.subject || '',
          ticket_priority: (f.ticket as { priority: string } | null)?.priority || '',
          ticket_status: (f.ticket as { status: string } | null)?.status || '',
          rating: f.rating,
          comment: f.comment || '',
          submitted_at: f.submitted_at,
        }))

        csvData = toCSV(feedbackRows, [
          'ticket_id',
          'ticket_subject',
          'ticket_priority',
          'ticket_status',
          'rating',
          'comment',
          'submitted_at',
        ])
        filename = `feedback-export-${period}.csv`
        break
      }

      case 'agents': {
        // Get tickets in range
        const { data: tickets } = await supabase
          .from('tickets')
          .select(`
            id,
            status,
            assigned_agent_id
          `)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())

        const ticketList = tickets || []
        const ticketIds = ticketList.map((t) => t.id)

        // Get feedback for these tickets
        const { data: feedback } = await supabase
          .from('ticket_feedback')
          .select('ticket_id, rating')
          .in('ticket_id', ticketIds)
          .not('submitted_at', 'is', null)

        const feedbackByTicket = new Map((feedback || []).map((f) => [f.ticket_id, f.rating]))

        // Get all agents
        const { data: agents, error } = await supabase
          .from('agents')
          .select('id, name, email')

        if (error) {
          console.error('Error fetching agents:', error)
          return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
        }

        // Calculate performance per agent
        const agentRows = (agents || []).map((agent) => {
          const agentTickets = ticketList.filter((t) => t.assigned_agent_id === agent.id)
          const totalTickets = agentTickets.length
          const resolvedTickets = agentTickets.filter((t) => t.status === 'resolved').length

          // Calculate avg rating
          const agentFeedback = agentTickets
            .map((t) => feedbackByTicket.get(t.id))
            .filter((r): r is number => r !== undefined)
          const avgRating = agentFeedback.length > 0
            ? Math.round((agentFeedback.reduce((a, b) => a + b, 0) / agentFeedback.length) * 100) / 100
            : null

          return {
            name: agent.name,
            email: agent.email,
            total_tickets: totalTickets,
            resolved_tickets: resolvedTickets,
            resolution_rate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
            avg_csat_rating: avgRating ?? '',
            feedback_count: agentFeedback.length,
          }
        })

        csvData = toCSV(agentRows, [
          'name',
          'email',
          'total_tickets',
          'resolved_tickets',
          'resolution_rate',
          'avg_csat_rating',
          'feedback_count',
        ])
        filename = `agents-performance-${period}.csv`
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
