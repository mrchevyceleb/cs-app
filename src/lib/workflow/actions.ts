/**
 * Workflow Action Handlers
 *
 * This module provides action execution logic for the workflow rules engine.
 * Each action type has a dedicated handler that performs the specified operation.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  Database,
  Ticket,
  Agent,
  WorkflowAction,
  WorkflowActionResult,
  WorkflowActionType,
  TicketStatus,
  TicketPriority,
} from '@/types/database'

// Context passed to action handlers
export interface ActionContext {
  ticket: Ticket
  supabase: SupabaseClient<Database>
  currentAgentId?: string | null
  eventData?: Record<string, unknown>
}

// Type for action handler functions
type ActionHandler = (
  action: WorkflowAction,
  context: ActionContext
) => Promise<WorkflowActionResult>

/**
 * Set ticket status
 */
async function handleSetStatus(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase, currentAgentId } = context
  const newStatus = action.value as TicketStatus

  const validStatuses: TicketStatus[] = ['open', 'pending', 'resolved', 'escalated']
  if (!validStatuses.includes(newStatus)) {
    return {
      action,
      success: false,
      error: `Invalid status value: ${newStatus}`,
    }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ticket.id)

  if (error) {
    return { action, success: false, error: error.message }
  }

  // Log the event
  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    agent_id: currentAgentId || null,
    event_type: 'status_changed',
    old_value: ticket.status,
    new_value: newStatus,
    metadata: { workflow_action: true },
  })

  return {
    action,
    success: true,
    result: { old_status: ticket.status, new_status: newStatus },
  }
}

/**
 * Set ticket priority
 */
async function handleSetPriority(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase, currentAgentId } = context
  const newPriority = action.value as TicketPriority

  const validPriorities: TicketPriority[] = ['low', 'normal', 'high', 'urgent']
  if (!validPriorities.includes(newPriority)) {
    return {
      action,
      success: false,
      error: `Invalid priority value: ${newPriority}`,
    }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ priority: newPriority, updated_at: new Date().toISOString() })
    .eq('id', ticket.id)

  if (error) {
    return { action, success: false, error: error.message }
  }

  // Log the event
  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    agent_id: currentAgentId || null,
    event_type: 'priority_changed',
    old_value: ticket.priority,
    new_value: newPriority,
    metadata: { workflow_action: true },
  })

  return {
    action,
    success: true,
    result: { old_priority: ticket.priority, new_priority: newPriority },
  }
}

/**
 * Add tag to ticket
 */
async function handleAddTag(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase, currentAgentId } = context
  const tagToAdd = action.value as string

  if (!tagToAdd || typeof tagToAdd !== 'string') {
    return {
      action,
      success: false,
      error: 'Tag value is required',
    }
  }

  const currentTags = ticket.tags || []
  const normalizedTag = tagToAdd.trim().toLowerCase()

  // Check if tag already exists
  if (currentTags.some(t => t.toLowerCase() === normalizedTag)) {
    return {
      action,
      success: true,
      result: { message: 'Tag already exists', tags: currentTags },
    }
  }

  const newTags = [...currentTags, tagToAdd.trim()]

  const { error } = await supabase
    .from('tickets')
    .update({ tags: newTags, updated_at: new Date().toISOString() })
    .eq('id', ticket.id)

  if (error) {
    return { action, success: false, error: error.message }
  }

  // Log the event
  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    agent_id: currentAgentId || null,
    event_type: 'tagged',
    new_value: tagToAdd.trim(),
    metadata: { workflow_action: true, tag: tagToAdd.trim() },
  })

  return {
    action,
    success: true,
    result: { added_tag: tagToAdd.trim(), tags: newTags },
  }
}

/**
 * Remove tag from ticket
 */
async function handleRemoveTag(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase, currentAgentId } = context
  const tagToRemove = action.value as string

  if (!tagToRemove || typeof tagToRemove !== 'string') {
    return {
      action,
      success: false,
      error: 'Tag value is required',
    }
  }

  const currentTags = ticket.tags || []
  const normalizedTag = tagToRemove.trim().toLowerCase()
  const newTags = currentTags.filter(t => t.toLowerCase() !== normalizedTag)

  // Check if tag was actually removed
  if (newTags.length === currentTags.length) {
    return {
      action,
      success: true,
      result: { message: 'Tag not found', tags: currentTags },
    }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ tags: newTags, updated_at: new Date().toISOString() })
    .eq('id', ticket.id)

  if (error) {
    return { action, success: false, error: error.message }
  }

  // Log the event
  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    agent_id: currentAgentId || null,
    event_type: 'tagged',
    old_value: tagToRemove.trim(),
    metadata: { workflow_action: true, tag_removed: tagToRemove.trim() },
  })

  return {
    action,
    success: true,
    result: { removed_tag: tagToRemove.trim(), tags: newTags },
  }
}

/**
 * Assign ticket to an agent
 */
