'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricsBar } from '@/components/dashboard'

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
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {value} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics')
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
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track support performance and AI efficiency
        </p>
      </div>

      {/* Key Metrics */}
      <MetricsBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tickets by Status */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
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
              <p className="text-sm text-gray-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Tickets by Priority */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
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
              <p className="text-sm text-gray-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* AI vs Human Handled */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
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
                    <span className="text-gray-600 dark:text-gray-400">AI Efficiency</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {metrics.totalTickets > 0
                        ? `${((metrics.aiHandledCount / metrics.totalTickets) * 100).toFixed(0)}%`
                        : '--'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Customer Satisfaction - Coming Soon */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" x2="9.01" y1="9" y2="9" />
                  <line x1="15" x2="15.01" y1="9" y2="9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Coming Soon
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Customer feedback collection will be added in a future update
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {metrics && (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.totalTickets}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tickets</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.byStatus.resolved}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {metrics.aiHandledCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI Handled</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {metrics.byPriority.urgent + metrics.byStatus.escalated}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
