'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const INVALIDATION_DELAY_MS = 400

const QUERY_KEYS_TO_INVALIDATE = [
  ['tickets'],
  ['dashboard-tickets'],
  ['queue-counts'],
  ['ticket-count'],
  ['metrics-bar'],
] as const

/**
 * Keeps ticket-related UI in sync across the dashboard by reacting to
 * realtime changes in the tickets table and invalidating affected queries.
 */
export function TicketRealtimeSync() {
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushInvalidations = useCallback(() => {
    invalidateTimerRef.current = null

    QUERY_KEYS_TO_INVALIDATE.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
    })
  }, [queryClient])

  const scheduleInvalidation = useCallback(() => {
    if (invalidateTimerRef.current) return

    invalidateTimerRef.current = setTimeout(() => {
      flushInvalidations()
    }, INVALIDATION_DELAY_MS)
  }, [flushInvalidations])

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
        () => {
          scheduleInvalidation()
        }
      )
      .subscribe()

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [supabase, scheduleInvalidation])

  return null
}
