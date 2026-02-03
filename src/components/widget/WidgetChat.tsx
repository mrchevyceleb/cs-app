'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, User, Headphones, Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { WidgetSession, WidgetConfig, StreamingMessage } from '@/types/widget'
import { getWidgetSupabase } from '@/lib/widget/supabase'

// Generate a varied, context-aware acknowledgment so the user feels heard immediately
function generateAcknowledgment(userMessage: string): string {
  const msg = userMessage.toLowerCase()

  const isIssue = /not working|broken|error|issue|problem|bug|crash|fail|can't|cannot|won't|doesn't|isn't|stuck|down|wrong/.test(msg)
  const isQuestion = /\?$|how do|what is|where|when|why|can i|could you|is there|tell me/.test(msg)
  const isUrgent = /urgent|asap|emergency|critical|immediately|right away/.test(msg)

  const issueAcks = [
    "Sorry you're running into that — let me look into it.",
    "Sorry about that! Let me check what's going on.",
    "That sounds frustrating. I'm looking into it now.",
    "I hear you. Let me investigate this.",
    "Thanks for letting me know — I'm on it.",
    "Let me dig into that for you right away.",
  ]

  const questionAcks = [
    "Great question! Let me find that out for you.",
    "Let me look that up for you.",
    "Good question — give me just a moment.",
    "Sure thing, let me check on that.",
    "Let me find the answer for you.",
  ]

  const urgentAcks = [
    "I understand the urgency — looking into this right now.",
    "On it. Let me find a solution for you immediately.",
    "I hear you — prioritizing this now.",
  ]

  const generalAcks = [
    "Got it! Let me look into that for you.",
    "Thanks for reaching out! Working on this now.",
    "I'm on it — just a moment.",
    "Let me help you with that.",
    "Sure thing! Looking into this now.",
    "On it — one moment please.",
  ]

  let pool = generalAcks
  if (isUrgent) pool = urgentAcks
  else if (isIssue) pool = issueAcks
  else if (isQuestion) pool = questionAcks

  return pool[Math.floor(Math.random() * pool.length)]
}

