import type {
  ToolContext,
  ToolResult,
  SearchTicketsInput,
  UpdateTicketInput,
  EscalateTicketInput,
  GetTicketSummaryInput,
  TicketSearchResult,
  TicketSummary,
} from '../types'
import { getAnthropicClient, COPILOT_MODEL } from '../client'
import { TICKET_SUMMARY_PROMPT } from '../prompts'

/**
 * Search through support tickets
 */
export async function searchTickets(
  input: SearchTicketsInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context
  const limit = input.limit || 10

  try {
    let query = supabase
      .from('tickets')
      .select(`
        id,
        subject,
        status,
        priority,
        created_at,
        tags,
        customer:customers(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (input.customer_id) {
      query = query.eq('customer_id', input.customer_id)
    }

    if (input.status) {
      query = query.eq('status', input.status)
    }

    if (input.query) {
      // Search in subject using ilike
      query = query.ilike('subject', `%${input.query}%`)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error('searchTickets error:', error)
      return {
        success: false,
        error: `Failed to search tickets: ${error.message}`,
      }
    }

    const results: TicketSearchResult[] = (tickets || []).map((t) => {
      const customer = t.customer as { name: string | null; email: string | null } | null
      return {
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        tags: t.tags || [],
      }
    })

    return {
      success: true,
      data: {
        tickets: results,
        count: results.length,
        filters_applied: {
          query: input.query || null,
          customer_id: input.customer_id || null,
          status: input.status || null,
        },
      },
    }
  } catch (error) {
    console.error('searchTickets error:', error)
    return {
      success: false,
      error: 'Failed to search tickets',
    }
  }
}

/**
 * Update a ticket's status, priority, or tags
 */
export async function updateTicket(
  input: UpdateTicketInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase, agentId } = context

  if (!input.ticket_id) {
    return {
      success: false,
      error: 'ticket_id is required',
    }
  }

  try {
    // Fetch current ticket state
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', input.ticket_id)
      .single()

    if (fetchError || !currentTicket) {
      return {
        success: false,
        error: `Ticket not found: ${input.ticket_id}`,
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const events: { event_type: string; old_value: string | null; new_value: string | null }[] = []

    if (input.status && input.status !== currentTicket.status) {
      updates.status = input.status
      events.push({
        event_type: 'status_changed',
        old_value: currentTicket.status,
        new_value: input.status,
      })
    }

    if (input.priority && input.priority !== currentTicket.priority) {
      updates.priority = input.priority
      events.push({
        event_type: 'priority_changed',
        old_value: currentTicket.priority,
        new_value: input.priority,
      })
    }

    if (input.tags && input.tags.length > 0) {
      // Merge new tags with existing
      const existingTags = currentTicket.tags || []
      const newTags = [...new Set([...existingTags, ...input.tags])]
      updates.tags = newTags

      // Log each new tag
      const addedTags = input.tags.filter((t) => !existingTags.includes(t))
      addedTags.forEach((tag) => {
        events.push({
          event_type: 'tagged',
          old_value: null,
          new_value: tag,
        })
      })
    }

    if (Object.keys(updates).length === 1) {
      // Only updated_at, no actual changes
      return {
        success: false,
        error: 'No changes to apply. Provide status, priority, or tags to update.',
      }
    }

    // Perform the update
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', input.ticket_id)
      .select()
      .single()

    if (updateError) {
      return {
        success: false,
        error: `Failed to update ticket: ${updateError.message}`,
      }
    }

    // Log events
    for (const event of events) {
      await supabase.from('ticket_events').insert({
        ticket_id: input.ticket_id,
        agent_id: agentId || null,
        event_type: event.event_type,
        old_value: event.old_value,
        new_value: event.new_value,
      })
    }

    return {
      success: true,
      data: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        tags: ticket.tags,
        changes: events.map((e) => `${e.event_type}: ${e.old_value || 'none'} → ${e.new_value}`),
      },
    }
  } catch (error) {
    console.error('updateTicket error:', error)
    return {
      success: false,
      error: 'Failed to update ticket',
    }
  }
}

/**
 * Escalate a ticket to a supervisor
 */
export async function escalateTicket(
  input: EscalateTicketInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase, agentId } = context

  if (!input.ticket_id || !input.reason) {
    return {
      success: false,
      error: 'ticket_id and reason are required',
    }
  }

  try {
    // Update ticket status to escalated
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'escalated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.ticket_id)
      .select(`
        id,
        subject,
        status,
        priority,
        customer:customers(name, email)
      `)
      .single()

    if (updateError) {
      return {
        success: false,
        error: `Failed to escalate ticket: ${updateError.message}`,
      }
    }

    // Log escalation event with notes in metadata
    await supabase.from('ticket_events').insert({
      ticket_id: input.ticket_id,
      agent_id: agentId || null,
      event_type: 'escalated',
      old_value: null,
      new_value: input.reason,
      metadata: input.notes ? { notes: input.notes } : null,
    })

    const customer = ticket.customer as { name: string | null; email: string | null } | null

    return {
      success: true,
      data: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        customer_name: customer?.name || null,
        escalation_reason: input.reason,
        escalation_notes: input.notes || null,
        message: 'Ticket has been escalated successfully',
      },
    }
  } catch (error) {
    console.error('escalateTicket error:', error)
    return {
      success: false,
      error: 'Failed to escalate ticket',
    }
  }
}

/**
 * Get an AI-generated summary of a ticket conversation
 */
export async function getTicketSummary(
  input: GetTicketSummaryInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context

  if (!input.ticket_id) {
    return {
      success: false,
      error: 'ticket_id is required',
    }
  }

  try {
    // Fetch ticket with messages
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        status,
        priority,
        created_at,
        customer:customers(name, email)
      `)
      .eq('id', input.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return {
        success: false,
        error: `Ticket not found: ${input.ticket_id}`,
      }
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', input.ticket_id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return {
        success: false,
        error: 'Failed to fetch ticket messages',
      }
    }

    if (!messages || messages.length === 0) {
      return {
        success: true,
        data: {
          issue: 'No messages in this ticket yet',
          key_points: [],
          current_status: ticket.status,
          customer_sentiment: 'neutral',
          recommended_action: 'Review the ticket subject and reach out to the customer',
          message_count: 0,
        } as TicketSummary,
      }
    }

    // Format messages for the prompt
    const messagesText = messages
      .map((m) => {
        const sender = m.sender_type === 'customer' ? 'Customer' : m.sender_type === 'agent' ? 'Agent' : 'AI'
        return `[${sender}]: ${m.content}`
      })
      .join('\n\n')

    // Generate summary using Claude
    const prompt = TICKET_SUMMARY_PROMPT.replace('{messages}', messagesText)

    const response = await getAnthropicClient().messages.create({
      model: COPILOT_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    // Parse the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Try to extract structured data from the response
    const summary: TicketSummary = {
      issue: extractSection(responseText, 'Main issue', 'The ticket details a customer issue'),
      key_points: extractListSection(responseText, 'Key points'),
      current_status: ticket.status,
      customer_sentiment: extractSentiment(responseText),
      recommended_action: extractSection(responseText, 'Recommended', 'Follow up with the customer'),
      message_count: messages.length,
    }

    return {
      success: true,
      data: summary,
    }
  } catch (error) {
    console.error('getTicketSummary error:', error)
    return {
      success: false,
      error: 'Failed to generate ticket summary',
    }
  }
}

// Helper functions for parsing summary response
function extractSection(text: string, sectionName: string, defaultValue: string): string {
  const regex = new RegExp(`${sectionName}[:\\s]+(.+?)(?:\\n|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : defaultValue
}

function extractListSection(text: string, sectionName: string): string[] {
  const regex = new RegExp(`${sectionName}[:\\s]*\\n([\\s\\S]*?)(?:\\n\\n|\\d\\.|$)`, 'i')
  const match = text.match(regex)
  if (!match) return []

  return match[1]
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter((line) => line.length > 0)
}

function extractSentiment(text: string): 'frustrated' | 'neutral' | 'happy' {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('frustrated') || lowerText.includes('angry') || lowerText.includes('upset')) {
    return 'frustrated'
  }
  if (lowerText.includes('happy') || lowerText.includes('satisfied') || lowerText.includes('pleased')) {
    return 'happy'
  }
  return 'neutral'
}
