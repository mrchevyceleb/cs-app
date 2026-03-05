import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { withFallback } from '@/lib/claude/client'
import type { Message, Database } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Service role client for querying ai_agent_sessions (RLS-protected)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createSupabaseClient<Database>(url, serviceKey)
}

// Escalation acknowledgment patterns to filter from conversation history.
// These are the canned messages Nova sends when it escalates; they add no
// diagnostic value and cause the draft model to parrot them.
const ESCALATION_ACK_PATTERNS = [
  /I've flagged this for our team/i,
  /our team will email you shortly/i,
  /I'm bringing in a senior team member/i,
  /connecting to support team/i,
  /transferred.*to.*team/i,
  /escalat(ed|ing) (this|your)/i,
  /Done\s*--\s*our team will/i,
]

function isEscalationAckMessage(content: string): boolean {
  return ESCALATION_ACK_PATTERNS.some(pattern => pattern.test(content))
}

function hasEscalationAckInThread(messages: Message[]): boolean {
  return messages.some((message: Message) => {
    if (message.sender_type === 'customer') return false
    return isEscalationAckMessage(message.content || '')
  })
}

/** Standard (non-escalated) system prompt */
function getStandardSystemPrompt(): string {
  return `You are a support agent drafting a reply to a customer. Write a helpful, warm, professional response based on the conversation history.

Rules:
- Write as a human support agent, not a bot.
- Be concise but thorough. Match the complexity of the issue.
- If the conversation already has AI responses, build on them naturally. Don't repeat what was already said.
- PAY CLOSE ATTENTION to who sent the last message:
  - If support sent the last message (especially a question), the customer has NOT replied yet. Your draft is a follow-up. Gently check in. Reference the specific question that was asked. Do NOT say "thanks for checking back" or "thanks for reaching out" because the customer didn't.
  - If the customer sent the last message, your draft is a direct response to what they said.
- If the customer's issue seems resolved, check in and offer to close.
- If more info is needed, ask specific follow-up questions.
- Don't include a greeting line (no "Hi [name]") -- the agent can add their own.
- Don't sign off with a name -- the agent will handle that.
- Use plain language. No corporate jargon.
- NEVER use em dashes. Use commas, periods, or parentheses instead.
- Output ONLY the message body, nothing else.`
}

/** Escalation-aware system prompt for tickets handed off from AI to human */
function getEscalationSystemPrompt(escalationReason?: string | null, escalationSummary?: string | null): string {
  const escalationContext = (escalationReason || escalationSummary)
    ? `\n\nINTERNAL ESCALATION NOTES (not visible to customer):
- Reason for escalation: ${escalationReason || 'Not specified'}
- AI summary of the situation: ${escalationSummary || 'Not specified'}`
    : ''

  return `You are a senior support agent taking over a ticket that was previously handled by an AI assistant (Nova). The AI attempted to help but escalated to the human queue because it could not fully resolve the issue.

Your job is to draft the FIRST human response on this ticket. This is your chance to make a strong impression and actually solve the customer's problem.
${escalationContext}

Rules:
- You are a real human agent now, not Nova, not a bot. Write with natural authority.
- READ THE FULL CONVERSATION CAREFULLY. Understand what the customer originally asked, what the AI already tried, and where it fell short.
- DO NOT repeat or paraphrase the AI's escalation acknowledgment message ("flagged for our team", "team will follow up", etc.). That message is just a handoff notice and has zero value. Ignore it entirely.
- DO NOT say things like "I see this was escalated" or "I'm taking over from our AI". The customer does not care about internal routing. Just help them.
- DO NOT ask whether someone already reached out ("did anyone reach out?", "did you get our email?", "have you heard back?"). Those handoff check-ins are low-value and should not be your first human reply.
- Start with a brief, genuine acknowledgment of the situation (1 sentence max), then move directly into solving the problem.
- If you can provide a concrete answer or solution based on the conversation, do it. Be specific.
- If you need more information to solve the problem, ask targeted diagnostic questions. Be specific about what you need and why.
- If the customer asked for a human but did not provide issue details, ask one concise question to capture the core problem you need to solve.
- If the customer expressed frustration, acknowledge it briefly and naturally, then pivot to action. Do not over-apologize.
- Don't include a greeting line (no "Hi [name]") -- the agent can add their own.
- Don't sign off with a name -- the agent will handle that.
- Use plain language. No corporate jargon.
- NEVER use em dashes. Use commas, periods, or parentheses instead.
- Output ONLY the message body, nothing else.`
}

