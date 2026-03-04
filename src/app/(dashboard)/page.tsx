'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { MetricsBar, TicketQueue, FilterBar, defaultFilters, ViewToggle, KanbanBoard } from '@/components/dashboard'
import type { FilterOptions, TicketWithCustomer } from '@/components/dashboard'
import { BulkActionsBar } from '@/components/dashboard/BulkActionsBar'
import type { BulkUpdates } from '@/components/dashboard/BulkActionsBar'
import { Button } from '@/components/ui/button'
import { useViewPreference, useTicketSelection } from '@/hooks'
import { useAuth } from '@/components/providers/AuthProvider'
import { fetchTicketById, fetchTicketMessages } from '@/lib/api/tickets'
import type { Customer } from '@/types/database'
import { cn } from '@/lib/utils'
import { getQueueVisualTheme } from '@/lib/queue-theme'

type QueueTab = 'all' | 'human' | 'ai'

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useViewPreference()
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [selectedTicketId, setSelectedTicketId] = useState<string>()
  const [activeQueue, setActiveQueue] = useState<QueueTab>('all')

  const { agent } = useAuth()
  const {
    selectedIds,
    isSelected: isTicketChecked,
    toggleTicket,
    clearSelection,
    selectedCount,
    hasSelection,
  } = useTicketSelection()
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const queueTheme = getQueueVisualTheme(activeQueue)

  const { data: queueCounts } = useQuery({
    queryKey: ['dashboard-queue-counts'],
    queryFn: async () => {
      const [humanRes, aiRes] = await Promise.all([
        fetch('/api/tickets?queue=human&limit=1'),
        fetch('/api/tickets?queue=ai&limit=1'),
      ])
      const [humanData, aiData] = await Promise.all([humanRes.json(), aiRes.json()])
      return {
        human: humanData.total || 0,
        ai: aiData.total || 0,
      }
    },
    refetchInterval: 30000,
  })

  // Fetch tickets for board view (uses the dashboard-tickets cache prefix)
  const supabase = createClient()
  const { data: boardTickets = [], isPending: isBoardLoading } = useQuery({
    queryKey: ['dashboard-tickets', activeQueue],
    queryFn: async (): Promise<TicketWithCustomer[]> => {
      let query = supabase
        .from('tickets')
        .select(`*, customer:customers(*)`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (activeQueue !== 'all') {
        query = query.eq('queue_type', activeQueue)
      }

      const { data, error } = await query

      if (error) throw new Error('Unable to load tickets.')
      return (data || []).map((ticket) => ({
        ...ticket,
        customer: ticket.customer as Customer,
      })) as TicketWithCustomer[]
    },
    staleTime: 30 * 1000,
    retry: 2,
    enabled: viewMode === 'board',
  })

  const activeCountBadgeStyles: Record<QueueTab, string> = {
    ai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-100',
    human: 'bg-violet-100 text-violet-800 dark:bg-violet-900/45 dark:text-violet-100',
    all: 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900',
  }

  const handleTicketSelect = (ticket: TicketWithCustomer) => {
    setSelectedTicketId(ticket.id)
    router.push(`/tickets/${ticket.id}`)
  }

  const prefetchTicket = useCallback((ticketId: string) => {
    if (!queryClient.getQueryData(['ticket', ticketId])) {
      queryClient.prefetchQuery({
        queryKey: ['ticket', ticketId],
        queryFn: () => fetchTicketById(ticketId),
      })
    }
    if (!queryClient.getQueryData(['ticket-messages', ticketId])) {
      queryClient.prefetchQuery({
        queryKey: ['ticket-messages', ticketId],
        queryFn: () => fetchTicketMessages(ticketId),
      })
    }
  }, [queryClient])

  const handleBulkUpdate = useCallback(async (updates: BulkUpdates) => {
    const ticketIds = Array.from(selectedIds)
    try {
      const response = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds, updates }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update tickets')
      setBulkMessage(`Updated ${result.updatedCount} ticket${result.updatedCount !== 1 ? 's' : ''}`)
      setTimeout(() => setBulkMessage(null), 3000)
      clearSelection()
      await queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] })
    } catch (err) {
      setBulkMessage(`Error: ${err instanceof Error ? err.message : 'Failed to update'}`)
      setTimeout(() => setBulkMessage(null), 5000)
    }
  }, [selectedIds, clearSelection, queryClient])

  const handleBulkDelete = useCallback(async (ticketIds: string[]) => {
    try {
      const response = await fetch('/api/tickets/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to delete tickets')
      setBulkMessage(`Deleted ${result.deletedCount} ticket${result.deletedCount !== 1 ? 's' : ''}`)
      setTimeout(() => setBulkMessage(null), 3000)
      clearSelection()
      await queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] })
    } catch (err) {
      setBulkMessage(`Error: ${err instanceof Error ? err.message : 'Failed to delete'}`)
      setTimeout(() => setBulkMessage(null), 5000)
    }
  }, [clearSelection, queryClient])

  const handleStatusChange = useCallback(async (ticketId: string, newStatus: string) => {
    // Optimistic update
    const previousTickets = queryClient.getQueriesData<TicketWithCustomer[]>({ queryKey: ['dashboard-tickets'] })
    queryClient.setQueriesData<TicketWithCustomer[]>({ queryKey: ['dashboard-tickets'] }, (old) =>
      (old || []).map((t) => t.id === ticketId ? { ...t, status: newStatus as TicketWithCustomer['status'] } : t)
    )

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
    } catch {
      // Rollback
      previousTickets.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    }
  }, [queryClient])

  return (
    <div className={cn('space-y-4 rounded-3xl border p-4 transition-all duration-300 sm:space-y-6 sm:p-6', queueTheme.shell)}>
      <div className={cn('-mx-4 -mt-4 h-1.5 rounded-t-3xl bg-gradient-to-r sm:-mx-6 sm:-mt-6', queueTheme.accentBar)} />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-xl font-bold sm:text-2xl', queueTheme.heading)}>
            Support Dashboard
          </h1>
          <p className={cn('mt-1 text-sm', queueTheme.subheading)}>
            Manage customer tickets with AI-powered assistance
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button variant="outline" size="sm" className="sm:size-default">
            Export
          </Button>
          <Button
            size="sm"
            className="sm:size-default bg-primary-600 hover:bg-primary-700 text-white"
            onClick={() => router.push('/tickets/new')}
          >
            + New Ticket
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={cn('flex w-fit gap-1 rounded-xl border p-1.5 transition-colors duration-300', queueTheme.tabsRail)}>
          {([
            { key: 'human' as QueueTab, label: 'Human Queue', count: queueCounts?.human },
            { key: 'ai' as QueueTab, label: 'AI Queue', count: queueCounts?.ai },
            { key: 'all' as QueueTab, label: 'All' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveQueue(tab.key)}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200',
                activeQueue === tab.key ? queueTheme.tabActive : queueTheme.tabInactive
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-xs',
                  activeQueue === tab.key
                    ? activeCountBadgeStyles[tab.key]
                    : 'bg-background/70 text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', queueTheme.modeBadge)}>
          {activeQueue === 'ai' ? 'AI queue focus' : activeQueue === 'human' ? 'Human queue focus' : 'Unified queue view'}
        </span>
      </div>

      {/* Metrics */}
      <MetricsBar />

      {/* Filter Bar (board view uses it for filtering columns) */}
      {viewMode === 'board' && (
        <FilterBar filters={filters} onFiltersChange={setFilters} />
      )}

      {/* Content: List or Board */}
      {viewMode === 'list' ? (
        <TicketQueue
          onTicketSelect={handleTicketSelect}
          selectedTicketId={selectedTicketId}
          queueFilter={activeQueue}
        />
      ) : (
        <>
          <div className={cn('rounded-2xl border p-3 sm:p-4 transition-colors duration-300', queueTheme.panelFrame)}>
            <KanbanBoard
              tickets={boardTickets}
              filters={filters}
              isLoading={isBoardLoading}
              isChecked={isTicketChecked}
              selectionMode={hasSelection}
              onTicketClick={handleTicketSelect}
              onTicketCheckboxChange={toggleTicket}
              onTicketHover={prefetchTicket}
              onStatusChange={handleStatusChange}
            />
          </div>
          {bulkMessage && (
            <div className={`px-4 py-2 rounded-md text-sm font-medium ${
              bulkMessage.startsWith('Error')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            }`}>
              {bulkMessage}
            </div>
          )}
          <BulkActionsBar
            selectedCount={selectedCount}
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
            onBulkUpdate={handleBulkUpdate}
            onBulkDelete={handleBulkDelete}
            currentAgentId={agent?.id}
          />
          {hasSelection && <div className="h-16" />}
        </>
      )}
    </div>
  )
}
