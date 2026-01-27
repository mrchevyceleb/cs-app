'use client'

/**
 * RealtimeContext
 * Global context for managing Supabase Realtime subscriptions
 * Handles typing indicators, read receipts, and presence
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import type { TypingBroadcast, ReadReceiptBroadcast } from '@/types/database'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TypingUser {
  typer_type: 'customer' | 'agent'
  typer_id: string
  typer_name: string | null
  started_at: number
}

interface RealtimeContextValue {
  // Typing indicators
  typingUsers: Map<string, TypingUser[]> // Map of ticketId -> typing users
  startTyping: (ticketId: string, userId: string, userType: 'customer' | 'agent', userName?: string) => void
  stopTyping: (ticketId: string, userId: string, userType: 'customer' | 'agent') => void
  getTypingUsers: (ticketId: string) => TypingUser[]

  // Read receipts
  markAsRead: (ticketId: string, messageId: string, readerId: string, readerType: 'customer' | 'agent') => void

  // Subscription management
  subscribeToTicket: (ticketId: string) => void
  unsubscribeFromTicket: (ticketId: string) => void

  // Agent presence
  updatePresence: (agentId: string, ticketId?: string) => void

  // Connection status
  isConnected: boolean
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

interface RealtimeProviderProps {
  children: React.ReactNode
  currentUserId?: string
  currentUserType?: 'customer' | 'agent'
  currentUserName?: string
}

export function RealtimeProvider({
  children,
  currentUserId,
  currentUserType,
  currentUserName,
}: RealtimeProviderProps) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup expired typing indicators
  const cleanupExpiredTyping = useCallback(() => {
    const now = Date.now()
    const TIMEOUT_MS = 5000

    setTypingUsers(prev => {
      const newMap = new Map(prev)
      let changed = false

      newMap.forEach((users, ticketId) => {
        const filtered = users.filter(u => now - u.started_at < TIMEOUT_MS)
        if (filtered.length !== users.length) {
          newMap.set(ticketId, filtered)
          changed = true
        }
      })

      return changed ? newMap : prev
    })
  }, [])

  // Start cleanup interval
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(cleanupExpiredTyping, 1000)
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [cleanupExpiredTyping])

  // Handle typing broadcast
  const handleTypingBroadcast = useCallback((ticketId: string, payload: TypingBroadcast) => {
    // Ignore own broadcasts
    if (
      currentUserId &&
      payload.typer_id === currentUserId &&
      payload.typer_type === currentUserType
    ) {
      return
    }

    setTypingUsers(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(ticketId) || []

      // Remove this user first
      const filtered = current.filter(
        u => !(u.typer_id === payload.typer_id && u.typer_type === payload.typer_type)
      )

      // Add back if typing
      if (payload.is_typing) {
        filtered.push({
          typer_type: payload.typer_type,
          typer_id: payload.typer_id,
          typer_name: payload.typer_name,
          started_at: Date.now(),
        })
      }

      newMap.set(ticketId, filtered)
      return newMap
    })
  }, [currentUserId, currentUserType])

  // Subscribe to a ticket's realtime channel
  const subscribeToTicket = useCallback((ticketId: string) => {
    if (channelsRef.current.has(ticketId)) return

    const channel = supabase.channel(`ticket:${ticketId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        handleTypingBroadcast(ticketId, payload as TypingBroadcast)
      })
      .on('broadcast', { event: 'read' }, ({ payload }) => {
        // Read receipt broadcasts can be handled here if needed
        console.log('Read receipt:', payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    channelsRef.current.set(ticketId, channel)
  }, [handleTypingBroadcast])

  // Unsubscribe from a ticket's channel
  const unsubscribeFromTicket = useCallback((ticketId: string) => {
    const channel = channelsRef.current.get(ticketId)
    if (channel) {
      channel.unsubscribe()
      channelsRef.current.delete(ticketId)
    }

    // Clear any typing timeouts for this ticket
    const timeoutKey = `${ticketId}:${currentUserId}:${currentUserType}`
    const timeout = typingTimeoutsRef.current.get(timeoutKey)
    if (timeout) {
      clearTimeout(timeout)
      typingTimeoutsRef.current.delete(timeoutKey)
    }
  }, [currentUserId, currentUserType])

  // Start typing indicator
  const startTyping = useCallback((
    ticketId: string,
    userId: string,
    userType: 'customer' | 'agent',
    userName?: string
  ) => {
    const channel = channelsRef.current.get(ticketId)
    if (!channel) return

    const payload: TypingBroadcast = {
      ticket_id: ticketId,
      typer_type: userType,
      typer_id: userId,
      typer_name: userName || null,
      is_typing: true,
    }

    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload,
    })

    // Clear existing timeout and set new one
    const timeoutKey = `${ticketId}:${userId}:${userType}`
    const existing = typingTimeoutsRef.current.get(timeoutKey)
    if (existing) {
      clearTimeout(existing)
    }

    // Auto-stop after 5 seconds
    const timeout = setTimeout(() => {
      stopTyping(ticketId, userId, userType)
    }, 5000)
    typingTimeoutsRef.current.set(timeoutKey, timeout)
  }, [])

  // Stop typing indicator
  const stopTyping = useCallback((
    ticketId: string,
    userId: string,
    userType: 'customer' | 'agent'
  ) => {
    const channel = channelsRef.current.get(ticketId)
    if (!channel) return

    const payload: TypingBroadcast = {
      ticket_id: ticketId,
      typer_type: userType,
      typer_id: userId,
      typer_name: null,
      is_typing: false,
    }

    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload,
    })

    // Clear timeout
    const timeoutKey = `${ticketId}:${userId}:${userType}`
    const existing = typingTimeoutsRef.current.get(timeoutKey)
    if (existing) {
      clearTimeout(existing)
      typingTimeoutsRef.current.delete(timeoutKey)
    }
  }, [])

  // Get typing users for a ticket
  const getTypingUsers = useCallback((ticketId: string): TypingUser[] => {
    return typingUsers.get(ticketId) || []
  }, [typingUsers])

  // Mark messages as read (broadcasts to channel)
  const markAsRead = useCallback((
    ticketId: string,
    messageId: string,
    readerId: string,
    readerType: 'customer' | 'agent'
  ) => {
    const channel = channelsRef.current.get(ticketId)
    if (!channel) return

    const payload: ReadReceiptBroadcast = {
      ticket_id: ticketId,
      reader_type: readerType,
      reader_id: readerId,
      last_read_message_id: messageId,
      read_at: new Date().toISOString(),
    }

    channel.send({
      type: 'broadcast',
      event: 'read',
      payload,
    })

    // Also persist to database
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_id: ticketId,
        message_id: messageId,
        reader_type: readerType,
        reader_id: readerId,
      }),
    }).catch(console.error)
  }, [])

  // Update agent presence
  const updatePresence = useCallback(async (agentId: string, ticketId?: string) => {
    try {
      await fetch('/api/agents/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          current_ticket_id: ticketId || null,
        }),
      })
    } catch (error) {
      console.error('Failed to update presence:', error)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all channels
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe()
      })
      channelsRef.current.clear()

      // Clear all timeouts
      typingTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      typingTimeoutsRef.current.clear()
    }
  }, [])

  const value: RealtimeContextValue = {
    typingUsers,
    startTyping,
    stopTyping,
    getTypingUsers,
    markAsRead,
    subscribeToTicket,
    unsubscribeFromTicket,
    updatePresence,
    isConnected,
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

// Hook for typing indicator in a specific ticket
export function useTicketTyping(ticketId: string | undefined) {
  const { getTypingUsers, subscribeToTicket, unsubscribeFromTicket, startTyping, stopTyping } = useRealtime()

  useEffect(() => {
    if (ticketId) {
      subscribeToTicket(ticketId)
      return () => unsubscribeFromTicket(ticketId)
    }
  }, [ticketId, subscribeToTicket, unsubscribeFromTicket])

  const typingUsers = ticketId ? getTypingUsers(ticketId) : []

  return {
    typingUsers,
    startTyping: (userId: string, userType: 'customer' | 'agent', userName?: string) =>
      ticketId && startTyping(ticketId, userId, userType, userName),
    stopTyping: (userId: string, userType: 'customer' | 'agent') =>
      ticketId && stopTyping(ticketId, userId, userType),
  }
}

// Format typing indicator text
export function formatTypingIndicator(typingUsers: TypingUser[]): string | null {
  if (typingUsers.length === 0) return null

  const names = typingUsers
    .map(u => u.typer_name || (u.typer_type === 'agent' ? 'Support' : 'Someone'))
    .slice(0, 3)

  if (names.length === 1) {
    return `${names[0]} is typing...`
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`
  } else {
    return `${names[0]}, ${names[1]}, and others are typing...`
  }
}
