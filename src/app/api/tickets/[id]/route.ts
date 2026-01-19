import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to get appropriate client based on auth mode
async function getSupabaseClient() {
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

  if (isDevBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Use service role in dev mode with auth bypass
    return createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  // Use normal authenticated client
  return await createClient()
}

// GET /api/tickets/[id] - Get a single ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents(id, name, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching ticket:', error)
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Get ticket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/tickets/[id] - Update a ticket
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'
    const supabase = await getSupabaseClient()

    // Check auth status (skip in dev bypass mode)
    if (!isDevBypass) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Auth error:', authError || 'No user session')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const body = await request.json()

    // Allowed fields to update
    const allowedFields = [
      'status',
      'priority',
      'ai_handled',
      'ai_confidence',
      'tags',
      'assigned_agent_id',
    ]

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Always update the timestamp
    updates.updated_at = new Date().toISOString()

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents(id, name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Update ticket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tickets/[id] - Delete a ticket
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // First delete all messages associated with the ticket
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('ticket_id', id)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
    }

    // Then delete the ticket
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting ticket:', error)
      return NextResponse.json(
        { error: 'Failed to delete ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete ticket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
