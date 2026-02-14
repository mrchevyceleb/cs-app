'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentPerformanceCard } from '@/components/dashboard/AgentPerformanceCard'
import { AgentLeaderboard } from '@/components/dashboard/AgentLeaderboard'

interface Agent {
  id: string
  name: string
  email: string
  avatar_url: string | null
  status: 'online' | 'away' | 'offline'
}

interface TeamSummary {
  total_agents: number
  total_tickets: number
  total_resolved: number
  avg_resolution_rate: number
  avg_csat: number | null
  online_agents: number
  away_agents: number
  offline_agents: number
}

// Icons
const Icons = {
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ticket: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    </svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  star: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  activity: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
}

function SummaryCard({
  icon,
  label,
  value,
  subValue,
  iconColor = 'text-primary-600 dark:text-primary-400',
  iconBg = 'bg-primary-100 dark:bg-primary-900/50',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  iconColor?: string
  iconBg?: string
}) {
  return (
    <Card className="bg-card border-border/70">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${iconBg} ${iconColor}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subValue && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AgentStatusIndicator({ online, away, offline }: { online: number; away: number; offline: number }) {
  const total = online + away + offline
  if (total === 0) return null

  const onlinePercent = (online / total) * 100
  const awayPercent = (away / total) * 100
  const offlinePercent = (offline / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${onlinePercent}%` }}
        />
        <div
          className="bg-amber-500 transition-all duration-300"
          style={{ width: `${awayPercent}%` }}
        />
        <div
          className="bg-gray-400 transition-all duration-300"
          style={{ width: `${offlinePercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Online ({online})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Away ({away})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Offline ({offline})
        </span>
      </div>
    </div>
  )
}

export default function AgentsAnalyticsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [viewMode, setViewMode] = useState<'cards' | 'leaderboard'>('leaderboard')

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Fetch agents performance data which includes team summary
        const response = await fetch(`/api/agents/performance?period=${period}&limit=100`)
        if (response.ok) {
          const data = await response.json()

          // Extract agents list
          const agentsList = data.agents.map((a: { agent_id: string; agent_name: string; agent_email: string; avatar_url: string | null; status: 'online' | 'away' | 'offline' }) => ({
            id: a.agent_id,
            name: a.agent_name,
            email: a.agent_email,
            avatar_url: a.avatar_url,
            status: a.status,
          }))
          setAgents(agentsList)

          // Calculate status counts
          const onlineAgents = agentsList.filter((a: Agent) => a.status === 'online').length
          const awayAgents = agentsList.filter((a: Agent) => a.status === 'away').length
          const offlineAgents = agentsList.filter((a: Agent) => a.status === 'offline').length

          setTeamSummary({
            ...data.team_summary,
            online_agents: onlineAgents,
            away_agents: awayAgents,
            offline_agents: offlineAgents,
          })
        }
      } catch (error) {
        console.error('Failed to fetch agents data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [period])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent Performance
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor and compare agent productivity and metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'leaderboard')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leaderboard">Leaderboard</SelectItem>
              <SelectItem value="cards">Card View</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/70">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teamSummary ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={Icons.users}
              label="Total Agents"
              value={teamSummary.total_agents}
              subValue={`${teamSummary.online_agents} online`}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-100 dark:bg-blue-900/50"
            />
            <SummaryCard
              icon={Icons.ticket}
              label="Total Tickets"
              value={teamSummary.total_tickets}
              subValue={`${teamSummary.total_resolved} resolved`}
            />
            <SummaryCard
              icon={Icons.check}
              label="Avg Resolution Rate"
              value={`${teamSummary.avg_resolution_rate}%`}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
            />
          </div>

          {/* Agent Status Overview */}
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-primary-600 dark:text-primary-400">{Icons.activity}</span>
                Agent Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgentStatusIndicator
                online={teamSummary.online_agents}
                away={teamSummary.away_agents}
                offline={teamSummary.offline_agents}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Main Content - Leaderboard or Cards */}
      {viewMode === 'leaderboard' ? (
        <AgentLeaderboard
          initialPeriod={period as '7' | '30' | 'all'}
          showFilters={false}
          limit={20}
        />
      ) : (
        <>
          {/* Agent Performance Cards Grid */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Individual Performance
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-card border-border/70">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : agents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <AgentPerformanceCard
                    key={agent.id}
                    agentId={agent.id}
                    initialPeriod={period as '7' | '30' | 'all'}
                    showPeriodSelector={false}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border/70">
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      {Icons.users}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      No agents found. Add agents to see their performance metrics.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Performance Tips */}
      <Card className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-100 dark:border-primary-800/50">
        <CardContent className="py-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Performance Insights
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">&#x2713;</span>
              <span>
                <strong>Resolution Rate:</strong> Aim for 80%+ resolution rate. Low rates may indicate complex issues or training needs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">&#x2713;</span>
              <span>
                <strong>SLA Compliance:</strong> Target 90%+ compliance. Breaches may require workload balancing or process improvements.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">&#x2713;</span>
              <span>
                <strong>Response Time:</strong> First response within 30 minutes significantly improves customer satisfaction.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">&#x2713;</span>
              <span>
                <strong>CSAT Ratings:</strong> Agents with 4.5+ ratings demonstrate excellent customer handling skills.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

