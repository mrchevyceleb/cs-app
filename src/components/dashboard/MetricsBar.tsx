'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

function MetricCard({ label, value, icon, variant = 'default', isLoading = false }: MetricCardProps) {
  const variantStyles = {
    default: 'bg-card border-border/60',
    success: 'bg-card border-border/60',
    warning: 'bg-card border-border/60',
    danger: 'bg-card border-border/60',
  }

  const iconStyles = {
    default: 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  }

  return (
    <Card className={cn(
      'p-4 border shadow-sm hover:shadow-md transition-shadow',
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/70">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

const Icons = {
  ticket: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    </svg>
  ),
  clock: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  robot: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="10" x="3" y="11" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" x2="8" y1="16" y2="16" />
      <line x1="16" x2="16" y1="16" y2="16" />
    </svg>
  ),
  happy: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  ),
}

interface MetricsData {
  openTickets: number
  avgResponseTime: string
  aiResolutionRate: number | null
  customerSatisfaction: number | null
}

interface MetricsBarProps {
  className?: string
}

export function MetricsBar({ className }: MetricsBarProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics')
        if (response.ok) {
          const data = await response.json()
          setMetrics({
            openTickets: data.openTickets,
            avgResponseTime: data.avgResponseTime,
            aiResolutionRate: data.aiResolutionRate,
            customerSatisfaction: data.customerSatisfaction,
          })
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  const displayValue = (value: number | string | null | undefined, suffix?: string): string => {
    if (value === null || value === undefined) return '--'
    if (typeof value === 'string') return value
    return suffix ? `${value}${suffix}` : String(value)
  }

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4', className)}>
      <MetricCard
        label="Open Tickets"
        value={displayValue(metrics?.openTickets ?? 0)}
        icon={Icons.ticket}
        variant="warning"
        isLoading={isLoading}
      />
      <MetricCard
        label="Avg Response Time"
        value={displayValue(metrics?.avgResponseTime)}
        icon={Icons.clock}
        variant="default"
        isLoading={isLoading}
      />
      <MetricCard
        label="AI Resolution Rate"
        value={displayValue(metrics?.aiResolutionRate, '%')}
        icon={Icons.robot}
        variant="success"
        isLoading={isLoading}
      />
      <MetricCard
        label="Customer Satisfaction"
        value={displayValue(metrics?.customerSatisfaction, '%')}
        icon={Icons.happy}
        variant="success"
        isLoading={isLoading}
      />
    </div>
  )
}
