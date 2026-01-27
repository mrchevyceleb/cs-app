import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendTicketCreatedEmail,
  sendTicketResolvedEmail,
  sendAgentReplyEmail,
} from '@/lib/email'
import { generatePortalToken } from '@/lib/portal/auth'
import type { Ticket, Customer, Message } from '@/types/database'

// Use admin client for internal API calls
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  return createClient(supabaseUrl, serviceKey)
}

// Supported email types
type EmailRequestType = 'ticket_created' | 'ticket_resolved' | 'agent_reply'

interface EmailRequestBody {
  type: EmailRequestType
  ticketId: string
  customerId?: string
  messageId?: string
  token?: string
}

/**
 * POST /api/email/send - Internal API for sending emails
 *
 * Request body:
 * {
 *   type: 'ticket_created' | 'ticket_resolved' | 'agent_reply',
 *   ticketId: string,
 *   customerId?: string, // Optional, will be fetched from ticket if not provided
 *   messageId?: string, // Required for agent_reply type
 *   token?: string // Optional portal token, will be generated if not provided
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal API key for security
    const apiKey = request.headers.get('x-internal-api-key')
    const expectedKey = process.env.INTERNAL_API_KEY

    // In development, allow requests without API key
    const isDev = process.env.NODE_ENV !== 'production'
    if (!isDev && expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: EmailRequestBody = await request.json()
    const { type, ticketId, messageId, token } = body

    // Validate required fields
    if (!type || !ticketId) {
      return NextResponse.json(
        { error: 'Missing required fields: type and ticketId' },
        { status: 400 }
      )
    }

    // Validate email type
    const validTypes: EmailRequestType[] = ['ticket_created', 'ticket_resolved', 'agent_reply']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid email type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // For agent_reply, messageId is required
    if (type === 'agent_reply' && !messageId) {
      return NextResponse.json(
        { error: 'messageId is required for agent_reply type' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Fetch ticket with customer
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('[Email API] Ticket fetch error:', ticketError)
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const customer = ticket.customer as Customer
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found for ticket' },
        { status: 404 }
      )
    }

    // Generate portal token if not provided
    let portalToken = token || null
    if (!portalToken) {
      portalToken = await generatePortalToken(customer.id, ticketId)
      if (!portalToken) {
        return NextResponse.json(
          { error: 'Failed to generate portal token' },
          { status: 500 }
        )
      }
    }

    // Send email based on type
    let result: { success: boolean; emailLogId?: string; error?: string }

    switch (type) {
      case 'ticket_created':
        result = await sendTicketCreatedEmail(ticket as Ticket, customer, portalToken)
        break

      case 'ticket_resolved':
        result = await sendTicketResolvedEmail(ticket as Ticket, customer, portalToken)
        break

      case 'agent_reply':
        // Fetch the message
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('id', messageId!)
          .single()

        if (messageError || !message) {
          console.error('[Email API] Message fetch error:', messageError)
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          )
        }

        result = await sendAgentReplyEmail(ticket as Ticket, message as Message, customer, portalToken)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    if (!result.success) {
      console.error('[Email API] Send failed:', result.error)
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: result.error,
          emailLogId: result.emailLogId,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailLogId: result.emailLogId,
      message: `Email sent successfully`,
    })

  } catch (error) {
    console.error('[Email API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for checking email status (optional utility)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailLogId = searchParams.get('id')
    const ticketId = searchParams.get('ticketId')

    if (!emailLogId && !ticketId) {
      return NextResponse.json(
        { error: 'Either id or ticketId parameter is required' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    if (emailLogId) {
      // Get single email log
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('id', emailLogId)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Email log not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ emailLog: data })
    }

    // Get all email logs for a ticket
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Email API] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      emailLogs: data,
      total: data.length,
    })

  } catch (error) {
    console.error('[Email API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
