'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConfidenceScore } from './ConfidenceScore'
import type { Ticket, Customer, Agent } from '@/types/database'

export interface TicketWithCustomer extends Ticket {
  customer: Customer
  assigned_agent?: Pick<Agent, 'id' | 'name' | 'avatar_url'> | null
}

interface TicketCardProps {
  ticket: TicketWithCustomer
  isSelected?: boolean
  onClick?: () => void
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  escalated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const priorityIndicators: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-gray-400', label: 'Low priority' },
  normal: { color: 'bg-blue-500', label: 'Normal priority' },
  high: { color: 'bg-amber-500', label: 'High priority' },
  urgent: { color: 'bg-red-500 animate-pulse', label: 'Urgent priority' },
}

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

function getInitials(name: string | null): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export function TicketCard({ ticket, isSelected = false, onClick }: TicketCardProps) {
  const priority = priorityIndicators[ticket.priority] || priorityIndicators.normal
  const customerLang = ticket.customer?.preferred_language || 'en'

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all duration-200 cursor-pointer border hover-lift',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
      )}
    >
      {/* Top row on mobile: Avatar, Info, Status */}
      <div className="flex items-center gap-3 sm:contents">
        {/* Customer Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-sm font-semibold">
              {getInitials(ticket.customer?.name ?? null)}
            </AvatarFallback>
          </Avatar>
          {ticket.priority === 'urgent' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          )}
        </div>

        {/* Ticket Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {ticket.subject}
            </h4>
            {languageFlags[customerLang] && (
              <span
                className="text-base flex-shrink-0"
                title={`Language: ${customerLang.toUpperCase()}`}
              >
                {languageFlags[customerLang]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="truncate">{ticket.customer?.name || ticket.customer?.email || 'Unknown'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex-shrink-0 hidden sm:inline">{getRelativeTime(ticket.created_at)}</span>
          </div>
        </div>

        {/* Status & Priority - visible on mobile */}
        <div className="flex items-center gap-2 sm:hidden">
          <Badge
            variant="secondary"
            className={cn('text-xs capitalize', statusColors[ticket.status])}
          >
            {ticket.status}
          </Badge>
          <div
            className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.color)}
            title={priority.label}
          />
        </div>
      </div>

      {/* Bottom row on mobile: Time, AI badge */}
      <div className="flex items-center justify-between sm:hidden pl-[52px]">
        <span className="text-xs text-gray-600 dark:text-gray-400">{getRelativeTime(ticket.created_at)}</span>
        {ticket.ai_handled ? (
          <Badge
            variant="outline"
            className="text-xs border-primary-200 text-primary-600 dark:border-primary-800 dark:text-primary-400"
          >
            AI
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Human
          </Badge>
        )}
      </div>

      {/* AI Confidence - hidden on mobile */}
      <div className="hidden md:block min-w-[120px]">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">AI Confidence</div>
        <ConfidenceScore value={ticket.ai_confidence || 0} size="sm" />
      </div>

      {/* Status & Priority - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2">
        <Badge
          variant="secondary"
          className={cn('text-xs capitalize', statusColors[ticket.status])}
        >
          {ticket.status}
        </Badge>
        <div
          className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.color)}
          title={priority.label}
        />
      </div>

      {/* AI/Human indicator - hidden on mobile */}
      <div className="hidden sm:block w-20 text-right flex-shrink-0">
        {ticket.ai_handled ? (
          <Badge
            variant="outline"
            className="text-xs border-primary-200 text-primary-600 dark:border-primary-800 dark:text-primary-400"
          >
            AI
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Human
          </Badge>
        )}
      </div>

      {/* Tags (if any) */}
      {ticket.tags && ticket.tags.length > 0 && (
        <div className="hidden lg:flex items-center gap-1">
          {ticket.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-gray-600 dark:text-gray-400"
            >
              {tag}
            </Badge>
          ))}
          {ticket.tags.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{ticket.tags.length - 2}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Skeleton loader for TicketCard
export function TicketCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
      <div className="hidden md:block space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
    </div>
  )
}
