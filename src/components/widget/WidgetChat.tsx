'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, AlertCircle, User, Headphones, Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetSession, WidgetMessage_DB, WidgetTicket } from '@/types/widget'
import { createClient } from '@supabase/supabase-js'

interface WidgetChatProps {
  session: WidgetSession | null
  ticketId: string | null
  onBack: () => void
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

// Sender icon and styling
const senderConfig = {
  customer: {
    icon: User,
    label: 'You',
    align: 'right' as const,
    bgColor: 'bg-primary-600 dark:bg-primary-700',
    textColor: 'text-white',
  },
  agent: {
    icon: Headphones,
    label: 'Support',
    align: 'left' as const,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-900 dark:text-gray-100',
  },
  ai: {
    icon: Sparkles,
    label: 'AI Assistant',
    align: 'left' as const,
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    textColor: 'text-gray-900 dark:text-gray-100',
  },
}

export function WidgetChat({
  session,
  ticketId,
  onBack,
}: WidgetChatProps) {
  const [ticket, setTicket] = useState<WidgetTicket | null>(null)
  const [messages, setMessages] = useState<WidgetMessage_DB[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingMessageRef = useRef<string | null>(null) // Track pending message to prevent race condition

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch ticket and messages
  useEffect(() => {
    async function fetchTicket() {
      if (!session?.token || !ticketId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/widget/tickets/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load conversation')
        }

        const data = await response.json()
        setTicket(data.ticket)
        setMessages(data.messages || [])
      } catch (err) {
        setError('Failed to load conversation')
        console.error('Fetch ticket error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTicket()
  }, [session?.token, ticketId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Set up real-time subscription
  useEffect(() => {
    if (!ticketId) return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) return

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const subscription = supabase
      .channel(`widget-ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as WidgetMessage_DB & { metadata?: { is_internal?: boolean } }
          // Don't add internal notes
          if (newMsg.metadata?.is_internal) return

          // Check if message already exists (could be our own message or a duplicate)
          setMessages((prev) => {
            // Skip if message ID already exists
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev
            }

            // Skip if this is our pending message (prevents race condition)
            // The POST response will handle replacing the temp message
            if (pendingMessageRef.current && newMsg.id === pendingMessageRef.current) {
              return prev
            }

            return [...prev, {
              id: newMsg.id,
              sender_type: newMsg.sender_type,
              content: newMsg.content,
              created_at: newMsg.created_at,
            }]
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [ticketId])

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !session?.token || !ticketId || isSending) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: WidgetMessage_DB = {
      id: tempId,
      sender_type: 'customer',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const response = await fetch(`/api/widget/tickets/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ content: messageContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Track this message ID to prevent duplicate from real-time subscription
      pendingMessageRef.current = data.message.id

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m))
      )

      // Clear pending message after a short delay (to allow subscription to process)
      setTimeout(() => {
        pendingMessageRef.current = null
      }, 1000)
    } catch (err) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError('Failed to send message. Please try again.')
      setNewMessage(messageContent) // Restore message
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Loading conversation...
        </p>
      </div>
    )
  }

  // Error state
  if (error && !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Ticket subject */}
      {ticket && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {ticket.subject}
          </h2>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const config = senderConfig[message.sender_type] || senderConfig.agent
          const Icon = config.icon
          const isRight = config.align === 'right'

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-2',
                isRight ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                  message.sender_type === 'customer'
                    ? 'bg-primary-100 dark:bg-primary-900'
                    : message.sender_type === 'ai'
                    ? 'bg-purple-100 dark:bg-purple-900'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    message.sender_type === 'customer'
                      ? 'text-primary-600 dark:text-primary-400'
                      : message.sender_type === 'ai'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                />
              </div>

              {/* Message content */}
              <div
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isRight ? 'items-end' : 'items-start'
                )}
              >
                <div className={cn('flex items-center gap-1.5 mb-0.5', isRight && 'flex-row-reverse')}>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(message.created_at)}
                  </span>
                </div>
                <div
                  className={cn(
                    'px-3 py-2 rounded-2xl',
                    config.bgColor,
                    config.textColor,
                    isRight ? 'rounded-br-md' : 'rounded-bl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                {/* Related Article card for AI messages with KB citations */}
                {message.sender_type === 'ai' && message.content.includes('[Source:') && (() => {
                  const sourceMatch = message.content.match(/\[Source:\s*([^\]]+)\]/)
                  if (!sourceMatch) return null
                  const sourceTitle = sourceMatch[1].trim()
                  const isExpanded = expandedSource === message.id
                  return (
                    <button
                      type="button"
                      onClick={() => setExpandedSource(isExpanded ? null : message.id)}
                      className={cn(
                        'mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                        'bg-purple-50 dark:bg-purple-900/20',
                        'border border-purple-200 dark:border-purple-800',
                        'text-xs text-purple-700 dark:text-purple-400',
                        'hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors'
                      )}
                    >
                      <BookOpen className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Related: {sourceTitle}</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )
                })()}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div
          className={cn(
            'flex items-end gap-2 p-2 rounded-xl',
            'border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500'
          )}
        >
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            rows={1}
            className={cn(
              'flex-1 resize-none border-0 bg-transparent',
              'text-sm text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-0',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[36px] max-h-[100px]'
            )}
            style={{
              height: 'auto',
              overflow: 'hidden',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 100)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg',
              'bg-primary-600 hover:bg-primary-700',
              'text-white',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
