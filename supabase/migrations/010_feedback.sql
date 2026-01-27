-- Sprint 5: Customer Satisfaction (CSAT) Feedback Schema

CREATE TABLE IF NOT EXISTS ticket_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL UNIQUE, -- One feedback per ticket
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  comment text,
  feedback_token text UNIQUE, -- Token for email link feedback
  token_expires_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index for feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_ticket ON ticket_feedback(ticket_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer ON ticket_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON ticket_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted ON ticket_feedback(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_token ON ticket_feedback(feedback_token) WHERE feedback_token IS NOT NULL;

-- Agent performance metrics view (materialized for efficiency)
CREATE OR REPLACE VIEW agent_performance AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.email AS agent_email,
  a.avatar_url,
  COUNT(DISTINCT t.id) AS total_tickets_handled,
  COUNT(DISTINCT CASE WHEN t.status = 'resolved' THEN t.id END) AS tickets_resolved,
  COUNT(DISTINCT CASE WHEN t.first_response_breached = false THEN t.id END) AS sla_first_response_met,
  COUNT(DISTINCT CASE WHEN t.resolution_breached = false THEN t.id END) AS sla_resolution_met,
  ROUND(AVG(f.rating)::numeric, 2) AS avg_csat_rating,
  COUNT(DISTINCT f.id) AS feedback_count,
  AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60)::integer AS avg_first_response_minutes,
  AVG(EXTRACT(EPOCH FROM (
    CASE WHEN t.status = 'resolved' THEN t.updated_at ELSE NULL END - t.created_at
  )) / 3600)::integer AS avg_resolution_hours
FROM agents a
LEFT JOIN tickets t ON t.assigned_agent_id = a.id
LEFT JOIN ticket_feedback f ON f.ticket_id = t.id
GROUP BY a.id, a.name, a.email, a.avatar_url;

-- RLS policies
ALTER TABLE ticket_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can view feedback (for analytics)
CREATE POLICY "View feedback" ON ticket_feedback
  FOR SELECT USING (true);

-- System can insert feedback
CREATE POLICY "Insert feedback" ON ticket_feedback
  FOR INSERT WITH CHECK (true);

-- Only allow update if no feedback submitted yet (for token-based submission)
CREATE POLICY "Update feedback" ON ticket_feedback
  FOR UPDATE USING (submitted_at IS NULL OR auth.uid() IS NOT NULL);

-- Function to generate feedback token
CREATE OR REPLACE FUNCTION generate_feedback_token(p_ticket_id uuid)
RETURNS text AS $$
DECLARE
  v_token text;
  v_customer_id uuid;
BEGIN
  -- Get customer ID from ticket
  SELECT customer_id INTO v_customer_id FROM tickets WHERE id = p_ticket_id;

  -- Generate token
  v_token := encode(gen_random_bytes(24), 'hex');

  -- Upsert feedback record with token
  INSERT INTO ticket_feedback (ticket_id, customer_id, rating, feedback_token, token_expires_at, submitted_at)
  VALUES (p_ticket_id, v_customer_id, 0, v_token, now() + interval '7 days', NULL)
  ON CONFLICT (ticket_id) DO UPDATE SET
    feedback_token = v_token,
    token_expires_at = now() + interval '7 days'
  WHERE ticket_feedback.submitted_at IS NULL; -- Only update if not yet submitted

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit feedback via token
CREATE OR REPLACE FUNCTION submit_feedback_by_token(
  p_token text,
  p_rating integer,
  p_comment text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_feedback_id uuid;
BEGIN
  -- Find and update feedback
  UPDATE ticket_feedback
  SET rating = p_rating,
      comment = p_comment,
      submitted_at = now()
  WHERE feedback_token = p_token
    AND token_expires_at > now()
    AND submitted_at IS NULL
  RETURNING id INTO v_feedback_id;

  RETURN v_feedback_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily metrics snapshot for historical tracking
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  metric_type text NOT NULL, -- 'daily_summary', 'agent_performance', 'sla_compliance'
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(snapshot_date, metric_type)
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics_snapshots(metric_type);

-- Comments
COMMENT ON TABLE ticket_feedback IS 'Customer satisfaction ratings and comments per ticket';
COMMENT ON VIEW agent_performance IS 'Aggregated performance metrics per agent';
COMMENT ON TABLE metrics_snapshots IS 'Historical snapshots of daily metrics for trending';
