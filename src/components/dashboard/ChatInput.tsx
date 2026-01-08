'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Send,
  Paperclip,
  Smile,
  Sparkles,
  Keyboard,
} from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      setIsExpanded(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-end gap-2 p-2 rounded-xl border border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-800',
          'focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500',
          'transition-all duration-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Attachment Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-700"
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach file</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 resize-none border-0 shadow-none focus-visible:ring-0 p-0',
            'min-h-[36px] max-h-[120px]',
            'text-sm placeholder:text-gray-400'
          )}
          rows={1}
        />

        {/* Emoji Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-700"
                disabled={disabled}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add emoji</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* AI Assist Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-primary-500 hover:text-primary-600 hover:bg-primary-50"
                disabled={disabled}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ask Nova for help</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0',
            message.trim()
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard shortcut hint */}
      {isExpanded && (
        <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
          <Keyboard className="h-3 w-3" />
          <span>
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Shift+Enter</kbd> for new line
          </span>
        </div>
      )}
    </div>
  )
}
