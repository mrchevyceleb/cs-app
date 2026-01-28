'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ConfidenceScore } from './ConfidenceScore'
import { MessageAttachments } from './MessageAttachment'
import { Sparkles, User, Headphones, Globe, Loader2, Lock, Check, CheckCheck, Phone, Mail, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Message, MessageMetadata, MessageAttachment, MessageWithAttachments, DeliveryStatus, MessageSource } from '@/types/database'

interface ChatBubbleProps {
  message: Message | MessageWithAttachments
  customerName?: string
  isPending?: boolean
  showReadStatus?: boolean
  isRead?: boolean
}

// Channel icon mapping
const channelIcons: Record<MessageSource, React.ComponentType<{ className?: string }>> = {
  dashboard: Headphones,
  portal: User,
  widget: MessageSquare,
  sms: Phone,
  email: Mail,
  slack: MessageSquare,
  api: MessageSquare,
}

// Channel labels
const channelLabels: Record<MessageSource, string> = {
  dashboard: 'Dashboard',
  portal: 'Portal',
  widget: 'Widget',
  sms: 'SMS',
  email: 'Email',
  slack: 'Slack',
  api: 'API',
}

const senderConfig = {
  customer: {
    align: 'left' as const,
    bgColor: 'bg-card border border-border/60 shadow-[var(--shadow-xs)]',
    textColor: 'text-foreground',
    icon: User,
    label: 'Customer',
    avatarBg: 'bg-muted text-muted-foreground',
  },
  agent: {
    align: 'right' as const,
    bgColor: 'bg-primary-600 shadow-[var(--shadow-sm)] text-white',
    textColor: 'text-white',
    icon: Headphones,
    label: 'Agent',
    avatarBg: 'bg-primary-100',
  },
  ai: {
    align: 'left' as const,
    bgColor: 'bg-secondary border border-primary-100 shadow-[var(--shadow-xs)]',
    textColor: 'text-foreground',
    icon: Sparkles,
    label: 'Nova AI',
    avatarBg: 'bg-gradient-to-br from-primary-400 to-primary-600',
  },
}

// Internal note styling (overrides agent styling)
const internalNoteConfig = {
  align: 'right' as const,
  bgColor: 'bg-amber-50 border border-amber-200',
  textColor: 'text-amber-900',
  icon: Lock,
  label: 'Internal Note',
  avatarBg: 'bg-amber-100',
}

// Language flag mapping
const languageFlags: Record<string, string> = {
  en: '',
  es: '',
  tl: '',
  hi: '',
  zh: '',
  ja: '',
  ko: '',
  fr: '',
  de: '',
  pt: '',
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

// Helper to check if message is an internal note
function isInternalNote(message: Message): boolean {
  if (!message.metadata) return false
  const metadata = message.metadata as MessageMetadata
  return metadata.is_internal === true
}

// Helper to get attachments from message
function getAttachments(message: Message | MessageWithAttachments): MessageAttachment[] {
  if ('message_attachments' in message && message.message_attachments) {
    return message.message_attachments
  }
  return []
}

export function ChatBubble({ message, customerName, isPending = false, showReadStatus = false, isRead = false }: ChatBubbleProps) {
  const isInternal = isInternalNote(message)
  const attachments = getAttachments(message)

  // Use internal note config if this is an internal note, otherwise use sender config
  const config = isInternal
    ? internalNoteConfig
    : (senderConfig[message.sender_type] || senderConfig.customer)
  const Icon = config.icon
  const isRight = config.align === 'right'

  const displayName = isInternal
    ? 'Internal Note'
    : message.sender_type === 'customer'
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
          <span className={cn(
            'text-xs font-medium',
            isInternal ? 'text-amber-700' : 'text-muted-foreground'
          )}>
            {displayName}
          </span>

          {/* Internal Note Badge */}
          {isInternal && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 gap-1 border-amber-200 bg-amber-50 text-amber-700"
            >
              <Lock className="h-2.5 w-2.5" />
              Private
            </Badge>
          )}

          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              getRelativeTime(message.created_at)
            )}
          </span>

          {/* Channel indicator */}
          {message.source && message.source !== 'dashboard' && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 gap-1"
            >
              {(() => {
                const ChannelIcon = channelIcons[message.source as MessageSource] || MessageSquare
                return <ChannelIcon className="h-2.5 w-2.5" />
              })()}
              {channelLabels[message.source as MessageSource] || message.source}
            </Badge>
          )}

          {/* Read status for agent/AI messages */}
          {showReadStatus && message.sender_type !== 'customer' && !isPending && (
            <span className="text-xs text-muted-foreground flex items-center">
              {isRead ? (
                <CheckCheck className="h-3.5 w-3.5 text-primary-600" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          )}

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
            'px-4 py-2.5 rounded-2xl shadow-[var(--shadow-xs)]',
            config.bgColor,
            config.textColor,
            isRight ? 'rounded-br-md' : 'rounded-bl-md'
          )}
        >
          {/* Message text content */}
          {message.content && (
            <div className={cn(
              "text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:font-semibold",
              // For agent messages (dark background), always use inverted (light) prose
              // For others, use standard prose that switches based on dark mode
              (message.sender_type === 'agent' && !isInternal) 
                ? 'prose-invert text-white prose-p:text-white prose-headings:text-white prose-strong:text-white prose-a:text-white' 
                : 'dark:prose-invert'
            )}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <MessageAttachments
              attachments={attachments}
              variant={message.sender_type === 'agent' ? 'default' : 'default'}
            />
          )}

          {/* Show translated content if different from original */}
          {message.content_translated &&
            message.content_translated !== message.content && (
              <div className="mt-2 pt-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
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