interface WidgetChatProps {
  session: WidgetSession | null
  ticketId: string | null
  config: WidgetConfig
  isNewSession: boolean
  onBack: () => void
  onTicketCreated: (ticketId: string) => void
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

export function WidgetChat({
  session,
  ticketId: initialTicketId,
  config,
  isNewSession,
  onBack,
  onTicketCreated,
}: WidgetChatProps) {
  const [messages, setMessages] = useState<StreamingMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(initialTicketId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingMessageRef = useRef<Set<string>>(new Set())
  const streamingMsgIdRef = useRef<string | null>(null)
  const activeTempIdRef = useRef<string | null>(null)
  const lastInitialTicketIdRef = useRef<string | null>(initialTicketId)

  const [avatarError, setAvatarError] = useState(false)
  const agentName = config.agentName || 'Nova'
  const agentAvatarUrl = config.agentAvatarUrl
  const showAvatar = agentAvatarUrl && !avatarError
  const handleAvatarError = useCallback(() => setAvatarError(true), [])

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
      label: agentName,
      align: 'left' as const,
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      textColor: 'text-gray-900 dark:text-gray-100',
    },
  }

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch existing ticket messages (when resuming a conversation)
  useEffect(() => {
    async function fetchMessages() {
      if (!session?.token || !ticketId) return
      if (streamingMsgIdRef.current) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/widget/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (err) {
        console.error('Fetch messages error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (ticketId && !isNewSession) {
      fetchMessages()
    }
  }, [session?.token, ticketId, isNewSession])

  // Sync local state when parent changes the ticket
  useEffect(() => {
    if (lastInitialTicketIdRef.current === initialTicketId) return
    lastInitialTicketIdRef.current = initialTicketId
    setTicketId(initialTicketId)
    setMessages([])
    setError(null)
    setExpandedSource(null)
    pendingMessageRef.current = new Set()
    streamingMsgIdRef.current = null
  }, [initialTicketId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Set up real-time subscription for agent/human messages
  useEffect(() => {
    if (!ticketId) return

    const supabase = getWidgetSupabase()
    if (!supabase) return

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
          const newMsg = payload.new as StreamingMessage & { metadata?: { is_internal?: boolean } }
          if (newMsg.metadata?.is_internal) return

          // Skip if this message came through our SSE stream
          if (pendingMessageRef.current.has(newMsg.id)) {
            return
          }

          // Skip customer messages while we have an active optimistic message
          // (SSE ticket event will swap tempId → real ID)
          if (activeTempIdRef.current && newMsg.sender_type === 'customer') {
            pendingMessageRef.current.add(newMsg.id)
            return
          }

          // While streaming, skip AI messages — the SSE stream handles them.
          // Stash the ID so the complete handler can dedup if needed.
          if (streamingMsgIdRef.current && newMsg.sender_type === 'ai') {
            pendingMessageRef.current.add(newMsg.id)
            return
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
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

  // Send message via SSE streaming
  const handleSend = async () => {
    if (!newMessage.trim() || !session?.token || isSending) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setIsSending(true)
    setError(null)

    // Optimistic customer message
    const tempId = `temp-${Date.now()}`
    activeTempIdRef.current = tempId
    const optimisticMessage: StreamingMessage = {
      id: tempId,
      sender_type: 'customer',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    // Create streaming AI placeholder — starts with dots, then reveals acknowledgment
    const streamingId = `streaming-${Date.now()}`
    streamingMsgIdRef.current = streamingId
    const ackText = generateAcknowledgment(messageContent)
    const streamingMessage: StreamingMessage = {
      id: streamingId,
      sender_type: 'ai',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
      isAcknowledgment: true,
    }
    // Show thinking dots immediately
    setMessages((prev) => [...prev, streamingMessage])

    // Reveal acknowledgment text after a natural delay
    const ackDelay = 700 + Math.floor(Math.random() * 600) // 700-1300ms
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId && m.isAcknowledgment
            ? { ...m, content: ackText }
            : m
        )
      )
    }, ackDelay)

    try {
      const response = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          content: messageContent,
          ticketId: ticketId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullAiContent = ''
      let realMessageId: string | null = null
      let realCustomerMsgId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)

            switch (event.type) {
              case 'ticket': {
                // Got ticketId and customer messageId from server
                if (event.ticketId && !ticketId) {
                  setTicketId(event.ticketId)
                  // Update ref BEFORE calling parent so the sync useEffect
                  // won't reset messages when parent passes back the new ticketId
                  lastInitialTicketIdRef.current = event.ticketId
                  onTicketCreated(event.ticketId)
                }
                if (event.messageId) {
                  realCustomerMsgId = event.messageId
                  pendingMessageRef.current.add(event.messageId)
                  activeTempIdRef.current = null
                  // Replace temp customer message with real ID,
                  // filtering out any duplicate from real-time that slipped through
                  setMessages((prev) => {
                    const filtered = prev.filter(
                      (m) => m.id !== event.messageId
                    )
                    return filtered.map((m) =>
                      m.id === tempId ? { ...m, id: event.messageId } : m
                    )
                  })
                }
                break
              }

              case 'thinking':
                // Keep showing acknowledgment — content chunks will replace it
                break

              case 'tool_status':
                // Hidden from user — just keep showing thinking dots
                break

              case 'chunk': {
                fullAiContent += event.content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? { ...m, content: fullAiContent, isAcknowledgment: false, toolStatus: undefined }
                      : m
                  )
                )
                break
              }

              case 'complete': {
                realMessageId = event.messageId || null
                if (event.content) {
                  fullAiContent = event.content
                }
                // Track this message ID to prevent duplicate from realtime
                if (realMessageId) {
                  pendingMessageRef.current.add(realMessageId)
                }
                // Finalize streaming message + remove any realtime duplicate
                setMessages((prev) => {
                  // Remove any realtime-inserted duplicate with the same real ID
                  const deduped = realMessageId
                    ? prev.filter((m) => m.id !== realMessageId || m.id === streamingId)
                    : prev
                  return deduped.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          id: realMessageId || streamingId,
                          content: fullAiContent,
                          isStreaming: false,
                          isAcknowledgment: false,
                          toolStatus: undefined,
                        }
                      : m
                  )
                })
                break
              }

              case 'error': {
                setError(event.error || 'Something went wrong')
                // Remove streaming placeholder on error
                setMessages((prev) => prev.filter((m) => m.id !== streamingId))
                break
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Clean up pending refs after a delay
      setTimeout(() => {
        if (realMessageId) pendingMessageRef.current.delete(realMessageId)
        if (realCustomerMsgId) pendingMessageRef.current.delete(realCustomerMsgId)
      }, 3000)
    } catch (err) {
      // Remove optimistic + streaming messages on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId && m.id !== streamingId))
      setError('Failed to send message. Please try again.')
      setNewMessage(messageContent)
    } finally {
      setIsSending(false)
      streamingMsgIdRef.current = null
      activeTempIdRef.current = null
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

  // Loading state (only for resuming existing conversations)
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

  const showWelcome = messages.length === 0 && !isSending

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message (local only, not saved to DB) */}
        {showWelcome && (
          <div className="flex gap-2 flex-row">
            {showAvatar ? (
              <img
                src={agentAvatarUrl}
                alt={agentName}
                className="flex-shrink-0 w-7 h-7 rounded-full object-cover"
                onError={handleAvatarError}
              />
            ) : (
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            )}
            <div className="flex flex-col items-start max-w-[80%]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {agentName}
                </span>
              </div>
              <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-purple-50 dark:bg-purple-900/30 text-gray-900 dark:text-gray-100">
                <p className="text-sm">
                  Hey! I&apos;m {agentName}, your AI assistant. How can I help?
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const cfg = senderConfig[message.sender_type] || senderConfig.agent
          const Icon = cfg.icon
          const isRight = cfg.align === 'right'

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-2',
                isRight ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              {message.sender_type === 'ai' && showAvatar ? (
                <img
                  src={agentAvatarUrl}
                  alt={agentName}
                  className="flex-shrink-0 w-7 h-7 rounded-full object-cover"
                  onError={handleAvatarError}
                />
              ) : (
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
              )}

              {/* Message content */}
              <div
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isRight ? 'items-end' : 'items-start'
                )}
              >
                <div className={cn('flex items-center gap-1.5 mb-0.5', isRight && 'flex-row-reverse')}>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {cfg.label}
                  </span>
                  {!message.isStreaming && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(message.created_at)}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    'px-3 py-2 rounded-2xl',
                    cfg.bgColor,
                    cfg.textColor,
                    isRight ? 'rounded-br-md' : 'rounded-bl-md'
                  )}
                >
                  {message.sender_type === 'customer' ? (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {message.content ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold mt-2.5 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">{children}</a>
                            ),
                            code: ({ children }) => (
                              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-black/10 dark:bg-white/10 p-2 rounded my-1.5 overflow-x-auto text-xs">{children}</pre>
                            ),
                            hr: () => <hr className="my-2 border-current opacity-20" />,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-2 border-current opacity-70 pl-3 my-1.5 italic">{children}</blockquote>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : null}
                      {message.isStreaming && message.content && !message.isAcknowledgment && (
                        <span className="inline-block w-1.5 h-4 ml-0.5 bg-purple-500 animate-pulse align-text-bottom rounded-sm" />
                      )}
                      {message.isStreaming && message.isAcknowledgment && !message.content && (
                        <span className="inline-flex items-center gap-0.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                      {message.isStreaming && !message.content && !message.isAcknowledgment && (
                        <span className="inline-flex items-center gap-1 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Related Article card for AI messages with KB citations */}
                {message.sender_type === 'ai' && !message.isStreaming && message.content.includes('[Source:') && (() => {
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
            placeholder={`Message ${agentName}...`}
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
