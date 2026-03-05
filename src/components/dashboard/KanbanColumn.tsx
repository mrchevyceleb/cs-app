'use client'

import { cn } from '@/lib/utils'
import { KanbanTicketCard, KanbanTicketCardSkeleton } from './KanbanTicketCard'
import type { TicketWithCustomer } from './TicketCard'

const statusConfig: Record<string, { label: string; dotColor: string; bgColor: string; borderColor: string }> = {
  open: { label: 'Open', dotColor: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800' },
  pending: { label: 'Pending', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800' },
  escalated: { label: 'Escalated', dotColor: 'bg-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800' },
  resolved: { label: 'Resolved', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800' },
}

interface KanbanColumnProps {
  status: string
  tickets: TicketWithCustomer[]
  isLoading?: boolean
  isChecked?: (id: string) => boolean
  selectionMode?: boolean
  onTicketClick?: (ticket: TicketWithCustomer) => void
  onTicketCheckboxChange?: (ticketId: string) => void
  onTicketHover?: (ticketId: string) => void
  onMoveTicket?: (ticketId: string, newStatus: string) => void
  isDropTarget?: boolean
  draggable?: boolean
  draggingTicketId?: string | null
  onDragStart?: (e: React.DragEvent, ticketId: string, status: string) => void
  onDragEnd?: () => void
}

export function KanbanColumn({
  status,
  tickets,
  isLoading,
  isChecked,
  selectionMode,
  onTicketClick,
  onTicketCheckboxChange,
  onTicketHover,
  onMoveTicket,
  isDropTarget,
  draggable,
  draggingTicketId,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const config = statusConfig[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    dotColor: 'bg-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    borderColor: 'border-gray-200 dark:border-gray-800',
  }

  return (
    <div
      className={cn(
        'flex flex-col w-72 min-w-[288px] flex-shrink-0 rounded-lg border shadow-[var(--shadow-sm)]',
        config.borderColor,
        isDropTarget && 'ring-2 ring-primary/50'
      )}
    >
      {/* Header */}
      <div className={cn('rounded-t-lg px-3 py-2.5 flex items-center gap-2', config.bgColor)}>
        <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full ml-auto tabular-nums">
          {tickets.length}
        </span>
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] space-y-2 p-2">
        {isLoading ? (
          <>
            <KanbanTicketCardSkeleton />
            <KanbanTicketCardSkeleton />
            <KanbanTicketCardSkeleton />
          </>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <svg
              className="w-8 h-8 mb-2 opacity-40"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
              />
            </svg>
            <span className="text-xs">No tickets</span>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              draggable={draggable}
              onDragStart={draggable ? (e) => onDragStart?.(e, ticket.id, status) : undefined}
              onDragEnd={draggable ? onDragEnd : undefined}
              className={draggingTicketId === ticket.id ? 'opacity-40' : undefined}
            >
              <KanbanTicketCard
                ticket={ticket}
                isChecked={isChecked?.(ticket.id) ?? false}
                selectionMode={selectionMode}
                onClick={() => onTicketClick?.(ticket)}
                onCheckboxChange={() => onTicketCheckboxChange?.(ticket.id)}
                onHover={() => onTicketHover?.(ticket.id)}
                onMoveToStatus={onMoveTicket ? (ticketId: string, newStatus: string) => onMoveTicket(ticketId, newStatus) : undefined}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
