import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, CHAT_MODEL } from '@/lib/openai/client'
import {
  CUSTOMER_CHATBOT_SYSTEM_PROMPT,
} from '@/lib/openai/prompts'
import {
  detectLanguage,
  translateText,
  type ConversationContext,
} from '@/lib/openai/chat'
import { searchKnowledgeHybrid, formatKBResultsForPrompt } from '@/lib/knowledge/search'
import { getAgentConfig } from '@/lib/ai-agent/config'
import { agenticSolveStreaming } from '@/lib/ai-agent/engine'
import type { AgentStreamEvent, AgentResult } from '@/lib/ai-agent/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { ticketId, message } = body

    if (!ticketId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing ticketId or message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch ticket with customer info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Detect language and translate if needed
    const detectedLanguage = await detectLanguage(message)
    let processedMessage = message
    if (detectedLanguage !== 'en') {
      processedMessage = await translateText(message, detectedLanguage, 'en')
    }

    // Fetch previous messages for context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(20)

    const agentConfig = getAgentConfig()

    // --- Agentic streaming mode ---
    if (agentConfig.enabled) {
      const conversationHistory = (previousMessages || []).map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      const agentStream = agenticSolveStreaming({
        message: processedMessage,
        ticket: ticket as any,
        customer: ticket.customer as any,
        channel: 'widget',
        previousMessages: conversationHistory,
      })

      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          let fullContent = ''
          let agentResult: AgentResult | null = null

          try {
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

                case 'content_reset':
                  fullContent = ''
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'content_reset' })}\n\n`)
                  )
                  break

                case 'text_delta':
                  fullContent += event.content
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: event.content, type: 'chunk' })}\n\n`)
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

            // Handle translation if needed
            let translatedContent: string | undefined
            if (detectedLanguage !== 'en' && fullContent) {
              translatedContent = await translateText(fullContent, 'en', detectedLanguage)
            }

            // Save the complete message to database
            const { data: savedMessage } = await supabase
              .from('messages')
              .insert({
                ticket_id: ticketId,
                sender_type: 'ai',
                content: fullContent,
                content_translated: translatedContent,
                original_language: detectedLanguage !== 'en' ? detectedLanguage : null,
                confidence: agentResult ? Math.round(agentResult.confidence * 100) : 75,
                metadata: agentResult ? {
                  agent_mode: true,
                  kb_article_ids: agentResult.kbArticleIds,
                  web_searches: agentResult.webSearchCount,
                  total_tool_calls: agentResult.totalToolCalls,
                  duration_ms: agentResult.durationMs,
                } : {},
              })
              .select()
              .single()

            // Log agent session
            if (agentResult) {
              const inputCost = (agentResult.inputTokens / 1_000_000) * 3
              const outputCost = (agentResult.outputTokens / 1_000_000) * 15
              await supabase
                .from('ai_agent_sessions')
                .insert({
                  ticket_id: ticketId,
                  message_id: savedMessage?.id || null,
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

              // Update ticket metadata based on agent result
              if (agentResult.type === 'escalation' || agentResult.type === 'timeout') {
                await supabase
                  .from('tickets')
                  .update({
                    status: 'escalated',
                    queue_type: 'human',
                    ai_handled: false,
                    ai_confidence: agentResult.confidence,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', ticketId)
              } else {
                await supabase
                  .from('tickets')
                  .update({
                    ai_handled: true,
                    ai_confidence: agentResult.confidence,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', ticketId)
              }
            }

            // Send completion event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'complete',
                  messageId: savedMessage?.id,
                  content: fullContent,
                  translatedContent,
                  originalLanguage: detectedLanguage !== 'en' ? detectedLanguage : undefined,
                })}\n\n`
              )
            )

            controller.close()
          } catch (error) {
            console.error('Agent streaming error:', error)
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
        },
      })
    }

    // --- Legacy OpenAI streaming mode (fallback) ---
    const relevantArticles = await searchKnowledgeHybrid({
      query: processedMessage,
      limit: 5,
      source: 'customer_chat',
      ticketId,
      customerId: ticket.customer_id,
    })
    const kbContext = formatKBResultsForPrompt(relevantArticles, 1500)

    const ticketHistory = await supabase
      .from('tickets')
      .select('subject, status')
      .eq('customer_id', ticket.customer_id)
      .neq('id', ticketId)
      .order('created_at', { ascending: false })
      .limit(5)

    const systemPrompt = CUSTOMER_CHATBOT_SYSTEM_PROMPT
      .replace('{relevantArticles}', kbContext)
      .replace('{customerName}', ticket.customer?.name || 'Customer')
      .replace('{preferredLanguage}', ticket.customer?.preferred_language || 'en')
      .replace('{ticketHistory}', (ticketHistory.data || []).map(t => `${t.subject} (${t.status})`).join(', ') || 'No previous issues')

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(previousMessages || []).map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
      { role: 'user' as const, content: processedMessage },
    ]

    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = ''

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`)
              )
            }
          }

          let translatedContent: string | undefined
          if (detectedLanguage !== 'en') {
            translatedContent = await translateText(fullContent, 'en', detectedLanguage)
          }

          const kbArticleIds = relevantArticles.map(a => a.id)
          const { data: savedMessage } = await supabase
            .from('messages')
            .insert({
              ticket_id: ticketId,
              sender_type: 'ai',
              content: fullContent,
              content_translated: translatedContent,
              original_language: detectedLanguage !== 'en' ? detectedLanguage : null,
              confidence: 75,
              metadata: kbArticleIds.length > 0 ? {
                kb_article_ids: kbArticleIds,
                kb_sources: relevantArticles.slice(0, 3).map(a => ({
                  title: a.title,
                  source_file: a.source_file,
                  similarity: a.similarity,
                })),
              } : {},
            })
            .select()
            .single()

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                messageId: savedMessage?.id,
                content: fullContent,
                translatedContent,
                originalLanguage: detectedLanguage !== 'en' ? detectedLanguage : undefined,
              })}\n\n`
            )
          )

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
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
      },
    })
  } catch (error) {
    console.error('Chat stream API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
