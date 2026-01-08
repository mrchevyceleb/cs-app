import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, CHAT_MODEL } from '@/lib/openai/client'
import {
  CUSTOMER_CHATBOT_SYSTEM_PROMPT,
} from '@/lib/openai/prompts'
import {
  detectLanguage,
  translateText,
  searchKnowledgeBase,
  type ConversationContext,
} from '@/lib/openai/chat'

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

    // Search knowledge base
    const relevantArticles = await searchKnowledgeBase(processedMessage)
    const kbContext = relevantArticles.length > 0
      ? relevantArticles.map(a => `**${a.title}**\n${a.content}`).join('\n\n---\n\n')
      : 'No relevant articles found in knowledge base.'

    // Fetch previous messages for context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Fetch customer's ticket history
    const { data: ticketHistory } = await supabase
      .from('tickets')
      .select('subject, status')
      .eq('customer_id', ticket.customer_id)
      .neq('id', ticketId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Build system prompt
    const systemPrompt = CUSTOMER_CHATBOT_SYSTEM_PROMPT
      .replace('{relevantArticles}', kbContext)
      .replace('{customerName}', ticket.customer?.name || 'Customer')
      .replace('{preferredLanguage}', ticket.customer?.preferred_language || 'en')
      .replace('{ticketHistory}', (ticketHistory || []).map(t => `${t.subject} (${t.status})`).join(', ') || 'No previous issues')

    // Build messages array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(previousMessages || []).map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
      { role: 'user' as const, content: processedMessage },
    ]

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    })

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = ''

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              // Send chunk as SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`)
              )
            }
          }

          // After streaming is complete, handle translation if needed
          let translatedContent: string | undefined
          if (detectedLanguage !== 'en') {
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
              confidence: 75, // Default confidence for streaming, can be evaluated separately
            })
            .select()
            .single()

          // Send completion event with metadata
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
