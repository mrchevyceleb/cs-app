import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Get admin Supabase client for feedback operations
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  return createClient(supabaseUrl, serviceKey)
}

// Generate a secure feedback token
function generateFeedbackToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

// GET /api/feedback - List feedback with filters (for analytics)
export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const rating = searchParams.get('rating')
    const agentId = searchParams.get('agentId')
    const hasComment = searchParams.get('hasComment')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    // Build query
    let query = supabase
      .from('ticket_feedback')
      .select(`
        *,
        ticket:tickets(
          id,
          subject,
          status,
          priority,
          assigned_agent_id,
          created_at,
          agent:agents!assigned_agent_id(id, name, avatar_url)
        ),
        customer:customers(id, name, email)
      `, { count: 'exact' })
      .not('submitted_at', 'is', null) // Only submitted feedback
      .order('submitted_at', { ascending: false })

    // Apply filters
    if (startDate) {
      query = query.gte('submitted_at', startDate)
    }

    if (endDate) {
      query = query.lte('submitted_at', endDate)
    }

    if (rating) {
      query = query.eq('rating', parseInt(rating))
    }

    if (hasComment === 'true') {
      query = query.not('comment', 'is', null)
    } else if (hasComment === 'false') {
      query = query.is('comment', null)
    }

    // Filter by agent (need to join through ticket)
    // Note: Supabase doesn't support filtering on joined columns directly
    // We'll need to handle this differently or post-filter

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: feedback, error, count } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    // Filter by agent if specified (post-filter since Supabase can't filter on joined columns)
    let filteredFeedback = feedback || []
    if (agentId) {
      filteredFeedback = filteredFeedback.filter((f) => {
        const ticket = f.ticket as { assigned_agent_id?: string | null } | null
        return ticket?.assigned_agent_id === agentId
      })
    }

    // Calculate metrics if requested
    let metrics = null
    if (includeMetrics) {
      // Build a separate query for metrics
      let metricsQuery = supabase
        .from('ticket_feedback')
        .select('rating')
        .not('submitted_at', 'is', null)

      if (startDate) {
        metricsQuery = metricsQuery.gte('submitted_at', startDate)
      }
      if (endDate) {
        metricsQuery = metricsQuery.lte('submitted_at', endDate)
      }

      const { data: metricsData } = await metricsQuery

      if (metricsData && metricsData.length > 0) {
        const ratings = metricsData.map((f) => f.rating)
        const distribution = [1, 2, 3, 4, 5].map((r) => {
          const count = ratings.filter((rating) => rating === r).length
          return {
            rating: r,
            count,
            percentage: (count / ratings.length) * 100,
          }
        })

        metrics = {
          totalResponses: ratings.length,
          averageScore: ratings.reduce((a, b) => a + b, 0) / ratings.length,
          distribution,
        }
      }
    }

    return NextResponse.json({
      feedback: filteredFeedback,
      total: count,
      limit,
      offset,
      ...(metrics && { metrics }),
    })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/feedback - Create a feedback request for a ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient()
    const body = await request.json()

    const { ticketId, customerId, expiresInDays = 7 } = body

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId is required' },
        { status: 400 }
      )
    }

    // Verify ticket exists and get customer info if not provided
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, customer_id, subject, customer:customers(id, name, email)')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const resolvedCustomerId = customerId || ticket.customer_id

    // Check if feedback request already exists for this ticket
    const { data: existingFeedback } = await supabase
      .from('ticket_feedback')
      .select('id, submitted_at, feedback_token')
      .eq('ticket_id', ticketId)
      .single()

    if (existingFeedback) {
      // If already submitted, return error
      if (existingFeedback.submitted_at) {
        return NextResponse.json(
          { error: 'Feedback has already been submitted for this ticket' },
          { status: 409 }
        )
      }

      // If not submitted, return the existing token
      const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/feedback/${existingFeedback.feedback_token}`
      return NextResponse.json({
        feedbackId: existingFeedback.id,
        feedbackToken: existingFeedback.feedback_token,
        feedbackUrl,
        existing: true,
      })
    }

    // Generate feedback token
    const feedbackToken = generateFeedbackToken()
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + expiresInDays)

    // Create feedback request record
    const { data: feedback, error: createError } = await supabase
      .from('ticket_feedback')
      .insert({
        ticket_id: ticketId,
        customer_id: resolvedCustomerId,
        feedback_token: feedbackToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        rating: null,
        submitted_at: null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating feedback request:', createError)
      return NextResponse.json(
        { error: 'Failed to create feedback request' },
        { status: 500 }
      )
    }

    // Generate feedback URL
    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/feedback/${feedbackToken}`

    return NextResponse.json({
      feedbackId: feedback.id,
      feedbackToken,
      feedbackUrl,
      expiresAt: tokenExpiresAt.toISOString(),
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
      },
      customer: ticket.customer,
    }, { status: 201 })
  } catch (error) {
    console.error('Create feedback request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
