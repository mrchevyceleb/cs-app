import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import type { Ticket, Customer } from '@/types/database'

const JOB_NAME = 'post-resolution-checkin'

// Configuration
const DAYS_AFTER_RESOLUTION = 5 // Check in 5 days after resolution
const MAX_CHECKINS_PER_RUN = 50
const EXCLUDE_AI_HANDLED = false // Whether to exclude AI-handled tickets

interface ResolvedTicket {
  ticket: Ticket & { customer: Customer }
  daysSinceResolution: number
}

/**
 * Check if we've already sent a check-in for this ticket
 */
async function hasExistingCheckin(
  supabase: ReturnType<typeof getServiceClient>,
  ticketId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('proactive_outreach_log')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('outreach_type', 'post_resolution_checkin')
    .limit(1)

  return (data?.length || 0) > 0
}

/**
 * Generate a friendly check-in message
 */
function generateCheckinMessage(ticket: Ticket, customerName: string | null): string {
  const name = customerName || 'there'

  return `Hi ${name},

We recently helped you with "${ticket.subject}" and wanted to check in.

Is everything still working well? If you've encountered any new issues or have questions, please don't hesitate to reach out - we're here to help!

If everything is going smoothly, no need to reply. We're just making sure you're taken care of.

Best regards,
Support Team`
}

/**
 * POST /api/cron/post-resolution-checkin
 * Send follow-up messages to customers a few days after resolution
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()

    // Calculate the date range for tickets resolved exactly DAYS_AFTER_RESOLUTION days ago
    // We use a 24-hour window to catch tickets resolved on that day
    const targetDate = new Date(now.getTime() - DAYS_AFTER_RESOLUTION * 24 * 60 * 60 * 1000)
    const targetDateStart = new Date(targetDate)
    targetDateStart.setHours(0, 0, 0, 0)
    const targetDateEnd = new Date(targetDate)
    targetDateEnd.setHours(23, 59, 59, 999)

    // Find tickets that were resolved on the target date
    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('status', 'resolved')
      .gte('updated_at', targetDateStart.toISOString())
      .lte('updated_at', targetDateEnd.toISOString())
      .order('updated_at', { ascending: true })
      .limit(200)

    // Optionally exclude AI-handled tickets
    if (EXCLUDE_AI_HANDLED) {
      query = query.eq('ai_handled', false)
    }

    const { data: resolvedTickets, error: ticketsError } = await query

    if (ticketsError) {
      logCronExecution(JOB_NAME, 'failed', { error: ticketsError.message })
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    if (!resolvedTickets || resolvedTickets.length === 0) {
      logCronExecution(JOB_NAME, 'completed', {
        eligibleTickets: 0,
        checkinsSent: 0,
        targetDate: targetDateStart.toISOString(),
      })
      return NextResponse.json({
        success: true,
        eligibleTickets: 0,
        checkinsSent: 0,
      })
    }

    logCronExecution(JOB_NAME, 'started', {
      eligibleTicketsFound: resolvedTickets.length,
      targetDate: targetDateStart.toISOString(),
    })

    let checkinsSent = 0
    let skippedExisting = 0
    let skippedNoEmail = 0
    let errors = 0

    // Process resolved tickets
    for (const ticket of resolvedTickets as (Ticket & { customer: Customer })[]) {
      if (checkinsSent >= MAX_CHECKINS_PER_RUN) break

      try {
        // Skip if we've already sent a check-in
        if (await hasExistingCheckin(supabase, ticket.id)) {
          skippedExisting++
          continue
        }

        const customer = ticket.customer
        if (!customer) continue

        // Skip if no email
        if (!customer.email) {
          skippedNoEmail++
          continue
        }

        // Generate check-in message
        const checkinMessage = generateCheckinMessage(ticket, customer.name)

        // Log the outreach first
        const { data: outreachLog, error: logError } = await supabase
          .from('proactive_outreach_log')
          .insert({
            customer_id: customer.id,
            ticket_id: ticket.id,
            outreach_type: 'post_resolution_checkin',
            channel: 'email',
            message_content: checkinMessage,
            message_subject: `Following up on your support request`,
            trigger_reason: `Resolved ${DAYS_AFTER_RESOLUTION} days ago`,
            trigger_data: {
              days_since_resolution: DAYS_AFTER_RESOLUTION,
              original_resolved_at: ticket.updated_at,
              ai_handled: ticket.ai_handled,
            },
            delivery_status: 'pending',
          })
          .select()
          .single()

        if (logError) {
          console.error(`[${JOB_NAME}] Error logging outreach for ticket ${ticket.id}:`, logError)
          errors++
          continue
        }

        // Send the email
        try {
          const { sendEmail } = await import('@/lib/email/client')
          const { generatePortalToken } = await import('@/lib/portal/auth')

          // Generate portal token for easy access
          const portalToken = await generatePortalToken(customer.id, ticket.id)
          const portalUrl = portalToken
            ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/tickets/${ticket.id}?token=${portalToken}`
            : null

          const emailContent = portalUrl
            ? `${checkinMessage}\n\nYou can also view your ticket history here: ${portalUrl}`
            : checkinMessage

          const result = await sendEmail({
            to: customer.email,
            subject: `Following up on your support request - #${ticket.id.slice(0, 8).toUpperCase()}`,
            text: emailContent,
            html: `<div style="font-family: sans-serif; line-height: 1.6;">
              ${checkinMessage.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
              ${portalUrl ? `<p><a href="${portalUrl}" style="color: #3B82F6;">View your ticket history</a></p>` : ''}
            </div>`,
            tags: [
              { name: 'type', value: 'post_resolution_checkin' },
              { name: 'ticket_id', value: ticket.id },
            ],
          })

          // Update outreach log with result
          await supabase
            .from('proactive_outreach_log')
            .update({
              delivery_status: result.success ? 'sent' : 'failed',
              delivered_at: result.success ? now.toISOString() : null,
              error_message: result.error || null,
            })
            .eq('id', outreachLog.id)

          if (result.success) {
            checkinsSent++
          } else {
            errors++
          }
        } catch (emailError) {
          console.error(`[${JOB_NAME}] Error sending email for ticket ${ticket.id}:`, emailError)

          // Update outreach log with error
          await supabase
            .from('proactive_outreach_log')
            .update({
              delivery_status: 'failed',
              error_message: emailError instanceof Error ? emailError.message : 'Email send failed',
            })
            .eq('id', outreachLog.id)

          errors++
        }
      } catch (err) {
        console.error(`[${JOB_NAME}] Error processing ticket ${ticket.id}:`, err)
        errors++
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      eligibleTickets: resolvedTickets.length,
      checkinsSent,
      skippedExisting,
      skippedNoEmail,
      errors,
    })

    return NextResponse.json({
      success: true,
      eligibleTickets: resolvedTickets.length,
      checkinsSent,
      skippedExisting,
      skippedNoEmail,
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
