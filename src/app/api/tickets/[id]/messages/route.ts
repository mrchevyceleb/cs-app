import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: messages, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

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
    } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Missing content' },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', id)
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
        sender_type: senderType,
        content,
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Update ticket timestamp and potentially mark as human-handled
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // If agent is responding, mark as no longer AI-handled
    if (senderType === 'agent') {
      updateData.ai_handled = false
      updateData.status = 'pending' // Mark as pending customer response
    }

    await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Create message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
