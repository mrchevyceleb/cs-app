'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const INVALIDATION_DELAY_MS = 400

const ALWAYS_INVALIDATE_KEYS = [
  ['tickets'],
  ['dashboard-tickets'],
  ['ticket-events'],
  ['metrics-bar'],
] as const

const COUNT_INVALIDATE_KEYS = [
  ['queue-counts'],
  ['ticket-count'],
] as const

type TicketRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: { queue_type?: string | null } | null
  new: { queue_type?: string | null } | null
}

/**
 * Keeps ticket-related UI in sync across the dashboard by reacting to
 * realtime changes in the tickets table and invalidating affected queries.
 */
export function TicketRealtimeSync() {
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingInvalidationKeysRef = useRef<Set<string>>(new Set())

  const flushInvalidations = useCallback(() => {
    invalidateTimerRef.current = null
    const keysToFlush = Array.from(pendingInvalidationKeysRef.current)
    pendingInvalidationKeysRef.current.clear()

    keysToFlush.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key], refetchType: 'active' })
    })
  }, [queryClient])

  const scheduleInvalidation = useCallback((queryKeys: readonly (readonly [string])[]) => {
    queryKeys.forEach(([key]) => {
      pendingInvalidationKeysRef.current.add(key)
    })

    if (invalidateTimerRef.current) return

    invalidateTimerRef.current = setTimeout(() => {
      flushInvalidations()
    }, INVALIDATION_DELAY_MS)
  }, [flushInvalidations])

  const shouldInvalidateCounts = useCallback((payload: TicketRealtimePayload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
      return true
    }

    if (payload.eventType === 'UPDATE') {
      return payload.old?.queue_type !== payload.new?.queue_type
    }

    return false
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-ticket-cache-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          scheduleInvalidation(ALWAYS_INVALIDATE_KEYS)

          if (shouldInvalidateCounts(payload as TicketRealtimePayload)) {
            scheduleInvalidation(COUNT_INVALIDATE_KEYS)
          }
        }
      )
      .subscribe()

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [supabase, scheduleInvalidation, shouldInvalidateCounts])

  return null
}
