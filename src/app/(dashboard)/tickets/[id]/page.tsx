'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TicketDetail } from '@/components/dashboard/TicketDetail'
import { CustomerContext } from '@/components/dashboard/CustomerContext'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react'
import { useRegisterTicketShortcuts } from '@/contexts/KeyboardShortcutsContext'
import type { TicketWithCustomer } from '@/components/dashboard'
import type { Message, MessageWithAttachments } from '@/types/database'
import { fetchTicketById, fetchTicketEvents, fetchTicketMessages } from '@/lib/api/tickets'

// Priority cycle order
const PRIORITY_ORDER = ['low', 'normal', 'high', 'urgent'] as const
const TIMELINE_PREFETCH_LIMIT = 10

type PendingMessage = {
  content: string
  senderType: 'agent' | 'ai'
  isInternal?: boolean
  attachmentIds?: string[]
}

function getCachedTicket(queryClient: ReturnType<typeof useQueryClient>, ticketId: string) {
  const dashboardTickets = queryClient.getQueryData<TicketWithCustomer[]>(['dashboard-tickets'])
  const dashboardMatch = dashboardTickets?.find((ticket) => ticket.id === ticketId)
  if (dashboardMatch) return dashboardMatch

  const listQueries = queryClient.getQueriesData<{ tickets: TicketWithCustomer[] }>({ queryKey: ['tickets'] })
  for (const [, data] of listQueries) {
    const match = data?.tickets?.find((ticket) => ticket.id === ticketId)
    if (match) return match
  }

  return undefined
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])

  const [showCustomerContext, setShowCustomerContext] = useState(true)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null)

  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicketById(ticketId),
    initialData: () => getCachedTicket(queryClient, ticketId),
    staleTime: 60 * 1000,
    enabled: Boolean(ticketId),
    refetchOnMount: true,
  })

  const messagesQuery = useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => fetchTicketMessages(ticketId),
    staleTime: 30 * 1000,
    enabled: Boolean(ticketId),
    refetchOnMount: true,
  })

  const currentAgentQuery = useQuery({
    queryKey: ['current-agent'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id ?? null
    },
    staleTime: 5 * 60 * 1000,
  })

  const updateTicketInCaches = useCallback((updates: Partial<TicketWithCustomer>) => {
    queryClient.setQueryData<TicketWithCustomer | undefined>(['ticket', ticketId], (old) => {
      if (!old) return old
      const next: TicketWithCustomer = { ...old, ...updates }
      if (updates.assigned_agent_id === null) {
        next.assigned_agent = null
      }
      return next
    })

    queryClient.setQueryData<TicketWithCustomer[] | undefined>(['dashboard-tickets'], (old) => {
      if (!old) return old
      return old.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...updates } : ticket
      )
    })

    queryClient.setQueriesData<{ tickets: TicketWithCustomer[]; total: number } | undefined>(
      { queryKey: ['tickets'] },
      (old) => {
        if (!old?.tickets) return old
        return {
          ...old,
          tickets: old.tickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, ...updates } : ticket
          ),
        }
      }
    )
  }, [queryClient, ticketId])

  const replaceTicketInCaches = useCallback((updatedTicket: TicketWithCustomer) => {
    queryClient.setQueryData(['ticket', ticketId], updatedTicket)

    queryClient.setQueryData<TicketWithCustomer[] | undefined>(['dashboard-tickets'], (old) => {
      if (!old) return old
      return old.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))
    })

    queryClient.setQueriesData<{ tickets: TicketWithCustomer[]; total: number } | undefined>(
      { queryKey: ['tickets'] },
      (old) => {
        if (!old?.tickets) return old
        return {
          ...old,
          tickets: old.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        }
      }
    )
  }, [queryClient, ticketId])

  const updateTicketMutation = useMutation({
    mutationFn: async (updates: Partial<TicketWithCustomer>) => {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ticket')
      }

      return data.ticket as TicketWithCustomer
    },
    onMutate: async (updates) => {
      setSendError(null)
      const previousTicket = queryClient.getQueryData<TicketWithCustomer>(['ticket', ticketId])
      const previousDashboard = queryClient.getQueryData<TicketWithCustomer[]>(['dashboard-tickets'])
      const previousLists = queryClient.getQueriesData<{ tickets: TicketWithCustomer[]; total: number }>({
        queryKey: ['tickets'],
      })

      updateTicketInCaches(updates)

      return { previousTicket, previousDashboard, previousLists }
    },
    onError: (error, _updates, context) => {
      console.error('Error updating ticket:', error)
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', ticketId], context.previousTicket)
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard-tickets'], context.previousDashboard)
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
    },
    onSuccess: (updatedTicket) => {
      replaceTicketInCaches(updatedTicket)
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, senderType, isInternal, attachmentIds }: PendingMessage) => {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          senderType,
          metadata: isInternal ? { is_internal: true } : {},
          attachmentIds: attachmentIds || [],
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      return data.message as MessageWithAttachments
    },
    onMutate: async (payload) => {
      setSendError(null)
      setPendingMessage(payload)

      const optimisticMessage: Message = {
        id: `pending-${Date.now()}`,
        ticket_id: ticketId,
        sender_type: payload.senderType,
        content: payload.content,
        created_at: new Date().toISOString(),
        confidence: null,
        content_translated: null,
        original_language: null,
        metadata: payload.isInternal ? { is_internal: true } : {},
        source: 'dashboard',
        external_id: null,
        routing_decision: null,
        delivery_status: 'pending',
        delivered_at: null,
        read_at: null,
      }

      queryClient.setQueryData<(Message | MessageWithAttachments)[]>(['ticket-messages', ticketId], (old = []) => [
        ...old,
        optimisticMessage,
      ])

      return { optimisticId: optimisticMessage.id }
    },
    onError: (error, _payload, context) => {
      console.error('Error sending message:', error)
      queryClient.setQueryData<(Message | MessageWithAttachments)[]>(['ticket-messages', ticketId], (old = []) =>
        old.filter((message) => message.id !== context?.optimisticId)
      )
      setSendError(error instanceof Error ? error.message : 'Failed to send message')
    },
    onSuccess: (message, _payload, context) => {
      queryClient.setQueryData<(Message | MessageWithAttachments)[]>(['ticket-messages', ticketId], (old = []) => {
        const withoutOptimistic = old.filter((item) => item.id !== context?.optimisticId)
        if (withoutOptimistic.some((item) => item.id === message.id)) {
          return withoutOptimistic
        }
        return [...withoutOptimistic, message]
      })

      setPendingMessage(null)
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
  })

  const handleSendMessage = useCallback((content: string, senderType: 'agent' | 'ai' = 'agent', isInternal: boolean = false, attachmentIds?: string[]) => {
    sendMessageMutation.mutate({ content, senderType, isInternal, attachmentIds })
  }, [sendMessageMutation])

  const handleRetry = useCallback(async () => {
    if (pendingMessage) {
      sendMessageMutation.mutate(pendingMessage)
    }
  }, [pendingMessage, sendMessageMutation])

  const handleClearError = useCallback(() => {
    setSendError(null)
    setPendingMessage(null)
  }, [])

  const handleUpdateTicket = useCallback((updates: Partial<TicketWithCustomer>) => {
    updateTicketMutation.mutate(updates)
  }, [updateTicketMutation])

  // Keyboard shortcut handlers
  const handleResolve = useCallback(() => {
    if (ticketQuery.data) {
      handleUpdateTicket({ status: 'resolved' })
    }
  }, [ticketQuery.data, handleUpdateTicket])

  const handleEscalate = useCallback(() => {
    if (ticketQuery.data) {
      handleUpdateTicket({ status: 'escalated', ai_handled: false })
    }
  }, [ticketQuery.data, handleUpdateTicket])

  const handleAssign = useCallback(() => {
    if (ticketQuery.data && currentAgentQuery.data) {
      handleUpdateTicket({ assigned_agent_id: currentAgentQuery.data })
    }
  }, [ticketQuery.data, currentAgentQuery.data, handleUpdateTicket])

  const handleUnassign = useCallback(() => {
    if (ticketQuery.data) {
      handleUpdateTicket({ assigned_agent_id: null })
    }
  }, [ticketQuery.data, handleUpdateTicket])

  const handleTogglePriority = useCallback(() => {
    if (ticketQuery.data) {
      const currentIndex = PRIORITY_ORDER.indexOf(ticketQuery.data.priority as typeof PRIORITY_ORDER[number])
      const nextIndex = (currentIndex + 1) % PRIORITY_ORDER.length
      handleUpdateTicket({ priority: PRIORITY_ORDER[nextIndex] })
    }
  }, [ticketQuery.data, handleUpdateTicket])

  const shortcutActions = useMemo(() => ({
    onResolve: handleResolve,
    onEscalate: handleEscalate,
    onAssign: handleAssign,
    onUnassign: handleUnassign,
    onTogglePriority: handleTogglePriority,
    onFocusInput: () => {
      const textarea = document.querySelector('[data-chat-input="true"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
      }
    },
  }), [handleResolve, handleEscalate, handleAssign, handleUnassign, handleTogglePriority])

  useRegisterTicketShortcuts(shortcutActions)

  useEffect(() => {
    if (!ticketId) return
    queryClient.prefetchQuery({
      queryKey: ['ticket-events', ticketId, TIMELINE_PREFETCH_LIMIT],
      queryFn: () => fetchTicketEvents(ticketId, { limit: TIMELINE_PREFETCH_LIMIT }),
    })
  }, [ticketId, queryClient])

  useEffect(() => {
    if (!ticketId) return

    const messagesChannel = supabase
      .channel(`messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          const { data: messageWithAttachments } = await supabase
            .from('messages')
            .select('*, message_attachments(*)')
            .eq('id', (payload.new as Message).id)
            .single()

          const newMessage = messageWithAttachments || (payload.new as Message)

          queryClient.setQueryData<(Message | MessageWithAttachments)[]>(['ticket-messages', ticketId], (old = []) => {
            if (old.some((message) => message.id === newMessage.id)) {
              return old
            }
            return [...old, newMessage]
          })
        }
      )
      .subscribe()

    const ticketChannel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`,
        },
        async () => {
          const { data } = await supabase
            .from('tickets')
            .select(`*, customer:customers(*), assigned_agent:agents!assigned_agent_id(id, name, avatar_url)`)
            .eq('id', ticketId)
            .single()
          if (data) {
            replaceTicketInCaches(data as TicketWithCustomer)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(ticketChannel)
    }
  }, [ticketId, supabase, queryClient, replaceTicketInCaches])

  if (ticketQuery.isPending) {
    return <TicketDetailSkeleton />
  }

  const ticketError = ticketQuery.error as (Error & { status?: number }) | null

  if (ticketError?.status === 404 || !ticketQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="text-6xl mb-2">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Ticket not found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This ticket may have been deleted or you don&apos;t have access to it.
        </p>
        <Button variant="outline" onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  if (ticketQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load ticket
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{ticketError?.message || 'Unable to load ticket.'}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => ticketQuery.refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const ticket = ticketQuery.data
  const messages = messagesQuery.data || []

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
              {ticket.subject}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Ticket #{ticket.id.slice(0, 8)} • {ticket.customer?.name || 'Unknown Customer'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCustomerContext(!showCustomerContext)}
          className="self-start sm:self-auto"
        >
          {showCustomerContext ? 'Hide' : 'Show'} Customer Info
        </Button>
      </div>

      {/* Split View - stacked on mobile, side by side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100%-5rem)] lg:h-[calc(100%-4rem)]">
        {/* Main Chat Area */}
        <div className={`flex-1 min-h-[400px] lg:min-h-0 ${showCustomerContext ? 'lg:max-w-[calc(100%-320px)]' : ''}`}>
          <TicketDetail
            ticket={ticket}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUpdateTicket={handleUpdateTicket}
            currentAgentId={currentAgentQuery.data}
            isSending={sendMessageMutation.isPending}
            sendError={sendError}
            onRetry={handleRetry}
            onClearError={handleClearError}
            isMessagesLoading={messagesQuery.isPending}
          />
        </div>

        {/* Customer Context Sidebar */}
        {showCustomerContext && (
          <div className="w-full lg:w-80 flex-shrink-0 order-first lg:order-last">
            <CustomerContext
              customer={ticket.customer}
              ticket={ticket}
              onUpdateTicket={handleUpdateTicket}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TicketDetailSkeleton() {
  return (
    <div className="h-[calc(100vh-8rem)] animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="space-y-2">
          <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="w-80 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}
