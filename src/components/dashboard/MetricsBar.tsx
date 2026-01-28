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
    default: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }

  return (
    <Card
      className={cn(
        'p-4 border transition-shadow duration-200 shadow-sm hover:shadow-md',
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
        <div className={cn('p-3 rounded-lg', iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

const Icons = {
  ticket: <Ticket size={28} strokeWidth={2.5} />,
  clock: <Clock size={28} strokeWidth={2.5} />,
  robot: <Bot size={28} strokeWidth={2.5} />,
  happy: <Smile size={28} strokeWidth={2.5} />,
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
