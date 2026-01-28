'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MetricsBar, CsatMetrics, SlaMetrics, ExportButton } from '@/components/dashboard'
import { cn } from '@/lib/utils'

interface CsatFeedback {
  id: string
  ticket_id: string
  rating: number
  comment: string | null
  submitted_at: string
}

interface CsatData {
  average: number | null
  total: number
  distribution: Record<number, number>
  trend: number | null
  recentFeedback: CsatFeedback[]
}

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

interface AgentPerformance {
  id: string
  name: string
  avatar_url: string | null
  ticketsHandled: number
  ticketsResolved: number
  avgRating: number | null
  feedbackCount: number
  slaComplianceRate: number | null
}

interface MetricsData {
  openTickets: number
  avgResponseTime: string
  aiResolutionRate: number | null
  customerSatisfaction: number | null
  totalTickets: number
  byStatus: {
    open: number
    pending: number
    resolved: number
    escalated: number
  }
  byPriority: {
    low: number
    normal: number
    high: number
    urgent: number
  }
  aiHandledCount: number
  humanHandledCount: number
  csat: CsatData
  sla: SlaData
  agentPerformance: AgentPerformance[]
  period: {
    start: string
    end: string
    label: string
  }
}

type TimePeriod = '7d' | '30d' | '90d' | 'all'

const timePeriods: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {value} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function TimePeriodSelector({
  value,
  onChange,
}: {
  value: TimePeriod
  onChange: (value: TimePeriod) => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/70 p-1">
      {timePeriods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === period.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}

function AgentLeaderboard({ agents }: { agents: AgentPerformance[] }) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No agent data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {agents.slice(0, 5).map((agent, index) => (
        <div
          key={agent.id}
          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        >
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <span
              className={cn(
                'text-sm font-bold',
                index === 0 && 'text-amber-500',
                index === 1 && 'text-gray-400',
                index === 2 && 'text-amber-700',
                index > 2 && 'text-gray-500'
              )}
            >
              #{index + 1}
            </span>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {agent.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {agent.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {agent.ticketsHandled} tickets, {agent.ticketsResolved} resolved
            </p>
          </div>
          <div className="flex items-center gap-4">
            {agent.avgRating !== null && (
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {agent.avgRating.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">CSAT</p>
              </div>
            )}
            {agent.slaComplianceRate !== null && (
              <div className="text-right">
                <p
                  className={cn(
                    'text-sm font-medium',
                    agent.slaComplianceRate >= 90
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : agent.slaComplianceRate >= 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {agent.slaComplianceRate}%
                </p>
                <p className="text-xs text-muted-foreground">SLA</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d')

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/metrics?period=${selectedPeriod}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [selectedPeriod])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track support performance and AI efficiency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimePeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
          <ExportButton period={selectedPeriod} />
        </div>
      </div>

      {/* Key Metrics */}
      <MetricsBar />

      {/* CSAT and SLA Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Card className="bg-card border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/70">
              <CardHeader>
                <CardTitle className="text-base">SLA Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : metrics ? (
          <>
            <CsatMetrics data={metrics.csat} />
            <SlaMetrics data={metrics.sla} />
          </>
        ) : (
          <>
            <Card className="bg-card border-border/70">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Failed to load CSAT data</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/70">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Failed to load SLA data</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tickets by Status */}
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <StatBar
                  label="Open"
                  value={metrics.byStatus.open}
                  total={metrics.totalTickets}
                  color="bg-blue-500"
                />
                <StatBar
                  label="Pending"
                  value={metrics.byStatus.pending}
                  total={metrics.totalTickets}
                  color="bg-amber-500"
                />
                <StatBar
                  label="Resolved"
                  value={metrics.byStatus.resolved}
                  total={metrics.totalTickets}
                  color="bg-emerald-500"
                />
                <StatBar
                  label="Escalated"
                  value={metrics.byStatus.escalated}
                  total={metrics.totalTickets}
                  color="bg-red-500"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Tickets by Priority */}
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <StatBar
                  label="Urgent"
                  value={metrics.byPriority.urgent}
                  total={metrics.totalTickets}
                  color="bg-red-500"
                />
                <StatBar
                  label="High"
                  value={metrics.byPriority.high}
                  total={metrics.totalTickets}
                  color="bg-amber-500"
                />
                <StatBar
                  label="Normal"
                  value={metrics.byPriority.normal}
                  total={metrics.totalTickets}
                  color="bg-blue-500"
                />
                <StatBar
                  label="Low"
                  value={metrics.byPriority.low}
                  total={metrics.totalTickets}
                  color="bg-gray-400"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* AI vs Human Handled */}
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base">AI vs Human Handled</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <StatBar
                  label="AI Handled"
                  value={metrics.aiHandledCount}
                  total={metrics.totalTickets}
                  color="bg-primary-500"
                />
                <StatBar
                  label="Human Handled"
                  value={metrics.humanHandledCount}
                  total={metrics.totalTickets}
                  color="bg-gray-500"
                />
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AI Efficiency</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {metrics.totalTickets > 0
                        ? `${((metrics.aiHandledCount / metrics.totalTickets) * 100).toFixed(0)}%`
                        : '--'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Agent Leaderboard */}
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Top Performers</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics/agents" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                  View All
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : metrics ? (
              <AgentLeaderboard agents={metrics.agentPerformance} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {metrics && (
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-muted/60 border border-border/60 rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {metrics.totalTickets}
                </p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
              <div className="text-center p-4 bg-muted/60 border border-border/60 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.byStatus.resolved}
                </p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <div className="text-center p-4 bg-muted/60 border border-border/60 rounded-lg">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {metrics.aiHandledCount}
                </p>
                <p className="text-sm text-muted-foreground">AI Handled</p>
              </div>
              <div className="text-center p-4 bg-muted/60 border border-border/60 rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {metrics.csat.average?.toFixed(1) || '--'}
                </p>
                <p className="text-sm text-muted-foreground">Avg CSAT</p>
              </div>
              <div className="text-center p-4 bg-muted/60 border border-border/60 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.sla.firstResponse.compliance ?? '--'}%
                </p>
                <p className="text-sm text-muted-foreground">First Response SLA</p>
              </div>
              <div className="text-center p-4 bg-muted/60 border border-border/60 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {metrics.byPriority.urgent + metrics.byStatus.escalated}
                </p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

