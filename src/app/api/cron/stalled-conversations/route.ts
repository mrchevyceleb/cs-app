import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import type { Ticket, Customer, Message } from '@/types/database'

const JOB_NAME = 'stalled-conversations'

// Configuration
const STALLED_HOURS = 24 // Consider stalled after 24 hours without customer response
const MAX_REVIVALS_PER_RUN = 50 // Limit to avoid overloading
const DAYS_BETWEEN_REVIVALS = 3 // Don't send revival more than once every 3 days

interface StalledTicket {
  ticket: Ticket & { customer: Customer }
  lastAgentMessage: Message
  hoursSinceLastResponse: number
}

/**
 * Check if we've already sent a revival for this ticket recently
 */
async function hasRecentRevival(
  supabase: ReturnType<typeof getServiceClient>,
  ticketId: string
): Promise<boolean> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_BETWEEN_REVIVALS)

  const { data } = await supabase
    .from('proactive_outreach_log')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('outreach_type', 'stalled_revival')
    .gte('created_at', cutoffDate.toISOString())
    .limit(1)

  return (data?.length || 0) > 0
}

/**
 * Generate a friendly follow-up message
 */
function generateRevivalMessage(ticket: Ticket, customerName: string | null): string {
  const name = customerName || 'there'

  return `Hi ${name},

I wanted to follow up on your support request regarding "${ticket.subject}".

We sent you a response but haven't heard back. Is there anything else we can help you with, or has your issue been resolved?

If everything is working now, just let us know and we'll close this ticket. If you're still experiencing issues, we're here to help!

Best regards,
Support Team`
}

/**
 * POST /api/cron/stalled-conversations
 * Find and revive stalled conversations where we're waiting for customer response
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const stalledCutoff = new Date(now.getTime() - STALLED_HOURS * 60 * 60 * 1000)

    // Find tickets that are:
    // 1. Status is 'pending' (waiting for customer)
    // 2. Last message was from agent/AI, not customer
    // 3. Last message was sent more than STALLED_HOURS ago
    const { data: pendingTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('status', 'pending')
      .order('updated_at', { ascending: true })
      .limit(200) // Fetch more than we need, we'll filter

    if (ticketsError) {
      logCronExecution(JOB_NAME, 'failed', { error: ticketsError.message })
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    if (!pendingTickets || pendingTickets.length === 0) {
      logCronExecution(JOB_NAME, 'completed', { stalledTickets: 0, revivalsSent: 0 })
      return NextResponse.json({
        success: true,
        stalledTickets: 0,
        revivalsSent: 0,
      })
    }

    // For each pending ticket, check if it's actually stalled
    const stalledTickets: StalledTicket[] = []

    for (const ticket of pendingTickets) {
      // Get the last message in the conversation
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!messages || messages.length === 0) continue

      const lastMessage = messages[0]

      // Skip if last message was from customer (we should respond, not them)
      if (lastMessage.sender_type === 'customer') continue

      // Check if the message is old enough
      const messageDate = new Date(lastMessage.created_at)
      if (messageDate > stalledCutoff) continue

      const hoursSinceLastResponse = Math.floor(
        (now.getTime() - messageDate.getTime()) / (60 * 60 * 1000)
      )

      stalledTickets.push({
        ticket: ticket as Ticket & { customer: Customer },
        lastAgentMessage: lastMessage,
        hoursSinceLastResponse,
      })

      // Stop if we have enough
      if (stalledTickets.length >= MAX_REVIVALS_PER_RUN * 2) break
    }

    logCronExecution(JOB_NAME, 'started', {
      stalledTicketsFound: stalledTickets.length,
    })

    let revivalsSent = 0
    let skippedRecentRevival = 0
    let errors = 0

    // Process stalled tickets
    for (const stalled of stalledTickets) {
      if (revivalsSent >= MAX_REVIVALS_PER_RUN) break

      try {
        // Check if we've already sent a revival recently
        if (await hasRecentRevival(supabase, stalled.ticket.id)) {
          skippedRecentRevival++
          continue
        }

        const customer = stalled.ticket.customer
        if (!customer) continue

        // Generate revival message
        const revivalMessage = generateRevivalMessage(stalled.ticket, customer.name)

        // Add the revival message to the ticket
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            ticket_id: stalled.ticket.id,
            sender_type: 'ai',
            content: revivalMessage,
            metadata: {
              is_proactive: true,
              outreach_type: 'stalled_revival',
              hours_stalled: stalled.hoursSinceLastResponse,
            },
          })

        if (messageError) {
          console.error(`[${JOB_NAME}] Error adding message to ticket ${stalled.ticket.id}:`, messageError)
          errors++
          continue
        }

        // Log the outreach
        const { error: logError } = await supabase
          .from('proactive_outreach_log')
          .insert({
            customer_id: customer.id,
            ticket_id: stalled.ticket.id,
            outreach_type: 'stalled_revival',
            channel: 'internal', // Message added to ticket, email sent via existing notification system
            message_content: revivalMessage,
            trigger_reason: `No customer response for ${stalled.hoursSinceLastResponse} hours`,
            trigger_data: {
              hours_stalled: stalled.hoursSinceLastResponse,
              last_agent_message_id: stalled.lastAgentMessage.id,
            },
            delivery_status: 'sent',
            delivered_at: now.toISOString(),
          })

        if (logError) {
          console.error(`[${JOB_NAME}] Error logging outreach for ticket ${stalled.ticket.id}:`, logError)
        }

        // Update ticket to indicate it was revived
        await supabase
          .from('tickets')
          .update({
            updated_at: now.toISOString(),
          })
          .eq('id', stalled.ticket.id)

        revivalsSent++
      } catch (err) {
        console.error(`[${JOB_NAME}] Error processing stalled ticket ${stalled.ticket.id}:`, err)
        errors++
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      stalledTicketsFound: stalledTickets.length,
      revivalsSent,
      skippedRecentRevival,
      errors,
    })

    return NextResponse.json({
      success: true,
      stalledTicketsFound: stalledTickets.length,
      revivalsSent,
      skippedRecentRevival,
      errors,
    })
  } catch (error) {
    logCronExecution(JOB_NAME, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
