import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'

const JOB_NAME = 'lifecycle'

const FOLLOW_UP_BATCH_SIZE = 50
const AUTO_CLOSE_BATCH_SIZE = 100

/**
 * GET /api/cron/lifecycle
 * Process scheduled follow-ups and auto-closes based on ticket lifecycle timestamps.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date().toISOString()

    // ── Part 1: Process Follow-ups ──────────────────────────────
    let followUpsSent = 0
    let followUpErrors = 0

    const { data: followUpTickets, error: followUpQueryError } = await supabase
      .from('tickets')
      .select('id, customer_id')
      .lt('follow_up_at', now)
      .in('status', ['open', 'pending'])
      .limit(FOLLOW_UP_BATCH_SIZE)

    if (followUpQueryError) {
      console.error(`[${JOB_NAME}] Error fetching follow-up tickets:`, followUpQueryError)
    }

    for (const ticket of followUpTickets || []) {
      try {
        // Insert follow-up message
        await supabase.from('messages').insert({
          ticket_id: ticket.id,
          sender_type: 'system',
          content:
            "Hi! Just checking in - is there anything else we can help with? If not, we'll close this ticket automatically in a few days.",
        })

        // Log to proactive_outreach_log
        await supabase.from('proactive_outreach_log').insert({
          customer_id: ticket.customer_id,
          ticket_id: ticket.id,
          outreach_type: 'stalled_revival',
          channel: 'internal',
          message_content:
            "Hi! Just checking in - is there anything else we can help with? If not, we'll close this ticket automatically in a few days.",
          trigger_reason: 'Scheduled follow-up reached',
          delivery_status: 'sent',
          delivered_at: now,
        })

        // Clear follow_up_at so we don't repeat
        await supabase
          .from('tickets')
          .update({ follow_up_at: null })
          .eq('id', ticket.id)

        followUpsSent++
      } catch (err) {
        console.error(`[${JOB_NAME}] Error processing follow-up for ticket ${ticket.id}:`, err)
        followUpErrors++
      }
    }

    // ── Part 2: Process Auto-closes ─────────────────────────────
    let autoCloseCount = 0
    let autoCloseErrors = 0

    const { data: autoCloseTickets, error: autoCloseQueryError } = await supabase
      .from('tickets')
      .select('id, customer_id, status')
      .lt('auto_close_at', now)
      .in('status', ['open', 'pending', 'resolved'])
      .limit(AUTO_CLOSE_BATCH_SIZE)

    if (autoCloseQueryError) {
      console.error(`[${JOB_NAME}] Error fetching auto-close tickets:`, autoCloseQueryError)
    }

    for (const ticket of autoCloseTickets || []) {
      try {
        const closingMessage =
          ticket.status === 'resolved'
            ? "Glad we could help! This ticket is now closed. Don't hesitate to reach out if you need anything else."
            : 'This ticket has been automatically resolved due to inactivity. Feel free to reach out anytime if you need more help!'

        // Insert closing message
        await supabase.from('messages').insert({
          ticket_id: ticket.id,
          sender_type: 'system',
          content: closingMessage,
        })

        // Update ticket status and clear lifecycle timestamps
        await supabase
          .from('tickets')
          .update({
            status: 'resolved',
            follow_up_at: null,
            auto_close_at: null,
          })
          .eq('id', ticket.id)

        // Log to proactive_outreach_log
        await supabase.from('proactive_outreach_log').insert({
          customer_id: ticket.customer_id,
          ticket_id: ticket.id,
          outreach_type: 'stalled_revival',
          channel: 'internal',
          message_content: closingMessage,
          trigger_reason: `Auto-close triggered (was ${ticket.status})`,
          delivery_status: 'sent',
          delivered_at: now,
        })

        autoCloseCount++
      } catch (err) {
        console.error(`[${JOB_NAME}] Error auto-closing ticket ${ticket.id}:`, err)
        autoCloseErrors++
      }
    }

    const result = {
      success: true,
      followUpsSent,
      followUpErrors,
      autoCloseCount,
      autoCloseErrors,
    }

    logCronExecution(JOB_NAME, 'completed', result)

    return NextResponse.json(result)
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
