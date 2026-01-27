'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle2,
  Zap,
  Filter,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type {
  WorkflowRule,
  WorkflowTriggerEvent,
  WorkflowCondition,
  WorkflowConditionField,
  WorkflowConditionOperator,
  WorkflowAction,
  WorkflowActionType,
  Agent,
} from '@/types/database'
import {
  TRIGGER_EVENT_DISPLAY_NAMES,
  TRIGGER_EVENT_DESCRIPTIONS,
  TRIGGER_EVENTS,
  FIELD_OPERATORS,
  FIELD_DISPLAY_NAMES,
  OPERATOR_DISPLAY_NAMES,
  FIELD_VALUE_OPTIONS,
  ACTION_TYPE_DISPLAY_NAMES,
  ACTION_TYPE_DESCRIPTIONS,
  ACTION_TYPE_CONFIG,
} from '@/lib/workflow/engine'

interface WorkflowRuleEditorProps {
  rule?: WorkflowRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: Partial<WorkflowRule>) => Promise<void>
  agents?: Agent[]
}

// Test result type
interface TestResult {
  success: boolean
  test_result: {
    conditions_matched: boolean
    condition_details: Array<{
      field: string
      operator: string
      expected_value: unknown
      actual_value: unknown
      matched: boolean
    }>
    actions_to_execute: Array<{
      type: string
      value?: string
      filter?: string
      template?: string
    }>
    would_execute: boolean
  }
  ticket_snapshot: Record<string, unknown>
}

