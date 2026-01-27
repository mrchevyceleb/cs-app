'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Zap,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Copy,
  ArrowLeft,
  Filter,
  Settings2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { WorkflowRuleEditor } from '@/components/dashboard/WorkflowRuleEditor'
import type { WorkflowRule, Agent } from '@/types/database'
import {
  TRIGGER_EVENT_DISPLAY_NAMES,
  ACTION_TYPE_DISPLAY_NAMES,
} from '@/lib/workflow/engine'

export default function WorkflowsSettingsPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<WorkflowRule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch workflow rules
  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows')
      if (!response.ok) {
        throw new Error('Failed to fetch workflow rules')
      }
      const data = await response.json()
      setRules(data.rules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow rules')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch agents for the editor
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents/me')
      if (response.ok) {
        // For now, just use the current agent
        // In a full implementation, you'd fetch all agents
        const data = await response.json()
        setAgents([data.agent])
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    }
  }, [])

  useEffect(() => {
    fetchRules()
    fetchAgents()
  }, [fetchRules, fetchAgents])

  // Handle save (create or update)
  const handleSave = async (ruleData: Partial<WorkflowRule>) => {
    const isUpdate = !!ruleData.id

    const response = await fetch(
      isUpdate ? `/api/workflows/${ruleData.id}` : '/api/workflows',
      {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      }
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to save workflow rule')
    }

    // Refresh the list
    await fetchRules()
  }

  // Handle toggle active state
  const handleToggleActive = async (rule: WorkflowRule) => {
    try {
      const response = await fetch(`/api/workflows/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })

      if (!response.ok) {
        throw new Error('Failed to update workflow rule')
      }

      // Update local state
      setRules(rules.map(r =>
        r.id === rule.id ? { ...r, is_active: !r.is_active } : r
      ))
    } catch (err) {
      console.error('Failed to toggle rule:', err)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!ruleToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/workflows/${ruleToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete workflow rule')
      }

      // Remove from local state
      setRules(rules.filter(r => r.id !== ruleToDelete.id))
      setDeleteDialogOpen(false)
      setRuleToDelete(null)
    } catch (err) {
      console.error('Failed to delete rule:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle duplicate
  const handleDuplicate = async (rule: WorkflowRule) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${rule.name} (Copy)`,
          description: rule.description,
          trigger_event: rule.trigger_event,
          conditions: rule.conditions,
          actions: rule.actions,
          priority: rule.priority,
          is_active: false, // Start inactive
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate workflow rule')
      }

      await fetchRules()
    } catch (err) {
      console.error('Failed to duplicate rule:', err)
    }
  }

  // Open editor for new rule
  const handleCreateNew = () => {
    setEditingRule(null)
    setEditorOpen(true)
  }

  // Open editor for editing
  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  // Confirm delete
  const confirmDelete = (rule: WorkflowRule) => {
    setRuleToDelete(rule)
    setDeleteDialogOpen(true)
  }

  // Render rule card
  const renderRuleCard = (rule: WorkflowRule) => {
    const conditionCount = rule.conditions?.length || 0
    const actionCount = rule.actions?.length || 0

    return (
      <Card
        key={rule.id}
        className={`bg-card border-border/70 transition-opacity ${
          !rule.is_active ? 'opacity-60' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {rule.name}
                </h3>
                <Badge
                  variant={rule.is_active ? 'default' : 'secondary'}
                  className={rule.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                >
                  {rule.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {rule.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                  {rule.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {TRIGGER_EVENT_DISPLAY_NAMES[rule.trigger_event]}
                </Badge>

                <Badge variant="outline" className="gap-1">
                  <Filter className="h-3 w-3" />
                  {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
                </Badge>

                <Badge variant="outline" className="gap-1">
                  <Settings2 className="h-3 w-3" />
                  {actionCount} action{actionCount !== 1 ? 's' : ''}
                </Badge>

                {rule.priority > 0 && (
                  <span className="text-gray-400">Priority: {rule.priority}</span>
                )}
              </div>

              {/* Show action types */}
              {rule.actions && rule.actions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {rule.actions.map((action, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {ACTION_TYPE_DISPLAY_NAMES[action.type]}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(rule)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(rule)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(rule)}>
                  {rule.is_active ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Enable
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => confirmDelete(rule)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Workflow Automation
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Automate ticket handling with custom rules and actions
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            How Workflow Rules Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 dark:text-gray-300">
          <p>
            Workflow rules automatically execute actions when trigger events occur.
            Each rule can have multiple conditions (all must match) and multiple actions.
            Rules with higher priority run first.
          </p>
        </CardContent>
      </Card>

      {/* Rules list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Rules
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {rules.filter(r => r.is_active).length} active / {rules.length} total
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border/70">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full max-w-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rules.length === 0 ? (
          <Card className="bg-card border-border/70">
            <CardContent className="py-12">
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No workflow rules yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first rule to start automating ticket handling.
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map(renderRuleCard)}
          </div>
        )}
      </div>

      {/* Example rules section */}
      {rules.length === 0 && (
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Example Rules</CardTitle>
            <CardDescription>
              Here are some common workflow rules you might want to create:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">Auto-escalate urgent tickets</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    When a ticket is created with urgent priority, automatically set status to escalated and notify online agents.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">Tag billing inquiries</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    When a ticket subject contains &quot;billing&quot; or &quot;payment&quot;, automatically add the &quot;billing&quot; tag.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">VIP customer handling</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    When a ticket has the &quot;vip&quot; tag, set priority to high and add an internal note.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor Dialog */}
      <WorkflowRuleEditor
        rule={editingRule}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        agents={agents}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{ruleToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
