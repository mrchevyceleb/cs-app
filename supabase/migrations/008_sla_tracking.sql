-- Sprint 3: SLA Tracking Schema
-- Track SLA policies and deadlines for tickets

-- SLA Policies table
CREATE TABLE IF NOT EXISTS sla_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  priority text NOT NULL, -- 'urgent', 'high', 'normal', 'low'
  first_response_hours integer NOT NULL DEFAULT 1, -- Hours until first response required
  resolution_hours integer NOT NULL DEFAULT 24, -- Hours until resolution required
  business_hours_only boolean DEFAULT true, -- Only count business hours
  is_default boolean DEFAULT false, -- Is this the default policy for this priority
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(priority, is_default) -- Only one default per priority
);

-- Add SLA fields to tickets
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS sla_policy_id uuid REFERENCES sla_policies(id),
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_breached boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolution_breached boolean DEFAULT false;

-- Index for SLA queries
CREATE INDEX IF NOT EXISTS idx_tickets_sla_policy ON tickets(sla_policy_id);
CREATE INDEX IF NOT EXISTS idx_tickets_first_response_due ON tickets(first_response_due_at) WHERE first_response_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_resolution_due ON tickets(resolution_due_at) WHERE status NOT IN ('resolved');
CREATE INDEX IF NOT EXISTS idx_tickets_sla_breached ON tickets(first_response_breached, resolution_breached);

-- RLS for SLA policies
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view SLA policies" ON sla_policies
  FOR SELECT USING (true);

CREATE POLICY "System can manage SLA policies" ON sla_policies
  FOR ALL USING (true) WITH CHECK (true);

-- Default SLA policies
INSERT INTO sla_policies (name, description, priority, first_response_hours, resolution_hours, business_hours_only, is_default) VALUES
  ('Urgent SLA', 'Critical issues requiring immediate attention', 'urgent', 1, 4, false, true),
  ('High Priority SLA', 'Important issues with quick turnaround', 'high', 2, 8, true, true),
  ('Normal SLA', 'Standard support requests', 'normal', 4, 24, true, true),
  ('Low Priority SLA', 'Non-critical requests and general inquiries', 'low', 8, 72, true, true)
ON CONFLICT (priority, is_default) DO NOTHING;

-- Function to calculate SLA deadlines
CREATE OR REPLACE FUNCTION calculate_sla_deadlines(
  p_created_at timestamptz,
  p_first_response_hours integer,
  p_resolution_hours integer,
  p_business_hours_only boolean
) RETURNS TABLE(first_response_due timestamptz, resolution_due timestamptz) AS $$
BEGIN
  -- For simplicity, we'll calculate based on straight hours
  -- In production, you'd want to properly calculate business hours
  IF p_business_hours_only THEN
    -- Assume 8 business hours per day, rough estimate
    RETURN QUERY SELECT
      p_created_at + (p_first_response_hours * interval '1 hour' * 1.5),
      p_created_at + (p_resolution_hours * interval '1 hour' * 1.5);
  ELSE
    RETURN QUERY SELECT
      p_created_at + (p_first_response_hours * interval '1 hour'),
      p_created_at + (p_resolution_hours * interval '1 hour');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set SLA deadlines on ticket creation
CREATE OR REPLACE FUNCTION set_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_policy sla_policies%ROWTYPE;
  v_deadlines RECORD;
BEGIN
  -- Find the default SLA policy for this priority
  SELECT * INTO v_policy
  FROM sla_policies
  WHERE priority = NEW.priority AND is_default = true
  LIMIT 1;

  IF v_policy.id IS NOT NULL THEN
    -- Calculate deadlines
    SELECT * INTO v_deadlines
    FROM calculate_sla_deadlines(
      NEW.created_at,
      v_policy.first_response_hours,
      v_policy.resolution_hours,
      v_policy.business_hours_only
    );

    -- Set the values
    NEW.sla_policy_id := v_policy.id;
    NEW.first_response_due_at := v_deadlines.first_response_due;
    NEW.resolution_due_at := v_deadlines.resolution_due;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_sla_trigger ON tickets;
CREATE TRIGGER ticket_sla_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_sla();

-- Trigger to record first response time
CREATE OR REPLACE FUNCTION record_first_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if this is the first agent/AI response and first_response_at is not set
  IF NEW.sender_type IN ('agent', 'ai') THEN
    UPDATE tickets
    SET first_response_at = NEW.created_at,
        first_response_breached = (NEW.created_at > first_response_due_at)
    WHERE id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS message_first_response_trigger ON messages;
CREATE TRIGGER message_first_response_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION record_first_response();

-- Trigger to check resolution SLA breach
CREATE OR REPLACE FUNCTION check_resolution_breach()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolution_breached := (now() > NEW.resolution_due_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_resolution_breach_trigger ON tickets;
CREATE TRIGGER ticket_resolution_breach_trigger
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION check_resolution_breach();

-- Comments
COMMENT ON TABLE sla_policies IS 'SLA policy definitions per priority level';
COMMENT ON COLUMN tickets.first_response_due_at IS 'Deadline for first agent/AI response';
COMMENT ON COLUMN tickets.resolution_due_at IS 'Deadline for ticket resolution';
