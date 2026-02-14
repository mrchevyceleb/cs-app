import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateChatResponse, type ConversationContext, detectLanguage, translateText } from '@/lib/openai/chat'
import { getAgentConfig } from '@/lib/ai-agent/config'
import { agenticSolve } from '@/lib/ai-agent/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const { ticketId, message, customerName, customerEmail, language } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400 }
      )
    }

    let ticket: any
    let currentTicketId = ticketId

    // If no ticketId, create a new ticket for this chat session
    if (!currentTicketId) {
      // Find or create customer
      let customerId: string | null = null

      if (customerEmail) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerEmail)
          .single()

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              email: customerEmail,
              name: customerName || customerEmail.split('@')[0],
              preferred_language: language || 'en',
            })
            .select('id')
            .single()

          if (!customerError && newCustomer) {
            customerId = newCustomer.id
          }
        }
      }

      // Ensure we have a customer
      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer identification required' },
          { status: 400 }
        )
      }

      // Create new ticket
      const { data: newTicket, error: createError } = await supabase
        .from('tickets')
        .insert({
          subject: 'Chat: ' + message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          status: 'open',
          priority: 'normal',
          source_channel: 'widget',
          customer_id: customerId,
          ai_handled: true,
        })
        .select(`
          *,
          customer:customers(*),
          assigned_agent:agents!assigned_agent_id(preferred_language)
        `)
        .single()

      if (createError || !newTicket) {
        return NextResponse.json(
          { error: 'Failed to create ticket' },
          { status: 500 }
        )
      }

      ticket = newTicket
      currentTicketId = newTicket.id
    } else {
      // Fetch existing ticket with customer info and assigned agent
      const { data: existingTicket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*),
          assigned_agent:agents!assigned_agent_id(preferred_language)
        `)
        .eq('id', currentTicketId)
        .single()

      if (ticketError || !existingTicket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        )
      }

      ticket = existingTicket
    }

    // Detect language and translate for agent if needed
    let detectedLanguage = 'en'
    let contentTranslated = null
    
    try {
      detectedLanguage = await detectLanguage(message)
      const agentLanguage = ticket.assigned_agent?.preferred_language || 'en'
      
      if (detectedLanguage !== agentLanguage) {
        contentTranslated = await translateText(message, detectedLanguage, agentLanguage)
      }
    } catch (err) {
      console.error('Language detection/translation error:', err)
      // Fallback to defaults
    }

    // Save customer message to database
    const { error: saveError } = await supabase
      .from('messages')
      .insert({
        ticket_id: currentTicketId,
        sender_type: 'customer',
        content: message,
        original_language: detectedLanguage !== 'en' ? detectedLanguage : null,
        content_translated: contentTranslated,
      })

    if (saveError) {
      console.error('Error saving customer message:', saveError)
    }

    // Fetch previous messages for context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', currentTicketId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Fetch customer's ticket history
    const { data: ticketHistory } = await supabase
      .from('tickets')
      .select('subject, status')
      .eq('customer_id', ticket.customer_id)
      .neq('id', currentTicketId)
      .order('created_at', { ascending: false })
      .limit(5)

    const agentConfig = getAgentConfig()

    // --- Agentic mode ---
    if (agentConfig.enabled) {
      const conversationHistory = (previousMessages || []).map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      const agentResult = await agenticSolve({
        message,
        ticket: ticket as any,
        customer: ticket.customer as any,
        channel: 'widget',
        previousMessages: conversationHistory,
      })

      const shouldEscalate = agentResult.type === 'escalation'
      const confidence = Math.round(agentResult.confidence * 100)

      // Save AI response to database
      const { data: savedMessage, error: aiSaveError } = await supabase
        .from('messages')
        .insert({
          ticket_id: currentTicketId,
          sender_type: 'ai',
          content: agentResult.content,
          confidence,
          metadata: {
            agent_mode: true,
            kb_article_ids: agentResult.kbArticleIds,
            web_searches: agentResult.webSearchCount,
            total_tool_calls: agentResult.totalToolCalls,
          },
        })
        .select()
        .single()

      if (aiSaveError) {
        console.error('Error saving AI message:', aiSaveError)
      }

      // Update ticket
      await supabase
        .from('tickets')
        .update({
          ai_confidence: agentResult.confidence,
          status: shouldEscalate ? 'escalated' : ticket.status,
          ai_handled: !shouldEscalate,
          queue_type: shouldEscalate ? 'human' : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentTicketId)

      // Log agent session
      const inputCost = (agentResult.inputTokens / 1_000_000) * 3
      const outputCost = (agentResult.outputTokens / 1_000_000) * 15
      await supabase
        .from('ai_agent_sessions')
        .insert({
          ticket_id: currentTicketId,
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

      return NextResponse.json({
        success: true,
        ticketId: currentTicketId,
        message: agentResult.content,
        confidence,
        shouldEscalate,
        escalationReason: agentResult.escalationReason,
      })
    }

    // --- Legacy mode (fallback) ---
    const context: ConversationContext = {
      ticketId: currentTicketId,
      customerId: ticket.customer_id,
      customerName: ticket.customer?.name || 'Customer',
      preferredLanguage: ticket.customer?.preferred_language || 'en',
      ticketHistory: (ticketHistory || []).map(t => `${t.subject} (${t.status})`),
      previousMessages: (previousMessages || []).map(m => ({
        role: m.sender_type === 'customer' ? 'user' : 'assistant',
        content: m.content,
      })),
    }

    const aiResponse = await generateChatResponse(message, context)

    const { data: savedMessage, error: aiSaveError } = await supabase
      .from('messages')
      .insert({
        ticket_id: currentTicketId,
        sender_type: 'ai',
        content: aiResponse.content,
        content_translated: aiResponse.translatedContent,
        original_language: aiResponse.originalLanguage,
        confidence: aiResponse.confidence,
      })
      .select()
      .single()

    if (aiSaveError) {
      console.error('Error saving AI message:', aiSaveError)
    }

    await supabase
      .from('tickets')
      .update({
        ai_confidence: aiResponse.confidence,
        status: aiResponse.shouldEscalate ? 'escalated' : ticket.status,
        queue_type: aiResponse.shouldEscalate ? 'human' : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentTicketId)

    if (aiResponse.shouldEscalate) {
      await supabase
        .from('tickets')
        .update({
          ai_handled: false,
          status: 'escalated',
          queue_type: 'human',
        })
        .eq('id', currentTicketId)
    }

    return NextResponse.json({
      success: true,
      ticketId: currentTicketId,
      message: aiResponse.content,
      confidence: aiResponse.confidence,
      shouldEscalate: aiResponse.shouldEscalate,
      escalationReason: aiResponse.escalationReason,
      translatedContent: aiResponse.translatedContent,
      originalLanguage: aiResponse.originalLanguage,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
