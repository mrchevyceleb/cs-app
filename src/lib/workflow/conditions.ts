/**
 * Workflow Condition Evaluators
 *
 * This module provides condition evaluation logic for the workflow rules engine.
 * It supports various operators for comparing ticket fields against expected values.
 */

import {
  Ticket,
  Customer,
  WorkflowCondition,
  WorkflowConditionOperator,
  WorkflowConditionField,
} from '@/types/database'

// Type for event data that may contain additional context
export interface WorkflowEventData {
  old_status?: string
  new_status?: string
  old_priority?: string
  new_priority?: string
  old_agent_id?: string | null
  new_agent_id?: string | null
  breach_type?: 'first_response' | 'resolution'
  message_content?: string
  message_sender_type?: 'customer' | 'agent' | 'ai'
  [key: string]: unknown
}

// Extended ticket type with customer for condition evaluation
export interface TicketWithCustomerForCondition extends Ticket {
  customer?: Customer | null
}

/**
 * Get the value of a field from the ticket or event data
 */
export function getFieldValue(
  field: WorkflowConditionField,
  ticket: TicketWithCustomerForCondition,
  eventData: WorkflowEventData = {}
): unknown {
  switch (field) {
    case 'status':
      return ticket.status
    case 'priority':
      return ticket.priority
    case 'subject':
      return ticket.subject
    case 'tags':
      return ticket.tags || []
    case 'customer_language':
      return ticket.customer?.preferred_language || 'en'
    case 'ai_handled':
      return ticket.ai_handled
    case 'assigned_agent_id':
      return ticket.assigned_agent_id
    default:
      // Check event data for dynamic fields
      return eventData[field]
  }
}

/**
 * Evaluate equals operator
 */
function evaluateEquals(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined || expected === ''
  }

  // For boolean comparison
  if (typeof expected === 'boolean') {
    if (typeof actual === 'boolean') return actual === expected
    if (typeof actual === 'string') return actual.toLowerCase() === String(expected)
    return Boolean(actual) === expected
  }

  // Case-insensitive string comparison
  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.toLowerCase() === expected.toLowerCase()
  }

  return actual === expected
}

/**
 * Evaluate not_equals operator
 */
function evaluateNotEquals(actual: unknown, expected: unknown): boolean {
  return !evaluateEquals(actual, expected)
}

/**
 * Evaluate contains operator (for strings and arrays)
 */
function evaluateContains(actual: unknown, expected: unknown): boolean {
  // For array fields (like tags)
  if (Array.isArray(actual)) {
    if (Array.isArray(expected)) {
      // Check if actual contains all expected values
      return expected.every(exp =>
        actual.some(act =>
          typeof act === 'string' && typeof exp === 'string'
            ? act.toLowerCase() === exp.toLowerCase()
            : act === exp
        )
      )
    }
    // Check if actual contains the expected value
    const expectedStr = String(expected).toLowerCase()
    return actual.some(item =>
      typeof item === 'string'
        ? item.toLowerCase() === expectedStr
        : item === expected
    )
  }

  // For string fields - support regex-like patterns with |
  if (typeof actual === 'string' && typeof expected === 'string') {
    const patterns = expected.split('|').map(p => p.trim().toLowerCase())
    const actualLower = actual.toLowerCase()
    return patterns.some(pattern => actualLower.includes(pattern))
  }

  return false
}

/**
 * Evaluate not_contains operator
 */
function evaluateNotContains(actual: unknown, expected: unknown): boolean {
  return !evaluateContains(actual, expected)
}

/**
 * Evaluate greater_than operator (for numbers)
 */
function evaluateGreaterThan(actual: unknown, expected: unknown): boolean {
  const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual))
  const expectedNum = typeof expected === 'number' ? expected : parseFloat(String(expected))

  if (isNaN(actualNum) || isNaN(expectedNum)) {
    return false
  }

  return actualNum > expectedNum
}

/**
 * Evaluate less_than operator (for numbers)
 */
function evaluateLessThan(actual: unknown, expected: unknown): boolean {
  const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual))
  const expectedNum = typeof expected === 'number' ? expected : parseFloat(String(expected))

  if (isNaN(actualNum) || isNaN(expectedNum)) {
    return false
  }

  return actualNum < expectedNum
}

/**
 * Evaluate in operator (for enum values)
 */
