'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, Clock, Smile, Ticket } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

function MetricCard({ label, value, icon, variant = 'default', isLoading = false }: MetricCardProps) {
  const variantStyles = {
    default: 'bg-card border-border/70',
    success: 'bg-card border-emerald-200/80 dark:border-emerald-800/60',
    warning: 'bg-card border-amber-200/80 dark:border-amber-800/60',
    danger: 'bg-card border-red-200/80 dark:border-red-800/60',
  }

  const iconStyles = {
    default: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/70 shadow-sm dark:bg-slate-800/60 dark:text-slate-100 dark:ring-slate-700/60',
    success: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-100 dark:ring-emerald-700/60',
    warning: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70 shadow-sm dark:bg-amber-900/50 dark:text-amber-100 dark:ring-amber-700/60',
    danger: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/70 shadow-sm dark:bg-rose-900/50 dark:text-rose-100 dark:ring-rose-700/60',
  }

  return (
    <Card
      className={cn(
        'p-4 border transition-shadow duration-200 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          )}
        </div>
        <div
          className={cn('flex items-center justify-center rounded-lg', iconStyles[variant])}
          style={{ width: 44, height: 44 }}
        >
          <span style={{ transform: 'scale(1.3)', transformOrigin: 'center' }}>
            {icon}
          </span>
        </div>
      </div>
    </Card>
  )
}

const Icons = {
  ticket: <Ticket strokeWidth={2.5} style={{ width: 26, height: 26 }} />,
  clock: <Clock strokeWidth={2.5} style={{ width: 26, height: 26 }} />,
  robot: <Bot strokeWidth={2.5} style={{ width: 26, height: 26 }} />,
  happy: <Smile strokeWidth={2.5} style={{ width: 26, height: 26 }} />,
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
  const { data: metrics, isPending: isLoading } = useQuery({
    queryKey: ['metrics-bar'],
    queryFn: async (): Promise<MetricsData> => {
      const response = await fetch('/api/metrics')
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      const data = await response.json()
      return {
        openTickets: data.openTickets,
        avgResponseTime: data.avgResponseTime,
        aiResolutionRate: data.aiResolutionRate,
        customerSatisfaction: data.customerSatisfaction,
      }
    },
    staleTime: 30 * 1000, // 30 seconds - metrics can be slightly stale
  })

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
