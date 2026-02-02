import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWidgetSession } from '@/lib/widget/auth'
import { getAgentConfig } from '@/lib/ai-agent/config'
import { agenticSolveStreaming } from '@/lib/ai-agent/engine'
import type { AgentResult } from '@/lib/ai-agent/types'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, serviceKey)
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

      const { data: newTicket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          subject,
          status: 'open',
          priority: 'medium',
          customer_id: session.customerId,
          channel: 'widget',
          metadata: { source: 'widget_chat', anonymous: session.isAnonymous || false },
        })
        .select('id')
        .single()

      if (ticketError || !newTicket) {
        console.error('Failed to create ticket:', ticketError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      ticketId = newTicket.id
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
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_status',
                      tool: event.tool,
                      status: event.success ? 'Done' : 'No results',
                    })}\n\n`)
                  )
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

            // Log agent session
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
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
          )
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
