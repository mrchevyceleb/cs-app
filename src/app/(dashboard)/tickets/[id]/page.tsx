'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TicketDetail } from '@/components/dashboard/TicketDetail'
import { CustomerContext } from '@/components/dashboard/CustomerContext'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react'
import { useRegisterTicketShortcuts } from '@/contexts/KeyboardShortcutsContext'
import type { TicketWithCustomer } from '@/components/dashboard'
import type { Message, MessageWithAttachments } from '@/types/database'

// Priority cycle order
const PRIORITY_ORDER = ['low', 'normal', 'high', 'urgent'] as const

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<TicketWithCustomer | null>(null)
  const [messages, setMessages] = useState<(Message | MessageWithAttachments)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCustomerContext, setShowCustomerContext] = useState(true)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)

  // Message sending state
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<{ content: string; senderType: 'agent' | 'ai'; isInternal?: boolean; attachmentIds?: string[] } | null>(null)

  const supabase = createClient()

  const fetchTicketAndMessages = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch ticket and messages in parallel
      const [ticketResult, messagesResult] = await Promise.all([
        supabase
          .from('tickets')
          .select(`
            *,
            customer:customers(*),
            assigned_agent:agents!assigned_agent_id(id, name, avatar_url)
          `)
          .eq('id', ticketId)
          .single(),
        supabase
          .from('messages')
          .select('*, message_attachments(*)')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true }),
      ])

      // Check if this fetch was aborted (component unmounted or ticketId changed)
      if (signal?.aborted) return

      if (ticketResult.error) {
        if (ticketResult.error.code === 'PGRST116') {
          setError('not_found')
        } else {
          console.error('Error fetching ticket:', ticketResult.error)
          setError('Failed to load ticket. Please try again.')
        }
        setIsLoading(false)
        return
      }

      setTicket(ticketResult.data as TicketWithCustomer)

      if (messagesResult.error) {
        console.error('Error fetching messages:', messagesResult.error)
      } else {
        setMessages(messagesResult.data || [])
      }
    } catch (err) {
      if (signal?.aborted) return
      console.error('Error fetching ticket:', err)
      setError('Network error. Please check your connection.')
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [ticketId, supabase])

  // Fetch current agent on mount
  useEffect(() => {
    const fetchCurrentAgent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentAgentId(user.id)
      }
    }
    fetchCurrentAgent()
  }, [supabase])

  useEffect(() => {
    const abortController = new AbortController()
    fetchTicketAndMessages(abortController.signal)

    // Subscribe to real-time message updates
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
          // Fetch the message with attachments
          const { data: messageWithAttachments } = await supabase
            .from('messages')
            .select('*, message_attachments(*)')
            .eq('id', (payload.new as Message).id)
            .single()

          if (messageWithAttachments) {
            setMessages((prev) => [...prev, messageWithAttachments as MessageWithAttachments])
          } else {
            // Fallback to basic message if fetch fails
            setMessages((prev) => [...prev, payload.new as Message])
          }
        }
      )
      .subscribe()

    // Subscribe to ticket updates
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
          // Refetch ticket with customer and agent data
          const { data } = await supabase
            .from('tickets')
            .select(`*, customer:customers(*), assigned_agent:agents!assigned_agent_id(id, name, avatar_url)`)
            .eq('id', ticketId)
            .single()
          if (data) setTicket(data as TicketWithCustomer)
        }
      )
      .subscribe()

    return () => {
      abortController.abort()
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(ticketChannel)
    }
  }, [ticketId, supabase, fetchTicketAndMessages])

  const handleSendMessage = useCallback(async (content: string, senderType: 'agent' | 'ai' = 'agent', isInternal: boolean = false, attachmentIds?: string[]) => {
    if (!ticket) return

    setIsSending(true)
    setSendError(null)

    // Create optimistic message with metadata
    const optimisticMessage: Message = {
      id: `pending-${Date.now()}`,
      ticket_id: ticketId,
      sender_type: senderType,
      content,
      created_at: new Date().toISOString(),
      confidence: null,
      content_translated: null,
      original_language: null,
      metadata: isInternal ? { is_internal: true } : {},
      source: 'dashboard',
      external_id: null,
      routing_decision: null,
      delivery_status: 'pending',
      delivered_at: null,
      read_at: null,
    }

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage])
    setPendingMessage({ content, senderType, isInternal, attachmentIds })

    try {
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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      // Success - real-time subscription will add the actual message
      // Remove the optimistic message (it will be replaced by the real one)
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      setPendingMessage(null)
    } catch (err) {
      console.error('Error sending message:', err)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      setSendError(err instanceof Error ? err.message : 'Failed to send message')
      // Keep pendingMessage for retry
    } finally {
      setIsSending(false)
    }
  }, [ticket, ticketId])

  const handleRetry = useCallback(async () => {
    if (pendingMessage) {
      await handleSendMessage(pendingMessage.content, pendingMessage.senderType, pendingMessage.isInternal, pendingMessage.attachmentIds)
    }
  }, [pendingMessage, handleSendMessage])

  const handleClearError = useCallback(() => {
    setSendError(null)
    setPendingMessage(null)
  }, [])

  const handleUpdateTicket = async (updates: Partial<TicketWithCustomer>) => {
    // Optimistically update the local state
    if (ticket) {
      setTicket({ ...ticket, ...updates } as TicketWithCustomer)
    }

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Error updating ticket:', data.error)
        // Revert on error by refetching
        fetchTicketAndMessages()
        return
      }

      // Update with the server response
      const { ticket: updatedTicket } = await response.json()
      setTicket(updatedTicket as TicketWithCustomer)
    } catch (err) {
      console.error('Error updating ticket:', err)
      // Revert on error by refetching
      fetchTicketAndMessages()
    }
  }

  // Keyboard shortcut handlers
  const handleResolve = useCallback(() => {
    if (ticket) {
      handleUpdateTicket({ status: 'resolved' })
    }
  }, [ticket])

  const handleEscalate = useCallback(() => {
    if (ticket) {
      handleUpdateTicket({ status: 'escalated', ai_handled: false })
    }
  }, [ticket])

  const handleAssign = useCallback(() => {
    if (ticket && currentAgentId) {
      handleUpdateTicket({ assigned_agent_id: currentAgentId })
    }
  }, [ticket, currentAgentId])

  const handleUnassign = useCallback(() => {
    if (ticket) {
      handleUpdateTicket({ assigned_agent_id: null })
    }
  }, [ticket])

  const handleTogglePriority = useCallback(() => {
    if (ticket) {
      const currentIndex = PRIORITY_ORDER.indexOf(ticket.priority as typeof PRIORITY_ORDER[number])
      const nextIndex = (currentIndex + 1) % PRIORITY_ORDER.length
      handleUpdateTicket({ priority: PRIORITY_ORDER[nextIndex] })
    }
  }, [ticket])

  // Memoize shortcut actions to prevent unnecessary re-registrations
  const shortcutActions = useMemo(() => ({
    onResolve: handleResolve,
    onEscalate: handleEscalate,
    onAssign: handleAssign,
    onUnassign: handleUnassign,
    onTogglePriority: handleTogglePriority,
    onFocusInput: () => {
      // Focus will be handled by the ChatInput component
      // We just need to trigger a focus event on the textarea
      const textarea = document.querySelector('[data-chat-input="true"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
      }
    },
  }), [handleResolve, handleEscalate, handleAssign, handleUnassign, handleTogglePriority])

  // Register keyboard shortcuts for this ticket
  useRegisterTicketShortcuts(shortcutActions)

  if (isLoading) {
    return <TicketDetailSkeleton />
  }

  if (error === 'not_found' || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="text-6xl mb-2">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Ticket not found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This ticket may have been deleted or you don&apos;t have access to it.
        </p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load ticket
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => fetchTicketAndMessages()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

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
            currentAgentId={currentAgentId}
            isSending={isSending}
            sendError={sendError}
            onRetry={handleRetry}
            onClearError={handleClearError}
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
