'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TicketCard, TicketCardSkeleton, TicketWithCustomer } from './TicketCard'
import { RefreshCw, AlertCircle } from 'lucide-react'
import type { Ticket, Customer } from '@/types/database'

type FilterTab = 'all' | 'ai' | 'human' | 'escalated'

interface TicketQueueProps {
  onTicketSelect?: (ticket: TicketWithCustomer) => void
  selectedTicketId?: string
}

export function TicketQueue({ onTicketSelect, selectedTicketId }: TicketQueueProps) {
  const [tickets, setTickets] = useState<TicketWithCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const supabase = createClient()

  const fetchTickets = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        console.error('Error fetching tickets:', fetchError)
        setError('Unable to load tickets. Please try again.')
        return
      }

      // Transform data to match TicketWithCustomer type
      const transformedTickets = (data || []).map((ticket) => ({
        ...ticket,
        customer: ticket.customer as Customer,
      })) as TicketWithCustomer[]

      setTickets(transformedTickets)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTickets()

    // Set up real-time subscription
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
              setTickets((prev) => [
                {
                  ...newTicket,
                  customer: newTicket.customer as Customer,
                } as TicketWithCustomer,
                ...prev,
              ])
            }
          } else if (payload.eventType === 'UPDATE') {
            setTickets((prev) =>
              prev.map((ticket) =>
                ticket.id === payload.new.id
                  ? { ...ticket, ...(payload.new as Ticket) }
                  : ticket
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTickets((prev) =>
              prev.filter((ticket) => ticket.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchTickets])

  // Filter tickets based on active tab
  const filteredTickets = tickets.filter((ticket) => {
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

  // Count badges
  const counts = {
    all: tickets.length,
    ai: tickets.filter((t) => t.ai_handled).length,
    human: tickets.filter((t) => !t.ai_handled).length,
    escalated: tickets.filter((t) => t.status === 'escalated').length,
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg">Ticket Queue</CardTitle>
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
                  <span className="ml-1 sm:ml-1.5 text-[10px] bg-gray-200 dark:bg-gray-700 px-1 sm:px-1.5 py-0.5 rounded-full">
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
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? (
            // Skeleton loaders
            Array.from({ length: 5 }).map((_, i) => (
              <TicketCardSkeleton key={i} />
            ))
          ) : error ? (
            // Error State
            <ErrorStateComponent message={error} onRetry={fetchTickets} />
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isSelected={ticket.id === selectedTicketId}
                onClick={() => onTicketSelect?.(ticket)}
              />
            ))
          ) : (
            // Empty State
            <EmptyState filter={activeTab} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorStateComponent({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Failed to load tickets
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
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
      icon: '☕',
      title: 'All caught up! Time for coffee.',
      description: 'Nova is watching the queue. You\'ll be notified instantly.',
    },
    ai: {
      icon: '🤖',
      title: 'No AI-handled tickets',
      description: 'New tickets will appear here when Nova handles them automatically.',
    },
    human: {
      icon: '✨',
      title: 'No tickets need attention',
      description: 'Nova is handling everything smoothly right now.',
    },
    escalated: {
      icon: '🎉',
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
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}
