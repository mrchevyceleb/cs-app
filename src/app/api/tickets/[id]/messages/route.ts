import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAgentReplyEmail } from '@/lib/email'
import { generatePortalToken } from '@/lib/portal/auth'
import { detectLanguage, translateText } from '@/lib/openai/chat'
import type { MessageInsert, Customer, Ticket, Message, MessageWithAttachments } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/tickets/[id]/messages - Get messages for a ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeAttachments = searchParams.get('includeAttachments') !== 'false' // Default true

    // Build query based on whether we need attachments
    const query = supabase
      .from('messages')
      .select(
        includeAttachments
          ? '*, message_attachments(*)'
          : '*',
        { count: 'exact' }
      )
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: messages, error, count } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/messages - Create a new message (agent reply)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      content,
      senderType = 'agent',
      metadata = {},
      attachmentIds = [],
      mentionedAgentIds = [],
    } = body

    // Allow empty content if there are attachments
    if (!content && (!attachmentIds || attachmentIds.length === 0)) {
      return NextResponse.json(
        { error: 'Missing content or attachments' },
        { status: 400 }
      )
    }

    // Validate metadata structure
    const isInternal = metadata?.is_internal === true

    // Verify ticket exists and fetch customer for email notifications
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Handle translation for agent messages (not internal notes)
    let contentTranslated = null
    let originalLanguage = null

    if (content && senderType === 'agent' && !isInternal) {
      try {
        const customer = ticket.customer as Customer
        const customerLanguage = customer?.preferred_language || 'en'
        
        // Detect the language the agent is typing in
        const detectedLanguage = await detectLanguage(content)
        
        // If agent is not typing in customer's language, translate it
        if (detectedLanguage !== customerLanguage) {
          originalLanguage = detectedLanguage
          contentTranslated = await translateText(content, detectedLanguage, customerLanguage)
        }
      } catch (err) {
        console.error('Translation error:', err)
        // Continue without translation on error
      }
    }

    // Create the message with metadata
    const messageData: MessageInsert = {
      ticket_id: id,
      sender_type: senderType,
      content: content || '', // Allow empty content if there are attachments
      metadata: isInternal ? { is_internal: true } : {},
      content_translated: contentTranslated,
      original_language: originalLanguage,
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Link attachments to the message
    if (attachmentIds && attachmentIds.length > 0 && message) {
      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .update({ message_id: message.id })
        .in('id', attachmentIds)
        .is('message_id', null) // Only update unlinked attachments

      if (attachmentError) {
        console.error('Error linking attachments:', attachmentError)
        // Don't fail the request, just log the error
      }
    }

    // Fetch the message with attachments
    let messageWithAttachments: MessageWithAttachments | null = null
    if (message) {
      const { data: fullMessage } = await supabase
        .from('messages')
        .select('*, message_attachments(*)')
        .eq('id', message.id)
        .single()

      messageWithAttachments = fullMessage as MessageWithAttachments
    }

    // Update ticket timestamp and potentially mark as human-handled
    // Internal notes don't affect ticket status
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // If agent is responding (and it's not an internal note), mark as no longer AI-handled
    if (senderType === 'agent' && !isInternal) {
      updateData.ai_handled = false
      updateData.status = 'pending' // Mark as pending customer response
    }

    await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)

    // Send email notification for agent replies on email-sourced tickets (not internal notes)
    // Widget/portal tickets are delivered via Supabase Realtime - no email needed
    if (senderType === 'agent' && !isInternal && message && ticket.customer && ticket.source_channel === 'email') {
      const customer = ticket.customer as Customer
      if (customer.email) {
        const portalToken = await generatePortalToken(customer.id, ticket.id)
        if (!portalToken) {
          console.error('[Messages API] Failed to generate portal token for agent reply email')
        } else {
          // Send email asynchronously (don't wait for it)
          // Human agent replies use the standard from address (not Ava)
          sendAgentReplyEmail(ticket as Ticket, message as Message, customer, portalToken)
            .then((result) => {
              if (result.success) {
                console.log('[Messages API] Agent reply email sent:', result.emailLogId)
              } else {
                console.error('[Messages API] Failed to send agent reply email:', result.error)
              }
            })
            .catch((err) => {
              console.error('[Messages API] Email send error:', err)
            })
        }
      }
    }

    // Create notifications for mentioned agents (internal notes only)
    if (isInternal && mentionedAgentIds && mentionedAgentIds.length > 0 && message) {
      // Get current agent info for notification
      const { data: { user } } = await supabase.auth.getUser()
      const { data: currentAgent } = user
        ? await supabase.from('agents').select('name').eq('id', user.id).single()
        : { data: null }

      const agentName = currentAgent?.name || 'An agent'

      // Create notifications for each mentioned agent
      const notifications = mentionedAgentIds.map((agentId: string) => ({
        agent_id: agentId,
        type: 'mention' as const,
        title: 'You were mentioned',
        message: `${agentName} mentioned you in an internal note on "${ticket.subject}"`,
        ticket_id: id,
        from_agent_id: user?.id || null,
      }))

      const { error: notificationError } = await supabase
        .from('agent_notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('[Messages API] Failed to create mention notifications:', notificationError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ message: messageWithAttachments || message }, { status: 201 })
  } catch (error) {
    console.error('Create message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
