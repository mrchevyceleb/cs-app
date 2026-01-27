import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WorkflowTriggerEvent, WorkflowCondition, WorkflowAction } from '@/types/database'

// GET /api/workflows - List all workflow rules
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('is_active')
    const triggerEvent = searchParams.get('trigger_event') as WorkflowTriggerEvent | null
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('workflow_rules')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by active status if provided
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Filter by trigger event if provided
    if (triggerEvent) {
      query = query.eq('trigger_event', triggerEvent)
    }

    const { data: rules, error, count } = await query

    if (error) {
      console.error('Error fetching workflow rules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workflow rules' },
        { status: 500 }
      )
    }

    // Parse JSONB fields
    const parsedRules = (rules || []).map(rule => ({
      ...rule,
      conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
      actions: Array.isArray(rule.actions) ? rule.actions : [],
    }))

    return NextResponse.json({
      rules: parsedRules,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Workflow rules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/workflows - Create a new workflow rule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      is_active = true,
      trigger_event,
      conditions = [],
      actions = [],
      priority = 0,
    } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!trigger_event) {
      return NextResponse.json(
        { error: 'Trigger event is required' },
        { status: 400 }
      )
    }

    const validTriggerEvents: WorkflowTriggerEvent[] = [
      'ticket_created',
      'status_changed',
      'priority_changed',
      'ticket_assigned',
      'sla_breach',
      'message_received',
    ]

    if (!validTriggerEvents.includes(trigger_event)) {
      return NextResponse.json(
        { error: `Invalid trigger event. Must be one of: ${validTriggerEvents.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate conditions format
    if (!Array.isArray(conditions)) {
      return NextResponse.json(
        { error: 'Conditions must be an array' },
        { status: 400 }
      )
    }

    for (const condition of conditions as WorkflowCondition[]) {
      if (!condition.field || !condition.operator) {
        return NextResponse.json(
          { error: 'Each condition must have a field and operator' },
          { status: 400 }
        )
      }
    }

    // Validate actions format
    if (!Array.isArray(actions)) {
      return NextResponse.json(
        { error: 'Actions must be an array' },
        { status: 400 }
      )
    }

    for (const action of actions as WorkflowAction[]) {
      if (!action.type) {
        return NextResponse.json(
          { error: 'Each action must have a type' },
          { status: 400 }
        )
      }
    }

    const { data: rule, error } = await supabase
      .from('workflow_rules')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_active,
        trigger_event,
        conditions,
        actions,
        priority,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workflow rule:', error)
      return NextResponse.json(
        { error: 'Failed to create workflow rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Create workflow rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