function evaluateIn(actual: unknown, expected: unknown): boolean {
  if (!Array.isArray(expected)) {
    // If expected is a string with | separator, split it
    if (typeof expected === 'string') {
      const values = expected.split('|').map(v => v.trim().toLowerCase())
      const actualStr = String(actual).toLowerCase()
      return values.includes(actualStr)
    }
    return evaluateEquals(actual, expected)
  }

  const actualStr = String(actual).toLowerCase()
  return expected.some(exp =>
    typeof exp === 'string'
      ? exp.toLowerCase() === actualStr
      : exp === actual
  )
}

/**
 * Evaluate not_in operator
 */
function evaluateNotIn(actual: unknown, expected: unknown): boolean {
  return !evaluateIn(actual, expected)
}

/**
 * Evaluate a single condition against a ticket
 */
export function evaluateCondition(
  condition: WorkflowCondition,
  ticket: TicketWithCustomerForCondition,
  eventData: WorkflowEventData = {}
): { matched: boolean; actualValue: unknown } {
  const actualValue = getFieldValue(condition.field, ticket, eventData)
  const { operator, value: expectedValue } = condition

  let matched: boolean

  switch (operator) {
    case 'equals':
      matched = evaluateEquals(actualValue, expectedValue)
      break
    case 'not_equals':
      matched = evaluateNotEquals(actualValue, expectedValue)
      break
    case 'contains':
      matched = evaluateContains(actualValue, expectedValue)
      break
    case 'not_contains':
      matched = evaluateNotContains(actualValue, expectedValue)
      break
    case 'greater_than':
      matched = evaluateGreaterThan(actualValue, expectedValue)
      break
    case 'less_than':
      matched = evaluateLessThan(actualValue, expectedValue)
      break
    case 'in':
      matched = evaluateIn(actualValue, expectedValue)
      break
    case 'not_in':
      matched = evaluateNotIn(actualValue, expectedValue)
      break
    default:
      // Unknown operator - fail safely
      matched = false
  }

  return { matched, actualValue }
}

/**
 * Evaluate all conditions for a workflow rule
 * Returns true only if ALL conditions match (AND logic)
 */
export function evaluateConditions(
  conditions: WorkflowCondition[],
  ticket: TicketWithCustomerForCondition,
  eventData: WorkflowEventData = {}
): {
  allMatched: boolean
  results: Array<{
    condition: WorkflowCondition
    matched: boolean
    actualValue: unknown
  }>
} {
  // If no conditions, the rule matches
  if (!conditions || conditions.length === 0) {
    return { allMatched: true, results: [] }
  }

  const results = conditions.map(condition => {
    const { matched, actualValue } = evaluateCondition(condition, ticket, eventData)
    return { condition, matched, actualValue }
  })

  const allMatched = results.every(r => r.matched)

  return { allMatched, results }
}

/**
 * Available operators for each field type
 */
export const FIELD_OPERATORS: Record<WorkflowConditionField, WorkflowConditionOperator[]> = {
  status: ['equals', 'not_equals', 'in', 'not_in'],
  priority: ['equals', 'not_equals', 'in', 'not_in'],
  subject: ['contains', 'not_contains', 'equals', 'not_equals'],
  tags: ['contains', 'not_contains'],
  customer_language: ['equals', 'not_equals', 'in', 'not_in'],
  ai_handled: ['equals', 'not_equals'],
  assigned_agent_id: ['equals', 'not_equals'],
}

/**
 * Field display names for UI
 */
export const FIELD_DISPLAY_NAMES: Record<WorkflowConditionField, string> = {
  status: 'Ticket Status',
  priority: 'Priority',
  subject: 'Subject',
  tags: 'Tags',
  customer_language: 'Customer Language',
  ai_handled: 'AI Handled',
  assigned_agent_id: 'Assigned Agent',
}

/**
 * Operator display names for UI
 */
export const OPERATOR_DISPLAY_NAMES: Record<WorkflowConditionOperator, string> = {
  equals: 'Equals',
  not_equals: 'Does not equal',
  contains: 'Contains',
  not_contains: 'Does not contain',
  greater_than: 'Greater than',
  less_than: 'Less than',
  in: 'Is one of',
  not_in: 'Is not one of',
}

/**
 * Field value options (for enum fields)
 */
export const FIELD_VALUE_OPTIONS: Partial<Record<WorkflowConditionField, { value: string; label: string }[]>> = {
  status: [
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'escalated', label: 'Escalated' },
  ],
  priority: [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ],
  ai_handled: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ],
}
