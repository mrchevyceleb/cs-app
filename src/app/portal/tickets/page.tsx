'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  AlertCircle,
  Ticket,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'
import type { PortalTicket, PortalSession, TicketStatus } from '@/types/database'

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string }> = {
  open: {
    label: 'Open',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  },
  pending: {
    label: 'Awaiting Response',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
  },
  escalated: {
    label: 'In Review',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700',
  },
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

type StatusFilter = 'all' | 'active' | 'resolved'

export default function PortalTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<PortalTicket[]>([])
  const [session, setSession] = useState<PortalSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/portal/tickets', {
        credentials: 'include', // Include cookies
      })

      if (response.status === 401) {
        // Token invalid/expired - redirect to portal home
        router.push('/portal')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load tickets')
        setIsLoading(false)
        return
      }

      setTickets(data.tickets || [])
      setSession(data.session || null)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Unable to load tickets. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter tickets based on search and status
  const filteredTickets = tickets.filter((ticket) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!ticket.subject.toLowerCase().includes(query)) {
        return false
      }
    }

    // Status filter
    if (statusFilter === 'active') {
      return ticket.status !== 'resolved'
    }
    if (statusFilter === 'resolved') {
      return ticket.status === 'resolved'
    }

    return true
  })

  // Count tickets by status
  const activeCount = tickets.filter(t => t.status !== 'resolved').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading your tickets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Unable to Load Tickets
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {error}
        </p>
        <Button onClick={fetchTickets} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {session?.customerName ? `Welcome, ${session.customerName}` : 'Your Support Tickets'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage your support requests
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="flex-1 sm:flex-none"
          >
            All ({tickets.length})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className="flex-1 sm:flex-none"
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('resolved')}
            className="flex-1 sm:flex-none"
          >
            Resolved ({resolvedCount})
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Ticket className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'No tickets match your filters'
                  : 'No tickets yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'When you contact support, your tickets will appear here'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const statusConfig = STATUS_CONFIG[ticket.status]

            return (
              <Link
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Subject */}
                        <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {ticket.subject}
                        </h3>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatRelativeTime(ticket.updated_at)}
                          </span>
                          {ticket.message_count !== undefined && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {ticket.message_count} messages
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status and Arrow */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`${statusConfig.bgColor} ${statusConfig.color} border`}
                        >
                          {statusConfig.label}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTickets}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  )
}
