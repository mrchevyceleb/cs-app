import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWidgetSession } from '@/lib/widget/auth'
import { getAgentConfig } from '@/lib/ai-agent/config'
import { agenticSolveStreaming } from '@/lib/ai-agent/engine'
import { classifyTicketPriority } from '@/lib/ai-agent/classify'
import { withFallback } from '@/lib/claude/client'
import type { AgentResult } from '@/lib/ai-agent/types'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, serviceKey)
}

/**
 * Generate a quick, contextual acknowledgment using Haiku.
 * Returns null on failure — non-critical, the widget just shows dots.
 */
async function generateQuickAck(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string | null> {
  try {
    const recentHistory = history.slice(-4).map(m =>
      `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`
    ).join('\n')

    const prompt = recentHistory
      ? `Conversation so far:\n${recentHistory}\n\nCustomer's new message: ${message}`
      : `Customer's message: ${message}`

    const response = await withFallback(client =>
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 35,
        system: `You are a live chat support agent. Write a brief acknowledgment (1 short sentence, max 12 words) for the customer's latest message.
Rules:
- Show you understood what they said
- Don't answer their question or offer solutions
- No greetings (Hi, Hey, Hello)
- For follow-ups, acknowledge what they confirmed or clarified
- Be warm, natural, conversational`,
        messages: [{ role: 'user', content: prompt }],
      })
    )

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text : ''))
      .join('')
      .trim()

    return text || null
  } catch (error) {
    console.error('[Widget] Quick ack failed:', error instanceof Error ? error.message : error)
    return null
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// POST /api/widget/chat - Send message and get AI streaming response
export async function POST(request: NextRequest) {
  try {
    // Authenticate via widget token
    const session = await getWidgetSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, ticketId: existingTicketId } = body as {
      content: string
      ticketId?: string
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    let ticketId = existingTicketId

    // Auto-create ticket if none provided
    if (!ticketId) {
      const subject = content.trim().slice(0, 100)

      // Classify urgency from first message (fast Haiku call, ~200ms)
      const priority = await classifyTicketPriority(content.trim(), subject)

      const { data: newTicket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          subject,
          status: 'open',
          priority,
          customer_id: session.customerId,
          source_channel: 'widget',
        })
        .select('id')
        .single()

      if (ticketError || !newTicket) {
        console.error('Failed to create ticket:', ticketError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      ticketId = newTicket.id
    } else {
      const { data: existingTicket, error: ticketLookupError } = await supabase
        .from('tickets')
        .select('id, customer_id')
        .eq('id', ticketId)
        .single()

      if (ticketLookupError || !existingTicket) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      if (existingTicket.customer_id !== session.customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Save customer message
    const { data: savedCustomerMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        content: content.trim(),
      })
      .select('id, sender_type, content, created_at')
      .single()

    if (msgError) {
      console.error('Failed to save message:', msgError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Fetch ticket with customer info for AI context
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, customer:customers(*)')
      .eq('id', ticketId)
      .single()

    // Fetch previous messages for context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(20)

    const agentConfig = getAgentConfig()
    const encoder = new TextEncoder()

    // Build conversation history (exclude the message we just saved since agenticSolve adds it)
    const conversationHistory = (previousMessages || [])
      .filter(m => m.id !== savedCustomerMsg.id)
      .map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Emit initial ticket+message info
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'ticket',
                ticketId,
                messageId: savedCustomerMsg.id,
              })}\n\n`
            )
          )

          if (agentConfig.enabled && ticket) {
            // Generate contextual acknowledgment (fast Haiku call, ~300ms)
            // Runs before the main agent so the user sees it quickly
            try {
              const ackText = await Promise.race([
                generateQuickAck(content.trim(), conversationHistory),
                new Promise<null>(resolve => setTimeout(() => resolve(null), 2000)),
              ])
              if (ackText) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'acknowledgment', content: ackText })}\n\n`)
                )
              }
            } catch {
              // Non-critical — widget just shows dots
            }

            // Agentic streaming mode
            const agentStream = agenticSolveStreaming({
              message: content.trim(),
              ticket: ticket as any,
              customer: (ticket.customer || { id: session.customerId }) as any,
              channel: 'widget',
              previousMessages: conversationHistory,
            })

            let fullContent = ''
            let agentResult: AgentResult | null = null

            for await (const event of agentStream) {
              switch (event.type) {
                case 'thinking':
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`)
                  )
                  break

                case 'tool_call':
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_status',
                      tool: event.tool,
                      status: event.description,
                    })}\n\n`)
                  )
                  break

                case 'tool_result':
                  // Only show "Done" for successful results; skip failed ones
                  // to avoid confusing "No results" display while agent continues working
                  if (event.success) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: 'tool_status',
                        tool: event.tool,
                        status: 'Done',
                      })}\n\n`)
                    )
                  }
                  break

                case 'text_delta':
                  fullContent += event.content
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: event.content })}\n\n`)
                  )
                  break

                case 'complete':
                  agentResult = event.result
                  break

                case 'error':
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`)
                  )
                  break
              }
            }

            // If agent produced no content, use a fallback
            if (!fullContent.trim()) {
              fullContent = 'I\'m sorry, I wasn\'t able to generate a response. A support agent will follow up with you shortly.'
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: fullContent })}\n\n`)
              )
            }

            // Save AI message to database
            const { data: savedAiMsg } = await supabase
              .from('messages')
              .insert({
                ticket_id: ticketId,
                sender_type: 'ai',
                content: fullContent,
                confidence: agentResult ? Math.round(agentResult.confidence * 100) : 75,
                metadata: agentResult ? {
                  agent_mode: true,
                  kb_article_ids: agentResult.kbArticleIds,
                  web_searches: agentResult.webSearchCount,
                  total_tool_calls: agentResult.totalToolCalls,
                  duration_ms: agentResult.durationMs,
                } : {},
              })
              .select('id')
              .single()

            // Log agent session and update ticket queue
            if (agentResult) {
              const inputCost = (agentResult.inputTokens / 1_000_000) * 3
              const outputCost = (agentResult.outputTokens / 1_000_000) * 15
              await supabase
                .from('ai_agent_sessions')
                .insert({
                  ticket_id: ticketId,
                  message_id: savedAiMsg?.id || null,
                  channel: 'widget',
                  result_type: agentResult.type,
                  total_tool_calls: agentResult.totalToolCalls,
                  tool_calls_detail: agentResult.toolCallsDetail as any,
                  kb_articles_used: agentResult.kbArticleIds,
                  web_searches_performed: agentResult.webSearchCount,
                  input_tokens: agentResult.inputTokens,
                  output_tokens: agentResult.outputTokens,
                  estimated_cost_usd: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
                  total_duration_ms: agentResult.durationMs,
                  escalation_reason: agentResult.escalationReason,
                  escalation_summary: agentResult.escalationSummary,
                } as any)

              // Move to human queue on escalation or timeout
              if (agentResult.type === 'escalation' || agentResult.type === 'timeout') {
                await supabase
                  .from('tickets')
                  .update({
                    status: 'escalated',
                    queue_type: 'human',
                    ai_handled: false,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', ticketId)
              }
            }

            // Send completion event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                messageId: savedAiMsg?.id,
                content: fullContent,
              })}\n\n`)
            )
          } else {
            // No AI agent - just acknowledge message was saved
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                content: '',
              })}\n\n`)
            )
          }

          controller.close()
        } catch (error) {
          console.error('Widget chat streaming error:', error)

          // Save a fallback message so the ticket isn't left without a response
          const fallbackContent = 'I\'m sorry, I\'m having trouble connecting right now. A support agent will follow up with you shortly.'
          try {
            const { data: fallbackMsg } = await supabase
              .from('messages')
              .insert({
                ticket_id: ticketId,
                sender_type: 'ai',
                content: fallbackContent,
                confidence: 0,
                metadata: { fallback: true, error: String(error) },
              })
              .select('id')
              .single()

            // Send the fallback as streamed content so the widget displays it
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: fallbackContent })}\n\n`)
            )
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                messageId: fallbackMsg?.id,
                content: fallbackContent,
              })}\n\n`)
            )
          } catch (saveError) {
            console.error('Failed to save fallback message:', saveError)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
            )
          }

          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Widget chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
