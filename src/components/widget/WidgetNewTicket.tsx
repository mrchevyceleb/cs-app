'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetSession } from '@/types/widget'

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
