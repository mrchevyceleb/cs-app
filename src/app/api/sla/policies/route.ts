import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/sla/policies - List all SLA policies
 * Used for settings/admin page and SLA configuration
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Optional filter by priority
    const priority = searchParams.get('priority')

    // Build query
    let query = supabase
      .from('sla_policies')
      .select('*')
      .order('priority', { ascending: true })
      .order('name', { ascending: true })

    // Apply priority filter if provided
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority as 'low' | 'normal' | 'high' | 'urgent')
    }

    const { data: policies, error } = await query

    if (error) {
      console.error('Error fetching SLA policies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SLA policies' },
        { status: 500 }
      )
    }

    return NextResponse.json({ policies })
  } catch (error) {
    console.error('SLA Policies API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sla/policies - Create a new SLA policy
 * Admin only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      description,
      priority,
      first_response_hours,
      resolution_hours,
      business_hours_only = false,
      is_default = false,
    } = body

    // Validate required fields
    if (!name || !priority || !first_response_hours || !resolution_hours) {
      return NextResponse.json(
        { error: 'Missing required fields: name, priority, first_response_hours, resolution_hours' },
        { status: 400 }
      )
    }

    // Validate priority value
    const validPriorities = ['low', 'normal', 'high', 'urgent']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value. Must be one of: low, normal, high, urgent' },
        { status: 400 }
      )
    }

    // Validate hours are positive numbers
    if (first_response_hours <= 0 || resolution_hours <= 0) {
      return NextResponse.json(
        { error: 'Response hours must be positive numbers' },
        { status: 400 }
      )
    }

    // If setting as default, first unset any existing default for this priority
    if (is_default) {
      await supabase
        .from('sla_policies')
        .update({ is_default: false })
        .eq('priority', priority)
        .eq('is_default', true)
    }

    // Create the policy
    const { data: policy, error } = await supabase
      .from('sla_policies')
      .insert({
        name,
        description: description || null,
        priority,
        first_response_hours,
        resolution_hours,
        business_hours_only,
        is_default,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating SLA policy:', error)
      return NextResponse.json(
        { error: 'Failed to create SLA policy' },
        { status: 500 }
      )
    }

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error) {
    console.error('Create SLA Policy API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
