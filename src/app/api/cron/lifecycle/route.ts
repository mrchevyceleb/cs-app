import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import { withFallback } from '@/lib/claude/client'
import { sendEmail } from '@/lib/email/client'
import { getUnsubscribeUrl, markdownToEmailHtml } from '@/lib/email/templates'

const JOB_NAME = 'lifecycle'

const FOLLOW_UP_BATCH_SIZE = 50
const AUTO_CLOSE_BATCH_SIZE = 100
const FOLLOW_UP_AI_TIMEOUT_MS = 5000
const FOLLOW_UP_MESSAGES_LIMIT = 20
const FOLLOW_UP_MESSAGE_MAX_CHARS = 300
const FOLLOW_UP_PROMPT_MAX_CHARS = 4000

/**
 * Graduated follow-up intervals (hours after previous follow-up):
 * Follow-up 1: set on ticket creation (priority-based: 4h/8h/24h/48h)
 * Follow-up 2: 48h after follow-up 1
 * Follow-up 3: 48h after follow-up 2 (warns about closing)
 * Auto-close:  24h after follow-up 3
 */
const FOLLOW_UP_2_HOURS = 48
const FOLLOW_UP_3_HOURS = 48
const AUTO_CLOSE_AFTER_FINAL_HOURS = 24

/** AI prompts for each follow-up stage */
const FOLLOW_UP_PROMPTS: Record<number, string> = {
  0: `You are Nova, a support agent following up with a customer who hasn't replied. Analyze the conversation to determine if the issue was resolved.

Rules:
- If the issue looks unresolved, provide specific next troubleshooting steps or information
- If you need more info to help, ask a targeted question
- If it looks resolved but unconfirmed, ask if everything is working
- Be concise but substantive (2-4 sentences)
- Reference the specific issue, not generic platitudes
- Don't say "just checking in" or "wanted to circle back"
- NEVER use em dashes`,

  1: `You are Nova, a support agent sending a second follow-up to a customer who hasn't replied to your previous messages. Keep it brief and casual.

Rules:
- Acknowledge this is a second follow-up without being pushy
- Ask if they got the issue figured out or if they still need help
- Keep it to 1-2 sentences max
- Casual, friendly tone
- NEVER use em dashes

Good example: "Hey, just seeing if you got this sorted out! If you're still stuck on [specific issue], happy to dig in further."`,

  2: `You are Nova, a support agent sending a final follow-up to a customer. This is the third message without a reply, so you're letting them know the ticket will be closed soon.

Rules:
- Let them know you'll be closing the ticket soon if you don't hear back
- Make it clear they can always open a new ticket or reply to reopen
- Keep it to 2-3 sentences
- Friendly, not guilt-trippy
- NEVER use em dashes

Good example: "Looks like you might be all set! I'm going to go ahead and close this ticket out, but if anything comes up with [specific issue], just reply here or reach out anytime and we'll pick right back up."`,
}

