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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  Paperclip,
  Smile,
  Sparkles,
  Keyboard,
  ChevronDown,
  Headphones,
  Loader2,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string, senderType: 'agent' | 'ai') => void
  placeholder?: string
  disabled?: boolean
  isSending?: boolean
  error?: string | null
  onRetry?: () => void
  onClearError?: () => void
}

export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isSending = false,
  error,
  onRetry,
  onClearError,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [sendMode, setSendMode] = useState<'agent' | 'ai'>('agent')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled && !isSending) {
      onSend(message.trim(), sendMode)
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
          (disabled || isSending) && 'opacity-50 cursor-not-allowed'
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
                disabled={disabled || isSending}
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
          disabled={disabled || isSending}
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
                disabled={disabled || isSending}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add emoji</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Send Button with Mode Dropdown */}
        <div className="flex shrink-0">
          {/* Main Send Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || disabled || isSending}
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-r-none',
                    message.trim() && !isSending
                      ? sendMode === 'ai'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : sendMode === 'ai' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {sendMode === 'ai' ? 'Send as AI' : 'Send as Agent'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={disabled || isSending}
                className={cn(
                  'h-8 w-6 rounded-l-none border-l-0 px-1',
                  message.trim() && !isSending
                    ? sendMode === 'ai'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                      : 'bg-primary-600 hover:bg-primary-700 text-white border-primary-600'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                )}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setSendMode('agent')}
                className="flex items-center gap-2"
              >
                <Headphones className="h-4 w-4" />
                <span className="flex-1">Send as Agent</span>
                {sendMode === 'agent' && <Check className="h-4 w-4 text-primary-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSendMode('ai')}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="flex-1">Send as AI</span>
                {sendMode === 'ai' && <Check className="h-4 w-4 text-purple-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-red-700 dark:text-red-300 hover:underline font-medium"
            >
              Retry
            </button>
          )}
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {isExpanded && !error && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            {sendMode === 'ai' ? (
              <>
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span className="text-purple-500">Sending as AI</span>
              </>
            ) : (
              <>
                <Headphones className="h-3 w-3" />
                <span>Sending as Agent</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Keyboard className="h-3 w-3" />
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Enter</kbd> to send,{' '}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Shift+Enter</kbd> for new line
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
