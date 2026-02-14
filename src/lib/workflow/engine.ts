/**
 * Workflow Rules Engine
 *
 * This is the core workflow engine that processes workflow rules when trigger events occur.
 * It coordinates condition evaluation and action execution for ticket automation.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  Database,
  Json,
  Ticket,
  WorkflowRule,
  WorkflowCondition,
  WorkflowAction,
  WorkflowTriggerEvent,
  WorkflowActionResult,
  WorkflowExecution,
  WorkflowTestResult,
} from '@/types/database'
import { evaluateConditions, WorkflowEventData, TicketWithCustomerForCondition } from './conditions'
import { executeActions, ActionContext } from './actions'

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  supabase: SupabaseClient<Database>
  currentAgentId?: string | null
}

/**
 * Result of processing workflows for an event
 */
export interface WorkflowProcessingResult {
  triggered: number
  executed: number
  results: Array<{
    rule: WorkflowRule
    matched: boolean
    actions: WorkflowActionResult[]
    error?: string
  }>
}

/**
 * Fetch active workflow rules for a trigger event
 */
export async function getActiveWorkflowRules(
  supabase: SupabaseClient<Database>,
  triggerEvent: WorkflowTriggerEvent
): Promise<WorkflowRule[]> {
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_event', triggerEvent)
    .order('priority', { ascending: false })

  if (error) {
    console.error('Error fetching workflow rules:', error)
    return []
  }

  // Parse JSONB fields and cast to WorkflowRule[]
  return (data || []).map(rule => ({
    ...rule,
    conditions: (Array.isArray(rule.conditions) ? rule.conditions : []) as unknown as WorkflowCondition[],
    actions: (Array.isArray(rule.actions) ? rule.actions : []) as unknown as WorkflowAction[],
  })) as unknown as WorkflowRule[]
}

/**
 * Fetch a ticket with customer information for condition evaluation
 */
export async function getTicketForWorkflow(
  supabase: SupabaseClient<Database>,
  ticketId: string
): Promise<TicketWithCustomerForCondition | null> {
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    console.error('Error fetching ticket for workflow:', error)
    return null
  }

  return ticket as TicketWithCustomerForCondition
}

/**
 * Log a workflow execution to the database
 */
export async function logWorkflowExecution(
  supabase: SupabaseClient<Database>,
  execution: Omit<WorkflowExecution, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase.from('workflow_executions').insert({
    workflow_rule_id: execution.workflow_rule_id,
    ticket_id: execution.ticket_id,
    trigger_event: execution.trigger_event,
    event_data: execution.event_data as Json,
    conditions_matched: execution.conditions_matched,
    actions_executed: execution.actions_executed as unknown as Json,
    status: execution.status,
    error_message: execution.error_message,
    started_at: execution.started_at,
    completed_at: execution.completed_at,
  })

  if (error) {
    console.error('Error logging workflow execution:', error)
  }
}

/**
 * Process a single workflow rule against a ticket
 */
export async function processWorkflowRule(
  rule: WorkflowRule,
  ticket: TicketWithCustomerForCondition,
  eventData: WorkflowEventData,
  context: WorkflowContext
): Promise<{
  matched: boolean
  actions: WorkflowActionResult[]
  error?: string
}> {
  const { supabase, currentAgentId } = context
  const startedAt = new Date().toISOString()

  try {
    // Evaluate conditions
    const { allMatched, results: conditionResults } = evaluateConditions(
      rule.conditions,
      ticket,
      eventData
    )

    if (!allMatched) {
      // Log non-matching execution
      await logWorkflowExecution(supabase, {
        workflow_rule_id: rule.id,
        ticket_id: ticket.id,
        trigger_event: rule.trigger_event,
        event_data: eventData,
        conditions_matched: false,
        actions_executed: [],
        status: 'completed',
        error_message: null,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      })

      return { matched: false, actions: [] }
    }

    // Execute actions
    const actionContext: ActionContext = {
      ticket: ticket as Ticket,
      supabase,
      currentAgentId,
      eventData,
    }

    const actionResults = await executeActions(rule.actions, actionContext)

    // Log successful execution
    await logWorkflowExecution(supabase, {
      workflow_rule_id: rule.id,
      ticket_id: ticket.id,
      trigger_event: rule.trigger_event,
      event_data: eventData,
      conditions_matched: true,
      actions_executed: actionResults,
      status: 'completed',
      error_message: null,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })

    return { matched: true, actions: actionResults }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed execution
    await logWorkflowExecution(supabase, {
      workflow_rule_id: rule.id,
      ticket_id: ticket.id,
      trigger_event: rule.trigger_event,
      event_data: eventData,
      conditions_matched: false,
      actions_executed: [],
      status: 'failed',
      error_message: errorMessage,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })

    return { matched: false, actions: [], error: errorMessage }
  }
}

