'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchTicketById, fetchTicketMessages } from '@/lib/api/tickets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TicketCard, TicketCardSkeleton, TicketWithCustomer } from './TicketCard'
import { GetNextTicketButtonCompact } from './GetNextTicketButton'
import { BulkActionsBar, BulkUpdates } from './BulkActionsBar'
import { useTicketSelection } from '@/hooks'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket, Customer } from '@/types/database'

type FilterTab = 'all' | 'ai' | 'human' | 'escalated'

interface TicketQueueProps {
  onTicketSelect?: (ticket: TicketWithCustomer) => void
  selectedTicketId?: string
  currentAgentId?: string
}

export function TicketQueue({ onTicketSelect, selectedTicketId, currentAgentId }: TicketQueueProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [bulkUpdateMessage, setBulkUpdateMessage] = useState<string | null>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Use the ticket selection hook
  const {
    selectedIds,
    isSelected: isTicketChecked,
    toggleTicket,
    selectAll,
    clearSelection,
    selectedCount,
    hasSelection,
  } = useTicketSelection()

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

  // Fetch tickets with React Query for caching across navigation
  const { data: tickets = [], isPending: isLoading, error, refetch: fetchTickets } = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async (): Promise<TicketWithCustomer[]> => {
      const { data, error: fetchError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        console.error('Supabase tickets fetch error:', fetchError)
        throw new Error('Unable to load tickets. Please try again.')
      }

      // Transform data to match TicketWithCustomer type
      return (data || []).map((ticket) => ({
        ...ticket,
        customer: ticket.customer as Customer,
      })) as TicketWithCustomer[]
    },
    staleTime: 30 * 1000, // 30 seconds - allow slightly stale data for instant navigation
    retry: 2,
  })

  // Set up real-time subscription (updates React Query cache)
  useEffect(() => {
    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        async (payload) => {
          console.log('Ticket change received:', payload)

          if (payload.eventType === 'INSERT') {
            // Fetch the new ticket with customer data
            const { data: newTicket } = await supabase
              .from('tickets')
              .select(`
                *,
                customer:customers(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (newTicket) {
              queryClient.setQueryData(['dashboard-tickets'], (old: TicketWithCustomer[] | undefined) => [
                {
                  ...newTicket,
                  customer: newTicket.customer as Customer,
                } as TicketWithCustomer,
                ...(old || []),
              ])
            }
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(['dashboard-tickets'], (old: TicketWithCustomer[] | undefined) =>
              (old || []).map((ticket) =>
                ticket.id === payload.new.id
                  ? { ...ticket, ...(payload.new as Ticket) }
                  : ticket
              )
            )
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(['dashboard-tickets'], (old: TicketWithCustomer[] | undefined) =>
              (old || []).filter((ticket) => ticket.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  // Filter tickets based on active tab
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      switch (activeTab) {
        case 'ai':
          return ticket.ai_handled === true
        case 'human':
          return ticket.ai_handled === false
        case 'escalated':
          return ticket.status === 'escalated'
        default:
          return true
      }
    })
  }, [tickets, activeTab])

  // Get IDs of filtered tickets for "Select All" functionality
  const filteredTicketIds = useMemo(
    () => filteredTickets.map((t) => t.id),
    [filteredTickets]
  )

  // Check if all filtered tickets are selected
  const allFilteredSelected = useMemo(() => {
    if (filteredTicketIds.length === 0) return false
    return filteredTicketIds.every((id) => selectedIds.has(id))
  }, [filteredTicketIds, selectedIds])

  // Check if some but not all filtered tickets are selected
  const someFilteredSelected = useMemo(() => {
    if (filteredTicketIds.length === 0) return false
    const selectedFiltered = filteredTicketIds.filter((id) => selectedIds.has(id))
    return selectedFiltered.length > 0 && selectedFiltered.length < filteredTicketIds.length
  }, [filteredTicketIds, selectedIds])

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      selectAll(filteredTicketIds)
    } else {
      clearSelection()
    }
  }

  // Handle bulk update
  const handleBulkUpdate = async (updates: BulkUpdates) => {
    const ticketIds = Array.from(selectedIds)

    try {
      const response = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketIds, updates }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tickets')
      }

      // Show success message
      setBulkUpdateMessage(`Successfully updated ${data.updatedCount} ticket${data.updatedCount !== 1 ? 's' : ''}`)
      setTimeout(() => setBulkUpdateMessage(null), 3000)

      // Clear selection after successful update
      clearSelection()

      // Refresh tickets to get updated data
      await queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] })
    } catch (err) {
      console.error('Bulk update error:', err)
      setBulkUpdateMessage(`Error: ${err instanceof Error ? err.message : 'Failed to update tickets'}`)
      setTimeout(() => setBulkUpdateMessage(null), 5000)
    }
  }

  const handleBulkDelete = async (ticketIds: string[]) => {
    try {
      const response = await fetch('/api/tickets/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketIds }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tickets')
      }

      setBulkUpdateMessage(`Successfully deleted ${data.deletedCount} ticket${data.deletedCount !== 1 ? 's' : ''}`)
      setTimeout(() => setBulkUpdateMessage(null), 3000)

      clearSelection()
      await queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] })
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
      await queryClient.invalidateQueries({ queryKey: ['queue-counts'] })
    } catch (err) {
      console.error('Bulk delete error:', err)
      setBulkUpdateMessage(`Error: ${err instanceof Error ? err.message : 'Failed to delete tickets'}`)
      setTimeout(() => setBulkUpdateMessage(null), 5000)
    }
  }

  // Count badges
  const counts = {
    all: tickets.length,
    ai: tickets.filter((t) => t.ai_handled).length,
    human: tickets.filter((t) => !t.ai_handled).length,
    escalated: tickets.filter((t) => t.status === 'escalated').length,
  }

  return (
    <>
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Select All Checkbox */}
              <div
                className={cn(
                  'flex items-center transition-opacity duration-200',
                  hasSelection || filteredTickets.length > 0 ? 'opacity-100' : 'opacity-0'
                )}
              >
                <Checkbox
                  checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  disabled={filteredTickets.length === 0}
                  aria-label="Select all tickets"
                  className="w-4 h-4"
                />
              </div>
              <CardTitle className="text-lg">Ticket Queue</CardTitle>
              {hasSelection ? (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {selectedCount} selected
                </span>
              ) : (
                <GetNextTicketButtonCompact />
              )}
            </div>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as FilterTab)}
              className="w-full sm:w-auto"
            >
              <TabsList className="h-8 w-full sm:w-auto grid grid-cols-4 sm:flex">
                <TabsTrigger value="all" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">All</span>
                  <span className="sm:hidden">All</span>
                  {counts.all > 0 && (
                    <span className="ml-1 sm:ml-1.5 text-[10px] bg-muted px-1 sm:px-1.5 py-0.5 rounded-full">
                      {counts.all}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">AI Handled</span>
                  <span className="sm:hidden">AI</span>
                  {counts.ai > 0 && (
                    <span className="ml-1 sm:ml-1.5 text-[10px] bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300 px-1 sm:px-1.5 py-0.5 rounded-full">
                      {counts.ai}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="human" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">Needs Human</span>
                  <span className="sm:hidden">Human</span>
                  {counts.human > 0 && (
                    <span className="ml-1 sm:ml-1.5 text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-1 sm:px-1.5 py-0.5 rounded-full">
                      {counts.human}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="escalated" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">Escalated</span>
                  <span className="sm:hidden">Esc</span>
                  {counts.escalated > 0 && (
                    <span className="ml-1 sm:ml-1.5 text-[10px] bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 px-1 sm:px-1.5 py-0.5 rounded-full">
                      {counts.escalated}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Success/Error Toast */}
          {bulkUpdateMessage && (
            <div
              className={cn(
                'mb-4 px-4 py-2 rounded-md text-sm font-medium',
                bulkUpdateMessage.startsWith('Error')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              )}
            >
              {bulkUpdateMessage}
            </div>
          )}

          <div className="divide-y divide-border/70">
            {isLoading ? (
              // Skeleton loaders
              Array.from({ length: 5 }).map((_, i) => (
                <TicketCardSkeleton key={i} />
              ))
            ) : error ? (
              // Error State
              <ErrorStateComponent message={error instanceof Error ? error.message : 'Failed to load tickets'} onRetry={() => fetchTickets()} />
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={ticket.id === selectedTicketId}
                  isChecked={isTicketChecked(ticket.id)}
                  selectionMode={hasSelection}
                  onClick={() => onTicketSelect?.(ticket)}
                  onCheckboxChange={() => toggleTicket(ticket.id)}
                  onHover={() => prefetchTicket(ticket.id)}
                />
              ))
            ) : (
              // Empty State
              <EmptyState filter={activeTab} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        currentAgentId={currentAgentId}
      />

      {/* Spacer to prevent content from being hidden behind the bulk actions bar */}
      {hasSelection && <div className="h-16" />}
    </>
  )
}

function ErrorStateComponent({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Failed to load tickets
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      {isDev && (
        <p className="mb-4 text-xs text-muted-foreground max-w-md mx-auto bg-muted p-2 rounded">
          Check browser console for details
        </p>
      )}
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Try again
      </Button>
    </div>
  )
}

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { icon: string; title: string; description: string }> = {
    all: {
      icon: String.fromCodePoint(0x2615),
      title: 'All caught up! Time for coffee.',
      description: 'Nova is watching the queue. You\'ll be notified instantly.',
    },
    ai: {
      icon: String.fromCodePoint(0x1F916),
      title: 'No AI-handled tickets',
      description: 'New tickets will appear here when Nova handles them automatically.',
    },
    human: {
      icon: String.fromCodePoint(0x2728),
      title: 'No tickets need attention',
      description: 'Nova is handling everything smoothly right now.',
    },
    escalated: {
      icon: String.fromCodePoint(0x1F389),
      title: 'No escalations',
      description: 'Great news! All customers are happy.',
    },
  }

  const { icon, title, description } = messages[filter]

  return (
    <div className="py-16 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p style={{ color: '#475569' }}>{description}</p>
    </div>
  )
}
