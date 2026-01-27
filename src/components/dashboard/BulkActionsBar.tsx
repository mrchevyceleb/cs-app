'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
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
  X,
  ChevronDown,
  Circle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  UserMinus,
  Tag,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TicketStatus, TicketPriority } from '@/types/database'

interface BulkActionsBarProps {
  selectedCount: number
  selectedIds: Set<string>
  onClearSelection: () => void
  onBulkUpdate: (updates: BulkUpdates) => Promise<void>
  currentAgentId?: string
}

export interface BulkUpdates {
  status?: TicketStatus
  priority?: TicketPriority
  assigned_agent_id?: string | null
  tags?: string[]
}

const statusOptions: { value: TicketStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'open', label: 'Open', icon: <Circle className="w-4 h-4" />, color: 'text-blue-500' },
  { value: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" />, color: 'text-amber-500' },
  { value: 'resolved', label: 'Resolved', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-500' },
  { value: 'escalated', label: 'Escalated', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500' },
]

const priorityOptions: { value: TicketPriority; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'low', label: 'Low', icon: <ArrowDownCircle className="w-4 h-4" />, color: 'text-gray-500 dark:text-gray-400' },
  { value: 'normal', label: 'Normal', icon: <Circle className="w-4 h-4" />, color: 'text-blue-500' },
  { value: 'high', label: 'High', icon: <ArrowUpCircle className="w-4 h-4" />, color: 'text-amber-500' },
  { value: 'urgent', label: 'Urgent', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500' },
]

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBulkUpdate,
  currentAgentId,
}: BulkActionsBarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'status' | 'priority' | 'assign' | 'unassign'
    value?: string
    label: string
  } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleAction = async (updates: BulkUpdates, actionLabel: string, requiresConfirmation = false) => {
    // Check if this action requires confirmation (e.g., resolving tickets)
    if (requiresConfirmation) {
      setPendingAction({ type: 'status', value: updates.status, label: actionLabel })
      setShowConfirmDialog(true)
      return
    }

    await executeAction(updates)
  }

  const executeAction = async (updates: BulkUpdates) => {
    setIsLoading(true)
    try {
      await onBulkUpdate(updates)
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
      setPendingAction(null)
    }
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return

    const updates: BulkUpdates = {}
    if (pendingAction.type === 'status' && pendingAction.value) {
      updates.status = pendingAction.value as TicketStatus
    } else if (pendingAction.type === 'priority' && pendingAction.value) {
      updates.priority = pendingAction.value as TicketPriority
    } else if (pendingAction.type === 'assign') {
      updates.assigned_agent_id = currentAgentId || null
    } else if (pendingAction.type === 'unassign') {
      updates.assigned_agent_id = null
    }

    await executeAction(updates)
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-300 ease-out',
          selectedCount > 0
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <div className="bg-card border-t border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Selection Count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-semibold">
                    {selectedCount}
                  </span>
                  <span>ticket{selectedCount !== 1 ? 's' : ''} selected</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Clear selection</span>
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Status Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="h-8 gap-1.5"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Status</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statusOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() =>
                          handleAction(
                            { status: option.value },
                            `Change status to ${option.label}`,
                            option.value === 'resolved'
                          )
                        }
                        className="gap-2"
                      >
                        <span className={option.color}>{option.icon}</span>
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Priority Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="h-8 gap-1.5"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Priority</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {priorityOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() =>
                          handleAction({ priority: option.value }, `Change priority to ${option.label}`)
                        }
                        className="gap-2"
                      >
                        <span className={option.color}>{option.icon}</span>
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Assign to Me */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || !currentAgentId}
                  onClick={() =>
                    handleAction({ assigned_agent_id: currentAgentId }, 'Assign to me')
                  }
                  className="h-8 gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Assign to Me</span>
                </Button>

                {/* Unassign */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleAction({ assigned_agent_id: null }, 'Unassign')}
                  className="h-8 gap-1.5"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unassign</span>
                </Button>

                {/* Tags (placeholder - could be expanded to a tag picker) */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 gap-1.5"
                  onClick={() => {
                    // TODO: Implement tag picker modal
                    console.log('Tag picker not yet implemented')
                  }}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Tags</span>
                </Button>

                {/* Clear Selection (visible on mobile) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  disabled={isLoading}
                  className="h-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 sm:hidden"
                >
                  Clear
                </Button>

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Updating...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {pendingAction?.label.toLowerCase()} for{' '}
              <strong>{selectedCount}</strong> ticket{selectedCount !== 1 ? 's' : ''}?
              {pendingAction?.value === 'resolved' && (
                <>
                  <br />
                  <br />
                  <span className="text-amber-600 dark:text-amber-400">
                    This will mark these tickets as resolved and close them.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAction}
              disabled={isLoading}
              className={cn(
                pendingAction?.value === 'resolved' &&
                  'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
