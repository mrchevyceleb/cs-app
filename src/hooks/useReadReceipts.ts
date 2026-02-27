/**
 * useReadReceipts Hook
 * Track and broadcast read receipts for messages
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { ReadReceiptBroadcast, MessageReadReceipt } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SB_URL!,
  process.env.NEXT_PUBLIC_SB_ANON_KEY!
);

interface UseReadReceiptsOptions {
  ticketId: string;
  currentUserId: string;
  currentUserType: 'customer' | 'agent';
}

interface ReadStatus {
  [messageId: string]: {
    read_by_customer: boolean;
    read_by_agents: string[];
    read_at: string | null;
  };
}

interface UseReadReceiptsReturn {
  readStatus: ReadStatus;
  markAsRead: (messageIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: number;
}

export function useReadReceipts({
  ticketId,
  currentUserId,
  currentUserType,
}: UseReadReceiptsOptions): UseReadReceiptsReturn {
  const [readStatus, setReadStatus] = useState<ReadStatus>({});
  const [unreadCount, setUnreadCount] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelName = `receipts:${ticketId}`;

  // Load initial read receipts
  useEffect(() => {
    const loadReadReceipts = async () => {
      const { data: receipts } = await supabase
        .from('message_read_receipts')
        .select('message_id, reader_type, reader_id, read_at')
        .eq('message_id', ticketId); // This should be a join query

      // Actually we need to get receipts for all messages in this ticket
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('ticket_id', ticketId);

      if (!messages) return;

      const messageIds = messages.map(m => m.id);

      const { data: allReceipts } = await supabase
        .from('message_read_receipts')
        .select('*')
        .in('message_id', messageIds);

      if (!allReceipts) return;

      // Build read status map
      const status: ReadStatus = {};
      for (const msg of messages) {
        const msgReceipts = allReceipts.filter(r => r.message_id === msg.id);
        status[msg.id] = {
          read_by_customer: msgReceipts.some(r => r.reader_type === 'customer'),
          read_by_agents: msgReceipts
            .filter(r => r.reader_type === 'agent')
            .map(r => r.reader_id),
          read_at: msgReceipts.find(r =>
            r.reader_type === currentUserType && r.reader_id === currentUserId
          )?.read_at || null,
        };
      }

      setReadStatus(status);
    };

    loadReadReceipts();
  }, [ticketId, currentUserId, currentUserType]);

  // Calculate unread count
  useEffect(() => {
    const calculateUnread = async () => {
      const { count } = await supabase.rpc('get_unread_count', {
        p_ticket_id: ticketId,
        p_reader_type: currentUserType,
        p_reader_id: currentUserId,
      });

      setUnreadCount(count || 0);
    };

    calculateUnread();
  }, [ticketId, currentUserId, currentUserType, readStatus]);

  // Mark specific messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    // Insert read receipts
    const receipts = messageIds.map(messageId => ({
      message_id: messageId,
      reader_type: currentUserType,
      reader_id: currentUserId,
    }));

    const { error } = await supabase
      .from('message_read_receipts')
      .upsert(receipts, {
        onConflict: 'message_id,reader_type,reader_id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('Failed to mark messages as read:', error);
      return;
    }

    // Update local state
    const now = new Date().toISOString();
    setReadStatus(prev => {
      const updated = { ...prev };
      for (const msgId of messageIds) {
        if (!updated[msgId]) {
          updated[msgId] = {
            read_by_customer: currentUserType === 'customer',
            read_by_agents: currentUserType === 'agent' ? [currentUserId] : [],
            read_at: now,
          };
        } else {
          if (currentUserType === 'customer') {
            updated[msgId].read_by_customer = true;
          } else {
            if (!updated[msgId].read_by_agents.includes(currentUserId)) {
              updated[msgId].read_by_agents.push(currentUserId);
            }
          }
          updated[msgId].read_at = now;
        }
      }
      return updated;
    });

    // Broadcast read receipt
    if (channelRef.current) {
      const payload: ReadReceiptBroadcast = {
        ticket_id: ticketId,
        reader_type: currentUserType,
        reader_id: currentUserId,
        last_read_message_id: messageIds[messageIds.length - 1],
        read_at: now,
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'read',
        payload,
      });
    }
  }, [ticketId, currentUserId, currentUserType]);

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    const { data: count } = await supabase.rpc('mark_messages_read', {
      p_ticket_id: ticketId,
      p_reader_type: currentUserType,
      p_reader_id: currentUserId,
    });

    if (count && count > 0) {
      // Refresh read status
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('ticket_id', ticketId);

      if (messages) {
        const now = new Date().toISOString();
        setReadStatus(prev => {
          const updated = { ...prev };
          for (const msg of messages) {
            if (!updated[msg.id]) {
              updated[msg.id] = {
                read_by_customer: currentUserType === 'customer',
                read_by_agents: currentUserType === 'agent' ? [currentUserId] : [],
                read_at: now,
              };
            } else {
              if (currentUserType === 'customer') {
                updated[msg.id].read_by_customer = true;
              } else if (!updated[msg.id].read_by_agents.includes(currentUserId)) {
                updated[msg.id].read_by_agents.push(currentUserId);
              }
              updated[msg.id].read_at = now;
            }
          }
          return updated;
        });

        setUnreadCount(0);
      }
    }
  }, [ticketId, currentUserId, currentUserType]);

  // Handle incoming read receipt broadcasts
  const handleReadBroadcast = useCallback((payload: ReadReceiptBroadcast) => {
    // Update local state based on broadcast
    setReadStatus(prev => {
      const updated = { ...prev };
      const msgId = payload.last_read_message_id;

      if (!updated[msgId]) {
        updated[msgId] = {
          read_by_customer: payload.reader_type === 'customer',
          read_by_agents: payload.reader_type === 'agent' ? [payload.reader_id] : [],
          read_at: payload.read_at,
        };
      } else {
        if (payload.reader_type === 'customer') {
          updated[msgId].read_by_customer = true;
        } else if (!updated[msgId].read_by_agents.includes(payload.reader_id)) {
          updated[msgId].read_by_agents.push(payload.reader_id);
        }
      }

      return updated;
    });
  }, []);

  // Subscribe to read receipt channel
  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'read' }, ({ payload }) => {
        handleReadBroadcast(payload as ReadReceiptBroadcast);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, handleReadBroadcast]);

  return {
    readStatus,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}

// Component to observe message visibility and auto-mark as read
export function useMessageVisibility(
  messageId: string,
  onVisible: () => void,
  options: { threshold?: number; delay?: number } = {}
) {
  const { threshold = 0.5, delay = 1000 } = options;
  const elementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && !hasTriggeredRef.current) {
          // Start timer when message becomes visible
          timeoutRef.current = setTimeout(() => {
            hasTriggeredRef.current = true;
            onVisible();
          }, delay);
        } else if (!entry.isIntersecting && timeoutRef.current) {
          // Cancel timer if message scrolls out of view
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messageId, onVisible, threshold, delay]);

  return elementRef;
}
