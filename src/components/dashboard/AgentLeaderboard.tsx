'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface AgentPerformanceSummary {
  agent_id: string
  agent_name: string
  agent_email: string
  avatar_url: string | null
  status: 'online' | 'away' | 'offline'
  total_tickets_handled: number
  tickets_resolved: number
  resolution_rate: number
  sla_compliance: number
  avg_csat_rating: number | null
  avg_first_response_minutes: number | null
  avg_resolution_hours: number | null
  rank?: number
}

interface AgentsPerformanceResponse {
  agents: AgentPerformanceSummary[]
  team_summary: {
    total_agents: number
    total_tickets: number
    total_resolved: number
    avg_resolution_rate: number
    avg_sla_compliance: number
    avg_csat: number | null
  }
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

type SortField = 'tickets' | 'resolved' | 'resolution_rate' | 'sla' | 'csat' | 'response_time' | 'resolution_time'

interface AgentLeaderboardProps {
  className?: string
  showFilters?: boolean
  initialPeriod?: '7' | '30' | 'all'
  initialSort?: SortField
  limit?: number
}

// Icons
const Icons = {
  trophy: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  medal: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
      <path d="M11 12 5.12 2.2" />
      <path d="m13 12 5.88-9.8" />
      <path d="M8 7h8" />
      <circle cx="12" cy="17" r="5" />
      <path d="M12 18v-2h-.5" />
    </svg>
  ),
  arrowUp: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  ),
  arrowDown: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  ),
  chevronLeft: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  chevronRight: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  star: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
}

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-gray-400',
}

const rankBadgeColors = {
  1: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30',
  2: 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-400/30',
  3: 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg shadow-amber-700/30',
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
          rankBadgeColors[rank as 1 | 2 | 3]
        )}
      >
        {rank}
      </div>
    )
  }

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
      {rank}
    </div>
  )
}

function formatTime(minutes: number | null): string {
  if (minutes === null) return '--'
  if (minutes < 60) return `${Math.round(minutes)}m`
  return `${(minutes / 60).toFixed(1)}h`
}

function formatHours(hours: number | null): string {
  if (hours === null) return '--'
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function getPerformanceColor(value: number, thresholds: { good: number; warning: number }) {
  if (value >= thresholds.good) return 'text-emerald-600 dark:text-emerald-400'
  if (value >= thresholds.warning) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'resolved', label: 'Tickets Resolved' },
  { value: 'tickets', label: 'Tickets Handled' },
  { value: 'resolution_rate', label: 'Resolution Rate' },
  { value: 'sla', label: 'SLA Compliance' },
  { value: 'csat', label: 'CSAT Rating' },
  { value: 'response_time', label: 'Response Time' },
  { value: 'resolution_time', label: 'Resolution Time' },
]

type TimePeriod = '7' | '30' | 'all'

export function AgentLeaderboard({
  className,
  showFilters = true,
  initialPeriod = '30',
  initialSort = 'resolved',
  limit = 10,
}: AgentLeaderboardProps) {
  const [data, setData] = useState<AgentsPerformanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>(initialPeriod)
  const [sortBy, setSortBy] = useState<SortField>(initialSort)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          period,
          sort: sortBy,
          order: sortOrder,
          page: page.toString(),
          limit: limit.toString(),
        })

        const response = await fetch(`/api/agents/performance?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch agent performance')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Failed to fetch agent performance:', err)
        setError('Failed to load leaderboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [period, sortBy, sortOrder, page, limit])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  if (isLoading) {
    return (
      <Card className={cn('bg-card border-border/70', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-500">{Icons.trophy}</span>
            Agent Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className={cn('bg-card border-border/70', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-500">{Icons.trophy}</span>
            Agent Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
            {error || 'No data available'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-card border-border/70', className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-500">{Icons.trophy}</span>
            Agent Leaderboard
          </CardTitle>
          {showFilters && (
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[100px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
                <SelectTrigger className="w-[150px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
                className="px-2"
              >
                {sortOrder === 'desc' ? Icons.arrowDown : Icons.arrowUp}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Team Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.team_summary.total_agents}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.team_summary.total_tickets}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tickets</p>
          </div>
          <div className="text-center">
            <p className={cn(
              'text-2xl font-bold',
              getPerformanceColor(data.team_summary.avg_resolution_rate, { good: 80, warning: 60 })
            )}>
              {data.team_summary.avg_resolution_rate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Resolution</p>
          </div>
          <div className="text-center">
            <p className={cn(
              'text-2xl font-bold',
              getPerformanceColor(data.team_summary.avg_sla_compliance, { good: 90, warning: 70 })
            )}>
              {data.team_summary.avg_sla_compliance}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg SLA</p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 py-3 pr-2">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2">
                  Agent
                </th>
                <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2">
                  Tickets
                </th>
                <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2">
                  Resolved
                </th>
                <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2 hidden sm:table-cell">
                  Rate
                </th>
                <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2 hidden md:table-cell">
                  SLA
                </th>
                <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2 hidden lg:table-cell">
                  CSAT
                </th>
                <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-3 px-2 hidden lg:table-cell">
                  Resp Time
                </th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map((agent) => (
                <tr
                  key={agent.agent_id}
                  className={cn(
                    'border-b border-gray-50 dark:border-gray-800/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30',
                    agent.rank && agent.rank <= 3 && 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10'
                  )}
                >
                  <td className="py-3 pr-2">
                    <RankBadge rank={agent.rank || 0} />
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          {agent.avatar_url && (
                            <AvatarImage src={agent.avatar_url} alt={agent.agent_name} />
                          )}
                          <AvatarFallback className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-medium text-sm">
                            {getInitials(agent.agent_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900',
                            statusColors[agent.status]
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {agent.agent_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {agent.agent_email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {agent.total_tickets_handled}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {agent.tickets_resolved}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center hidden sm:table-cell">
                    <span className={cn(
                      'text-sm font-medium',
                      getPerformanceColor(agent.resolution_rate, { good: 80, warning: 60 })
                    )}>
                      {agent.resolution_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center hidden md:table-cell">
                    <span className={cn(
                      'text-sm font-medium',
                      getPerformanceColor(agent.sla_compliance, { good: 90, warning: 70 })
                    )}>
                      {agent.sla_compliance}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center hidden lg:table-cell">
                    {agent.avg_csat_rating !== null ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-amber-500">{Icons.star}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {agent.avg_csat_rating.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center hidden lg:table-cell">
                    <span className={cn(
                      'text-sm font-medium',
                      agent.avg_first_response_minutes !== null
                        ? agent.avg_first_response_minutes <= 30
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : agent.avg_first_response_minutes <= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500'
                    )}>
                      {formatTime(agent.avg_first_response_minutes)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} agents
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {Icons.chevronLeft}
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {data.pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.total_pages, p + 1))}
                disabled={page === data.pagination.total_pages}
              >
                {Icons.chevronRight}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

