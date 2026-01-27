'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetricsBar, TicketQueue, FilterBar, defaultFilters } from '@/components/dashboard'
import type { FilterOptions, TicketWithCustomer } from '@/components/dashboard'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [selectedTicketId, setSelectedTicketId] = useState<string>()

  const handleTicketSelect = (ticket: TicketWithCustomer) => {
    setSelectedTicketId(ticket.id)
    // Navigate to ticket detail page
    router.push(`/tickets/${ticket.id}`)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Support Dashboard
          </h1>
          <p className="text-sm mt-1 text-medium">
            Manage customer tickets with AI-powered assistance
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
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

      {/* Filter Bar */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Ticket Queue with real-time updates */}
      <TicketQueue
        onTicketSelect={handleTicketSelect}
        selectedTicketId={selectedTicketId}
      />
    </div>
  )
}
