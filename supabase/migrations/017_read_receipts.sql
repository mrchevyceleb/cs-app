-- Migration 017: Read Receipts and Typing Indicators
-- Supports real-time read status and typing indicators

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_type TEXT NOT NULL CHECK (reader_type IN ('customer', 'agent')),
  reader_id UUID NOT NULL, -- Can be customer_id or agent_id
  read_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate read receipts
  UNIQUE(message_id, reader_type, reader_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_reader ON message_read_receipts(reader_type, reader_id);

-- Typing indicator status (ephemeral, used with Supabase Realtime Broadcast)
-- This table is optional - we can use pure Broadcast without persistence
-- But having it allows for recovery after disconnects
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  typer_type TEXT NOT NULL CHECK (typer_type IN ('customer', 'agent')),
  typer_id UUID NOT NULL,
  typer_name TEXT, -- For display purposes
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '10 seconds',
  -- Only one typing indicator per person per ticket
  UNIQUE(ticket_id, typer_type, typer_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_ticket ON typing_indicators(ticket_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON typing_indicators(expires_at);

-- Auto-cleanup expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Presence tracking for agents (online/away/offline with last_seen)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

-- Add delivery status to messages (for SMS/email channels)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent'
  CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Index for unread message counts
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status) WHERE delivery_status IN ('pending', 'sent');

-- Function to mark messages as read and create read receipts
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_ticket_id UUID,
  p_reader_type TEXT,
  p_reader_id UUID,
  p_before_timestamp TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Create read receipts for unread messages
  INSERT INTO message_read_receipts (message_id, reader_type, reader_id)
  SELECT m.id, p_reader_type, p_reader_id
  FROM messages m
  WHERE m.ticket_id = p_ticket_id
    AND m.created_at <= p_before_timestamp
    AND m.sender_type != (
      CASE p_reader_type
        WHEN 'customer' THEN 'customer'
        WHEN 'agent' THEN 'agent'
      END
    )
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts r
      WHERE r.message_id = m.id
        AND r.reader_type = p_reader_type
        AND r.reader_id = p_reader_id
    )
  ON CONFLICT (message_id, reader_type, reader_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update delivery_status for messages that now have read receipts
  UPDATE messages SET
    delivery_status = 'read',
    read_at = now()
  WHERE ticket_id = p_ticket_id
    AND created_at <= p_before_timestamp
    AND delivery_status != 'read'
    AND sender_type != (
      CASE p_reader_type
        WHEN 'customer' THEN 'customer'
        WHEN 'agent' THEN 'agent'
      END
    );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread count for a ticket
CREATE OR REPLACE FUNCTION get_unread_count(
  p_ticket_id UUID,
  p_reader_type TEXT,
  p_reader_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM messages m
  WHERE m.ticket_id = p_ticket_id
    AND m.sender_type != (
      CASE p_reader_type
        WHEN 'customer' THEN 'customer'
        WHEN 'agent' THEN 'agent'
      END
    )
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts r
      WHERE r.message_id = m.id
        AND r.reader_type = p_reader_type
        AND r.reader_id = p_reader_id
    );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Notification for new unread messages (can be used by Supabase Realtime)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Broadcast via Supabase Realtime
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id,
      'sender_type', NEW.sender_type,
      'source', NEW.source
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS message_created_notify ON messages;
CREATE TRIGGER message_created_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
