'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SlaMetricData {
  met: number
  breached: number
  compliance: number | null
  total: number
}

interface SlaData {
  firstResponse: SlaMetricData
  resolution: SlaMetricData
  ticketsAtRisk: number
}

interface SlaMetricsProps {
  data: SlaData
  className?: string
}

// Compliance progress bar
function ComplianceBar({ compliance, label }: { compliance: number | null; label: string }) {
  const hasData = compliance !== null

  // Determine color based on compliance rate
  const getColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500'
    if (rate >= 70) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getBgColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-100 dark:bg-emerald-900/30'
    if (rate >= 70) return 'bg-amber-100 dark:bg-amber-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span
          className={cn(
            'text-sm font-semibold',
            hasData && compliance! >= 90 && 'text-emerald-600 dark:text-emerald-400',
            hasData && compliance! >= 70 && compliance! < 90 && 'text-amber-600 dark:text-amber-400',
            hasData && compliance! < 70 && 'text-red-600 dark:text-red-400',
            !hasData && 'text-gray-400'
          )}
        >
          {hasData ? `${compliance}%` : '--'}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        {hasData && (
          <div
            className={cn('h-full rounded-full transition-all', getColor(compliance!))}
            style={{ width: `${compliance}%` }}
          />
        )}
      </div>
    </div>
  )
}

// Metric breakdown card
function MetricBreakdown({
  label,
  met,
  breached,
  total,
}: {
  label: string
  met: number
  breached: number
  total: number
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{met}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Met</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{breached}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Breached</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
      </div>
    </div>
  )
}

// Warning indicator for tickets at risk
function AtRiskIndicator({ count }: { count: number }) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="text-sm text-emerald-700 dark:text-emerald-300">All tickets on track</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-amber-600 dark:text-amber-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {count} {count === 1 ? 'ticket' : 'tickets'} at risk
        </span>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Approaching SLA deadline
        </p>
      </div>
    </div>
  )
}

export function SlaMetrics({ data, className }: SlaMetricsProps) {
  const hasFirstResponseData = data.firstResponse.total > 0
  const hasResolutionData = data.resolution.total > 0
  const hasData = hasFirstResponseData || hasResolutionData

  return (
    <Card className={cn('bg-card border-border/70', className)}>
      <CardHeader>
        <CardTitle className="text-base">SLA Compliance</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No SLA data</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              SLA metrics will appear once tickets have SLA policies
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compliance Overview */}
            <div className="space-y-4">
              <ComplianceBar
                compliance={data.firstResponse.compliance}
                label="First Response"
              />
              <ComplianceBar
                compliance={data.resolution.compliance}
                label="Resolution"
              />
            </div>

            {/* At Risk Warning */}
            <AtRiskIndicator count={data.ticketsAtRisk} />

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricBreakdown
                label="First Response SLA"
                met={data.firstResponse.met}
                breached={data.firstResponse.breached}
                total={data.firstResponse.total}
              />
              <MetricBreakdown
                label="Resolution SLA"
                met={data.resolution.met}
                breached={data.resolution.breached}
                total={data.resolution.total}
              />
            </div>

            {/* Overall Stats */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.firstResponse.met + data.resolution.met}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total SLAs Met</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {data.firstResponse.breached + data.resolution.breached}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Breaches</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SlaMetrics

