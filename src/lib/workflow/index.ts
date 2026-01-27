/**
 * Workflow Rules Engine
 *
 * This module provides automated ticket processing based on configurable rules.
 * Rules can be triggered by various events and execute actions when conditions match.
 *
 * @example
 * ```typescript
 * import { processWorkflows, createEventData } from '@/lib/workflow'
 *
 * // When a ticket is created
 * const result = await processWorkflows(
 *   'ticket_created',
 *   ticketId,
 *   createEventData('ticket_created'),
 *   { supabase }
 * )
 * ```
 */

// Core engine exports
export {
  processWorkflows,
  processWorkflowRule,
  getActiveWorkflowRules,
  getTicketForWorkflow,
  testWorkflowRule,
  logWorkflowExecution,
  createEventData,
  // Constants
  TRIGGER_EVENTS,
  TRIGGER_EVENT_DISPLAY_NAMES,
  TRIGGER_EVENT_DESCRIPTIONS,
} from './engine'

export type {
  WorkflowContext,
  WorkflowProcessingResult,
} from './engine'

// Condition evaluation exports
export {
  evaluateConditions,
  evaluateCondition,
  getFieldValue,
  // Constants
  FIELD_OPERATORS,
  FIELD_DISPLAY_NAMES,
  OPERATOR_DISPLAY_NAMES,
  FIELD_VALUE_OPTIONS,
} from './conditions'

export type {
  WorkflowEventData,
  TicketWithCustomerForCondition,
} from './conditions'

// Action execution exports
export {
  executeActions,
  executeAction,
  // Constants
  ACTION_TYPE_DISPLAY_NAMES,
  ACTION_TYPE_DESCRIPTIONS,
  ACTION_TYPE_CONFIG,
} from './actions'

export type {
  ActionContext,
} from './actions'
