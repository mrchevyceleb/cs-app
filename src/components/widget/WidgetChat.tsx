'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, User, Headphones, Sparkles, BookOpen, ChevronDown, ChevronUp, ImagePlus, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { WidgetSession, WidgetConfig, StreamingMessage, WidgetAttachment } from '@/types/widget'
import { getWidgetSupabase } from '@/lib/widget/supabase'

interface PendingImage {
  id: string // temp client ID or server attachment ID after upload
  file: File
  preview: string // object URL for local preview
  uploadedId?: string // server attachment ID
  uploadedUrl?: string // server public URL
  uploading: boolean
  error?: string
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

// Small component for rendering attachment images with error fallback
function AttachmentImage({ attachment }: { attachment: WidgetAttachment }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="w-[100px] h-[60px] flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg text-xs text-gray-500">
        Image unavailable
      </div>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-zoom-in"
    >
      <img
        src={attachment.url}
        alt={attachment.fileName}
        className="max-w-[180px] max-h-[140px] object-cover rounded-lg"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </a>
  )
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

  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const pendingImagesRef = useRef<PendingImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Upload a single image to the widget upload API
  const uploadImage = useCallback(async (image: PendingImage): Promise<{ id: string; url: string } | null> => {
    if (!session?.token) return null

    const formData = new FormData()
    formData.append('file', image.file)
    if (ticketId) formData.append('ticketId', ticketId)

    try {
      const response = await fetch('/api/widget/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      const data = await response.json()
      return { id: data.id, url: data.url }
    } catch (err) {
      console.error('[Widget] Image upload error:', err)
      return null
    }
  }, [session?.token, ticketId])

  // Add images from file input or paste
  const addImages = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    setPendingImages(prev => {
      // Use functional update to avoid stale closure
      const remaining = 4 - prev.length
      if (remaining <= 0) return prev

      const toAdd = imageFiles.slice(0, remaining)
      const newImages: PendingImage[] = toAdd.map(file => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
      }))

      return [...prev, ...newImages]
    })
  }, [])

  // Remove a pending image
  const removeImage = useCallback((id: string) => {
    setPendingImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  // Handle paste events for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      addImages(imageFiles)
    }
  }, [addImages])

  // Send message via SSE streaming
  const handleSend = async () => {
    if ((!newMessage.trim() && pendingImages.length === 0) || !session?.token || isSending) return

    const messageContent = newMessage.trim()
    const imagesToSend = [...pendingImages]
    setNewMessage('')
    setPendingImages([])
    setIsSending(true)
    setError(null)

    // Upload pending images in parallel
    const uploadResults = await Promise.all(
      imagesToSend.map(async (img) => {
        const result = await uploadImage(img)
        return { img, result }
      })
    )

    const uploadedAttachments: WidgetAttachment[] = []
    const attachmentIds: string[] = []
    let failedCount = 0

    for (const { img, result } of uploadResults) {
      if (result) {
        attachmentIds.push(result.id)
        uploadedAttachments.push({
          id: result.id,
          url: result.url,
          fileName: img.file.name,
          fileType: img.file.type,
          fileSize: img.file.size,
        })
      } else {
        failedCount++
      }
    }

    // If we only had images and all failed, bail and restore previews
    if (!messageContent && attachmentIds.length === 0) {
      setIsSending(false)
      setError('Failed to upload images. Please try again.')
      // Restore images with their still-valid preview URLs
      setPendingImages(imagesToSend)
      return
    }

    // Revoke preview URLs now that we're committed to sending
    imagesToSend.forEach(img => URL.revokeObjectURL(img.preview))

    // Warn about partial failures
    if (failedCount > 0 && attachmentIds.length > 0) {
      setError(`${failedCount} image${failedCount > 1 ? 's' : ''} failed to upload.`)
    }

    // Build content: text + image placeholders for context
    const contentToSend = messageContent || (attachmentIds.length > 0 ? '[Image attached]' : '')

    // Optimistic customer message
    const tempId = `temp-${Date.now()}`
    activeTempIdRef.current = tempId
    const optimisticMessage: StreamingMessage = {
      id: tempId,
      sender_type: 'customer',
      content: contentToSend,
      created_at: new Date().toISOString(),
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    }
    setMessages((prev) => [...prev, optimisticMessage])

    // Create streaming AI placeholder — starts with dots, server sends acknowledgment
    const streamingId = `streaming-${Date.now()}`
    streamingMsgIdRef.current = streamingId
    const streamingMessage: StreamingMessage = {
      id: streamingId,
      sender_type: 'ai',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
      isAcknowledgment: true,
    }
    setMessages((prev) => [...prev, streamingMessage])

    try {
      const response = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          content: contentToSend,
          ticketId: ticketId || undefined,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
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

              case 'acknowledgment':
                // AI-generated contextual acknowledgment from server
                if (event.content) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamingId && m.isAcknowledgment
                        ? { ...m, content: event.content }
                        : m
                    )
                  )
                }
                break

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

              case 'email_confirmed': {
                // Insert email link confirmation BEFORE the streaming AI placeholder
                // so it appears above the AI response that's about to stream in
                if (event.content) {
                  const msgId = `email_confirmed-${Date.now()}`
                  const confirmationMsg: StreamingMessage = {
                    id: msgId,
                    sender_type: 'ai',
                    content: event.content,
                    created_at: new Date().toISOString(),
                  }
                  setMessages((prev) => {
                    const streamIdx = prev.findIndex((m) => m.id === streamingId)
                    if (streamIdx >= 0) {
                      // Insert right before the streaming placeholder
                      const next = [...prev]
                      next.splice(streamIdx, 0, confirmationMsg)
                      return next
                    }
                    // Fallback: append if streaming placeholder not found
                    return [...prev, confirmationMsg]
                  })
                }
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
      if (messageContent) setNewMessage(messageContent)
    } finally {
      setIsSending(false)
      streamingMsgIdRef.current = null
      activeTempIdRef.current = null
      textareaRef.current?.focus()
    }
  }

  // Keep ref in sync for cleanup
  useEffect(() => {
    pendingImagesRef.current = pendingImages
  }, [pendingImages])

  // Clean up image previews on unmount
  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [])

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
                  {/* Attached images */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className={cn(
                      'flex flex-wrap gap-1.5',
                      message.content && message.content !== '[Image attached]' ? 'mb-1.5' : ''
                    )}>
                      {message.attachments.map((att) => (
                        <AttachmentImage key={att.id} attachment={att} />
                      ))}
                    </div>
                  )}
                  {message.sender_type === 'customer' ? (
                    message.content && message.content !== '[Image attached]' ? (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : null
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
                      {message.isStreaming && message.isAcknowledgment && (
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
        {/* Image preview strip */}
        {pendingImages.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {pendingImages.map((img) => (
              <div key={img.id} className="relative flex-shrink-0 group">
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className={cn(
                    'w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700',
                    img.uploading && 'opacity-50',
                    img.error && 'border-red-400'
                  )}
                />
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className={cn(
                    'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full',
                    'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800',
                    'flex items-center justify-center',
                    'opacity-70 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
                    'hover:bg-red-600 dark:hover:bg-red-400 dark:hover:text-white',
                    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none'
                  )}
                  aria-label={`Remove ${img.file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            'flex items-end gap-2 p-2 rounded-xl',
            'border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500'
          )}
        >
          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addImages(e.target.files)
              e.target.value = '' // reset so same file can be re-selected
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || pendingImages.length >= 4}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
            aria-label="Attach image"
            title="Attach image (max 4)"
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
            disabled={(!newMessage.trim() && pendingImages.length === 0) || isSending}
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
          Enter to send, Shift+Enter for new line. Paste or click to attach images.
        </p>
      </div>
    </div>
  )
}
