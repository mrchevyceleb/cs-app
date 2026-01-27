'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Clock, AlertTriangle, XCircle } from 'lucide-react'
import type { Ticket, SlaStatus, SlaInfo } from '@/types/database'
import {
  getActiveSlaInfo,
  getFirstResponseSlaInfo,
  getResolutionSlaInfo,
  getTimeRemaining,
  getSlaStatusColors,
  formatSlaDuration,
} from '@/lib/sla'

interface SlaBadgeProps {
  ticket: Ticket
  variant?: 'compact' | 'full'
  showBothSlas?: boolean
  className?: string
}

/**
 * SlaBadge component displays SLA status in a compact badge format
 *
 * Three states:
 * - OK (green): More than 50% time remaining
 * - Warning (amber): Less than 50% time remaining
 * - Breached (red): Past due
 */
export function SlaBadge({
  ticket,
  variant = 'compact',
  showBothSlas = false,
  className,
}: SlaBadgeProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const activeSla = getActiveSlaInfo(ticket)
  const firstResponseSla = getFirstResponseSlaInfo(ticket)
  const resolutionSla = getResolutionSlaInfo(ticket)

  // No SLA configured
  if (!activeSla && !showBothSlas) {
    return null
  }

  if (showBothSlas) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {firstResponseSla && (
          <SingleSlaBadge
            slaInfo={firstResponseSla}
            label="First Response"
            variant={variant}
            currentTime={currentTime}
          />
        )}
        {resolutionSla && (
          <SingleSlaBadge
            slaInfo={resolutionSla}
            label="Resolution"
            variant={variant}
            currentTime={currentTime}
          />
        )}
      </div>
    )
  }

  return (
    <SingleSlaBadge
      slaInfo={activeSla!}
      label={activeSla?.isFirstResponse ? 'First Response' : 'Resolution'}
      variant={variant}
      className={className}
      currentTime={currentTime}
    />
  )
}

interface SingleSlaBadgeProps {
  slaInfo: SlaInfo
  label: string
  variant: 'compact' | 'full'
  className?: string
  currentTime: Date
}

function SingleSlaBadge({
  slaInfo,
  label,
  variant,
  className,
  currentTime,
}: SingleSlaBadgeProps) {
  const colors = getSlaStatusColors(slaInfo.status)
  const timeRemaining = slaInfo.dueAt ? getTimeRemaining(slaInfo.dueAt, currentTime) : null

  const Icon = getStatusIcon(slaInfo.status)

  const badgeContent = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border transition-all',
        colors.bg,
        colors.text,
        colors.border,
        slaInfo.status === 'breached' && 'animate-pulse',
        variant === 'compact' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      <Icon
        className={cn(
          'flex-shrink-0',
          colors.icon,
          variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4'
        )}
      />
      <span className="font-medium">
        {slaInfo.status === 'breached'
          ? 'Breached'
          : timeRemaining || 'N/A'}
      </span>
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
      >
        <SlaTooltipContent
          slaInfo={slaInfo}
          label={label}
          currentTime={currentTime}
        />
      </TooltipContent>
    </Tooltip>
  )
}

interface SlaTooltipContentProps {
  slaInfo: SlaInfo
  label: string
  currentTime: Date
}

