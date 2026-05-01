import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendTicketCreatedEmail } from '@/lib/email'
import { generatePortalToken } from '@/lib/portal/auth'
import type { Customer } from '@/types/database'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SB_SERVICE_ROLE_KEY is required')
  }
  return createAdminClient(supabaseUrl, serviceKey)
}

// GET /api/tickets - List tickets with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const aiHandled = searchParams.get('aiHandled')
    const queue = searchParams.get('queue') // 'ai' | 'human' | null
    const search = searchParams.get('search')
    const assignedAgent = searchParams.get('assignedAgent') // 'me' | null
    const countOnly = searchParams.get('countOnly') === 'true'
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const parsedOffset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const safeLimit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50
    const safeOffset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0

    // Build query
    let query = supabase
      .from('tickets')
      .select(countOnly ? 'id' : `
        *,
        customer:customers(*)
      `, { count: 'exact', head: countOnly })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status as 'open' | 'pending' | 'resolved' | 'escalated')
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority as 'low' | 'normal' | 'high' | 'urgent')
    }

    if (aiHandled !== null && aiHandled !== 'all') {
      query = query.eq('ai_handled', aiHandled === 'true')
    }

    if (queue && (queue === 'ai' || queue === 'human')) {
      query = query.eq('queue_type', queue)
    }

    if (search) {
      query = query.ilike('subject', `%${search}%`)
    }

    if (assignedAgent === 'me') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        query = query.eq('assigned_agent_id', user.id)
      }
    }

    if (!countOnly) {
      query = query
        .order('created_at', { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1)
    }

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tickets: tickets || [],
      total: count,
      limit: safeLimit,
      offset: safeOffset,
    })
  } catch (error) {
    console.error('Tickets API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_AUTH === 'true'

    if (!isDevBypass && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()
    const body = await request.json()

    let customerId: string | undefined = body.customerId
    const customerEmail: string | undefined = body.customerEmail
    const customerName: string | undefined = body.customerName
    const subject: string | undefined = body.subject
    const initialMessage: string | undefined = body.initialMessage
    const priority: string = body.priority || 'normal'

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!customerId && !customerEmail) {
      return NextResponse.json(
        { error: 'Either customerId or customerEmail is required' },
        { status: 400 }
      )
    }

    // Resolve or create customer if only an email was provided
    if (!customerId && customerEmail) {
      const normalizedEmail = customerEmail.trim().toLowerCase()
      const trimmedName = customerName?.trim() || null

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (existingCustomer) {
        customerId = existingCustomer.id
        if (trimmedName && trimmedName !== existingCustomer.name) {
          await supabase
            .from('customers')
            .update({ name: trimmedName })
            .eq('id', existingCustomer.id)
        }
      } else {
        const { data: createdCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            email: normalizedEmail,
            name: trimmedName,
            metadata: { source: 'dashboard' },
          })
          .select('id')
          .single()

        if (createError || !createdCustomer) {
          // Concurrent ticket creation for the same new email can hit the
          // customers.email unique constraint (Postgres 23505); recover by
          // refetching the row that the other request just inserted.
          const isDuplicate = createError?.code === '23505' || createError?.message?.includes('duplicate')
          if (isDuplicate) {
            const { data: fallbackCustomer, error: fallbackError } = await supabase
              .from('customers')
              .select('id')
              .eq('email', normalizedEmail)
              .maybeSingle()
            if (fallbackError || !fallbackCustomer) {
              console.error('Error resolving duplicate customer:', fallbackError || createError)
              return NextResponse.json(
                { error: 'Failed to create customer' },
                { status: 500 }
              )
            }
            customerId = fallbackCustomer.id
          } else {
            console.error('Error creating customer:', createError)
            return NextResponse.json(
              { error: 'Failed to create customer' },
              { status: 500 }
            )
          }
        } else {
          customerId = createdCustomer.id
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Could not resolve customer' },
        { status: 400 }
      )
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        customer_id: customerId,
        subject: subject.trim(),
        priority,
        status: 'open',
        ai_handled: true,
        ai_confidence: null,
      })
      .select(`
        *,
        customer:customers(*)
      `)
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // If there's an initial message, create it
    if (initialMessage && ticket) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'customer',
          content: initialMessage,
        })

      if (messageError) {
        console.error('Error creating initial message:', messageError)
      }
    }

    // Send ticket created email notification to customer
    if (ticket && ticket.customer) {
      const customer = ticket.customer as Customer
      if (customer.email) {
        const portalToken = await generatePortalToken(customer.id, ticket.id)
        if (!portalToken) {
          console.error('[Tickets API] Failed to generate portal token for ticket created email')
        } else {
          // Send email asynchronously (don't wait for it)
          sendTicketCreatedEmail(ticket, customer, portalToken)
            .then((result) => {
              if (result.success) {
                console.log('[Tickets API] Ticket created email sent:', result.emailLogId)
              } else {
                console.error('[Tickets API] Failed to send ticket created email:', result.error)
              }
            })
            .catch((err) => {
              console.error('[Tickets API] Email send error:', err)
            })
        }
      }
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Create ticket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
