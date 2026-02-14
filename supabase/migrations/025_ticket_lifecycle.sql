-- Migration 024: Replace SLA system with simple ticket lifecycle
--
-- Removes the corporate SLA tracking system (policies, breach detection, predictions)
-- and replaces it with a lightweight lifecycle system driven by priority-based intervals.
-- Tickets now have follow_up_at and auto_close_at timestamps managed by triggers.

-- ============================================
-- 1. DROP TRIGGERS (must be before functions)
-- ============================================
DROP TRIGGER IF EXISTS ticket_sla_trigger ON tickets;
DROP TRIGGER IF EXISTS message_first_response_trigger ON messages;
DROP TRIGGER IF EXISTS ticket_resolution_breach_trigger ON tickets;

-- ============================================
-- 2. DROP FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS set_ticket_sla();
DROP FUNCTION IF EXISTS record_first_response();
DROP FUNCTION IF EXISTS check_resolution_breach();
DROP FUNCTION IF EXISTS calculate_sla_deadlines(timestamptz, integer, integer, boolean);

-- ============================================
-- 3. DROP TABLES (CASCADE for foreign keys)
-- ============================================
DROP TABLE IF EXISTS sla_predictions CASCADE;
DROP TABLE IF EXISTS sla_policies CASCADE;

-- ============================================
-- 4. DROP DEPENDENT VIEWS, THEN OLD COLUMNS
-- ============================================

-- agent_performance view depends on first_response_at, first_response_breached, resolution_breached
DROP VIEW IF EXISTS agent_performance;

ALTER TABLE tickets
  DROP COLUMN IF EXISTS sla_policy_id,
  DROP COLUMN IF EXISTS first_response_at,
  DROP COLUMN IF EXISTS first_response_due_at,
  DROP COLUMN IF EXISTS resolution_due_at,
  DROP COLUMN IF EXISTS first_response_breached,
  DROP COLUMN IF EXISTS resolution_breached;

-- Recreate agent_performance without SLA columns
CREATE OR REPLACE VIEW agent_performance AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.email AS agent_email,
  a.avatar_url,
  COUNT(DISTINCT t.id) AS total_tickets_handled,
  COUNT(DISTINCT CASE WHEN t.status = 'resolved' THEN t.id END) AS tickets_resolved,
  ROUND(AVG(f.rating)::numeric, 2) AS avg_csat_rating,
  COUNT(DISTINCT f.id) AS feedback_count,
  AVG(EXTRACT(EPOCH FROM (
    CASE WHEN t.status = 'resolved' THEN t.updated_at ELSE NULL END - t.created_at
  )) / 3600)::integer AS avg_resolution_hours
FROM agents a
LEFT JOIN tickets t ON t.assigned_agent_id = a.id
LEFT JOIN ticket_feedback f ON f.ticket_id = t.id
GROUP BY a.id, a.name, a.email, a.avatar_url;

COMMENT ON VIEW agent_performance IS 'Aggregated performance metrics per agent';

-- ============================================
-- 5. ADD NEW LIFECYCLE COLUMNS TO TICKETS
-- ============================================
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_close_at timestamptz;

-- ============================================
-- 6. ADD INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tickets_follow_up
  ON tickets(follow_up_at)
  WHERE status NOT IN ('resolved');

CREATE INDEX IF NOT EXISTS idx_tickets_auto_close
  ON tickets(auto_close_at)
  WHERE status NOT IN ('resolved');

-- ============================================
-- 7. LIFECYCLE INTERVALS BY PRIORITY
-- ============================================
CREATE OR REPLACE FUNCTION get_lifecycle_intervals(p_priority text)
RETURNS TABLE(
  follow_up_interval interval,
  auto_close_interval interval,
  post_resolve_close_interval interval
) AS $$
BEGIN
  RETURN QUERY SELECT
    CASE p_priority
      WHEN 'urgent' THEN interval '4 hours'
      WHEN 'high'   THEN interval '8 hours'
      WHEN 'normal' THEN interval '24 hours'
      WHEN 'low'    THEN interval '48 hours'
      ELSE               interval '24 hours'
    END,
    CASE p_priority
      WHEN 'urgent' THEN interval '2 days'
      WHEN 'high'   THEN interval '3 days'
      WHEN 'normal' THEN interval '7 days'
      WHEN 'low'    THEN interval '14 days'
      ELSE               interval '7 days'
    END,
    CASE p_priority
      WHEN 'urgent' THEN interval '1 day'
      WHEN 'high'   THEN interval '2 days'
      WHEN 'normal' THEN interval '3 days'
      WHEN 'low'    THEN interval '5 days'
      ELSE               interval '3 days'
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TRIGGER: Set lifecycle timestamps on ticket creation
-- ============================================
CREATE OR REPLACE FUNCTION set_ticket_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_intervals RECORD;
BEGIN
  SELECT * INTO v_intervals
  FROM get_lifecycle_intervals(NEW.priority);

  NEW.follow_up_at := NEW.created_at + v_intervals.follow_up_interval;
  NEW.auto_close_at := NEW.created_at + v_intervals.auto_close_interval;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. TRIGGER: Reset follow-up on customer message
-- ============================================
CREATE OR REPLACE FUNCTION reset_follow_up_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_intervals RECORD;
  v_priority text;
BEGIN
  IF NEW.sender_type = 'customer' THEN
    SELECT priority INTO v_priority
    FROM tickets
    WHERE id = NEW.ticket_id;

    SELECT * INTO v_intervals
    FROM get_lifecycle_intervals(v_priority);

    UPDATE tickets
    SET follow_up_at = now() + v_intervals.follow_up_interval,
        auto_close_at = now() + v_intervals.auto_close_interval
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. TRIGGER: Set post-resolve auto-close window
-- ============================================
CREATE OR REPLACE FUNCTION set_post_resolve_close()
RETURNS TRIGGER AS $$
DECLARE
  v_intervals RECORD;
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    SELECT * INTO v_intervals
    FROM get_lifecycle_intervals(NEW.priority);

    NEW.auto_close_at := now() + v_intervals.post_resolve_close_interval;
    NEW.follow_up_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. CREATE TRIGGERS
-- ============================================
CREATE TRIGGER ticket_lifecycle_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_lifecycle();

CREATE TRIGGER message_reset_follow_up_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION reset_follow_up_on_message();

CREATE TRIGGER ticket_post_resolve_trigger
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_post_resolve_close();

-- ============================================
-- 12. COMMENTS
-- ============================================
COMMENT ON COLUMN tickets.follow_up_at IS 'When to next automatically follow up with the customer';
COMMENT ON COLUMN tickets.auto_close_at IS 'When to automatically resolve the ticket if no activity';