/**
 * GET /api/cron/lifecycle
 * Graduated follow-ups (3 stages) then auto-close.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date().toISOString()

    // ── Part 1: Process Follow-ups (3 graduated stages) ──────────
    let followUpsSent = 0
    let followUpErrors = 0

    const { data: followUpTickets, error: followUpQueryError } = await supabase
      .from('tickets')
      .select('id, customer_id, subject, follow_up_count, customers:customer_id(email, name, email_opt_out)')
      .lt('follow_up_at', now)
      .in('status', ['open', 'pending'])
      .lt('follow_up_count', 3)
      .limit(FOLLOW_UP_BATCH_SIZE)

    if (followUpQueryError) {
      console.error(`[${JOB_NAME}] Error fetching follow-up tickets:`, followUpQueryError)
    }

    for (const ticket of followUpTickets || []) {
      try {
        const stage = (ticket as any).follow_up_count ?? 0

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

        // Generate follow-up with stage-appropriate prompt
        let followUpContent: string
        try {
          const systemPrompt = FOLLOW_UP_PROMPTS[stage] || FOLLOW_UP_PROMPTS[0]
          const aiResponse = await Promise.race([
            withFallback(client =>
              client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                temperature: 0.3,
                system: systemPrompt,
                messages: [{ role: 'user', content: `Ticket subject: ${ticket.subject}\nFollow-up stage: ${stage + 1} of 3\n\nFull conversation:\n${conversationSummary}` }],
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

        // Fallback messages per stage
        if (!followUpContent) {
          if (stage === 0) {
            followUpContent = `I wanted to follow up on your ${ticket.subject?.slice(0, 50) || 'issue'}. If you're still experiencing this, could you let me know what's happening now so I can suggest specific next steps?`
          } else if (stage === 1) {
            followUpContent = `Just seeing if you got this figured out! If you're still stuck, happy to dig in further.`
          } else {
            followUpContent = `Looks like you might be all set! I'm going to close this ticket out soon, but if anything comes up, just reply here or reach out anytime.`
          }
        }

        // Insert follow-up message
        await supabase.from('messages').insert({
          ticket_id: ticket.id,
          sender_type: 'ai',
          content: followUpContent,
          metadata: { type: 'follow_up', follow_up_stage: stage + 1 },
        })

        // Send email follow-up if customer has email and hasn't opted out
        const customerData = ticket.customers as unknown as { email: string | null; name: string | null; email_opt_out: boolean } | null
        const customerEmail = customerData?.email
        const customerName = customerData?.name
        const emailOptOut = customerData?.email_opt_out

        if (customerEmail && !emailOptOut) {
          const firstName = customerName?.split(' ')[0] || null
          const emailGreeting = firstName ? `Hey ${firstName}` : 'Hey there'
          const unsubscribeUrl = getUnsubscribeUrl(ticket.customer_id)
          await sendEmail({
            to: customerEmail,
            subject: `Re: ${ticket.subject || 'Your R-Link support request'}`,
            html: `<p>${emailGreeting},</p>${markdownToEmailHtml(followUpContent)}<p>Just reply to this email and I'll pick it right back up.</p><p>- Nova, R-Link Support</p><p style="font-size: 11px; color: #94A3B8; margin-top: 24px;"><a href="${unsubscribeUrl}" style="color: #94A3B8;">Unsubscribe from proactive emails</a></p>`,
            text: `${emailGreeting},\n\n${followUpContent}\n\nJust reply to this email and I'll pick it right back up.\n\n- Nova, R-Link Support\n\nUnsubscribe: ${unsubscribeUrl}`,
            unsubscribeUrl,
          })
        }

        // Log to proactive_outreach_log
        await supabase.from('proactive_outreach_log').insert({
          customer_id: ticket.customer_id,
          ticket_id: ticket.id,
          outreach_type: 'stalled_revival',
          channel: (customerEmail && !emailOptOut) ? 'email' : 'internal',
          message_content: followUpContent,
          trigger_reason: `Follow-up ${stage + 1} of 3`,
          delivery_status: 'sent',
          delivered_at: now,
        })

        // Advance to next stage
        const newCount = stage + 1
        const nextFollowUpHours = newCount === 1 ? FOLLOW_UP_2_HOURS
          : newCount === 2 ? FOLLOW_UP_3_HOURS
          : 0 // stage 3 = no more follow-ups

        const updateData: Record<string, unknown> = {
          follow_up_count: newCount,
        }

        if (newCount < 3) {
          // Schedule next follow-up
          const nextDate = new Date()
          nextDate.setHours(nextDate.getHours() + nextFollowUpHours)
          updateData.follow_up_at = nextDate.toISOString()
        } else {
          // Final follow-up sent — schedule auto-close
          const closeDate = new Date()
          closeDate.setHours(closeDate.getHours() + AUTO_CLOSE_AFTER_FINAL_HOURS)
          updateData.follow_up_at = null
          updateData.auto_close_at = closeDate.toISOString()
        }

        await supabase
          .from('tickets')
          .update(updateData)
          .eq('id', ticket.id)

        followUpsSent++
        console.log(`[${JOB_NAME}] Sent follow-up ${newCount}/3 for ticket ${ticket.id}`)
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
