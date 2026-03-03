/**
 * Workflow Display Constants
 *
 * These are UI-only constants for rendering workflow configuration in the dashboard.
 * Separated from the execution logic in actions.ts and engine.ts to avoid pulling
 * server-only dependencies (like @sendgrid/mail) into client component bundles.
 */

import type { WorkflowActionType, WorkflowTriggerEvent } from '@/types/database'

// ── Trigger Event Constants ──────────────────────────────

export const TRIGGER_EVENT_DISPLAY_NAMES: Record<WorkflowTriggerEvent, string> = {
  ticket_created: 'Ticket Created',
  status_changed: 'Status Changed',
  priority_changed: 'Priority Changed',
  ticket_assigned: 'Ticket Assigned',
  message_received: 'Message Received',
}

export const TRIGGER_EVENT_DESCRIPTIONS: Record<WorkflowTriggerEvent, string> = {
  ticket_created: 'Triggered when a new ticket is created',
  status_changed: 'Triggered when a ticket status changes',
  priority_changed: 'Triggered when ticket priority is updated',
  ticket_assigned: 'Triggered when a ticket is assigned to an agent',
  message_received: 'Triggered when a new message is added to a ticket',
}

export const TRIGGER_EVENTS: WorkflowTriggerEvent[] = [
  'ticket_created',
  'status_changed',
  'priority_changed',
  'ticket_assigned',
  'message_received',
]

// ── Action Type Constants ────────────────────────────────

/**
 * Action type display names for UI
 */
export const ACTION_TYPE_DISPLAY_NAMES: Record<WorkflowActionType, string> = {
  set_status: 'Set Status',
  set_priority: 'Set Priority',
  add_tag: 'Add Tag',
  remove_tag: 'Remove Tag',
  assign_agent: 'Assign to Agent',
  notify_agents: 'Notify Agents',
  send_email: 'Send Email',
  add_internal_note: 'Add Internal Note',
}

/**
 * Action type descriptions for UI
 */
export const ACTION_TYPE_DESCRIPTIONS: Record<WorkflowActionType, string> = {
  set_status: 'Change the ticket status',
  set_priority: 'Change the ticket priority',
  add_tag: 'Add a tag to the ticket',
  remove_tag: 'Remove a tag from the ticket',
  assign_agent: 'Assign the ticket to a specific agent',
  notify_agents: 'Send notifications to agents',
  send_email: 'Send an email to the customer',
  add_internal_note: 'Add an internal note to the ticket',
}

/**
 * Configuration options for each action type
 */
export const ACTION_TYPE_CONFIG: Record<
  WorkflowActionType,
  {
    requiresValue: boolean
    valueType: 'text' | 'select' | 'agent' | 'template'
    valueOptions?: { value: string; label: string }[]
    requiresFilter?: boolean
    filterOptions?: { value: string; label: string }[]
    requiresTemplate?: boolean
  }
> = {
  set_status: {
    requiresValue: true,
    valueType: 'select',
    valueOptions: [
      { value: 'open', label: 'Open' },
      { value: 'pending', label: 'Pending' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'escalated', label: 'Escalated' },
    ],
  },
  set_priority: {
    requiresValue: true,
    valueType: 'select',
    valueOptions: [
      { value: 'low', label: 'Low' },
      { value: 'normal', label: 'Normal' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
  },
  add_tag: {
    requiresValue: true,
    valueType: 'text',
  },
  remove_tag: {
    requiresValue: true,
    valueType: 'text',
  },
  assign_agent: {
    requiresValue: true,
    valueType: 'agent',
  },
  notify_agents: {
    requiresValue: false,
    valueType: 'template',
    requiresFilter: true,
    filterOptions: [
      { value: 'all', label: 'All Agents' },
      { value: 'online', label: 'Online Agents Only' },
      { value: 'assigned', label: 'Assigned Agent' },
    ],
    requiresTemplate: true,
  },
  send_email: {
    requiresValue: false,
    valueType: 'template',
    requiresTemplate: true,
  },
  add_internal_note: {
    requiresValue: false,
    valueType: 'template',
    requiresTemplate: true,
  },
}
