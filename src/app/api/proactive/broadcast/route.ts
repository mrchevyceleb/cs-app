import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifyCronRequest, unauthorizedResponse } from '@/lib/cron/auth'
import type { ProactiveOutreachLogInsert } from '@/types/database'

// Get admin Supabase client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SB_SERVICE_ROLE_KEY is required')
  }

  return createClient(supabaseUrl, serviceKey)
}

interface BroadcastRequest {
  patternId?: string // Issue pattern ID
  ticketIds?: string[] // Specific ticket IDs to notify
  customerIds?: string[] // Specific customer IDs to notify
  subject: string
  message: string
  channel?: 'email' | 'internal' // Default: email
  markPatternResolved?: boolean
}

interface BroadcastResult {
  customerId: string
  customerEmail: string | null
  ticketId: string | null
  success: boolean
  error?: string
}

/**
 * POST /api/proactive/broadcast
 * Send mass notification to affected customers when an issue is resolved
 */
export async function POST(request: NextRequest) {
  try {
    const isCronRequest = verifyCronRequest(request)

    if (!isCronRequest) {
      const authClient = await createServerClient()
      const { data: { user }, error: authError } = await authClient.auth.getUser()

      if (authError || !user) {
        return unauthorizedResponse()
      }
    }

    const supabase = getServiceClient()
    const body: BroadcastRequest = await request.json()

    const {
      patternId,
      ticketIds,
      customerIds,
      subject,
      message,
      channel = 'email',
      markPatternResolved = false,
    } = body

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'subject and message are required' },
        { status: 400 }
      )
    }

    if (!patternId && !ticketIds && !customerIds) {
      return NextResponse.json(
        { error: 'Must provide patternId, ticketIds, or customerIds' },
        { status: 400 }
      )
    }

    const now = new Date()
    let targetCustomers: { id: string; email: string | null; ticketId: string | null }[] = []

    // Get customers from pattern
    if (patternId) {
      const { data: pattern, error: patternError } = await supabase
        .from('issue_patterns')
        .select('affected_customer_ids, affected_ticket_ids')
        .eq('id', patternId)
        .single()

      if (patternError || !pattern) {
        return NextResponse.json(
          { error: 'Pattern not found' },
          { status: 404 }
        )
      }

      const affectedCustomerIds = pattern.affected_customer_ids || []
      const affectedTicketIds = pattern.affected_ticket_ids || []

      if (affectedCustomerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, email')
          .in('id', affectedCustomerIds)

        // Map customers to their most recent affected ticket
        const customerTicketMap = new Map<string, string>()
        if (affectedTicketIds.length > 0) {
          const { data: tickets } = await supabase
            .from('tickets')
            .select('id, customer_id')
            .in('id', affectedTicketIds)

          for (const ticket of tickets || []) {
            customerTicketMap.set(ticket.customer_id, ticket.id)
          }
        }

        targetCustomers = (customers || []).map((c) => ({
          id: c.id,
          email: c.email,
          ticketId: customerTicketMap.get(c.id) || null,
        }))
      }
    }

    // Get customers from ticket IDs
    if (ticketIds && ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, customer_id, customer:customers(id, email)')
        .in('id', ticketIds)

      for (const ticket of tickets || []) {
        const customerData = ticket.customer as { id: string; email: string | null } | { id: string; email: string | null }[] | null
        // Handle both single object and array cases from Supabase
        const customer = Array.isArray(customerData) ? customerData[0] : customerData
        if (customer && !targetCustomers.find((c) => c.id === customer.id)) {
          targetCustomers.push({
            id: customer.id,
            email: customer.email,
            ticketId: ticket.id,
          })
        }
      }
    }

    // Get customers from customer IDs
    if (customerIds && customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, email')
        .in('id', customerIds)

      for (const customer of customers || []) {
        if (!targetCustomers.find((c) => c.id === customer.id)) {
          targetCustomers.push({
            id: customer.id,
            email: customer.email,
            ticketId: null,
          })
        }
      }
    }

    if (targetCustomers.length === 0) {
      return NextResponse.json(
        { error: 'No customers found to notify' },
        { status: 400 }
      )
    }

    // Send broadcasts
    const results: BroadcastResult[] = []
    let successCount = 0
    let failCount = 0

    for (const customer of targetCustomers) {
      let success = false
      let error: string | undefined

      // Log the outreach
      const outreachLog: ProactiveOutreachLogInsert = {
        customer_id: customer.id,
        ticket_id: customer.ticketId,
        outreach_type: 'issue_broadcast',
        channel,
        message_content: message,
        message_subject: subject,
        trigger_reason: patternId ? `Issue pattern resolved: ${patternId}` : 'Manual broadcast',
        trigger_data: {
          pattern_id: patternId,
          broadcast_type: 'issue_resolution',
        },
        delivery_status: 'pending',
      }

      const { data: logEntry } = await supabase
        .from('proactive_outreach_log')
        .insert(outreachLog)
        .select()
        .single()

      // Send based on channel
      if (channel === 'email' && customer.email) {
        try {
          const { sendEmail } = await import('@/lib/email/client')

          const result = await sendEmail({
            to: customer.email,
            subject,
            text: message,
            html: `<div style="font-family: sans-serif; line-height: 1.6;">
              ${message.split('\n').map((line) => `<p>${line || '&nbsp;'}</p>`).join('')}
            </div>`,
            tags: [
              { name: 'type', value: 'issue_broadcast' },
              ...(patternId ? [{ name: 'pattern_id', value: patternId }] : []),
            ],
          })

          success = result.success
          error = result.error
        } catch (err) {
          success = false
          error = err instanceof Error ? err.message : 'Email send failed'
        }
      } else if (channel === 'internal' && customer.ticketId) {
        // Add message to ticket
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            ticket_id: customer.ticketId,
            sender_type: 'ai',
            content: `**Issue Update**\n\n${message}`,
            metadata: {
              is_proactive: true,
              outreach_type: 'issue_broadcast',
              pattern_id: patternId,
            },
          })

        success = !msgError
        error = msgError?.message
      } else {
        error = channel === 'email' ? 'No email address' : 'No ticket for internal message'
      }

      // Update outreach log
      if (logEntry) {
        await supabase
          .from('proactive_outreach_log')
          .update({
            delivery_status: success ? 'sent' : 'failed',
            delivered_at: success ? now.toISOString() : null,
            error_message: error || null,
          })
          .eq('id', logEntry.id)
      }

      results.push({
        customerId: customer.id,
        customerEmail: customer.email,
        ticketId: customer.ticketId,
        success,
        error,
      })

      if (success) successCount++
      else failCount++
    }

    // Mark pattern as resolved if requested
    if (markPatternResolved && patternId) {
      await supabase
        .from('issue_patterns')
        .update({
          status: 'resolved',
          resolved_at: now.toISOString(),
          broadcast_sent: true,
          resolution_notes: `Broadcast sent to ${successCount} customers`,
        })
        .eq('id', patternId)
    }

    return NextResponse.json({
      success: true,
      totalCustomers: targetCustomers.length,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('[Broadcast] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/proactive/broadcast
 * Get broadcast history
 */
export async function GET(request: NextRequest) {
  try {
    const isCronRequest = verifyCronRequest(request)

    if (!isCronRequest) {
      const authClient = await createServerClient()
      const { data: { user }, error: authError } = await authClient.auth.getUser()

      if (authError || !user) {
        return unauthorizedResponse()
      }
    }

    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const patternId = searchParams.get('patternId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('proactive_outreach_log')
      .select('*', { count: 'exact' })
      .eq('outreach_type', 'issue_broadcast')
      .order('created_at', { ascending: false })

    if (patternId) {
      query = query.eq('trigger_data->>pattern_id', patternId)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: broadcasts, error, count } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch broadcasts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      broadcasts: broadcasts || [],
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Broadcast] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
