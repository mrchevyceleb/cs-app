import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import { withFallback } from '@/lib/claude/client'
import { sendEmail } from '@/lib/email/client'

const JOB_NAME = 'lifecycle'

const FOLLOW_UP_BATCH_SIZE = 50
const AUTO_CLOSE_BATCH_SIZE = 100
const FOLLOW_UP_AI_TIMEOUT_MS = 5000
const FOLLOW_UP_MESSAGES_LIMIT = 20
const FOLLOW_UP_MESSAGE_MAX_CHARS = 300
const FOLLOW_UP_PROMPT_MAX_CHARS = 4000

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
      .select('id, customer_id, subject, customers:customer_id(email, name)')
      .lt('follow_up_at', now)
      .in('status', ['open', 'pending'])
      .limit(FOLLOW_UP_BATCH_SIZE)

    if (followUpQueryError) {
      console.error(`[${JOB_NAME}] Error fetching follow-up tickets:`, followUpQueryError)
    }

    for (const ticket of followUpTickets || []) {
      try {
        // Fetch recent messages for conversation context
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('sender_type, content')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: false })
          .limit(FOLLOW_UP_MESSAGES_LIMIT)

        const truncatedConversation = (recentMessages || [])
          .reverse()
          .map(m => {
            const sender = m.sender_type === 'customer' ? 'Customer' : 'Nova'
            const content = (m.content || '').replace(/\s+/g, ' ').trim()
            return `${sender}: ${content.slice(0, FOLLOW_UP_MESSAGE_MAX_CHARS)}`
          })
          .join('\n')

        const conversationSummary = truncatedConversation.slice(0, FOLLOW_UP_PROMPT_MAX_CHARS)

        // Generate substantive follow-up with troubleshooting analysis
        let followUpContent: string
        try {
          const aiResponse = await Promise.race([
            withFallback(client =>
              client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 300,
                temperature: 0.3,
                system: `You are Nova, a support agent following up with a customer who hasn't replied. Analyze the conversation to determine if the issue was resolved.

Rules:
- If the issue looks unresolved, provide specific next troubleshooting steps or information
- If you need more info to help, ask a targeted question
- If it looks resolved but unconfirmed, ask if everything is working
- Be concise but substantive (2-4 sentences)
- Reference the specific issue, not generic platitudes
- Don't say "just checking in" or "wanted to circle back"`,
                messages: [{ role: 'user', content: `Ticket subject: ${ticket.subject}\n\nFull conversation:\n${conversationSummary}` }],
              })
            ),
            new Promise<null>(resolve => setTimeout(() => resolve(null), FOLLOW_UP_AI_TIMEOUT_MS)),
          ])

          followUpContent = aiResponse
            ? aiResponse.content.filter(b => b.type === 'text').map(b => ('text' in b ? b.text : '')).join('').trim()
            : ''
        } catch {
          followUpContent = ''
        }

        // Fallback if AI generation failed
        if (!followUpContent) {
          followUpContent = `I wanted to follow up on your ${ticket.subject?.slice(0, 50) || 'issue'}. If you're still experiencing this, could you let me know what's happening now so I can suggest specific next steps?`
        }

        // Insert follow-up message in widget
        await supabase.from('messages').insert({
          ticket_id: ticket.id,
          sender_type: 'ai',
          content: followUpContent,
          metadata: { type: 'follow_up' },
        })

        // Send email follow-up if customer has email
        const customerData = ticket.customers as unknown as { email: string | null; name: string | null } | null
        const customerEmail = customerData?.email
        const customerName = customerData?.name

        if (customerEmail) {
          const emailGreeting = customerName ? `Hey ${customerName}` : 'Hey there'
          await sendEmail({
            to: customerEmail,
            subject: `Re: ${ticket.subject || 'Your R-Link support request'}`,
            html: `<p>${emailGreeting},</p><p>${followUpContent}</p><p>Just reply to this email and I'll pick it right back up.</p><p>- Nova, R-Link Support</p>`,
            text: `${emailGreeting},\n\n${followUpContent}\n\nJust reply to this email and I'll pick it right back up.\n\n- Nova, R-Link Support`,
          })
        }

        // Log to proactive_outreach_log
        await supabase.from('proactive_outreach_log').insert({
          customer_id: ticket.customer_id,
          ticket_id: ticket.id,
          outreach_type: 'stalled_revival',
          channel: customerEmail ? 'email' : 'internal',
          message_content: followUpContent,
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
          sender_type: 'ai',
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
