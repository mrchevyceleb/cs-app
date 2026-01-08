'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface MetricCardProps {
  label: string
  value: string | number
  change?: {
    value: number
    label: string
    positive?: boolean
  }
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function MetricCard({ label, value, change, icon, variant = 'default' }: MetricCardProps) {
  const variantStyles = {
    default: 'from-gray-50 to-white dark:from-gray-800 dark:to-gray-900',
    success: 'from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900',
    warning: 'from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-900',
    danger: 'from-red-50 to-white dark:from-red-950/30 dark:to-gray-900',
  }

  const iconStyles = {
    default: 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  }

  return (
    <Card className={cn(
      'p-4 bg-gradient-to-br border-0 shadow-sm hover:shadow-md transition-shadow',
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <p className={cn(
              'text-xs mt-1 flex items-center gap-1',
              change.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              <span>{change.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value)}%</span>
              <span className="text-gray-500 dark:text-gray-400">{change.label}</span>
            </p>
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

interface MetricsBarProps {
  className?: string
  metrics?: {
    openTickets: number
    avgResponseTime: string
    aiResolutionRate: number
    customerSatisfaction: number
  }
}

export function MetricsBar({ className, metrics }: MetricsBarProps) {
  // Demo data if no metrics provided
  const data = metrics || {
    openTickets: 12,
    avgResponseTime: '2.4m',
    aiResolutionRate: 87,
    customerSatisfaction: 94,
  }

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4', className)}>
      <MetricCard
        label="Open Tickets"
        value={data.openTickets}
        change={{ value: 8, label: 'from yesterday', positive: false }}
        icon={Icons.ticket}
        variant="warning"
      />
      <MetricCard
        label="Avg Response Time"
        value={data.avgResponseTime}
        change={{ value: 12, label: 'faster', positive: true }}
        icon={Icons.clock}
        variant="default"
      />
      <MetricCard
        label="AI Resolution Rate"
        value={`${data.aiResolutionRate}%`}
        change={{ value: 5, label: 'this week', positive: true }}
        icon={Icons.robot}
        variant="success"
      />
      <MetricCard
        label="Customer Satisfaction"
        value={`${data.customerSatisfaction}%`}
        change={{ value: 2, label: 'this month', positive: true }}
        icon={Icons.happy}
        variant="success"
      />
    </div>
  )
}
