-- Sprint 3: Ticket Events - Audit Trail
-- Track all changes to tickets for accountability

CREATE TABLE IF NOT EXISTS ticket_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'created', 'status_changed', 'priority_changed', 'assigned', 'unassigned', 'tagged', 'untagged', 'escalated', 'resolved', 'message_sent', 'note_added'
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_events_agent_id ON ticket_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_ticket_events_event_type ON ticket_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ticket_events_created_at ON ticket_events(created_at DESC);

-- RLS policies
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;

-- All agents can view ticket events
CREATE POLICY "Agents can view ticket events" ON ticket_events
  FOR SELECT
  USING (true);

-- System can insert events (via triggers)
CREATE POLICY "System can insert ticket events" ON ticket_events
  FOR INSERT
  WITH CHECK (true);

-- Auto-log ticket changes via trigger
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  event_agent_id uuid;
BEGIN
  -- Determine the agent making the change (use assigned_agent_id as fallback)
  event_agent_id := COALESCE(auth.uid(), NEW.assigned_agent_id);

  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_events (ticket_id, agent_id, event_type, old_value, new_value)
    VALUES (NEW.id, event_agent_id, 'status_changed', OLD.status, NEW.status);

    -- Special event types for specific status changes
    IF NEW.status = 'escalated' THEN
      INSERT INTO ticket_events (ticket_id, agent_id, event_type, metadata)
      VALUES (NEW.id, event_agent_id, 'escalated', jsonb_build_object('from_status', OLD.status));
    ELSIF NEW.status = 'resolved' THEN
      INSERT INTO ticket_events (ticket_id, agent_id, event_type, metadata)
      VALUES (NEW.id, event_agent_id, 'resolved', jsonb_build_object('from_status', OLD.status));
    END IF;
  END IF;

  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO ticket_events (ticket_id, agent_id, event_type, old_value, new_value)
    VALUES (NEW.id, event_agent_id, 'priority_changed', OLD.priority, NEW.priority);
  END IF;

  -- Log assignment changes
  IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    IF NEW.assigned_agent_id IS NOT NULL AND OLD.assigned_agent_id IS NULL THEN
      INSERT INTO ticket_events (ticket_id, agent_id, event_type, new_value)
      VALUES (NEW.id, NEW.assigned_agent_id, 'assigned', NEW.assigned_agent_id::text);
    ELSIF NEW.assigned_agent_id IS NULL AND OLD.assigned_agent_id IS NOT NULL THEN
      INSERT INTO ticket_events (ticket_id, agent_id, event_type, old_value)
      VALUES (NEW.id, event_agent_id, 'unassigned', OLD.assigned_agent_id::text);
    ELSE
      INSERT INTO ticket_events (ticket_id, agent_id, event_type, old_value, new_value, metadata)
      VALUES (NEW.id, NEW.assigned_agent_id, 'reassigned', OLD.assigned_agent_id::text, NEW.assigned_agent_id::text,
              jsonb_build_object('from_agent', OLD.assigned_agent_id, 'to_agent', NEW.assigned_agent_id));
    END IF;
  END IF;

  -- Log AI handling changes
  IF OLD.ai_handled IS DISTINCT FROM NEW.ai_handled THEN
    INSERT INTO ticket_events (ticket_id, agent_id, event_type, old_value, new_value)
    VALUES (NEW.id, event_agent_id, 'ai_handling_changed', OLD.ai_handled::text, NEW.ai_handled::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS ticket_changes_trigger ON tickets;
CREATE TRIGGER ticket_changes_trigger
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_changes();

-- Function to log ticket creation
CREATE OR REPLACE FUNCTION log_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ticket_events (ticket_id, agent_id, event_type, metadata)
  VALUES (NEW.id, NEW.assigned_agent_id, 'created',
          jsonb_build_object(
            'subject', NEW.subject,
            'status', NEW.status,
            'priority', NEW.priority,
            'customer_id', NEW.customer_id
          ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_created_trigger ON tickets;
CREATE TRIGGER ticket_created_trigger
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_created();

-- Comment
COMMENT ON TABLE ticket_events IS 'Audit trail for all ticket changes. Automatically populated via triggers.';
