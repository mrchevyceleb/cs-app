'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowRightLeft,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { TicketHandoffWithDetails } from '@/types/database'

interface HandoffBannerProps {
  className?: string
  onAccept?: (handoff: TicketHandoffWithDetails) => void
  onDecline?: (handoff: TicketHandoffWithDetails) => void
  onNavigateToTicket?: (ticketId: string) => void
}

const handoffQueryKey = ['pending-handoffs'] as const

export function HandoffBanner({
  className,
  onAccept,
  onDecline,
  onNavigateToTicket,
}: HandoffBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const pendingHandoffsQuery = useQuery({
    queryKey: handoffQueryKey,
    queryFn: async () => {
      const response = await fetch('/api/notifications?type=handoff&unread=true')
      if (!response.ok) return [] as TicketHandoffWithDetails[]

      const { notifications } = await response.json()

      const handoffIds = notifications
        .filter((n: { type: string }) => n.type === 'handoff')
        .map((n: { ticket_id: string | null }) => n.ticket_id)
        .filter(Boolean)

      if (handoffIds.length === 0) {
        return []
      }

      const handoffPromises = handoffIds.map(async (ticketId: string) => {
        const res = await fetch(`/api/tickets/${ticketId}/handoff?status=pending`)
        if (!res.ok) return null
        const { handoffs } = await res.json()
        return handoffs?.[0] || null
      })

      const handoffs = (await Promise.all(handoffPromises)).filter(Boolean)
      return handoffs as TicketHandoffWithDetails[]
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    staleTime: 15 * 1000,
  })

  const updateHandoffMutation = useMutation({
    mutationFn: async ({ handoffId, status }: { handoffId: string; status: 'accepted' | 'declined' }) => {
      const response = await fetch(`/api/handoffs/${handoffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update handoff')
      }
    },
    onMutate: ({ handoffId }) => {
      const previous = queryClient.getQueryData<TicketHandoffWithDetails[]>(handoffQueryKey)

      queryClient.setQueryData<TicketHandoffWithDetails[]>(handoffQueryKey, (old = []) =>
        old.filter((handoff) => handoff.id !== handoffId)
      )

      return { previous }
    },
    onError: (error, _payload, context) => {
      console.error('Failed to update handoff:', error)
      if (context?.previous) {
        queryClient.setQueryData(handoffQueryKey, context.previous)
      }
    },
  })

  const pendingHandoffs = pendingHandoffsQuery.data || []

  const handleAccept = (handoff: TicketHandoffWithDetails) => {
    setProcessingId(handoff.id)
    updateHandoffMutation.mutate(
      { handoffId: handoff.id, status: 'accepted' },
      {
        onSuccess: () => {
          onAccept?.(handoff)
        },
        onSettled: () => {
          setProcessingId(null)
        },
      }
    )
  }

  const handleDecline = (handoff: TicketHandoffWithDetails) => {
    setProcessingId(handoff.id)
    updateHandoffMutation.mutate(
      { handoffId: handoff.id, status: 'declined' },
      {
        onSuccess: () => {
          onDecline?.(handoff)
        },
        onSettled: () => {
          setProcessingId(null)
        },
      }
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (pendingHandoffs.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-800 dark:text-amber-200">
            Pending Handoffs
          </span>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200">
            {pendingHandoffs.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
      </button>

      {/* Handoff List */}
      {isExpanded && (
        <div className="border-t border-amber-200 dark:border-amber-700 divide-y divide-amber-200 dark:divide-amber-700">
          {pendingHandoffs.map((handoff) => {
            const isProcessing = processingId === handoff.id

            return (
              <div
                key={handoff.id}
                className="p-3 bg-white/50 dark:bg-gray-900/30"
              >
                {/* From Agent */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={handoff.from_agent?.avatar_url || ''} />
                    <AvatarFallback className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      {handoff.from_agent?.name ? getInitials(handoff.from_agent.name) : 'AG'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {handoff.from_agent?.name || 'An agent'}
                      </span>{' '}
                      wants to hand off a ticket to you
                    </p>

                    {/* Ticket Info */}
                    <button
                      onClick={() => onNavigateToTicket?.(handoff.ticket_id)}
                      className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline mt-1 block truncate text-left"
                    >
                      {handoff.ticket?.subject || `Ticket ${handoff.ticket_id.slice(0, 8)}...`}
                    </button>

                    {/* Reason */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">Reason:</span> {handoff.reason}
                    </p>

                    {/* Notes */}
                    {handoff.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
                        {handoff.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 ml-11">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(handoff)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(handoff)}
                    disabled={isProcessing}
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
