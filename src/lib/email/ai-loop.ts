/**
 * Email AI Loop
 * Processes inbound emails through the AI agent and auto-replies as "Nova".
 * After 3 AI exchanges without resolution, escalates to human queue.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { agenticSolve } from '@/lib/ai-agent/engine'
import { sendAgentReplyEmail } from './send'
import { emailConfig } from './client'
import { notifyAgentsOfCustomerReply } from '@/lib/notifications/customer-reply'
import { withFallback } from '@/lib/claude/client'

const AI_EXCHANGE_LIMIT = 3

/**
 * Extract clean email body from AI output.
 *
 * Two-layer approach:
 * 1. Try to extract content from <email_body> XML tags (fast, deterministic)
 * 2. Run Haiku sanity check to strip any remaining reasoning, greetings,
 *    sign-offs, or artifacts the template already provides.
 *
 * Haiku is ~200ms and very cheap — reliable safety net.
 */
async function extractEmailBody(raw: string): Promise<string> {
  // Layer 1: XML tag extraction
  const tagMatch = raw.match(/<email_body>([\s\S]*?)<\/email_body>/)
  const extracted = tagMatch ? tagMatch[1].trim() : raw.trim()

  // Layer 2: Haiku sanity check — clean any remaining artifacts
  try {
    const cleaned = await withFallback(client =>
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        temperature: 0,
        system: `You are an email content cleaner. You receive raw AI-generated email content that may contain artifacts. Your job is to output ONLY the clean customer-facing email body.

Remove ALL of the following if present:
- Internal reasoning/thinking (e.g., "I have enough context to...", "Let me craft...")
- "Subject:" lines
- Greeting lines like "Hi [Name]," or "Hello [Name]," (the email template adds its own greeting)
- Sign-off blocks like "Best, Nova", "Talk soon, Nova", "R-Link Support Team" (the template adds its own)
- Horizontal rules (---) used as separators

Keep ONLY the core message content — the helpful response to the customer.

Output the cleaned content and NOTHING else. No commentary, no explanation.`,
        messages: [{ role: 'user', content: extracted }],
      })
    )

    const text = cleaned.content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text : ''))
      .join('')
      .trim()

    if (text.length > 0) {
      console.log(`[Email AI] Haiku cleaned content: ${raw.length} → ${text.length} chars`)
      return text
    }
  } catch (err) {
    console.error('[Email AI] Haiku sanity check failed, using extracted content:', err)
  }

  // Fallback: return tag-extracted content (or raw if no tags)
  return extracted
}

let _supabase: SupabaseClient<Database> | null = null
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.SB_SERVICE_ROLE_KEY!
    )
  }
  return _supabase
}

interface EmailAIResult {
  action: 'responded' | 'escalated' | 'error'
  error?: string
}

/**
 * Process an email ticket through the AI agent.
 * - If under 3 AI exchanges: AI processes and replies via email as Nova
 * - If 3+ exchanges: auto-escalates to human queue
 */
