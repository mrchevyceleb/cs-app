'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { TicketWithCustomer } from './TicketCard'

interface KanbanTicketCardProps {
  ticket: TicketWithCustomer
  isChecked?: boolean
  selectionMode?: boolean
  onClick?: () => void
  onCheckboxChange?: (checked: boolean) => void
  onHover?: () => void
  onMoveToStatus?: (ticketId: string, status: string) => void
}

const priorityIndicators: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-gray-400', label: 'Low priority' },
  normal: { color: 'bg-blue-500', label: 'Normal priority' },
  high: { color: 'bg-amber-500', label: 'High priority' },
  urgent: { color: 'bg-red-500 animate-pulse', label: 'Urgent priority' },
}

const statuses = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
]

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}

export function KanbanTicketCard({
  ticket,
  isChecked = false,
  selectionMode = false,
  onClick,
  onCheckboxChange,
  onHover,
  onMoveToStatus,
}: KanbanTicketCardProps) {
  const priority = priorityIndicators[ticket.priority] || priorityIndicators.normal

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      onCheckboxChange?.(checked)
    }
  }

  const handleMoveToStatus = (e: React.MouseEvent, status: string) => {
    e.stopPropagation()
    onMoveToStatus?.(ticket.id, status)
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={cn(
        'p-3 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer transition-all duration-200 group',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5',
        isChecked
          ? 'border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20'
          : 'border-border/70'
      )}
    >
      {/* Top row: checkbox + priority dot + time */}
      <div className="flex items-center gap-2 mb-2">
        <div
          onClick={handleCheckboxClick}
          className={cn(
            'flex-shrink-0 transition-opacity duration-200',
            selectionMode || isChecked
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheckboxChange}
            className="w-3.5 h-3.5"
            aria-label={`Select ticket: ${ticket.subject}`}
          />
        </div>
        <div
          className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.color)}
          title={priority.label}
        />
        <span className="ml-auto text-[11px] text-muted-foreground flex-shrink-0">
          {getRelativeTime(ticket.created_at)}
        </span>
        {onMoveToStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                aria-label="Move to status"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {statuses
                .filter((s) => s.value !== ticket.status)
                .map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={(e) => handleMoveToStatus(e, s.value)}
                  >
                    Move to {s.label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Subject */}
      <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
        {ticket.subject}
      </h4>

      {/* Customer */}
      <p className="text-xs text-muted-foreground truncate mb-2">
        {ticket.customer?.name || ticket.customer?.email || 'Unknown'}
      </p>

      {/* Bottom row: AI/Human badge + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ticket.ai_handled ? (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-primary-200 text-primary-600 dark:border-primary-800 dark:text-primary-400"
          >
            AI
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Human
          </Badge>
        )}
        {ticket.tags && ticket.tags.length > 0 && (
          <>
            {ticket.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
            {ticket.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{ticket.tags.length - 2}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function KanbanTicketCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border bg-card animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="ml-auto w-6 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="flex gap-1.5">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
      </div>
    </div>
  )
}
