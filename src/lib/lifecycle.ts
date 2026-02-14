// Ticket lifecycle constants and utilities
// Simple system: follow-ups and auto-closing based on priority

export const LIFECYCLE_TIMELINES = {
  urgent:  { followUpHours: 4,  autoCloseHours: 48,   postResolveCloseHours: 24  },
  high:    { followUpHours: 8,  autoCloseHours: 72,   postResolveCloseHours: 48  },
  normal:  { followUpHours: 24, autoCloseHours: 168,  postResolveCloseHours: 72  },
  low:     { followUpHours: 48, autoCloseHours: 336,  postResolveCloseHours: 120 },
} as const

export type LifecycleStatus = 'ok' | 'soon' | 'overdue'

export interface LifecycleInfo {
  followUpAt: Date | null
  autoCloseAt: Date | null
  followUpStatus: LifecycleStatus | null
  autoCloseStatus: LifecycleStatus | null
  followUpLabel: string | null
  autoCloseLabel: string | null
}

export function getTimeLabel(date: Date | string | null, now: Date = new Date()): string | null {
  if (!date) return null
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return 'overdue'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days >= 2) return `in ${days}d`
  if (hours >= 1) return `in ${hours}h`
  return `in ${minutes}m`
}

export function getLifecycleStatus(date: Date | string | null, now: Date = new Date()): LifecycleStatus | null {
  if (!date) return null
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return 'overdue'
  // "soon" if less than 6 hours remaining (25% of 24h baseline)
  if (diff < 6 * 60 * 60 * 1000) return 'soon'
  return 'ok'
}

export function getLifecycleInfo(ticket: {
  follow_up_at: string | null
  auto_close_at: string | null
  status: string
}): LifecycleInfo {
  const isResolved = ticket.status === 'resolved'

  const followUpAt = ticket.follow_up_at ? new Date(ticket.follow_up_at) : null
  const autoCloseAt = ticket.auto_close_at ? new Date(ticket.auto_close_at) : null

  return {
    followUpAt: isResolved ? null : followUpAt,
    autoCloseAt,
    followUpStatus: isResolved ? null : getLifecycleStatus(ticket.follow_up_at),
    autoCloseStatus: getLifecycleStatus(ticket.auto_close_at),
    followUpLabel: isResolved ? null : getTimeLabel(ticket.follow_up_at),
    autoCloseLabel: getTimeLabel(ticket.auto_close_at),
  }
}

export function getStatusColors(status: LifecycleStatus): {
  bg: string
  text: string
  border: string
  icon: string
} {
  switch (status) {
    case 'ok':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-700',
        icon: 'text-blue-500 dark:text-blue-400',
      }
    case 'soon':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-700',
        icon: 'text-amber-500 dark:text-amber-400',
      }
    case 'overdue':
      return {
        bg: 'bg-slate-100 dark:bg-slate-800/40',
        text: 'text-slate-600 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-600',
        icon: 'text-slate-500 dark:text-slate-400',
      }
  }
}