function SlaTooltipContent({ slaInfo, label, currentTime }: SlaTooltipContentProps) {
  const timeRemaining = slaInfo.dueAt ? getTimeRemaining(slaInfo.dueAt, currentTime) : null

  return (
    <div className="space-y-1.5 py-1">
      <div className="font-semibold">{label} SLA</div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="opacity-80">Status:</span>
        <span className={cn(
          'font-medium capitalize',
          slaInfo.status === 'ok' && 'text-emerald-400',
          slaInfo.status === 'warning' && 'text-amber-400',
          slaInfo.status === 'breached' && 'text-red-400'
        )}>
          {slaInfo.status === 'ok' ? 'On Track' : slaInfo.status === 'warning' ? 'At Risk' : 'Breached'}
        </span>
      </div>
      {slaInfo.dueAt && (
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="opacity-80">Due:</span>
          <span>
            {slaInfo.dueAt.toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}
      {timeRemaining && slaInfo.status !== 'breached' && (
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="opacity-80">Time left:</span>
          <span className="font-medium">{timeRemaining}</span>
        </div>
      )}
      {slaInfo.status === 'breached' && (
        <div className="mt-1 text-xs text-red-400">
          This SLA has been breached and requires immediate attention.
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-2">
        <div className="h-1.5 w-full rounded-full bg-gray-700 dark:bg-gray-300 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              slaInfo.status === 'ok' && 'bg-emerald-500',
              slaInfo.status === 'warning' && 'bg-amber-500',
              slaInfo.status === 'breached' && 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, slaInfo.percentageUsed)}%` }}
          />
        </div>
        <div className="mt-0.5 text-[10px] opacity-60 text-right">
          {Math.round(slaInfo.percentageUsed)}% of SLA used
        </div>
      </div>
    </div>
  )
}

function getStatusIcon(status: SlaStatus) {
  switch (status) {
    case 'ok':
      return Clock
    case 'warning':
      return AlertTriangle
    case 'breached':
      return XCircle
  }
}

/**
 * SlaProgressBar component for detailed view
 */
interface SlaProgressBarProps {
  slaInfo: SlaInfo
  label: string
  showDetails?: boolean
  className?: string
}

export function SlaProgressBar({
  slaInfo,
  label,
  showDetails = true,
  className,
}: SlaProgressBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const colors = getSlaStatusColors(slaInfo.status)
  const timeRemaining = slaInfo.dueAt ? getTimeRemaining(slaInfo.dueAt, currentTime) : null

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const Icon = getStatusIcon(slaInfo.status)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', colors.icon)} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <div className={cn('text-sm font-semibold', colors.text)}>
          {slaInfo.status === 'breached' ? 'Breached' : timeRemaining || 'N/A'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            slaInfo.status === 'ok' && 'bg-emerald-500',
            slaInfo.status === 'warning' && 'bg-amber-500',
            slaInfo.status === 'breached' && 'bg-red-500 animate-pulse'
          )}
          style={{ width: `${Math.min(100, slaInfo.percentageUsed)}%` }}
        />
      </div>

      {showDetails && slaInfo.dueAt && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{Math.round(slaInfo.percentageUsed)}% used</span>
          <span>
            Due: {slaInfo.dueAt.toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * SlaAlertBanner component for breached SLAs
 */
interface SlaAlertBannerProps {
  ticket: Ticket
  className?: string
}

export function SlaAlertBanner({ ticket, className }: SlaAlertBannerProps) {
  const firstResponseSla = getFirstResponseSlaInfo(ticket)
  const resolutionSla = getResolutionSlaInfo(ticket)

  const hasBreached =
    firstResponseSla?.status === 'breached' ||
    resolutionSla?.status === 'breached'

  if (!hasBreached) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20',
        'animate-pulse',
        className
      )}
    >
      <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          SLA Breached
        </p>
        <p className="text-xs text-red-600 dark:text-red-400">
          {firstResponseSla?.status === 'breached' && 'First response '}
          {firstResponseSla?.status === 'breached' &&
            resolutionSla?.status === 'breached' &&
            'and '}
          {resolutionSla?.status === 'breached' && 'resolution '}
          SLA has been breached. This ticket requires immediate attention.
        </p>
      </div>
    </div>
  )
}

/**
 * Compact SLA indicator for ticket lists - shows just an icon with color
 */
interface SlaIndicatorProps {
  ticket: Ticket
  className?: string
}

export function SlaIndicator({ ticket, className }: SlaIndicatorProps) {
  const activeSla = getActiveSlaInfo(ticket)

  if (!activeSla) {
    return null
  }

  const colors = getSlaStatusColors(activeSla.status)
  const Icon = getStatusIcon(activeSla.status)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-1',
            activeSla.status === 'breached' && 'animate-pulse',
            className
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
      >
        <div className="text-xs">
          <span className="font-medium">
            {activeSla.isFirstResponse ? 'First Response' : 'Resolution'} SLA:
          </span>{' '}
          <span className={cn(
            activeSla.status === 'ok' && 'text-emerald-400',
            activeSla.status === 'warning' && 'text-amber-400',
            activeSla.status === 'breached' && 'text-red-400'
          )}>
            {activeSla.status === 'breached'
              ? 'Breached'
              : activeSla.timeRemaining || 'N/A'}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
