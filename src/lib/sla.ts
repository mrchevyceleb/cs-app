/**
 * SLA (Service Level Agreement) utility functions
 *
 * These functions help calculate and display SLA status information
 * for tickets in the customer support system.
 */

import type { Ticket, SlaStatus, SlaInfo } from '@/types/database'

/**
 * Determines the SLA status based on time remaining
 * - 'ok': More than 50% time remaining
 * - 'warning': 50% or less time remaining
 * - 'breached': Past due
 */
export function getSlaStatus(
  dueAt: Date | string | null,
  breached?: boolean
): SlaStatus {
  // If already marked as breached, return breached
  if (breached) {
    return 'breached'
  }

  if (!dueAt) {
    return 'ok'
  }

  const now = new Date()
  const due = new Date(dueAt)
  const remaining = due.getTime() - now.getTime()

  if (remaining <= 0) {
    return 'breached'
  }

  // Calculate percentage of time used
  // We'll use a 50% threshold for warning
  // This is a simplified calculation - for more accuracy,
  // you'd want to compare against the original SLA duration
  const oneHour = 60 * 60 * 1000
  if (remaining <= oneHour) {
    return 'warning'
  }

  return 'ok'
}

/**
 * Gets the SLA status based on percentage of time used
 * This provides more accurate status when you have the creation time
 */
export function getSlaStatusByPercentage(percentage: number, breached?: boolean): SlaStatus {
  if (breached || percentage >= 100) {
    return 'breached'
  }
  if (percentage >= 50) {
    return 'warning'
  }
  return 'ok'
}

/**
 * Calculates the percentage of SLA time used
 * @param createdAt - When the ticket/SLA timer started
 * @param dueAt - When the SLA is due
 * @param now - Current time (optional, defaults to now)
 * @returns Percentage from 0 to 100+
 */
export function getSlaPercentage(
  createdAt: Date | string,
  dueAt: Date | string,
  now: Date = new Date()
): number {
  const created = new Date(createdAt)
  const due = new Date(dueAt)
  const current = new Date(now)

  const totalDuration = due.getTime() - created.getTime()
  const elapsed = current.getTime() - created.getTime()

  if (totalDuration <= 0) {
    return 100
  }

  const percentage = (elapsed / totalDuration) * 100
  return Math.max(0, Math.min(150, percentage)) // Cap at 150% for display purposes
}

/**
 * Gets a human-readable time remaining string
 * @param dueAt - When the SLA is due
 * @param now - Current time (optional)
 * @returns Formatted string like "2h 30m", "15m", "3d", or "Breached"
 */
export function getTimeRemaining(
  dueAt: Date | string | null,
  now: Date = new Date()
): string | null {
  if (!dueAt) {
    return null
  }

  const due = new Date(dueAt)
  const current = new Date(now)
  const remaining = due.getTime() - current.getTime()

  if (remaining <= 0) {
    return 'Breached'
  }

  return formatDuration(remaining)
}

/**
 * Gets a human-readable "overdue by" string
 */
export function getOverdueTime(
  dueAt: Date | string,
  now: Date = new Date()
): string {
  const due = new Date(dueAt)
  const current = new Date(now)
  const overdue = current.getTime() - due.getTime()

  if (overdue <= 0) {
    return 'On time'
  }

  return formatDuration(overdue) + ' overdue'
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`
    }
    return `${days}d`
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${hours}h`
  }

  if (minutes > 0) {
    return `${minutes}m`
  }

  return '< 1m'
}

/**
 * Formats SLA policy hours into a readable duration
 * @param hours - Number of hours
 * @returns Formatted string like "4 hours", "1 day", "2 days 4 hours"
 */
export function formatSlaDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
}

/**
 * Gets comprehensive SLA information for first response
 */
