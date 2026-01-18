'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ConfidenceScore } from './ConfidenceScore'
import { Sparkles, User, Headphones, Globe, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '@/types/database'

interface ChatBubbleProps {
  message: Message
  customerName?: string
  isPending?: boolean
}

const senderConfig = {
  customer: {
    align: 'left' as const,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-900 dark:text-gray-100',
    icon: User,
    label: 'Customer',
    avatarBg: 'bg-gray-200 dark:bg-gray-700',
  },
  agent: {
    align: 'right' as const,
    bgColor: 'bg-primary-600 dark:bg-primary-700',
    textColor: 'text-white',
    icon: Headphones,
    label: 'Agent',
    avatarBg: 'bg-primary-100 dark:bg-primary-900',
  },
  ai: {
    align: 'left' as const,
    bgColor: 'bg-gradient-to-br from-purple-50 to-primary-50 dark:from-purple-900/30 dark:to-primary-900/30',
    textColor: 'text-gray-900 dark:text-gray-100',
    icon: Sparkles,
    label: 'Nova AI',
    avatarBg: 'bg-gradient-to-br from-primary-400 to-purple-500',
  },
}

// Language flag mapping
const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  tl: '🇵🇭',
  hi: '🇮🇳',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇧🇷',
}

function getRelativeTime(date: string): string {
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

export function ChatBubble({ message, customerName, isPending = false }: ChatBubbleProps) {
  const config = senderConfig[message.sender_type] || senderConfig.customer
  const Icon = config.icon
  const isRight = config.align === 'right'

  const displayName =
    message.sender_type === 'customer'
      ? customerName || 'Customer'
      : message.sender_type === 'ai'
        ? 'Nova AI'
        : 'You'

  return (
    <div
      className={cn(
        'flex gap-3 message-enter',
        isRight ? 'flex-row-reverse' : 'flex-row',
        isPending && 'opacity-70'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn(config.avatarBg, 'text-sm')}>
          {message.sender_type === 'ai' ? (
            <Sparkles className="h-4 w-4 text-white" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isRight ? 'items-end' : 'items-start'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isRight ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {displayName}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            {isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              getRelativeTime(message.created_at)
            )}
          </span>

          {/* Language Badge */}
          {message.original_language && message.original_language !== 'en' && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 gap-1"
            >
              <Globe className="h-2.5 w-2.5" />
              {languageFlags[message.original_language] || message.original_language}
            </Badge>
          )}

          {/* AI Confidence */}
          {message.sender_type === 'ai' && message.confidence !== null && (
            <ConfidenceScore value={message.confidence} size="sm" />
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl shadow-sm',
            config.bgColor,
            config.textColor,
            isRight ? 'rounded-br-md' : 'rounded-bl-md'
          )}
        >
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:font-semibold">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {/* Show translated content if different from original */}
          {message.content_translated &&
            message.content_translated !== message.content && (
              <div className="mt-2 pt-2 border-t border-gray-200/30 dark:border-gray-600/30">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Translated:
                </p>
                <div className="text-sm opacity-90 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content_translated}</ReactMarkdown>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export function ChatBubbleSkeleton({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'flex gap-3 animate-pulse',
        align === 'right' ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className={cn('flex flex-col max-w-[70%]', align === 'right' ? 'items-end' : 'items-start')}>
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-16 w-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </div>
  )
}
