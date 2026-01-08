'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200/70',
        className
      )}
    />
  )
}

export function TicketCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Name and badge */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Subject */}
          <Skeleton className="h-4 w-full max-w-[200px]" />

          {/* Preview */}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />

          {/* Tags and time */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TicketQueueSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TicketCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TicketDetailSkeleton() {
  return (
    <div className="flex h-full">
      {/* Messages area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 bg-gray-50">
          {/* Customer message */}
          <div className="flex justify-start">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-20 w-64 rounded-2xl rounded-bl-sm" />
            </div>
          </div>

          {/* AI message */}
          <div className="flex justify-end">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-32 w-72 rounded-2xl rounded-br-sm" />
            </div>
          </div>

          {/* Customer message */}
          <div className="flex justify-start">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-16 w-56 rounded-2xl rounded-bl-sm" />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Customer context sidebar */}
      <div className="w-72 border-l border-gray-100 bg-white p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-px w-full bg-gray-200" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function MetricsBarSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function KnowledgeBaseSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
