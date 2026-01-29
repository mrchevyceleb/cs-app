'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetSession } from '@/types/widget'

interface KBSuggestion {
  id: string
  title: string
  preview: string
  source_file: string
  similarity: number
  content: string
}

interface WidgetNewTicketProps {
  session: WidgetSession | null
  onTicketCreated: (ticketId: string) => void
  onCancel: () => void
}

export function WidgetNewTicket({
  session,
  onTicketCreated,
  onCancel,
}: WidgetNewTicketProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // KB suggestion state
  const [kbSuggestions, setKbSuggestions] = useState<KBSuggestion[]>([])
  const [isSearchingKB, setIsSearchingKB] = useState(false)
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)
  const [deflected, setDeflected] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced KB search on subject change
  const searchKB = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setKbSuggestions([])
      return
    }

    setIsSearchingKB(true)
    try {
      const response = await fetch(`/api/widget/kb-suggest?q=${encodeURIComponent(query.trim())}`)
      if (response.ok) {
        const data = await response.json()
        setKbSuggestions(data.suggestions || [])
      }
    } catch {
      // Silently fail - KB suggestions are non-critical
    } finally {
      setIsSearchingKB(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchKB(subject), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [subject, searchKB])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }

    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    if (!session?.token) {
      setError('Session expired. Please refresh and try again.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/widget/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          suggested_article_ids: kbSuggestions.map(s => s.id),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create conversation')
      }

      const data = await response.json()
      onTicketCreated(data.ticket.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeflection = () => {
    setDeflected(true)
    setTimeout(() => onCancel(), 2000)
  }

  if (deflected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Glad that helped!
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Returning to home...
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Subject field */}
        <div>
          <label
            htmlFor="widget-subject"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="widget-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What do you need help with?"
            disabled={isSubmitting}
            maxLength={200}
            className={cn(
              'block w-full px-3 py-2.5',
              'border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'text-sm'
            )}
            autoFocus
          />
        </div>

        {/* KB Suggestions */}
        {(isSearchingKB || kbSuggestions.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {isSearchingKB ? 'Searching help articles...' : 'Related help articles'}
              </span>
            </div>

            {kbSuggestions.map((suggestion) => {
              const isExpanded = expandedArticle === suggestion.id
              return (
                <div
                  key={suggestion.id}
                  className={cn(
                    'border rounded-lg overflow-hidden transition-all',
                    'border-purple-200 dark:border-purple-800',
                    'bg-purple-50/50 dark:bg-purple-900/20'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedArticle(isExpanded ? null : suggestion.id)}
                    className="w-full flex items-start gap-2 p-2.5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.title}
                      </p>
                      {!isExpanded && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {suggestion.preview}
                        </p>
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
                    <div className="px-2.5 pb-2.5 space-y-2">
                      <div className="max-h-48 overflow-y-auto">
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {suggestion.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDeflection}
                        className={cn(
                          'w-full flex items-center justify-center gap-1.5',
                          'px-3 py-1.5 rounded-md',
                          'bg-green-100 dark:bg-green-900/30',
                          'text-green-700 dark:text-green-400',
                          'hover:bg-green-200 dark:hover:bg-green-900/50',
                          'transition-colors text-xs font-medium'
                        )}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        This solved my problem
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Message field */}
        <div className="flex-1 flex flex-col">
          <label
            htmlFor="widget-message"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="widget-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your question or issue in detail..."
            disabled={isSubmitting}
            rows={6}
            className={cn(
              'block w-full px-3 py-2.5',
              'border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'text-sm resize-none'
            )}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Footer with buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          type="submit"
          disabled={isSubmitting || !subject.trim() || !message.trim()}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'px-4 py-2.5 rounded-lg',
            'bg-primary-600 hover:bg-primary-700',
            'text-white font-medium',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>Send Message</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-gray-300',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'text-sm'
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
