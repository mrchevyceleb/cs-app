'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface AgentMetrics {
  agent_id: string
  agent_name: string
  agent_email: string
  avatar_url: string | null
  status: 'online' | 'away' | 'offline'
  total_tickets_handled: number
  tickets_resolved: number
  avg_csat_rating: number | null
  feedback_count: number
  avg_resolution_hours: number | null
  ticket_breakdown: {
    open: number
    pending: number
    resolved: number
    escalated: number
  }
  period: string
}

interface AgentPerformanceCardProps {
  agentId: string
  className?: string
  showPeriodSelector?: boolean
  initialPeriod?: '7' | '30' | 'all'
}

// Icons as SVG components
const Icons = {
  ticket: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    </svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  star: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  starEmpty: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  clock: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  timer: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  ),
}

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-gray-400',
}

function MetricItem({
  icon,
  label,
  value,
  subValue,
  colorClass = 'text-gray-900 dark:text-white',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  colorClass?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className={cn('text-sm font-semibold', colorClass)}>{value}</p>
        {subValue && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{subValue}</p>
        )}
      </div>
    </div>
  )
}

function StarRating({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) {
  const fullStars = Math.floor(rating)
  const hasPartialStar = rating % 1 >= 0.5
  const emptyStars = maxStars - fullStars - (hasPartialStar ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="text-amber-500">
          {Icons.star}
        </span>
      ))}
      {hasPartialStar && (
        <span className="text-amber-500">
          {Icons.star}
        </span>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300 dark:text-gray-600">
          {Icons.starEmpty}
        </span>
      ))}
    </div>
  )
}

function getPerformanceColor(value: number, thresholds: { good: number; warning: number }) {
  if (value >= thresholds.good) return 'text-emerald-600 dark:text-emerald-400'
  if (value >= thresholds.warning) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return '--'
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

function formatResolutionTime(hours: number | null): string {
  if (hours === null) return '--'
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

type TimePeriod = '7' | '30' | 'all'

export function AgentPerformanceCard({
  agentId,
  className,
  showPeriodSelector = true,
  initialPeriod = '30',
}: AgentPerformanceCardProps) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>(initialPeriod)

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/agents/${agentId}/metrics?period=${period}`)
        if (!response.ok) {
          throw new Error('Failed to fetch agent metrics')
        }
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        console.error('Failed to fetch agent metrics:', err)
        setError('Failed to load metrics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [agentId, period])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <Card className={cn('bg-card border-border/70', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !metrics) {
    return (
      <Card className={cn('bg-card border-border/70', className)}>
        <CardContent className="py-8">
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            {error || 'No data available'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const resolutionRate =
    metrics.total_tickets_handled > 0
      ? Math.round((metrics.tickets_resolved / metrics.total_tickets_handled) * 100)
      : 0

  return (
    <Card className={cn('bg-card border-border/70', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                {metrics.avatar_url && (
                  <AvatarImage src={metrics.avatar_url} alt={metrics.agent_name} />
                )}
                <AvatarFallback className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-medium">
                  {getInitials(metrics.agent_name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900',
                  statusColors[metrics.status]
                )}
              />
            </div>
            <div>
              <CardTitle className="text-base">{metrics.agent_name}</CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {metrics.agent_email}
              </p>
            </div>
          </div>
          {showPeriodSelector && (
            <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[100px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Tickets Handled */}
          <MetricItem
            icon={Icons.ticket}
            label="Tickets Handled"
            value={metrics.total_tickets_handled}
            subValue={`${metrics.tickets_resolved} resolved`}
          />

          {/* Resolution Rate */}
          <MetricItem
            icon={Icons.check}
            label="Resolution Rate"
            value={`${resolutionRate}%`}
            colorClass={getPerformanceColor(resolutionRate, { good: 80, warning: 60 })}
          />

          {/* CSAT Rating */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-amber-500">
              {Icons.star}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">CSAT Rating</p>
              {metrics.avg_csat_rating !== null ? (
                <div className="flex items-center gap-2">
                  <StarRating rating={metrics.avg_csat_rating} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metrics.avg_csat_rating.toFixed(1)}
                  </span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                  No ratings
                </p>
              )}
              {metrics.feedback_count > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {metrics.feedback_count} reviews
                </p>
              )}
            </div>
          </div>

          {/* Avg Resolution Time */}
          <MetricItem
            icon={Icons.timer}
            label="Avg Resolution Time"
            value={formatResolutionTime(metrics.avg_resolution_hours)}
            colorClass={
              metrics.avg_resolution_hours !== null
                ? metrics.avg_resolution_hours <= 4
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : metrics.avg_resolution_hours <= 24
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-gray-500'
            }
          />
        </div>

        {/* Ticket Breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ticket Breakdown</p>
          <div className="flex gap-2">
            <div className="flex-1 text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {metrics.ticket_breakdown.open}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Open</p>
            </div>
            <div className="flex-1 text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {metrics.ticket_breakdown.pending}
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Pending</p>
            </div>
            <div className="flex-1 text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.ticket_breakdown.resolved}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Resolved</p>
            </div>
            <div className="flex-1 text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {metrics.ticket_breakdown.escalated}
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">Escalated</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

