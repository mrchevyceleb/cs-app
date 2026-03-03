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

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useViewPreference()
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [selectedTicketId, setSelectedTicketId] = useState<string>()

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

  // Fetch tickets for board view (shares cache key with TicketQueue)
  const supabase = createClient()
  const { data: boardTickets = [], isPending: isBoardLoading } = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async (): Promise<TicketWithCustomer[]> => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`*, customer:customers(*)`)
        .order('created_at', { ascending: false })
        .limit(50)

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
    const previousTickets = queryClient.getQueryData<TicketWithCustomer[]>(['dashboard-tickets'])
    queryClient.setQueryData<TicketWithCustomer[]>(['dashboard-tickets'], (old) =>
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
      queryClient.setQueryData(['dashboard-tickets'], previousTickets)
    }
  }, [queryClient])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Support Dashboard
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
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
        />
      ) : (
        <>
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