export function WorkflowRuleEditor({
  rule,
  open,
  onOpenChange,
  onSave,
  agents = [],
}: WorkflowRuleEditorProps) {
  const isEditing = !!rule

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEvent, setTriggerEvent] = useState<WorkflowTriggerEvent>('ticket_created')
  const [conditions, setConditions] = useState<WorkflowCondition[]>([])
  const [actions, setActions] = useState<WorkflowAction[]>([])
  const [priority, setPriority] = useState(0)
  const [isActive, setIsActive] = useState(true)

  // UI state
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [testTicketData, setTestTicketData] = useState({
    subject: 'Test ticket subject',
    status: 'open',
    priority: 'normal',
    tags: [] as string[],
    ai_handled: false,
    assigned_agent_id: '',
    customer_language: 'en',
  })
  const [error, setError] = useState<string | null>(null)

  // Initialize form when rule changes
  useEffect(() => {
    if (rule) {
      setName(rule.name)
      setDescription(rule.description || '')
      setTriggerEvent(rule.trigger_event)
      setConditions(rule.conditions || [])
      setActions(rule.actions || [])
      setPriority(rule.priority || 0)
      setIsActive(rule.is_active)
    } else {
      // Reset to defaults for new rule
      setName('')
      setDescription('')
      setTriggerEvent('ticket_created')
      setConditions([])
      setActions([])
      setPriority(0)
      setIsActive(true)
    }
    setTestResult(null)
    setError(null)
  }, [rule, open])

  // Add a new condition
  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'status', operator: 'equals', value: '' },
    ])
  }

  // Update a condition
  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }

    // Reset value when field changes to ensure valid options
    if (updates.field && updates.field !== conditions[index].field) {
      const fieldOptions = FIELD_VALUE_OPTIONS[updates.field as WorkflowConditionField]
      newConditions[index].value = fieldOptions ? fieldOptions[0]?.value || '' : ''
    }

    setConditions(newConditions)
  }

  // Remove a condition
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  // Add a new action
  const addAction = () => {
    setActions([
      ...actions,
      { type: 'add_tag', value: '' },
    ])
  }

  // Update an action
  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], ...updates }
    setActions(newActions)
  }

  // Remove an action
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  // Test the workflow rule
  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const response = await fetch('/api/workflows/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions,
          actions,
          trigger_event: triggerEvent,
          test_ticket_data: testTicketData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test workflow')
      }

      setTestResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test workflow')
    } finally {
      setTesting(false)
    }
  }

  // Save the workflow rule
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (actions.length === 0) {
      setError('At least one action is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave({
        id: rule?.id,
        name: name.trim(),
        description: description.trim() || null,
        trigger_event: triggerEvent,
        conditions,
        actions,
        priority,
        is_active: isActive,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  // Get available operators for a field
  const getOperatorsForField = (field: WorkflowConditionField) => {
    return FIELD_OPERATORS[field] || ['equals', 'not_equals']
  }

  // Render condition value input based on field type
  const renderConditionValueInput = (condition: WorkflowCondition, index: number) => {
    const fieldOptions = FIELD_VALUE_OPTIONS[condition.field as WorkflowConditionField]

    if (fieldOptions) {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => updateCondition(index, { value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // For tags field, show a text input with hint
    if (condition.field === 'tags') {
      return (
        <Input
          value={String(condition.value)}
          onChange={(e) => updateCondition(index, { value: e.target.value })}
          placeholder="e.g., vip, billing"
        />
      )
    }

    // For agent ID, show agent selector
    if (condition.field === 'assigned_agent_id') {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => updateCondition(index, { value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Default text input
    return (
      <Input
        value={String(condition.value)}
        onChange={(e) => updateCondition(index, { value: e.target.value })}
        placeholder="Enter value (use | for multiple)"
      />
    )
  }

  // Render action value input based on action type
  const renderActionValueInput = (action: WorkflowAction, index: number) => {
    const config = ACTION_TYPE_CONFIG[action.type as WorkflowActionType]

    if (!config) return null

    const inputs = []

    // Value input
    if (config.requiresValue) {
      if (config.valueType === 'select' && config.valueOptions) {
        inputs.push(
          <div key="value" className="flex-1">
            <Select
              value={String(action.value || '')}
              onValueChange={(value) => updateAction(index, { value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {config.valueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      } else if (config.valueType === 'agent') {
        inputs.push(
          <div key="value" className="flex-1">
            <Select
              value={String(action.value || '')}
              onValueChange={(value) => updateAction(index, { value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      } else {
        inputs.push(
          <div key="value" className="flex-1">
            <Input
              value={String(action.value || '')}
              onChange={(e) => updateAction(index, { value: e.target.value })}
              placeholder="Enter value"
            />
          </div>
        )
      }
    }

    // Filter input (for notify_agents)
    if (config.requiresFilter && config.filterOptions) {
      inputs.push(
        <div key="filter" className="w-40">
          <Select
            value={action.filter || 'all'}
            onValueChange={(filter) => updateAction(index, { filter })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              {config.filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    // Template input (for email and notes)
    if (config.requiresTemplate) {
      inputs.push(
        <div key="template" className="w-full mt-2">
          <Textarea
            value={action.template || ''}
            onChange={(e) => updateAction(index, { template: e.target.value })}
            placeholder="Enter message template..."
            rows={2}
          />
        </div>
      )
    }

    return <div className="flex flex-wrap gap-2 flex-1">{inputs}</div>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {isEditing ? 'Edit Workflow Rule' : 'Create Workflow Rule'}
          </DialogTitle>
          <DialogDescription>
            Define conditions and actions to automate ticket handling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Auto-escalate urgent tickets"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  placeholder="Higher = runs first"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule does..."
                rows={2}
              />
            </div>
          </div>

          {/* Trigger Event */}
          <div className="space-y-2">
            <Label>Trigger Event *</Label>
            <Select
              value={triggerEvent}
              onValueChange={(value) => setTriggerEvent(value as WorkflowTriggerEvent)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select trigger event" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_EVENTS.map((event) => (
                  <SelectItem key={event} value={event}>
                    <div className="flex flex-col">
                      <span>{TRIGGER_EVENT_DISPLAY_NAMES[event]}</span>
                      <span className="text-xs text-gray-500">
                        {TRIGGER_EVENT_DESCRIPTIONS[event]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Conditions
                <span className="text-xs text-gray-500">(All must match)</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCondition}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No conditions - rule will match all tickets for this trigger.
              </p>
            ) : (
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={condition.field}
                        onValueChange={(value) =>
                          updateCondition(index, { field: value as WorkflowConditionField })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(FIELD_DISPLAY_NAMES) as WorkflowConditionField[]).map(
                            (field) => (
                              <SelectItem key={field} value={field}>
                                {FIELD_DISPLAY_NAMES[field]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(index, { operator: value as WorkflowConditionOperator })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorsForField(condition.field as WorkflowConditionField).map(
                            (op) => (
                              <SelectItem key={op} value={op}>
                                {OPERATOR_DISPLAY_NAMES[op as WorkflowConditionOperator]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>

                      <div className="flex-1">
                        {renderConditionValueInput(condition, index)}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Actions *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAction}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Add at least one action to execute when conditions match.
              </p>
            ) : (
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start gap-2">
                      <Select
                        value={action.type}
                        onValueChange={(value) =>
                          updateAction(index, {
                            type: value as WorkflowActionType,
                            value: undefined,
                            filter: undefined,
                            template: undefined,
                          })
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ACTION_TYPE_DISPLAY_NAMES) as WorkflowActionType[]).map(
                            (type) => (
                              <SelectItem key={type} value={type}>
                                <div className="flex flex-col">
                                  <span>{ACTION_TYPE_DISPLAY_NAMES[type]}</span>
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>

                      {renderActionValueInput(action, index)}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {ACTION_TYPE_DESCRIPTIONS[action.type as WorkflowActionType]}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Test Panel */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowTestPanel(!showTestPanel)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {showTestPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Test Rule
            </button>

            {showTestPanel && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Subject</Label>
                    <Input
                      value={testTicketData.subject}
                      onChange={(e) =>
                        setTestTicketData({ ...testTicketData, subject: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Test Status</Label>
                    <Select
                      value={testTicketData.status}
                      onValueChange={(value) =>
                        setTestTicketData({ ...testTicketData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Test Priority</Label>
                    <Select
                      value={testTicketData.priority}
                      onValueChange={(value) =>
                        setTestTicketData({ ...testTicketData, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Test Tags (comma-separated)</Label>
                    <Input
                      value={testTicketData.tags.join(', ')}
                      onChange={(e) =>
                        setTestTicketData({
                          ...testTicketData,
                          tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g., vip, billing"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <>Testing...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>

                {/* Test Results */}
                {testResult && (
                  <Card className="p-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {testResult.test_result.conditions_matched ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="font-medium">
                          {testResult.test_result.conditions_matched
                            ? 'Conditions matched!'
                            : 'Conditions did not match'}
                        </span>
                      </div>

                      {testResult.test_result.condition_details.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Condition Results:</p>
                          {testResult.test_result.condition_details.map((detail, i) => (
                            <div
                              key={i}
                              className={`text-sm p-2 rounded ${
                                detail.matched
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : 'bg-red-50 dark:bg-red-900/20'
                              }`}
                            >
                              <span className="font-mono">
                                {detail.field} {detail.operator} &quot;{String(detail.expected_value)}&quot;
                              </span>
                              <span className="text-gray-500">
                                {' '}(actual: &quot;{String(detail.actual_value)}&quot;)
                              </span>
                              <Badge variant={detail.matched ? 'default' : 'secondary'} className="ml-2">
                                {detail.matched ? 'Match' : 'No Match'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {testResult.test_result.would_execute && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Actions that would execute:</p>
                          <div className="flex flex-wrap gap-1">
                            {testResult.test_result.actions_to_execute.map((action, i) => (
                              <Badge key={i} variant="outline">
                                {ACTION_TYPE_DISPLAY_NAMES[action.type as WorkflowActionType]}
                                {action.value && `: ${action.value}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
