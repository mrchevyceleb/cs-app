'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PlusCircle,
  ArrowRight,
  Flag,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileText,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  Tag,
  RefreshCw,
} from 'lucide-react'
import type { TicketEventWithAgent, TicketEventType, TicketEventMetadata } from '@/types/database'

interface TicketTimelineProps {
  ticketId: string
  className?: string
}

// Event type configuration with icons and colors
const eventConfig: Record<TicketEventType, {
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  created: {
    icon: PlusCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    label: 'Created',
  },
  status_changed: {
    icon: ArrowRight,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-100',
    label: 'Status Changed',
  },
  priority_changed: {
    icon: Flag,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    label: 'Priority Changed',
  },
  assigned: {
    icon: UserPlus,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-100',
    label: 'Assigned',
  },
  unassigned: {
    icon: UserMinus,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border/60',
    label: 'Unassigned',
  },
  tagged: {
    icon: Tag,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-100',
    label: 'Tagged',
  },
  escalated: {
    icon: AlertTriangle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    label: 'Escalated',
  },
  resolved: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    label: 'Resolved',
  },
  message_sent: {
    icon: MessageSquare,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-100',
    label: 'Message Sent',
  },
  note_added: {
    icon: FileText,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    label: 'Note Added',
  },
  ai_handling_changed: {
    icon: Sparkles,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-100',
    label: 'AI Handling Changed',
  },
  reassigned: {
    icon: Users,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-100',
    label: 'Reassigned',
  },
}

// Get relative time string
function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Generate event description based on type and values
function getEventDescription(event: TicketEventWithAgent): string {
  const metadata = event.metadata as TicketEventMetadata | null

  switch (event.event_type) {
    case 'created':
      return 'created this ticket'
    case 'status_changed':
      return `changed status from ${formatValue(event.old_value)} to ${formatValue(event.new_value)}`
    case 'priority_changed':
      return `changed priority from ${formatValue(event.old_value)} to ${formatValue(event.new_value)}`
    case 'assigned':
      return `assigned to ${event.new_value || 'an agent'}`
    case 'unassigned':
      return `unassigned from ${event.old_value || 'agent'}`
    case 'tagged':
      return metadata?.tag ? `added tag "${metadata.tag}"` : 'updated tags'
    case 'escalated':
      return 'escalated this ticket'
    case 'resolved':
      return 'resolved this ticket'
    case 'message_sent':
      return 'sent a message'
    case 'note_added':
      return 'added an internal note'
    case 'ai_handling_changed':
      return event.new_value === 'true' ? 'enabled AI handling' : 'disabled AI handling'
    case 'reassigned':
      const fromAgent = metadata?.previous_agent_name || event.old_value || 'previous agent'
      const toAgent = metadata?.new_agent_name || event.new_value || 'new agent'
      return `reassigned from ${fromAgent} to ${toAgent}`
    default:
      return 'updated this ticket'
  }
}

// Format value for display (capitalize, replace underscores)
function formatValue(value: string | null): string {
  if (!value) return 'none'
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
}

// Single timeline event component
function TimelineEvent({ event, isLast }: { event: TicketEventWithAgent; isLast: boolean }) {
  const config = eventConfig[event.event_type as TicketEventType] || eventConfig.status_changed
  const Icon = config.icon

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2',
          config.bgColor,
          config.borderColor
        )}
      >
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          {/* Agent info */}
          {event.agent ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={event.agent.avatar_url || undefined} />
                <AvatarFallback className="text-[9px] bg-gray-200 dark:bg-gray-700">
                  {getInitials(event.agent.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {event.agent.name}
              </span>
            </div>
          ) : (
            <span className="font-medium text-sm text-gray-500 dark:text-gray-400 italic">
              System
            </span>
          )}

          {/* Description */}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getEventDescription(event)}
          </span>
        </div>

        {/* Timestamp */}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {getRelativeTime(event.created_at)}
        </p>

        {/* Additional metadata display */}
        {event.old_value && event.new_value && (event.event_type === 'status_changed' || event.event_type === 'priority_changed') && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={cn(
              'px-2 py-0.5 rounded-full',
              event.event_type === 'status_changed'
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            )}>
              {formatValue(event.old_value)}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={cn(
              'px-2 py-0.5 rounded-full',
              event.event_type === 'status_changed'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            )}>
              {formatValue(event.new_value)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Loading skeleton
function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty state
function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <RefreshCw className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
        No activity yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Ticket events will appear here as they occur
      </p>
    </div>
  )
}

export function TicketTimeline({ ticketId, className }: TicketTimelineProps) {
  const [events, setEvents] = useState<TicketEventWithAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const INITIAL_LIMIT = 10
  const EXPANDED_LIMIT = 50

  const fetchEvents = useCallback(async (limit: number = INITIAL_LIMIT) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/events?limit=${limit}&offset=0`)

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events)
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Error fetching timeline events:', err)
      setError('Failed to load timeline')
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchEvents(isExpanded ? EXPANDED_LIMIT : INITIAL_LIMIT)
  }, [fetchEvents, isExpanded])

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <TimelineSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEvents()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <EmptyTimeline />
      </div>
    )
  }

  return (
    <div className={cn('p-4', className)}>
      {/* Timeline events */}
      <div className="space-y-0">
        {events.map((event, index) => (
          <TimelineEvent
            key={event.id}
            event={event}
            isLast={index === events.length - 1}
          />
        ))}
      </div>

      {/* Expand/Collapse button */}
      {(hasMore || isExpanded) && total > INITIAL_LIMIT && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All ({total} events)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
