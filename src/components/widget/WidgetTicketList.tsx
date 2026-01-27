'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetSession, WidgetTicket } from '@/types/widget'

interface WidgetTicketListProps {
  session: WidgetSession | null
  onSelectTicket: (ticketId: string) => void
  onNewTicket: () => void
}

// Status badge configuration
const statusConfig = {
  open: {
    label: 'Open',
    icon: MessageSquare,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  escalated: {
    label: 'Escalated',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date()
  const messageDate = new Date(date)
  const diffMs = now.getTime() - messageDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function WidgetTicketList({
  session,
  onSelectTicket,
  onNewTicket,
}: WidgetTicketListProps) {
  const [tickets, setTickets] = useState<WidgetTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      if (!session?.token) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/widget/tickets', {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load conversations')
        }

        const data = await response.json()
        setTickets(data.tickets || [])
      } catch (err) {
        setError('Failed to load conversations')
        console.error('Fetch tickets error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTickets()
  }, [session?.token])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Loading conversations...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* New conversation button */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewTicket}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'px-4 py-2.5 rounded-lg',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors duration-200',
            'text-sm font-medium'
          )}
        >
          <Plus className="h-5 w-5" />
          <span>Start New Conversation</span>
        </button>
      </div>

      {/* Tickets list */}
      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              No conversations yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Start a new conversation to get help
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.open
              const StatusIcon = status.icon

              return (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className={cn(
                    'w-full text-left p-4',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    'transition-colors duration-150',
                    'focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                            status.className
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {formatRelativeTime(ticket.last_message_at || ticket.updated_at)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
