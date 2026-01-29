'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  User,
  Headphones,
  Sparkles,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortalMessage, TicketStatus } from '@/types/database'

interface RelatedArticle {
  id: string
  title: string
  content: string
  category: string | null
  source_file: string
  similarity: number
}

interface TicketDetail {
  id: string
  subject: string
  status: TicketStatus
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  open: {
    label: 'Open',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    icon: Clock,
  },
  pending: {
    label: 'Awaiting Your Response',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
    icon: Clock,
  },
  escalated: {
    label: 'Being Reviewed',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
    icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    icon: CheckCircle2,
  },
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
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

  return formatDateTime(dateString)
}

const SENDER_CONFIG = {
  customer: {
    label: 'You',
    icon: User,
    align: 'right' as const,
    bgColor: 'bg-primary-600 dark:bg-primary-700',
    textColor: 'text-white',
    avatarBg: 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400',
  },
  agent: {
    label: 'Support',
    icon: Headphones,
    align: 'left' as const,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-900 dark:text-gray-100',
    avatarBg: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  },
  ai: {
    label: 'AI Assistant',
    icon: Sparkles,
    align: 'left' as const,
    bgColor: 'bg-gradient-to-br from-purple-50 to-primary-50 dark:from-purple-900/30 dark:to-primary-900/30',
    textColor: 'text-gray-900 dark:text-gray-100',
    avatarBg: 'bg-gradient-to-br from-primary-400 to-purple-500 text-white',
  },
}

function MessageBubble({ message }: { message: PortalMessage }) {
  const config = SENDER_CONFIG[message.sender_type] || SENDER_CONFIG.agent
  const Icon = config.icon
  const isRight = config.align === 'right'

  return (
    <div
      className={cn(
        'flex gap-3',
        isRight ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          config.avatarBg
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Message */}
      <div
        className={cn(
          'flex flex-col max-w-[80%]',
          isRight ? 'items-end' : 'items-start'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400',
            isRight ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="font-medium">{config.label}</span>
          <span>{formatRelativeTime(message.created_at)}</span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl shadow-sm whitespace-pre-wrap',
            config.bgColor,
            config.textColor,
            isRight ? 'rounded-br-md' : 'rounded-bl-md'
          )}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

export default function PortalTicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reply form state
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Related articles state
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null)
  const [showArticles, setShowArticles] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTicketData()
  }, [ticketId])

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom()
  }, [messages])

  // Fetch related KB articles when ticket subject is available
  useEffect(() => {
    if (!ticket?.subject) return

    async function fetchRelatedArticles() {
      setArticlesLoading(true)
      try {
        const response = await fetch(
          `/api/portal/kb?q=${encodeURIComponent(ticket!.subject)}`,
          { credentials: 'include' }
        )
        if (response.ok) {
          const data = await response.json()
          setRelatedArticles(data.results || [])
        }
      } catch {
        // Non-critical, silently fail
      } finally {
        setArticlesLoading(false)
      }
    }

    fetchRelatedArticles()
  }, [ticket?.subject])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchTicketData() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/portal/tickets/${ticketId}`, {
        credentials: 'include',
      })

      if (response.status === 401) {
        router.push('/portal')
        return
      }

      if (response.status === 404) {
        setError('Ticket not found or you do not have access to it.')
        setIsLoading(false)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load ticket')
        setIsLoading(false)
        return
      }

      setTicket(data.ticket)
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Error fetching ticket:', err)
      setError('Unable to load ticket. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()

    if (!replyContent.trim() || isSending) return

    setIsSending(true)
    setSendError(null)

    // Optimistic update
    const optimisticMessage: PortalMessage = {
      id: `pending-${Date.now()}`,
      sender_type: 'customer',
      content: replyContent.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimisticMessage])
    const savedContent = replyContent
    setReplyContent('')

    try {
      const response = await fetch(`/api/portal/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: savedContent }),
      })

      if (response.status === 401) {
        router.push('/portal')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
        setReplyContent(savedContent)
        setSendError(data.error || 'Failed to send message')
        return
      }

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMessage.id ? data.message : m))
      )

      // Update ticket status if changed
      if (data.ticket) {
        setTicket(data.ticket)
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      setReplyContent(savedContent)
      setSendError('Unable to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading ticket...</p>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Unable to Load Ticket
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {error || 'Ticket not found'}
        </p>
        <div className="flex gap-3">
          <Link href="/portal/tickets">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </Link>
          <Button onClick={fetchTicketData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[ticket.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/portal/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge
              variant="outline"
              className={cn('gap-1', statusConfig.bgColor, statusConfig.color, 'border')}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Created {formatDateTime(ticket.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No messages yet. Start the conversation below.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Reply Form */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {sendError && (
            <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {sendError}
            </div>
          )}

          {ticket.status === 'resolved' ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This ticket has been resolved. Need more help?{' '}
                <a
                  href="mailto:support@r-link.io"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Contact us
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex gap-3">
              <Textarea
                placeholder="Type your message..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={isSending}
                className="min-h-[60px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply(e)
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!replyContent.trim() || isSending}
                className="self-end"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}

          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>

      {/* Related Help Articles */}
      {(relatedArticles.length > 0 || articlesLoading) && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => setShowArticles(!showArticles)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Related Help Articles
                </span>
                {relatedArticles.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {relatedArticles.length}
                  </Badge>
                )}
              </div>
              {showArticles ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showArticles && (
              <div className="px-4 pb-4 space-y-2">
                {articlesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching help articles...
                  </div>
                ) : (
                  relatedArticles.slice(0, 3).map((article) => {
                    const isExpanded = expandedArticleId === article.id
                    return (
                      <div
                        key={article.id}
                        className={cn(
                          'border rounded-lg overflow-hidden transition-all',
                          'border-purple-200 dark:border-purple-800',
                          'bg-purple-50/50 dark:bg-purple-900/10'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                          className="w-full flex items-start gap-2 p-3 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {article.title}
                            </p>
                            {!isExpanded && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {article.content.slice(0, 150)}
                                {article.content.length > 150 ? '...' : ''}
                              </p>
                            )}
                            {article.category && (
                              <Badge variant="outline" className="text-[10px] mt-1">
                                {article.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex-shrink-0 mt-0.5">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <div className="max-h-64 overflow-y-auto rounded bg-white dark:bg-gray-900 p-3">
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {article.content}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTicketData}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Messages
        </Button>
      </div>
    </div>
  )
}
