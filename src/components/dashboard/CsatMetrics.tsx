'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface CsatMetricsProps {
  data: CsatData
  className?: string
}

// Star rating display component
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn(
            sizeClasses[size],
            star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'
          )}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

// Trend indicator component
function TrendIndicator({ trend }: { trend: number | null }) {
  if (trend === null) {
    return <span className="text-xs text-muted-foreground">No previous data</span>
  }

  const isPositive = trend >= 0
  const Icon = isPositive ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )

  return (
    <span
      className={cn(
        'flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      {Icon}
      {Math.abs(trend)}%
    </span>
  )
}

// Distribution bar component
function DistributionBar({ distribution, total }: { distribution: Record<number, number>; total: number }) {
  const ratings = [5, 4, 3, 2, 1]
  const colors = {
    5: 'bg-emerald-500',
    4: 'bg-emerald-400',
    3: 'bg-amber-400',
    2: 'bg-orange-400',
    1: 'bg-red-400',
  }

  return (
    <div className="space-y-2">
      {ratings.map((rating) => {
        const count = distribution[rating] || 0
        const percentage = total > 0 ? (count / total) * 100 : 0

        return (
          <div key={rating} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-12">{rating} star</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', colors[rating as keyof typeof colors])}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function CsatMetrics({ data, className }: CsatMetricsProps) {
  const hasData = data.total > 0

  return (
    <Card className={cn('bg-card border-border/70', className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Customer Satisfaction</span>
          {hasData && <TrendIndicator trend={data.trend} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
        <div className="text-center py-8">
          <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-muted flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-muted-foreground"
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
          <p className="text-sm font-medium text-foreground mb-1">No feedback yet</p>
          <p className="text-xs text-muted-foreground">
            Feedback will appear here once customers submit ratings
          </p>
        </div>
        ) : (
          <div className="space-y-6">
            {/* Average Score */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {data.average?.toFixed(1) ?? '--'}
                </p>
                <StarRating rating={Math.round(data.average || 0)} size="md" />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {data.total} {data.total === 1 ? 'response' : 'responses'}
                </p>
              </div>
            </div>

            {/* Distribution */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Rating Distribution</p>
              <DistributionBar distribution={data.distribution} total={data.total} />
            </div>

            {/* Recent Feedback */}
            {data.recentFeedback.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Recent Feedback</p>
                <div className="space-y-3">
                  {data.recentFeedback.slice(0, 3).map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 bg-muted/60 border border-border/60 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <StarRating rating={fb.rating} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(fb.submitted_at)}
                        </span>
                      </div>
                      {fb.comment && (
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          "{fb.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CsatMetrics