async function handleAssignAgent(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase, currentAgentId } = context
  const agentId = action.value as string

  if (!agentId || typeof agentId !== 'string') {
    return {
      action,
      success: false,
      error: 'Agent ID is required',
    }
  }

  // Verify agent exists
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return {
      action,
      success: false,
      error: `Agent not found: ${agentId}`,
    }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ assigned_agent_id: agentId, updated_at: new Date().toISOString() })
    .eq('id', ticket.id)

  if (error) {
    return { action, success: false, error: error.message }
  }

  // Log the event
  const eventType = ticket.assigned_agent_id ? 'reassigned' : 'assigned'
  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    agent_id: currentAgentId || null,
    event_type: eventType,
    old_value: ticket.assigned_agent_id,
    new_value: agentId,
    metadata: {
      workflow_action: true,
      new_agent_name: agent.name,
    },
  })

  return {
    action,
    success: true,
    result: {
      previous_agent_id: ticket.assigned_agent_id,
      new_agent_id: agentId,
      agent_name: agent.name,
    },
  }
}

/**
 * Notify agents (create notifications)
 */
async function handleNotifyAgents(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase } = context
  const filter = action.filter || 'all'
  const message = action.template || `Workflow notification for ticket: ${ticket.subject}`

  // Build agent query based on filter
  let agentQuery = supabase.from('agents').select('id, name, email')

  if (filter === 'online') {
    agentQuery = agentQuery.eq('status', 'online')
  } else if (filter === 'assigned' && ticket.assigned_agent_id) {
    agentQuery = agentQuery.eq('id', ticket.assigned_agent_id)
  }

  const { data: agents, error: agentsError } = await agentQuery

  if (agentsError) {
    return { action, success: false, error: agentsError.message }
  }

  if (!agents || agents.length === 0) {
    return {
      action,
      success: true,
      result: { message: 'No agents matched filter', notified_count: 0 },
    }
  }

  // Create notifications for each agent
  const notifications = agents.map(agent => ({
    agent_id: agent.id,
    type: 'escalation' as const,
    title: `Workflow Alert: ${ticket.subject}`,
    message,
    ticket_id: ticket.id,
  }))

  const { error: notifyError } = await supabase
    .from('agent_notifications')
    .insert(notifications)

  if (notifyError) {
    return { action, success: false, error: notifyError.message }
  }

  return {
    action,
    success: true,
    result: {
      notified_count: agents.length,
      agents: agents.map(a => ({ id: a.id, name: a.name })),
    },
  }
}

/**
 * Send email (log to email_logs table for processing)
 */
async function handleSendEmail(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase } = context
  const template = action.template || 'Workflow email notification'

  // Get customer email
  const { data: customer } = await supabase
    .from('customers')
    .select('email, name')
    .eq('id', ticket.customer_id)
    .single()

  if (!customer?.email) {
    return {
      action,
      success: false,
      error: 'Customer email not found',
    }
  }

  // Create email log entry
  const { error } = await supabase.from('email_logs').insert({
    ticket_id: ticket.id,
    customer_id: ticket.customer_id,
    email_type: 'ticket_updated',
    recipient_email: customer.email,
    subject: `Update: ${ticket.subject}`,
    status: 'pending',
    metadata: { workflow_action: true, template },
  })

  if (error) {
    return { action, success: false, error: error.message }
  }

  return {
    action,
    success: true,
    result: {
      email_queued: true,
      recipient: customer.email,
    },
  }
}

/**
 * Add internal note to ticket
 */
async function handleAddInternalNote(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const { ticket, supabase, currentAgentId } = context
  const noteContent = action.template || action.value

  if (!noteContent || typeof noteContent !== 'string') {
    return {
      action,
      success: false,
      error: 'Note content is required',
    }
  }

  // Create internal note message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      ticket_id: ticket.id,
      content: noteContent,
      sender_type: 'agent',
      metadata: { is_internal: true, workflow_action: true },
    })
    .select()
    .single()

  if (error) {
    return { action, success: false, error: error.message }
  }

  // Log the event
  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    agent_id: currentAgentId || null,
    event_type: 'note_added',
    metadata: { workflow_action: true, message_id: message.id },
  })

  return {
    action,
    success: true,
    result: { message_id: message.id, note: noteContent },
  }
}

// Map of action types to handlers
const actionHandlers: Record<WorkflowActionType, ActionHandler> = {
  set_status: handleSetStatus,
  set_priority: handleSetPriority,
  add_tag: handleAddTag,
  remove_tag: handleRemoveTag,
  assign_agent: handleAssignAgent,
  notify_agents: handleNotifyAgents,
  send_email: handleSendEmail,
  add_internal_note: handleAddInternalNote,
}

/**
 * Execute a single workflow action
 */
export async function executeAction(
  action: WorkflowAction,
  context: ActionContext
): Promise<WorkflowActionResult> {
  const handler = actionHandlers[action.type]

  if (!handler) {
    return {
      action,
      success: false,
      error: `Unknown action type: ${action.type}`,
    }
  }

  try {
    return await handler(action, context)
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute all actions for a workflow rule
 */
export async function executeActions(
  actions: WorkflowAction[],
  context: ActionContext
): Promise<WorkflowActionResult[]> {
  const results: WorkflowActionResult[] = []

  // Execute actions sequentially to maintain order
  for (const action of actions) {
    const result = await executeAction(action, context)
    results.push(result)

    // If a critical action fails, we might want to stop
    // For now, we continue with all actions
  }

  return results
}

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
  send_email: 'Queue an email to the customer',
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
