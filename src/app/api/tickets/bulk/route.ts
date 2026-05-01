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

// Service role client for admin operations (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SB_SERVICE_ROLE_KEY is required')
  }

  return createAdminClient(supabaseUrl, serviceKey)
}

// PATCH /api/tickets/bulk - Bulk update tickets
export async function PATCH(request: NextRequest) {
  try {
    const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

    // Verify the caller is authenticated (unless dev bypass) and remember who they
    // are so we can attribute audit events back to them after the service-role write
    // (which otherwise records `auth.uid() = NULL` in the ticket_events trigger).
    let actingUserId: string | null = null
    if (!isDevBypass) {
      const userClient = await createClient()
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) {
        console.error('Auth error:', authError || 'No user session')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      actingUserId = user.id
    }

    // Use service role client for write operations (bypasses RLS row-by-row checks
    // that can fail when status triggers reference columns the user role can't touch).
    const supabase = getServiceClient()

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

    // Capture the boundary just before the update so we can identify only the
    // ticket_events rows the trigger inserts for THIS write when patching the actor.
    const eventCutoff = new Date(Date.now() - 1000).toISOString()

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

    // Attribute the trigger-emitted audit events to the verified user. Service-role
    // calls leave auth.uid() NULL, so log_ticket_changes() falls back to
    // assigned_agent_id, which incorrectly credits the assignee for changes the
    // bulk actor made. Re-stamp the rows the trigger just wrote.
    if (actingUserId) {
      const { error: attributionError } = await supabase
        .from('ticket_events')
        .update({ agent_id: actingUserId })
        .in('ticket_id', ticketIds)
        .gte('created_at', eventCutoff)
      if (attributionError) {
        console.error('Failed to attribute bulk update audit events:', attributionError)
      }
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

    // Verify the caller is authenticated (unless dev bypass)
    if (!isDevBypass) {
      const userClient = await createClient()
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) {
        console.error('Auth error:', authError || 'No user session')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Use service role client for delete operations (no DELETE RLS policy on tickets)
    const supabase = getServiceClient()

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

    // Clean up related records that lack ON DELETE CASCADE
    // proactive_outreach_log.response_ticket_id has no ON DELETE clause (defaults to RESTRICT)
    const { error: outreachError } = await supabase
      .from('proactive_outreach_log')
      .update({ response_ticket_id: null })
      .in('response_ticket_id', ticketIds)

    if (outreachError) {
      console.error('Error clearing outreach log references:', outreachError)
      // Non-fatal: table may not exist in all environments
    }

    // kb_search_logs.ticket_id has no ON DELETE clause (defaults to RESTRICT)
    const { error: kbLogsError } = await supabase
      .from('kb_search_logs')
      .update({ ticket_id: null })
      .in('ticket_id', ticketIds)

    if (kbLogsError) {
      console.error('Error clearing kb_search_logs references:', kbLogsError)
      // Non-fatal: table may not exist in all environments
    }

    // Delete related messages first (has CASCADE but being explicit)
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