/**
 * Main entry point: Process all active workflows for a trigger event
 */
export async function processWorkflows(
  triggerEvent: WorkflowTriggerEvent,
  ticketId: string,
  eventData: WorkflowEventData,
  context: WorkflowContext
): Promise<WorkflowProcessingResult> {
  const { supabase } = context

  // Get ticket with customer data
  const ticket = await getTicketForWorkflow(supabase, ticketId)
  if (!ticket) {
    return {
      triggered: 0,
      executed: 0,
      results: [],
    }
  }

  // Get active workflow rules for this trigger
  const rules = await getActiveWorkflowRules(supabase, triggerEvent)

  if (rules.length === 0) {
    return {
      triggered: 0,
      executed: 0,
      results: [],
    }
  }

  // Process each rule
  const results = []
  let executedCount = 0

  for (const rule of rules) {
    const result = await processWorkflowRule(rule, ticket, eventData, context)
    results.push({ rule, ...result })

    if (result.matched) {
      executedCount++
    }
  }

  return {
    triggered: rules.length,
    executed: executedCount,
    results,
  }
}

/**
 * Test a workflow rule against sample data without executing actions
 */
export async function testWorkflowRule(
  rule: Partial<WorkflowRule>,
  ticket: TicketWithCustomerForCondition,
  eventData: WorkflowEventData = {}
): Promise<WorkflowTestResult> {
  const conditions = rule.conditions || []
  const actions = rule.actions || []

  const { allMatched, results } = evaluateConditions(conditions, ticket, eventData)

  return {
    conditionsMatched: allMatched,
    conditionResults: results,
    actionsToExecute: allMatched ? actions : [],
  }
}

/**
 * Trigger event display names for UI
 */
export const TRIGGER_EVENT_DISPLAY_NAMES: Record<WorkflowTriggerEvent, string> = {
  ticket_created: 'Ticket Created',
  status_changed: 'Status Changed',
  priority_changed: 'Priority Changed',
  ticket_assigned: 'Ticket Assigned',
  message_received: 'Message Received',
}

/**
 * Trigger event descriptions for UI
 */
export const TRIGGER_EVENT_DESCRIPTIONS: Record<WorkflowTriggerEvent, string> = {
  ticket_created: 'Triggered when a new ticket is created',
  status_changed: 'Triggered when a ticket status changes',
  priority_changed: 'Triggered when ticket priority is updated',
  ticket_assigned: 'Triggered when a ticket is assigned to an agent',
  message_received: 'Triggered when a new message is added to a ticket',
}

/**
 * Get available trigger events
 */
export const TRIGGER_EVENTS: WorkflowTriggerEvent[] = [
  'ticket_created',
  'status_changed',
  'priority_changed',
  'ticket_assigned',
  'message_received',
]

/**
 * Helper to create workflow event data for specific triggers
 */
export function createEventData(
  triggerEvent: WorkflowTriggerEvent,
  data: Record<string, unknown> = {}
): WorkflowEventData {
  switch (triggerEvent) {
    case 'status_changed':
      return {
        old_status: data.old_status as string,
        new_status: data.new_status as string,
        ...data,
      }
    case 'priority_changed':
      return {
        old_priority: data.old_priority as string,
        new_priority: data.new_priority as string,
        ...data,
      }
    case 'ticket_assigned':
      return {
        old_agent_id: data.old_agent_id as string | null,
        new_agent_id: data.new_agent_id as string,
        ...data,
      }
    case 'message_received':
      return {
        message_content: data.message_content as string,
        message_sender_type: data.message_sender_type as 'customer' | 'agent' | 'ai',
        ...data,
      }
    default:
      return data as WorkflowEventData
  }
}

// Re-export types and utilities from submodules
export { evaluateConditions, evaluateCondition } from './conditions'
export type { WorkflowEventData } from './conditions'
export { executeActions, executeAction } from './actions'
export type { ActionContext } from './actions'
export {
  FIELD_OPERATORS,
  FIELD_DISPLAY_NAMES,
  OPERATOR_DISPLAY_NAMES,
  FIELD_VALUE_OPTIONS,
} from './conditions'
export {
  ACTION_TYPE_DISPLAY_NAMES,
  ACTION_TYPE_DESCRIPTIONS,
  ACTION_TYPE_CONFIG,
} from './actions'
