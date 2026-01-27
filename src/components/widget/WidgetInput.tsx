'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  isSending?: boolean
  placeholder?: string
}

export function WidgetInput({
  onSend,
  disabled = false,
  isSending = false,
  placeholder = 'Type a message...',
}: WidgetInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (!message.trim() || disabled || isSending) return

    onSend(message.trim())
    setMessage('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [message, disabled, isSending, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const target = e.target
    target.style.height = 'auto'
    target.style.height = `${Math.min(target.scrollHeight, 100)}px`
  }

  const canSend = message.trim() && !disabled && !isSending

  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
      <div
        className={cn(
          'flex items-end gap-2 p-2 rounded-xl',
          'border border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-800',
          'focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500',
          (disabled || isSending) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className={cn(
            'flex-1 resize-none border-0 bg-transparent',
            'text-sm text-gray-900 dark:text-white',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-0',
            'disabled:cursor-not-allowed',
            'min-h-[36px] max-h-[100px]'
          )}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
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
  )
}
