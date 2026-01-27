import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WorkflowTriggerEvent, WorkflowCondition, WorkflowAction } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/workflows/[id] - Get a single workflow rule
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: rule, error } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !rule) {
      console.error('Error fetching workflow rule:', error)
      return NextResponse.json(
        { error: 'Workflow rule not found' },
        { status: 404 }
      )
    }

    // Parse JSONB fields
    const parsedRule = {
      ...rule,
      conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
      actions: Array.isArray(rule.actions) ? rule.actions : [],
    }

    return NextResponse.json({ rule: parsedRule })
  } catch (error) {
    console.error('Get workflow rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/workflows/[id] - Update a workflow rule
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if rule exists
    const { data: existing } = await supabase
      .from('workflow_rules')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow rule not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      is_active,
      trigger_event,
      conditions,
      actions,
      priority,
    } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Validate and update name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    // Update description
    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    // Update active status
    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active)
    }

    // Validate and update trigger event
    if (trigger_event !== undefined) {
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
      updates.trigger_event = trigger_event
    }

    // Validate and update conditions
    if (conditions !== undefined) {
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
      updates.conditions = conditions
    }

    // Validate and update actions
    if (actions !== undefined) {
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
      updates.actions = actions
    }

    // Update priority
    if (priority !== undefined) {
      updates.priority = Number(priority) || 0
    }

    const { data: rule, error } = await supabase
      .from('workflow_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workflow rule:', error)
      return NextResponse.json(
        { error: 'Failed to update workflow rule' },
        { status: 500 }
      )
    }

    // Parse JSONB fields
    const parsedRule = {
      ...rule,
      conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
      actions: Array.isArray(rule.actions) ? rule.actions : [],
    }

    return NextResponse.json({ rule: parsedRule })
  } catch (error) {
    console.error('Update workflow rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id] - Delete a workflow rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if rule exists
    const { data: existing } = await supabase
      .from('workflow_rules')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow rule not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('workflow_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting workflow rule:', error)
      return NextResponse.json(
        { error: 'Failed to delete workflow rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workflow rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
