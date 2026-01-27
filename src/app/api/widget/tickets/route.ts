import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWidgetSession } from '@/lib/widget/auth'
import type { WidgetCreateTicketRequest, WidgetTicket, WidgetMessage_DB } from '@/types/widget'

// Create admin client for widget operations
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/widget/tickets - List customer's tickets
export async function GET(request: NextRequest) {
  try {
    // Validate widget token
    const session = await getWidgetSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()

    // Fetch customer's tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        status,
        created_at,
        updated_at
      `)
      .eq('customer_id', session.customerId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    // Get message counts for each ticket (excluding internal notes)
    const ticketsWithCounts: WidgetTicket[] = await Promise.all(
      (tickets || []).map(async (ticket) => {
        // Count messages (excluding internal notes)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .or('metadata->is_internal.is.null,metadata->is_internal.eq.false')

        // Get last message date
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('created_at')
          .eq('ticket_id', ticket.id)
          .or('metadata->is_internal.is.null,metadata->is_internal.eq.false')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          message_count: count || 0,
          last_message_at: lastMessage?.created_at,
        }
      })
    )

    return NextResponse.json({
      tickets: ticketsWithCounts,
      customer: {
        id: session.customerId,
        name: session.customerName,
        email: session.customerEmail,
      },
    })
  } catch (error) {
    console.error('Widget tickets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/widget/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    // Validate widget token
    const session = await getWidgetSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as WidgetCreateTicketRequest
    const { subject, message } = body

    // Validate input
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        customer_id: session.customerId,
        subject: subject.trim(),
        status: 'open',
        priority: 'normal',
        tags: ['widget'],
      })
      .select('id, subject, status, created_at, updated_at')
      .single()

    if (ticketError || !ticket) {
      console.error('Error creating ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // Create the initial message
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        content: message.trim(),
        metadata: { source: 'widget' },
      })
      .select('id, sender_type, content, created_at')
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      // Ticket was created but message failed - delete ticket
      await supabase.from('tickets').delete().eq('id', ticket.id)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Create ticket event for creation
    await supabase
      .from('ticket_events')
      .insert({
        ticket_id: ticket.id,
        event_type: 'created',
        metadata: { source: 'widget' },
      })

    const widgetTicket: WidgetTicket = {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      message_count: 1,
      last_message_at: newMessage.created_at,
    }

    const widgetMessage: WidgetMessage_DB = {
      id: newMessage.id,
      sender_type: newMessage.sender_type,
      content: newMessage.content,
      created_at: newMessage.created_at,
    }

    return NextResponse.json({
      ticket: widgetTicket,
      message: widgetMessage,
    }, { status: 201 })
  } catch (error) {
    console.error('Widget create ticket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
