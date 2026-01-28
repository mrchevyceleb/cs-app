import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateChatResponse, type ConversationContext, detectLanguage, translateText } from '@/lib/openai/chat'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const { ticketId, message } = body

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: 'Missing ticketId or message' },
        { status: 400 }
      )
    }

    // Fetch ticket with customer info and assigned agent
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents!assigned_agent_id(preferred_language)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
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
        ticket_id: ticketId,
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

    // Build conversation context
    const context: ConversationContext = {
      ticketId,
      customerId: ticket.customer_id,
      customerName: ticket.customer?.name || 'Customer',
      preferredLanguage: ticket.customer?.preferred_language || 'en',
      ticketHistory: (ticketHistory || []).map(t => `${t.subject} (${t.status})`),
      previousMessages: (previousMessages || []).map(m => ({
        role: m.sender_type === 'customer' ? 'user' : 'assistant',
        content: m.content,
      })),
    }

    // Generate AI response
    const aiResponse = await generateChatResponse(message, context)

    // Save AI response to database
    const { data: savedMessage, error: aiSaveError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
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

    // Update ticket with AI confidence
    await supabase
      .from('tickets')
      .update({
        ai_confidence: aiResponse.confidence,
        status: aiResponse.shouldEscalate ? 'escalated' : ticket.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)

    // If escalation is needed, update the ticket
    if (aiResponse.shouldEscalate) {
      await supabase
        .from('tickets')
        .update({
          ai_handled: false,
          status: 'escalated',
        })
        .eq('id', ticketId)
    }

    return NextResponse.json({
      success: true,
      message: {
        id: savedMessage?.id,
        content: aiResponse.content,
        translatedContent: aiResponse.translatedContent,
        originalLanguage: aiResponse.originalLanguage,
        confidence: aiResponse.confidence,
        shouldEscalate: aiResponse.shouldEscalate,
        escalationReason: aiResponse.escalationReason,
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
