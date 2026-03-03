'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilterBar, defaultFilters, TicketCard, TicketCardSkeleton, GetNextTicketButton } from '@/components/dashboard'
import type { FilterOptions, TicketWithCustomer } from '@/components/dashboard'
import { BulkActionsBar } from '@/components/dashboard/BulkActionsBar'
import type { BulkUpdates } from '@/components/dashboard/BulkActionsBar'
import { fetchTicketById, fetchTicketMessages } from '@/lib/api/tickets'
import { useTicketSelection } from '@/hooks'
import { useAuth } from '@/components/providers/AuthProvider'

const PAGE_SIZE = 20

type QueueTab = 'human' | 'ai' | 'all'

export default function TicketsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { agent } = useAuth()
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [currentPage, setCurrentPage] = useState(0)
  const [activeQueue, setActiveQueue] = useState<QueueTab>('all')
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  const {
    selectedIds,
    isSelected: isTicketChecked,
    toggleTicket,
    clearSelection,
    selectedCount,
    hasSelection,
  } = useTicketSelection()

  // Reset to first page when filters or queue tab change
  useEffect(() => {
    setCurrentPage(0)
  }, [filters, activeQueue])

  // Fetch queue counts for tab badges
  const { data: queueCounts } = useQuery({
    queryKey: ['queue-counts'],
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

  const { data, isPending } = useQuery({
    queryKey: ['tickets', filters, currentPage, activeQueue],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(currentPage * PAGE_SIZE))

      // Apply queue filter
      if (activeQueue !== 'all') {
        params.set('queue', activeQueue)
      }

      if (filters.search) {
        params.set('search', filters.search)
      }

      // Apply status filters (single value for now - API expects single status)
      if (filters.status.length === 1) {
        params.set('status', filters.status[0])
      }

      // Apply priority filters (single value for now)
      if (filters.priority.length === 1) {
        params.set('priority', filters.priority[0])
      }

      // Apply AI handled filter
      if (filters.aiHandled !== 'all') {
        params.set('aiHandled', filters.aiHandled === 'ai' ? 'true' : 'false')
      }

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        signal,
      })
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }
      return response.json()
    },
    placeholderData: keepPreviousData,
    retry: 2,
  })

  const tickets: TicketWithCustomer[] = data?.tickets || []
  const totalCount = data?.total || 0
  const isLoading = isPending

  const handleTicketClick = (ticket: TicketWithCustomer) => {
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
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
      await queryClient.invalidateQueries({ queryKey: ['queue-counts'] })
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
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
      await queryClient.invalidateQueries({ queryKey: ['queue-counts'] })
      await queryClient.invalidateQueries({ queryKey: ['ticket-count'] })
    } catch (err) {
      setBulkMessage(`Error: ${err instanceof Error ? err.message : 'Failed to delete'}`)
      setTimeout(() => setBulkMessage(null), 5000)
    }
  }, [clearSelection, queryClient])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNextPage = currentPage < totalPages - 1
  const hasPrevPage = currentPage > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeQueue === 'human' ? 'Human Queue' : activeQueue === 'ai' ? 'AI Queue' : 'All Tickets'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : activeQueue === 'human' ? `${totalCount} tickets need attention` : `${totalCount} tickets`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GetNextTicketButton />
          <Button
            className="bg-primary-600 hover:bg-primary-700 text-white"
            onClick={() => router.push('/tickets/new')}
          >
            + New Ticket
          </Button>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {([
          { key: 'human' as QueueTab, label: 'Human Queue', count: queueCounts?.human },
          { key: 'ai' as QueueTab, label: 'AI Queue', count: queueCounts?.ai },
          { key: 'all' as QueueTab, label: 'All' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveQueue(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeQueue === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                activeQueue === tab.key
                  ? tab.key === 'human' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Ticket List */}
      <Card className="glass border-0 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border/70">
              {Array.from({ length: 5 }).map((_, i) => (
                <TicketCardSkeleton key={i} />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No tickets found
              </h3>
              <p className="text-sm text-muted-foreground">
                {filters.search || filters.status.length > 0 || filters.priority.length > 0 || filters.aiHandled !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No tickets have been created yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isChecked={isTicketChecked(ticket.id)}
                  selectionMode={hasSelection}
                  onClick={() => handleTicketClick(ticket)}
                  onCheckboxChange={() => toggleTicket(ticket.id)}
                  onHover={() => prefetchTicket(ticket.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Update Message */}
      {bulkMessage && (
        <div className={`px-4 py-2 rounded-md text-sm font-medium ${
          bulkMessage.startsWith('Error')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
        }`}>
          {bulkMessage}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * PAGE_SIZE + 1} -{' '}
            {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={!hasPrevPage || isLoading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!hasNextPage || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        currentAgentId={agent?.id}
      />
      {hasSelection && <div className="h-16" />}
    </div>
  )
}