/**
 * POST /api/tickets/[id]/draft
 * Generate an AI-drafted reply for a human agent to review.
 * Reads the full conversation history and produces a contextual response.
 * For escalated tickets, generates a substantive first human response instead
 * of parroting the AI's escalation acknowledgment.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: ticketId } = await params
    const supabase = await createClient()

    // Verify agent is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch ticket with customer info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, customer:customers(name, email, metadata)')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Fetch conversation history (exclude internal notes)
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, content, metadata, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(30)

    const visibleMessages = ((messages || []) as Message[])
      .filter((m: Message) => {
        const meta = m.metadata as Record<string, unknown> | null
        return !meta?.is_internal
      })

    // Detect escalated intent from ticket state and/or handoff language in thread.
    // Some threads contain escalation acknowledgments before status/queue are updated.
    const isEscalatedByState = ticket.status === 'escalated' || ticket.queue_type === 'human'
    const isEscalatedByConversation = hasEscalationAckInThread(visibleMessages)
    const isEscalated = isEscalatedByState || isEscalatedByConversation

    // Fetch escalation context from ai_agent_sessions if ticket is escalated
    let escalationReason: string | null = null
    let escalationSummary: string | null = null

    if (isEscalated) {
      try {
        const serviceClient = getServiceClient()
        const { data: session } = await serviceClient
          .from('ai_agent_sessions')
          .select('escalation_reason, escalation_summary')
          .eq('ticket_id', ticketId)
          .eq('result_type', 'escalation')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (session) {
          escalationReason = session.escalation_reason
          escalationSummary = session.escalation_summary
        }
      } catch {
        // Non-critical: continue without escalation context
        console.warn('[Draft API] Could not fetch escalation context for ticket', ticketId)
      }
    }

    // For escalated tickets, filter out the AI's escalation acknowledgment messages
    // so the draft model focuses on the real problem, not the handoff boilerplate
    const messagesForDraft = isEscalated
      ? visibleMessages.filter((m: Message) => {
          if (m.sender_type === 'customer') return true
          return !isEscalationAckMessage(m.content || '')
        })
      : visibleMessages

    const conversationHistory = messagesForDraft
      .map((m: Message) => {
        const role = m.sender_type === 'customer' ? 'Customer' : 'Support (AI)'
        return `${role}: ${m.content}`
      })
      .join('\n\n')

    // Determine who sent the last relevant message to give the AI critical context.
    // For escalations we intentionally ignore handoff boilerplate.
    const lastMessage = messagesForDraft[messagesForDraft.length - 1] || visibleMessages[visibleMessages.length - 1]
    const lastSender = lastMessage?.sender_type === 'customer' ? 'customer' : 'support'
    const waitingOnCustomer = lastSender !== 'customer'

    const customer = ticket.customer as { name?: string; email?: string } | null
    const customerName = customer?.name || customer?.email?.split('@')[0] || 'the customer'

    // Choose system prompt based on ticket state
    const systemPrompt = isEscalated
      ? getEscalationSystemPrompt(escalationReason, escalationSummary)
      : getStandardSystemPrompt()

    // Build the user message with appropriate framing
    const userMessageContent = isEscalated
      ? `Ticket subject: ${ticket.subject}
Priority: ${ticket.priority}
Status: ${ticket.status}
Customer: ${customerName}

This ticket was escalated from the AI queue to the human queue. The AI (Nova) could not resolve it. You are drafting the first human agent response.
Last relevant message was from: ${lastSender}${waitingOnCustomer ? ' (customer has NOT replied yet)' : ''}

Full conversation (AI escalation ack messages removed):
${conversationHistory}

Draft a substantive reply that actually addresses the customer's problem:`
      : `Ticket subject: ${ticket.subject}
Priority: ${ticket.priority}
Status: ${ticket.status}
Customer: ${customerName}
Last message was from: ${lastSender}${waitingOnCustomer ? ' (customer has NOT replied yet)' : ''}

Conversation:
${conversationHistory}

Draft a reply for the support agent to send:`

    const draftModel = isEscalated
      ? 'claude-sonnet-4-6'
      : 'claude-haiku-4-5-20251001'

    const response = await withFallback(client =>
      client.messages.create({
        model: draftModel,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userMessageContent,
        }],
      })
    )

    const draft = response.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { type: string; text?: string }) => ('text' in b ? b.text : ''))
      .join('')
      .trim()

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('[Draft API] Error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
