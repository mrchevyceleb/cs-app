'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const INVALIDATION_DELAY_MS = 500
const MIN_ACTIVE_REFETCH_INTERVAL_MS = 2500

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
  const lastFlushAtRef = useRef(0)
  const pendingInvalidationKeysRef = useRef<Set<string>>(new Set())

  const flushInvalidations = useCallback(function flushInvalidations() {
    invalidateTimerRef.current = null
    const now = Date.now()
    const elapsedSinceLastFlush = now - lastFlushAtRef.current

    if (elapsedSinceLastFlush < MIN_ACTIVE_REFETCH_INTERVAL_MS) {
      invalidateTimerRef.current = setTimeout(() => {
        flushInvalidations()
      }, MIN_ACTIVE_REFETCH_INTERVAL_MS - elapsedSinceLastFlush)
      return
    }

    const keysToFlush = Array.from(pendingInvalidationKeysRef.current)
    pendingInvalidationKeysRef.current.clear()
    lastFlushAtRef.current = now

    keysToFlush.forEach((key) => {
      queryClient.invalidateQueries(
        { queryKey: [key], refetchType: 'active' },
        // Avoid cancelling in-flight requests; repeated realtime events can otherwise
        // starve the initial load and keep the UI in a permanent loading state.
        { cancelRefetch: false }
      )
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
