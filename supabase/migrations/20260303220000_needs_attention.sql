-- Track who sent the last message on each ticket so the dashboard
-- can show a "Needs Attention" queue for unanswered customer messages.

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_message_sender text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

-- Index for "Needs Attention" dashboard query
CREATE INDEX IF NOT EXISTS idx_tickets_needs_attention
  ON tickets (last_message_sender, status)
  WHERE last_message_sender = 'customer' AND status NOT IN ('resolved');

-- Trigger: auto-update last_message_sender on every new message.
-- SECURITY DEFINER so roles that can insert messages but not update tickets
-- (e.g. anon/widget) don't have their message inserts rejected by this trigger.
CREATE OR REPLACE FUNCTION update_ticket_last_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip internal notes
  IF (NEW.metadata->>'is_internal')::boolean IS TRUE THEN
    RETURN NEW;
  END IF;

  UPDATE tickets
  SET
    last_message_sender = NEW.sender_type,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ticket_last_message ON messages;
CREATE TRIGGER trg_update_ticket_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_message();

-- Backfill: set last_message_sender from the most recent non-internal message per ticket
UPDATE tickets t
SET
  last_message_sender = sub.sender_type,
  last_message_at = sub.created_at
FROM (
  SELECT DISTINCT ON (ticket_id)
    ticket_id,
    sender_type,
    created_at
  FROM messages
  WHERE (metadata->>'is_internal')::boolean IS NOT TRUE
  ORDER BY ticket_id, created_at DESC
) sub
WHERE sub.ticket_id = t.id;
