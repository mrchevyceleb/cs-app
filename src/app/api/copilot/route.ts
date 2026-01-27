import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createSSEStream } from '@/lib/claude/agent'
import type { ToolContext } from '@/lib/claude/types'
import type { Database } from '@/types/database'

// Create service role client for tool operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient<Database>(url, serviceKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, ticketId, customerId, conversationHistory } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Check for auth bypass in development
    const isDevBypass =
      process.env.NODE_ENV === 'development' &&
      request.headers.get('x-dev-bypass') === 'true'

    let agentId: string | undefined
    let agentName: string | undefined

    // Get current agent from session (unless in dev bypass mode)
    if (!isDevBypass) {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Get agent info
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name')
        .eq('id', user.id)
        .single()

      agentId = agent?.id
      agentName = agent?.name
    } else {
      // Dev bypass mode - use default values
      agentId = 'dev-agent'
      agentName = 'Dev Agent'
    }

    // Get service client for tool operations
    const serviceClient = getServiceClient()

    // Build tool context
    const toolContext: ToolContext = {
      supabase: serviceClient,
      agentId,
      ticketId,
      customerId,
    }

    // Fetch ticket and customer info for context
    let ticketSubject: string | undefined
    let customerName: string | undefined

    if (ticketId) {
      const { data: ticket } = await serviceClient
        .from('tickets')
        .select(`
          subject,
          customer:customers(name)
        `)
        .eq('id', ticketId)
        .single()

      if (ticket) {
        ticketSubject = ticket.subject
        const customer = ticket.customer as { name: string | null } | null
        customerName = customer?.name || undefined
      }
    }

    if (customerId && !customerName) {
      const { data: customer } = await serviceClient
        .from('customers')
        .select('name')
        .eq('id', customerId)
        .single()

      customerName = customer?.name || undefined
    }

    // Create SSE stream
    const stream = createSSEStream(
      message,
      conversationHistory,
      toolContext,
      {
        ticketId,
        customerId,
        agentId,
        agentName,
        ticketSubject,
        customerName,
      }
    )

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Copilot API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Nova Copilot',
    version: '1.0.0',
    capabilities: [
      'lookup_customer',
      'update_customer',
      'search_tickets',
      'update_ticket',
      'escalate_ticket',
      'get_ticket_summary',
      'search_knowledge_base',
      'generate_response',
      'analyze_sentiment',
      'process_refund',
    ],
  })
}
