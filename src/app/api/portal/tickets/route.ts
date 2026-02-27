import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPortalSession } from '@/lib/portal/auth'
import type { PortalTicket } from '@/types/database'

// Create admin client for portal operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceKey)
}

// GET /api/portal/tickets - List customer's tickets
export async function GET(request: NextRequest) {
  try {
    // Validate portal token
    const session = await getPortalSession(request)

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
        priority,
        created_at,
        updated_at
      `)
      .eq('customer_id', session.customerId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    // Get message counts for each ticket
    const ticketsWithCounts: PortalTicket[] = await Promise.all(
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
          ...ticket,
          message_count: count || 0,
          last_message_at: lastMessage?.created_at,
        }
      })
    )

    return NextResponse.json({
      tickets: ticketsWithCounts,
      session: {
        customerId: session.customerId,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
      },
    })
  } catch (error) {
    console.error('Portal tickets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
