'use client'

import { useState, useMemo, useEffect, useCallback, DragEvent } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TicketWithCustomer } from './TicketCard'
import type { FilterOptions } from './FilterBar'

const COLUMN_ORDER = ['open', 'pending', 'escalated', 'resolved'] as const

interface KanbanBoardProps {
  tickets: TicketWithCustomer[]
  filters: FilterOptions
  isLoading?: boolean
  isChecked?: (id: string) => boolean
  selectionMode?: boolean
  onTicketClick?: (ticket: TicketWithCustomer) => void
  onTicketCheckboxChange?: (ticketId: string) => void
  onTicketHover?: (ticketId: string) => void
  onStatusChange?: (ticketId: string, newStatus: string) => Promise<void>
}

export function KanbanBoard({
  tickets,
  filters,
  isLoading,
  isChecked,
  selectionMode,
  onTicketClick,
  onTicketCheckboxChange,
  onTicketHover,
  onStatusChange,
}: KanbanBoardProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('open')
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const groupedTickets = useMemo(() => {
    const groups = new Map<string, TicketWithCustomer[]>()

    for (const status of COLUMN_ORDER) {
      groups.set(status, [])
    }

    for (const ticket of tickets) {
      const status = ticket.status ?? 'open'
      const bucket = groups.get(status)
      if (!bucket) continue

      // Search filter
      if (
        filters.search &&
        !ticket.subject?.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        continue
      }

      // Priority filter
      if (
        filters.priority.length > 0 &&
        !filters.priority.includes(ticket.priority ?? '')
      ) {
        continue
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const ticketTags = (ticket.tags as string[]) ?? []
        if (!filters.tags.some((t) => ticketTags.includes(t))) {
          continue
        }
      }

      // AI handled filter
      if (filters.aiHandled === 'ai' && !ticket.ai_handled) continue
      if (filters.aiHandled === 'human' && ticket.ai_handled) continue

      bucket.push(ticket)
    }

    return groups
  }, [tickets, filters])

  // Columns to render (hide unchecked statuses when status filter is active)
  const visibleColumns = useMemo(() => {
    if (filters.status.length > 0) {
      return COLUMN_ORDER.filter((s) => filters.status.includes(s))
    }
    return [...COLUMN_ORDER]
  }, [filters.status])

  // Clamp mobile activeTab to a visible column when status filters change
  useEffect(() => {
    if (visibleColumns.length > 0 && !visibleColumns.includes(activeTab as typeof COLUMN_ORDER[number])) {
      setActiveTab(visibleColumns[0])
    }
  }, [visibleColumns, activeTab])

  // Check if all visible columns are empty (for empty state)
  const allEmpty = useMemo(() => {
    return visibleColumns.every((s) => (groupedTickets.get(s)?.length ?? 0) === 0)
  }, [visibleColumns, groupedTickets])

  const handleDragStart = useCallback((e: DragEvent, ticketId: string, currentStatus: string) => {
    e.dataTransfer.setData('ticketId', ticketId)
    e.dataTransfer.setData('currentStatus', currentStatus)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingTicketId(ticketId)
  }, [])

  const handleDragOver = useCallback((e: DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent, status: string) => {
    // Only clear if we're actually leaving the column (not entering a child)
    const related = e.relatedTarget as HTMLElement | null
    const current = e.currentTarget as HTMLElement
    if (!related || !current.contains(related)) {
      setDragOverColumn((prev) => (prev === status ? null : prev))
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, newStatus: string) => {
      e.preventDefault()
      const ticketId = e.dataTransfer.getData('ticketId')
      const currentStatus = e.dataTransfer.getData('currentStatus')
      setDragOverColumn(null)
      setDraggingTicketId(null)

      if (ticketId && currentStatus !== newStatus && onStatusChange) {
        onStatusChange(ticketId, newStatus)
      }
    },
    [onStatusChange]
  )

  const handleMoveTicket = useCallback(
    (ticketId: string, newStatus: string) => {
      onStatusChange?.(ticketId, newStatus)
    },
    [onStatusChange]
  )

  // Loading state: show all 4 columns with skeletons
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((status) => (
          <div key={status} className="w-72 flex-shrink-0">
            <KanbanColumn status={status} tickets={[]} isLoading />
          </div>
        ))}
      </div>
    )
  }

  // Mobile: tab bar + single column
  if (isMobile) {
    const activeTickets = groupedTickets.get(activeTab) ?? []

    return (
      <div className="flex flex-col gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            {visibleColumns.map((status) => {
              const count = groupedTickets.get(status)?.length ?? 0
              return (
                <TabsTrigger key={status} value={status} className="flex-1 capitalize">
                  {status} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        <KanbanColumn
          status={activeTab}
          tickets={activeTickets}
          isChecked={isChecked}
          selectionMode={selectionMode}
          onTicketClick={onTicketClick}
          onTicketCheckboxChange={onTicketCheckboxChange}
          onTicketHover={onTicketHover}
          onMoveTicket={handleMoveTicket}
        />
      </div>
    )
  }

  // Empty state after filtering
  if (allEmpty && tickets.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <svg
          className="w-12 h-12 mb-3 opacity-30"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
          />
        </svg>
        <p className="text-sm font-medium">No tickets match your filters</p>
        <p className="text-xs mt-1">Try adjusting your filter criteria</p>
      </div>
    )
  }

  // Desktop: horizontal scrolling columns with drag-and-drop
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleColumns.map((status) => {
        const columnTickets = groupedTickets.get(status) ?? []

        return (
          <div
            key={status}
            className="w-72 flex-shrink-0"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={(e) => handleDragLeave(e, status)}
            onDrop={(e) => handleDrop(e, status)}
          >
            <KanbanColumn
              status={status}
              tickets={columnTickets}
              isChecked={isChecked}
              selectionMode={selectionMode}
              onTicketClick={onTicketClick}
              onTicketCheckboxChange={onTicketCheckboxChange}
              onTicketHover={onTicketHover}
              onMoveTicket={handleMoveTicket}
              isDropTarget={dragOverColumn === status}
              draggable
              draggingTicketId={draggingTicketId}
              onDragStart={handleDragStart}
              onDragEnd={() => { setDraggingTicketId(null); setDragOverColumn(null) }}
            />
          </div>
        )
      })}
    </div>
  )
}