export async function processEmailWithAI(
  ticketId: string,
  messageContent: string,
  customerId: string,
  customerEmail: string,
  customerName: string | null
): Promise<EmailAIResult> {
  const supabase = getSupabase()

  try {
    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('[Email AI] Ticket not found:', ticketId)
      return { action: 'error', error: 'Ticket not found' }
    }

    // Check if ticket is already escalated, resolved, or in human queue
    // Once a human agent is handling a ticket, AI should never intervene
    if (ticket.status === 'escalated' || ticket.status === 'resolved' || ticket.queue_type === 'human') {
      console.log(`[Email AI] Skipping - ticket ${ticketId} is ${ticket.status} (queue: ${ticket.queue_type})`)
      return { action: 'error', error: `Ticket is in ${ticket.queue_type} queue` }
    }

    // Check exchange count - escalate after limit
    if (ticket.ai_exchange_count >= AI_EXCHANGE_LIMIT) {
      console.log(`[Email AI] Exchange limit reached (${ticket.ai_exchange_count}/${AI_EXCHANGE_LIMIT}), escalating ticket ${ticketId}`)

      await supabase
        .from('tickets')
        .update({
          status: 'escalated',
          queue_type: 'human',
          priority: ticket.priority === 'low' || ticket.priority === 'normal' ? 'high' : ticket.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)

      // Save internal note about escalation
      await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'ai',
          content: `Auto-escalated after ${AI_EXCHANGE_LIMIT} AI email exchanges without resolution. Customer: ${customerName || customerEmail}. Review conversation history for context.`,
          metadata: { is_internal: true, escalation_reason: 'exchange_limit_reached' } as any,
        })

      // Send contextual acknowledgment email to customer
      // Use Haiku to generate a brief, contextual message based on the conversation
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (customer?.email) {
        let ackContent = "I've been working on this with you and I want to make sure you get the best help possible. I'm bringing in a senior team member who can take a closer look. They'll follow up with you by email shortly."
        try {
          const ackResult = await withFallback(client =>
            client.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              temperature: 0.3,
              system: `You are Nova, a support specialist. The customer's issue could not be resolved after ${AI_EXCHANGE_LIMIT} email exchanges and is being escalated to a human agent. Write a brief, warm acknowledgment (2-3 sentences max) that:
- References their specific issue naturally (don't just repeat the subject line)
- Lets them know you're bringing in a senior team member to help
- Assures them someone will follow up shortly by email
- Does NOT include a greeting or sign-off (template adds those)
- Does NOT use em dashes`,
              messages: [{ role: 'user', content: `Ticket subject: ${ticket.subject}\nCustomer's latest message: ${messageContent.slice(0, 300)}\nConversation summary: Customer had ${AI_EXCHANGE_LIMIT} exchanges with AI about this issue without resolution.` }],
            })
          )
          const ackText = ackResult.content
            .filter(b => b.type === 'text')
            .map(b => ('text' in b ? b.text : ''))
            .join('')
            .trim()
          if (ackText.length > 0) ackContent = ackText
        } catch (err) {
          console.error('[Email AI] Haiku ack generation failed, using default:', err)
        }

        const { data: ackMessage } = await supabase
          .from('messages')
          .insert({
            ticket_id: ticketId,
            sender_type: 'ai',
            content: ackContent,
            source: 'email',
            metadata: { escalation_ack: true } as any,
          })
          .select('*')
          .single()

        if (ackMessage) {
          try {
            await sendAgentReplyEmail(
              ticket as any,
              ackMessage as any,
              customer as any,
              undefined,
              emailConfig.aiFrom,
              { isAI: true }
            )
          } catch (emailErr) {
            console.error('[Email AI] Failed to send escalation ack email:', emailErr)
          }
        }
      }

      // Notify agents with escalation styling
      await notifyAgentsOfCustomerReply({
        ticketId,
        ticketSubject: ticket.subject,
        customerName,
        customerEmail,
        messagePreview: messageContent.slice(0, 150),
        channel: 'email',
        isEscalation: true,
        escalationReason: `Nova could not resolve after ${AI_EXCHANGE_LIMIT} email exchanges.`,
      }).catch(err => console.error('[Email AI] Escalation notification error:', err))

      return { action: 'escalated' }
    }

    // Fetch previous messages for conversation context (exclude internal notes)
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('sender_type, content, metadata')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(20)

    const conversationHistory = (previousMessages || [])
      .slice(0, -1) // Exclude the latest message (it's the one being processed)
      .filter(m => {
        // Exclude internal notes from AI context
        const meta = m.metadata as Record<string, unknown> | null
        return !meta?.is_internal
      })
      .filter(m => m.sender_type === 'customer' || m.sender_type === 'ai')
      .map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

    // Fetch customer for the agent
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (!customer) {
      return { action: 'error', error: 'Customer not found' }
    }

    // Run AI agent (non-streaming for email)
    const agentResult = await agenticSolve({
      message: messageContent,
      ticket: ticket as any,
      customer: customer as any,
      channel: 'email',
      previousMessages: conversationHistory,
    })

    // Handle escalation from agent
    if (agentResult.type === 'escalation' || agentResult.type === 'timeout') {
      console.log(`[Email AI] Agent escalated ticket ${ticketId}: ${agentResult.escalationReason || 'timeout'}`)

      await supabase
        .from('tickets')
        .update({
          status: 'escalated',
          queue_type: 'human',
          priority: ticket.priority === 'low' || ticket.priority === 'normal' ? 'high' : ticket.priority,
          ai_confidence: agentResult.confidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)

      // Save escalation summary as internal note
      await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'ai',
          content: agentResult.escalationSummary || agentResult.content,
          metadata: {
            is_internal: true,
            escalation_reason: agentResult.escalationReason,
            agent_result_type: agentResult.type,
          } as any,
        })

      // Send acknowledgment email to customer so they're not left waiting
      const ackContent = "Thanks for reaching out. I've flagged your request for our team to take a closer look. Someone will follow up with you by email shortly."
      const { data: ackMessage } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'ai',
          content: ackContent,
          source: 'email',
          metadata: { escalation_ack: true } as any,
        })
        .select('*')
        .single()

      if (ackMessage) {
        try {
          await sendAgentReplyEmail(
            ticket as any,
            ackMessage as any,
            customer as any,
            undefined,
            emailConfig.aiFrom,
            { isAI: true }
          )
        } catch (emailErr) {
          console.error('[Email AI] Failed to send escalation ack email:', emailErr)
        }
      }

      // Log agent session
      await logAgentSession(ticketId, agentResult)

      // Now that it's in human queue, notify agents with escalation styling
      await notifyAgentsOfCustomerReply({
        ticketId,
        ticketSubject: ticket.subject,
        customerName,
        customerEmail,
        messagePreview: messageContent.slice(0, 150),
        channel: 'email',
        isEscalation: true,
        escalationReason: agentResult.escalationReason || 'Nova determined this needs human attention.',
      }).catch(err => console.error('[Email AI] Escalation notification error:', err))

      return { action: 'escalated' }
    }

    // Increment exchange count (optimistic lock to prevent race condition)
    // Must happen BEFORE saving AI message to avoid orphaned messages on lock failure
    const { data: updated } = await supabase
      .from('tickets')
      .update({
        ai_exchange_count: ticket.ai_exchange_count + 1,
        ai_handled: true,
        ai_confidence: agentResult.confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('ai_exchange_count', ticket.ai_exchange_count)
      .select('id')
      .single()

    if (!updated) {
      // Another concurrent request already incremented - skip to avoid duplicate
      console.log(`[Email AI] Skipping duplicate response for ticket ${ticketId} (exchange count race)`)
      return { action: 'responded' }
    }

    // Lock acquired - now safe to save AI message and send email
    const cleanContent = await extractEmailBody(agentResult.content)
    const { data: aiMessage } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'ai',
        content: cleanContent,
        source: 'email',
        confidence: Math.round(agentResult.confidence * 100),
        metadata: {
          agent_mode: true,
          kb_article_ids: agentResult.kbArticleIds,
          web_searches: agentResult.webSearchCount,
          total_tool_calls: agentResult.totalToolCalls,
          duration_ms: agentResult.durationMs,
        } as any,
      })
      .select('*')
      .single()

    // Send email reply as Nova
    if (aiMessage) {
      await sendAgentReplyEmail(
        ticket as any,
        aiMessage as any,
        customer as any,
        undefined,
        emailConfig.aiFrom,
        { isAI: true }
      )
    }

    // Log agent session
    await logAgentSession(ticketId, agentResult, aiMessage?.id)

    console.log(`[Email AI] Responded to ticket ${ticketId} (exchange ${ticket.ai_exchange_count + 1}/${AI_EXCHANGE_LIMIT})`)

    return { action: 'responded' }
  } catch (error) {
    console.error('[Email AI] Error processing ticket:', ticketId, error)
    return { action: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function logAgentSession(
  ticketId: string,
  result: import('@/lib/ai-agent/types').AgentResult,
  messageId?: string
) {
  const inputCost = (result.inputTokens / 1_000_000) * 3
  const outputCost = (result.outputTokens / 1_000_000) * 15

  await getSupabase()
    .from('ai_agent_sessions')
    .insert({
      ticket_id: ticketId,
      message_id: messageId || null,
      channel: 'email',
      result_type: result.type,
      total_tool_calls: result.totalToolCalls,
      tool_calls_detail: result.toolCallsDetail as any,
      kb_articles_used: result.kbArticleIds,
      web_searches_performed: result.webSearchCount,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      estimated_cost_usd: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
      total_duration_ms: result.durationMs,
      escalation_reason: result.escalationReason,
      escalation_summary: result.escalationSummary,
    } as any)
}
