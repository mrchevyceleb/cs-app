import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WorkflowCondition, WorkflowAction, Customer } from '@/types/database'
import { testWorkflowRule } from '@/lib/workflow/engine'
import { TicketWithCustomerForCondition, WorkflowEventData } from '@/lib/workflow/conditions'

// POST /api/workflows/test - Test a workflow rule against sample data
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
      conditions = [],
      actions = [],
      trigger_event,
      test_ticket_id,
      test_ticket_data,
      event_data = {},
    } = body

    // Validate that we have either a ticket ID or test data
    if (!test_ticket_id && !test_ticket_data) {
      return NextResponse.json(
        { error: 'Either test_ticket_id or test_ticket_data is required' },
        { status: 400 }
      )
    }

    let ticket: TicketWithCustomerForCondition

    if (test_ticket_id) {
      // Fetch real ticket from database
      const { data: fetchedTicket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', test_ticket_id)
        .single()

      if (error || !fetchedTicket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        )
      }

      ticket = fetchedTicket as TicketWithCustomerForCondition
    } else {
      // Use provided test data
      ticket = {
        id: 'test-ticket-id',
        customer_id: 'test-customer-id',
        subject: test_ticket_data.subject || 'Test Ticket',
        status: test_ticket_data.status || 'open',
        priority: test_ticket_data.priority || 'normal',
        tags: test_ticket_data.tags || [],
        ai_handled: test_ticket_data.ai_handled || false,
        ai_confidence: test_ticket_data.ai_confidence || null,
        assigned_agent_id: test_ticket_data.assigned_agent_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        follow_up_at: null,
        auto_close_at: null,
        customer: {
          id: 'test-customer-id',
          email: test_ticket_data.customer_email || 'test@example.com',
          name: test_ticket_data.customer_name || 'Test Customer',
          preferred_language: test_ticket_data.customer_language || 'en',
          metadata: {},
          created_at: new Date().toISOString(),
        } as Customer,
      } as TicketWithCustomerForCondition
    }

    // Build the partial rule for testing
    const partialRule = {
      trigger_event,
      conditions: conditions as WorkflowCondition[],
      actions: actions as WorkflowAction[],
    }

    // Run the test
    const result = await testWorkflowRule(
      partialRule,
      ticket,
      event_data as WorkflowEventData
    )

    // Prepare response with detailed feedback
    const response = {
      success: true,
      test_result: {
        conditions_matched: result.conditionsMatched,
        condition_details: result.conditionResults.map((cr) => ({
          field: cr.condition.field,
          operator: cr.condition.operator,
          expected_value: cr.condition.value,
          actual_value: cr.actualValue,
          matched: cr.matched,
        })),
        actions_to_execute: result.actionsToExecute.map((action) => ({
          type: action.type,
          value: action.value,
          filter: action.filter,
          template: action.template,
        })),
        would_execute: result.conditionsMatched && result.actionsToExecute.length > 0,
      },
      ticket_snapshot: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        tags: ticket.tags,
        ai_handled: ticket.ai_handled,
        assigned_agent_id: ticket.assigned_agent_id,
        customer_language: ticket.customer?.preferred_language || 'en',
      },
      event_data,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Test workflow rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
