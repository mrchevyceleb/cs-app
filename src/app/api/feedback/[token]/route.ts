import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Get admin Supabase client for feedback operations
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  return createClient(supabaseUrl, serviceKey)
}

// GET /api/feedback/[token] - Validate token and get ticket info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getAdminClient()

    // Look up the feedback record by token
    const { data: feedback, error } = await supabase
      .from('ticket_feedback')
      .select(`
        id,
        ticket_id,
        customer_id,
        submitted_at,
        token_expires_at,
        ticket:tickets(
          id,
          subject
        ),
        customer:customers(
          id,
          name,
          email
        )
      `)
      .eq('feedback_token', token)
      .single()

    if (error || !feedback) {
      return NextResponse.json(
        { error: 'Invalid or unknown feedback link' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (feedback.token_expires_at) {
      const expiresAt = new Date(feedback.token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This feedback link has expired' },
          { status: 410 }
        )
      }
    }

    // Check if feedback was already submitted
    if (feedback.submitted_at) {
      return NextResponse.json(
        { error: 'Feedback has already been submitted for this ticket' },
        { status: 409 }
      )
    }

    // Return ticket info for the feedback form
    // Supabase returns single relation as object when using .single(), arrays otherwise
    const ticket = feedback.ticket as unknown as { id: string; subject: string } | null
    const customer = feedback.customer as unknown as { id: string; name: string | null; email: string | null } | null

    return NextResponse.json({
      ticketId: feedback.ticket_id,
      ticketSubject: ticket?.subject || 'Support Request',
      customerName: customer?.name || null,
      customerId: customer?.id || null,
    })
  } catch (error) {
    console.error('Feedback token validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate feedback link' },
      { status: 500 }
    )
  }
}

// POST /api/feedback/[token] - Submit feedback using token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { rating, comment } = body

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate comment length
    if (comment && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json(
        { error: 'Comment must be 500 characters or less' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Look up the feedback record by token
    const { data: feedback, error: lookupError } = await supabase
      .from('ticket_feedback')
      .select('id, ticket_id, customer_id, submitted_at, token_expires_at')
      .eq('feedback_token', token)
      .single()

    if (lookupError || !feedback) {
      return NextResponse.json(
        { error: 'Invalid or unknown feedback link' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (feedback.token_expires_at) {
      const expiresAt = new Date(feedback.token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This feedback link has expired' },
          { status: 410 }
        )
      }
    }

    // Check if feedback was already submitted
    if (feedback.submitted_at) {
      return NextResponse.json(
        { error: 'Feedback has already been submitted for this ticket' },
        { status: 409 }
      )
    }

    // Update the feedback record with the rating and comment
    const { data: updatedFeedback, error: updateError } = await supabase
      .from('ticket_feedback')
      .update({
        rating,
        comment: comment || null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', feedback.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating feedback:', updateError)
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    // Log the feedback submission event (optional - add to ticket_events if desired)
    // This could trigger notifications or other workflows

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedback: {
        id: updatedFeedback.id,
        rating: updatedFeedback.rating,
        submitted_at: updatedFeedback.submitted_at,
      },
    })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
