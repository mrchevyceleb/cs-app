'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Clock, Timer } from 'lucide-react'
import {
  getLifecycleInfo,
  getStatusColors,
  type LifecycleStatus,
} from '@/lib/lifecycle'

interface TicketLike {
  follow_up_at: string | null
  auto_close_at: string | null
  status: string
  priority: string
}

interface LifecycleBadgeProps {
  ticket: TicketLike
  className?: string
}

export function LifecycleBadge({ ticket, className }: LifecycleBadgeProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const info = getLifecycleInfo(ticket)
  const isResolved = ticket.status === 'resolved'

  const badges: Array<{
    label: string
    status: LifecycleStatus
    tooltip: string
    icon: typeof Clock
  }> = []

  if (!isResolved && info.followUpStatus && info.followUpLabel) {
    const label = info.followUpStatus === 'overdue'
      ? 'Follow-up overdue'
      : `Follow-up ${info.followUpLabel}`
    badges.push({
      label,
      status: info.followUpStatus,
      tooltip: 'Automatic follow-up scheduled',
      icon: Clock,
    })
  }

  if (info.autoCloseStatus && info.autoCloseLabel) {
    const label = info.autoCloseStatus === 'overdue'
      ? 'Auto-close overdue'
      : `Closing ${info.autoCloseLabel}`
    badges.push({
      label,
      status: info.autoCloseStatus,
      tooltip: 'Ticket will auto-resolve',
      icon: Timer,
    })
  }

  if (badges.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {badges.map((badge) => {
        const colors = getStatusColors(badge.status)
        const Icon = badge.icon
        return (
          <Tooltip key={badge.label}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs',
                  colors.bg,
                  colors.text,
                  colors.border
                )}
              >
                <Icon size={14} strokeWidth={2.25} className={cn('flex-shrink-0', colors.icon)} />
                <span className="font-medium">{badge.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {badge.tooltip}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

interface LifecycleIndicatorProps {
  ticket: TicketLike
  className?: string
}

export function LifecycleIndicator({ ticket, className }: LifecycleIndicatorProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const info = getLifecycleInfo(ticket)
  const isResolved = ticket.status === 'resolved'

  // Pick the most relevant status
  const status = isResolved ? info.autoCloseStatus : (info.followUpStatus ?? info.autoCloseStatus)
  const label = isResolved ? info.autoCloseLabel : (info.followUpLabel ?? info.autoCloseLabel)

  if (!status || !label) return null

  const colors = getStatusColors(status)
  const Icon = isResolved ? Timer : Clock

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center justify-center', className)}>
          <Icon size={16} strokeWidth={2.25} className={colors.icon} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label === 'overdue' ? 'Follow-up overdue' : label}
      </TooltipContent>
    </Tooltip>
  )
}
