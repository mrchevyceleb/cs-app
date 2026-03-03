import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withFallback } from '@/lib/claude/client'
import type { Message } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/tickets/[id]/draft
 * Generate an AI-drafted reply for a human agent to review.
 * Reads the full conversation history and produces a contextual response.
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

    const conversationHistory = ((messages || []) as Message[])
      .filter((m: Message) => {
        const meta = m.metadata as Record<string, unknown> | null
        return !meta?.is_internal
      })
      .map((m: Message) => {
        const role = m.sender_type === 'customer' ? 'Customer' : 'Support'
        return `${role}: ${m.content}`
      })
      .join('\n\n')

    const customer = ticket.customer as { name?: string; email?: string } | null
    const customerName = customer?.name || customer?.email?.split('@')[0] || 'the customer'

    const response = await withFallback(client =>
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: `You are a support agent drafting a reply to a customer. Write a helpful, warm, professional response based on the conversation history.

Rules:
- Write as a human support agent, not a bot.
- Be concise but thorough. Match the complexity of the issue.
- If the conversation already has AI responses, build on them naturally. Don't repeat what was already said.
- If the customer's issue seems resolved, check in and offer to close.
- If more info is needed, ask specific follow-up questions.
- Don't include a greeting line (no "Hi [name]") -- the agent can add their own.
- Don't sign off with a name -- the agent will handle that.
- Use plain language. No corporate jargon.
- Output ONLY the message body, nothing else.`,
        messages: [{
          role: 'user',
          content: `Ticket subject: ${ticket.subject}
Priority: ${ticket.priority}
Status: ${ticket.status}
Customer: ${customerName}

Conversation:
${conversationHistory}

Draft a reply for the support agent to send:`,
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