export function getFirstResponseSlaInfo(ticket: Ticket): SlaInfo | null {
  // If already responded, no active SLA
  if (ticket.first_response_at) {
    return {
      status: ticket.first_response_breached ? 'breached' : 'ok',
      dueAt: ticket.first_response_due_at ? new Date(ticket.first_response_due_at) : null,
      timeRemaining: null,
      percentageUsed: 100,
      isFirstResponse: true,
      breached: ticket.first_response_breached,
    }
  }

  if (!ticket.first_response_due_at) {
    return null
  }

  const dueAt = new Date(ticket.first_response_due_at)
  const percentage = getSlaPercentage(ticket.created_at, ticket.first_response_due_at)
  const status = getSlaStatusByPercentage(percentage, ticket.first_response_breached)
  const timeRemaining = getTimeRemaining(ticket.first_response_due_at)

  return {
    status,
    dueAt,
    timeRemaining,
    percentageUsed: percentage,
    isFirstResponse: true,
    breached: ticket.first_response_breached || percentage >= 100,
  }
}

/**
 * Gets comprehensive SLA information for resolution
 */
export function getResolutionSlaInfo(ticket: Ticket): SlaInfo | null {
  // If already resolved, no active SLA
  if (ticket.status === 'resolved') {
    return {
      status: ticket.resolution_breached ? 'breached' : 'ok',
      dueAt: ticket.resolution_due_at ? new Date(ticket.resolution_due_at) : null,
      timeRemaining: null,
      percentageUsed: 100,
      isFirstResponse: false,
      breached: ticket.resolution_breached,
    }
  }

  if (!ticket.resolution_due_at) {
    return null
  }

  const dueAt = new Date(ticket.resolution_due_at)
  const percentage = getSlaPercentage(ticket.created_at, ticket.resolution_due_at)
  const status = getSlaStatusByPercentage(percentage, ticket.resolution_breached)
  const timeRemaining = getTimeRemaining(ticket.resolution_due_at)

  return {
    status,
    dueAt,
    timeRemaining,
    percentageUsed: percentage,
    isFirstResponse: false,
    breached: ticket.resolution_breached || percentage >= 100,
  }
}

/**
 * Gets the most urgent SLA info (first response if not responded, otherwise resolution)
 */
export function getActiveSlaInfo(ticket: Ticket): SlaInfo | null {
  // First response takes priority if not yet responded
  if (!ticket.first_response_at && ticket.first_response_due_at) {
    return getFirstResponseSlaInfo(ticket)
  }

  // Otherwise show resolution SLA if available
  if (ticket.resolution_due_at && ticket.status !== 'resolved') {
    return getResolutionSlaInfo(ticket)
  }

  return null
}

/**
 * Determines if a ticket has any active SLA concerns
 */
export function hasSlaConcerns(ticket: Ticket): boolean {
  const activeSla = getActiveSlaInfo(ticket)
  return activeSla !== null && (activeSla.status === 'warning' || activeSla.status === 'breached')
}

/**
 * Gets the color classes for an SLA status
 */
export function getSlaStatusColors(status: SlaStatus): {
  bg: string
  text: string
  border: string
  icon: string
} {
  switch (status) {
    case 'ok':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-700',
        icon: 'text-emerald-500 dark:text-emerald-400',
      }
    case 'warning':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-700',
        icon: 'text-amber-500 dark:text-amber-400',
      }
    case 'breached':
      return {
        bg: 'bg-red-100 dark:bg-red-900/40',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-300 dark:border-red-600',
        icon: 'text-red-600 dark:text-red-400',
      }
  }
}

/**
 * Gets the progress bar color based on percentage
 */
export function getSlaProgressColor(percentage: number, breached?: boolean): string {
  if (breached || percentage >= 100) {
    return 'bg-red-500 dark:bg-red-400'
  }
  if (percentage >= 75) {
    return 'bg-amber-500 dark:bg-amber-400'
  }
  if (percentage >= 50) {
    return 'bg-yellow-500 dark:bg-yellow-400'
  }
  return 'bg-emerald-500 dark:bg-emerald-400'
}
