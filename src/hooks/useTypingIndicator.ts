/**
 * useTypingIndicator Hook
 * Real-time typing indicator using Supabase Broadcast
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { TypingBroadcast } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SB_URL!,
  process.env.NEXT_PUBLIC_SB_ANON_KEY!
);

interface TypingUser {
  typer_type: 'customer' | 'agent';
  typer_id: string;
  typer_name: string | null;
  started_at: number;
}

interface UseTypingIndicatorOptions {
  ticketId: string;
  currentUserId: string;
  currentUserType: 'customer' | 'agent';
  currentUserName?: string | null;
  debounceMs?: number;
  timeoutMs?: number;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useTypingIndicator({
  ticketId,
  currentUserId,
  currentUserType,
  currentUserName = null,
  debounceMs = 500,
  timeoutMs = 5000,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Channel name for this ticket's typing indicators
  const channelName = `typing:${ticketId}`;

  // Clean up expired typing users
  const cleanupExpiredUsers = useCallback(() => {
    const now = Date.now();
    setTypingUsers(prev =>
      prev.filter(user => now - user.started_at < timeoutMs)
    );
  }, [timeoutMs]);

  // Broadcast typing status
  const broadcastTyping = useCallback((typing: boolean) => {
    if (!channelRef.current) return;

    const now = Date.now();
    // Debounce broadcasts
    if (typing && now - lastBroadcastRef.current < debounceMs) {
      return;
    }

    const payload: TypingBroadcast = {
      ticket_id: ticketId,
      typer_type: currentUserType,
      typer_id: currentUserId,
      typer_name: currentUserName,
      is_typing: typing,
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload,
    });

    lastBroadcastRef.current = now;
  }, [ticketId, currentUserId, currentUserType, currentUserName, debounceMs]);

  // Start typing indicator
  const startTyping = useCallback(() => {
    setIsTyping(true);
    broadcastTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop after timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, timeoutMs);
  }, [broadcastTyping, timeoutMs]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce stop to avoid flickering
    debounceTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }, 200);
  }, [broadcastTyping]);

  // Handle incoming typing broadcasts
  const handleTypingBroadcast = useCallback((payload: TypingBroadcast) => {
    // Ignore own broadcasts
    if (payload.typer_id === currentUserId && payload.typer_type === currentUserType) {
      return;
    }

    setTypingUsers(prev => {
      // Remove this user first
      const filtered = prev.filter(
        u => !(u.typer_id === payload.typer_id && u.typer_type === payload.typer_type)
      );

      // Add back if typing
      if (payload.is_typing) {
        return [
          ...filtered,
          {
            typer_type: payload.typer_type,
            typer_id: payload.typer_id,
            typer_name: payload.typer_name,
            started_at: Date.now(),
          },
        ];
      }

      return filtered;
    });
  }, [currentUserId, currentUserType]);

  // Subscribe to typing channel
  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        handleTypingBroadcast(payload as TypingBroadcast);
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup interval for expired typing users
    const cleanupInterval = setInterval(cleanupExpiredUsers, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      clearInterval(cleanupInterval);

      // Broadcast stop typing before unsubscribing
      if (isTyping && channelRef.current) {
        broadcastTyping(false);
      }

      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, handleTypingBroadcast, cleanupExpiredUsers, isTyping, broadcastTyping]);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
  };
}

// Utility to format typing indicator text
export function formatTypingText(typingUsers: TypingUser[]): string | null {
  if (typingUsers.length === 0) return null;

  const names = typingUsers
    .map(u => u.typer_name || (u.typer_type === 'agent' ? 'Support' : 'Customer'))
    .slice(0, 3);

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  } else {
    return `${names[0]}, ${names[1]}, and others are typing...`;
  }
}
