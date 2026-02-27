import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { TicketStatus, TicketPriority } from '@/types/database'

interface BulkUpdateRequest {
  ticketIds: string[]
  updates: {
    status?: TicketStatus
    priority?: TicketPriority
    assigned_agent_id?: string | null
    tags?: string[]
  }
}

interface BulkDeleteRequest {
  ticketIds: string[]
}

// Helper to get appropriate client based on auth mode
async function getSupabaseClient() {
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

  if (isDevBypass && process.env.SB_SERVICE_ROLE_KEY) {
    // Use service role in dev mode with auth bypass
    return createAdminClient(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.SB_SERVICE_ROLE_KEY!
    )
  }

  // Use normal authenticated client
  return await createClient()
}

// PATCH /api/tickets/bulk - Bulk update tickets
export async function PATCH(request: NextRequest) {
  try {
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

    const body: BulkUpdateRequest = await request.json()
    const { ticketIds, updates } = body

    // Validate request
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: 'ticketIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'updates must be a non-empty object' },
        { status: 400 }
      )
    }

    // Validate all tickets exist
    const { data: existingTickets, error: fetchError } = await supabase
      .from('tickets')
      .select('id')
      .in('id', ticketIds)

    if (fetchError) {
      console.error('Error fetching tickets:', fetchError)
      return NextResponse.json(
        { error: 'Failed to validate tickets' },
        { status: 500 }
      )
    }

    const existingIds = new Set(existingTickets?.map(t => t.id) || [])
    const missingIds = ticketIds.filter(id => !existingIds.has(id))

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Some tickets not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // Allowed fields to update
    const allowedFields = ['status', 'priority', 'assigned_agent_id', 'tags']

    // Filter to only allowed fields
    const filteredUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field as keyof typeof updates] !== undefined) {
        filteredUpdates[field] = updates[field as keyof typeof updates]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Always update the timestamp
    filteredUpdates.updated_at = new Date().toISOString()

    // Perform the bulk update
    const { data: updatedTickets, error: updateError } = await supabase
      .from('tickets')
      .update(filteredUpdates)
      .in('id', ticketIds)
      .select('id')

    if (updateError) {
      console.error('Error updating tickets:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedTickets?.length || 0,
      updatedIds: updatedTickets?.map(t => t.id) || [],
    })
  } catch (error) {
    console.error('Bulk update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tickets/bulk - Bulk delete tickets
export async function DELETE(request: NextRequest) {
  try {
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

    const body: BulkDeleteRequest = await request.json()
    const { ticketIds } = body

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: 'ticketIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all tickets exist
    const { data: existingTickets, error: fetchError } = await supabase
      .from('tickets')
      .select('id')
      .in('id', ticketIds)

    if (fetchError) {
      console.error('Error fetching tickets for bulk delete:', fetchError)
      return NextResponse.json(
        { error: 'Failed to validate tickets' },
        { status: 500 }
      )
    }

    const existingIds = new Set(existingTickets?.map((ticket) => ticket.id) || [])
    const missingIds = ticketIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Some tickets not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // Delete related messages first for compatibility with current schema constraints.
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('ticket_id', ticketIds)

    if (messagesError) {
      console.error('Error deleting messages in bulk delete:', messagesError)
      return NextResponse.json(
        { error: 'Failed to delete ticket messages' },
        { status: 500 }
      )
    }

    const { data: deletedTickets, error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .in('id', ticketIds)
      .select('id')

    if (deleteError) {
      console.error('Error deleting tickets in bulk delete:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedTickets?.length || 0,
      deletedIds: deletedTickets?.map((ticket) => ticket.id) || [],
    })
  } catch (error) {
    console.error('Bulk delete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
