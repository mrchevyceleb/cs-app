import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWidgetSession } from '@/lib/widget/auth'
import type { WidgetMessage_DB, WidgetSendMessageRequest } from '@/types/widget'
import type { MessageMetadata } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Create admin client for widget operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/widget/tickets/[id] - Get single ticket with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Validate widget token
    const session = await getWidgetSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()

    // Fetch ticket - verify it belongs to this customer
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('customer_id', session.customerId)
      .single()

    if (ticketError || !ticket) {
      if (ticketError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      )
    }

    // Fetch messages (excluding internal notes)
    const { data: rawMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_type,
        content,
        created_at,
        metadata
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Filter out internal notes
    const messages: WidgetMessage_DB[] = (rawMessages || [])
      .filter((msg) => {
        const metadata = msg.metadata as MessageMetadata | null
        return !metadata?.is_internal
      })
      .map((msg) => ({
        id: msg.id,
        sender_type: msg.sender_type as 'customer' | 'agent' | 'ai',
        content: msg.content,
        created_at: msg.created_at,
      }))

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        message_count: messages.length,
      },
      messages,
    })
  } catch (error) {
    console.error('Widget ticket detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/widget/tickets/[id] - Send a message to a ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Validate widget token
    const session = await getWidgetSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as WidgetSendMessageRequest
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    // Verify ticket belongs to this customer
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', id)
      .eq('customer_id', session.customerId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        ticket_id: id,
        sender_type: 'customer',
        content: content.trim(),
        metadata: { source: 'widget' },
      })
      .select('id, sender_type, content, created_at')
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update ticket status and timestamp
    const newStatus = ticket.status === 'resolved' ? 'open' : ticket.status
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, subject, status, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
    }

    // Create ticket event
    await supabase
      .from('ticket_events')
      .insert({
        ticket_id: id,
        event_type: 'message_sent',
        metadata: {
          message_id: message.id,
          sender: 'customer',
          via: 'widget',
        },
      })

    // If ticket was reopened, create status change event
    if (ticket.status === 'resolved') {
      await supabase
        .from('ticket_events')
        .insert({
          ticket_id: id,
          event_type: 'status_changed',
          old_value: 'resolved',
          new_value: 'open',
          metadata: {
            via: 'widget',
            reason: 'customer_reply',
          },
        })
    }

    const widgetMessage: WidgetMessage_DB = {
      id: message.id,
      sender_type: message.sender_type as 'customer' | 'agent' | 'ai',
      content: message.content,
      created_at: message.created_at,
    }

    return NextResponse.json({
      message: widgetMessage,
      ticket: updatedTicket || ticket,
    }, { status: 201 })
  } catch (error) {
    console.error('Widget send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
