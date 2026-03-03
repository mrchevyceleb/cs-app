import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/fix-escalated-queue
 * One-time fix to move escalated tickets from AI queue to human queue.
 * Protected by service role key - only callable by admins.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate service role key is present (basic auth protection)
    const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
    const serviceRoleKey = process.env.SB_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // First, check how many need fixing
    const { data: brokenTickets, error: checkError } = await supabase
      .from('tickets')
      .select('id, subject, status, queue_type, created_at')
      .eq('status', 'escalated')
      .eq('queue_type', 'ai')

    if (checkError) {
      console.error('Error checking tickets:', checkError)
      return NextResponse.json(
        { error: 'Failed to check tickets', details: checkError },
        { status: 500 }
      )
    }

    if (!brokenTickets || brokenTickets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No escalated tickets found in AI queue. All good!',
        fixed: 0,
      })
    }

    console.log(`Found ${brokenTickets.length} escalated ticket(s) in AI queue`)

    // Fix them
    const { error: updateError, count } = await supabase
      .from('tickets')
      .update({ queue_type: 'human' })
      .eq('status', 'escalated')
      .eq('queue_type', 'ai')

    if (updateError) {
      console.error('Error updating tickets:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tickets', details: updateError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${count || brokenTickets.length} ticket(s) moved to human queue`,
      fixed: count || brokenTickets.length,
      tickets: brokenTickets.map(t => t.id),
    })
  } catch (error) {
    console.error('Fix escalated queue error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
