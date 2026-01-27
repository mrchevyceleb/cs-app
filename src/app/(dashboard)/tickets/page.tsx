'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilterBar, defaultFilters, TicketCard, TicketCardSkeleton, GetNextTicketButton } from '@/components/dashboard'
import type { FilterOptions, TicketWithCustomer } from '@/components/dashboard'

const PAGE_SIZE = 20

export default function TicketsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [tickets, setTickets] = useState<TicketWithCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)

  const fetchTickets = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(currentPage * PAGE_SIZE))

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

      const response = await fetch(`/api/tickets?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
        setTotalCount(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      setTickets([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, currentPage])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [filters])

  const handleTicketClick = (ticket: TicketWithCustomer) => {
    router.push(`/tickets/${ticket.id}`)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNextPage = currentPage < totalPages - 1
  const hasPrevPage = currentPage > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            All Tickets
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${totalCount} total tickets`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GetNextTicketButton />
          <Button className="bg-primary-600 hover:bg-primary-700 text-white">
            + New Ticket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Ticket List */}
      <Card className="bg-card border-border/70">
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
                  onClick={() => handleTicketClick(ticket)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
