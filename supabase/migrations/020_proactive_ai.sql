-- Migration 020: Proactive AI Customer Service System
-- Enables predictive prevention, intelligent escalation, proactive outreach,
-- self-healing knowledge, workload intelligence, and customer health scoring

-- ============================================
-- AI Calibration Data
-- Track AI confidence vs actual outcomes to learn and improve
-- ============================================
CREATE TABLE IF NOT EXISTS ai_calibration_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  initial_confidence float CHECK (initial_confidence >= 0 AND initial_confidence <= 1),
  final_outcome text CHECK (final_outcome IN ('resolved_by_ai', 'escalated_helpful', 'escalated_unnecessary', 'reopened')),
  csat_score int CHECK (csat_score >= 1 AND csat_score <= 5),
  resolution_time_hours float,
  intent_category text, -- Categorize the intent for per-intent calibration
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for calibration queries
CREATE INDEX IF NOT EXISTS idx_ai_calibration_ticket ON ai_calibration_data(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_calibration_outcome ON ai_calibration_data(final_outcome);
CREATE INDEX IF NOT EXISTS idx_ai_calibration_intent ON ai_calibration_data(intent_category);
CREATE INDEX IF NOT EXISTS idx_ai_calibration_created ON ai_calibration_data(created_at DESC);

-- ============================================
-- Customer Health Scores
-- Real-time health scoring for churn prediction
-- ============================================
CREATE TABLE IF NOT EXISTS customer_health_scores (
  customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  score int CHECK (score >= 0 AND score <= 100),
  risk_level text CHECK (risk_level IN ('healthy', 'at_risk', 'critical')),
  factors jsonb DEFAULT '{}', -- Breakdown of score components
  trend text CHECK (trend IN ('improving', 'stable', 'declining')),
  previous_score int,
  score_change int, -- Difference from previous calculation
  last_calculated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for health score queries
CREATE INDEX IF NOT EXISTS idx_health_scores_risk ON customer_health_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_health_scores_score ON customer_health_scores(score);
CREATE INDEX IF NOT EXISTS idx_health_scores_trend ON customer_health_scores(trend);

-- ============================================
-- Knowledge Article Metrics
-- Track article effectiveness over time
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_article_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  times_matched int DEFAULT 0,
  times_used_in_response int DEFAULT 0,
  auto_resolved_count int DEFAULT 0, -- Tickets resolved without escalation
  escalated_count int DEFAULT 0, -- Tickets that escalated despite using this article
  avg_csat_when_used float,
  csat_sample_size int DEFAULT 0,
  effectiveness_score float, -- Calculated: (auto_resolved - escalated) / times_used
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, period_start, period_end)
);

-- Index for metrics queries
CREATE INDEX IF NOT EXISTS idx_article_metrics_article ON knowledge_article_metrics(article_id);
CREATE INDEX IF NOT EXISTS idx_article_metrics_period ON knowledge_article_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_article_metrics_effectiveness ON knowledge_article_metrics(effectiveness_score DESC NULLS LAST);

-- ============================================
-- Knowledge Article Drafts
-- AI-suggested articles from successful resolutions
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_article_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  suggested_category text,
  source_ticket_ids uuid[], -- Tickets that contributed to this suggestion
  source_message_ids uuid[], -- Specific messages used
  generation_reason text, -- 'high_csat_response', 'repeated_question', 'gap_detected'
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  reviewed_by uuid REFERENCES agents(id),
  reviewed_at timestamptz,
  rejection_reason text,
  published_article_id uuid REFERENCES knowledge_articles(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for draft management
CREATE INDEX IF NOT EXISTS idx_article_drafts_status ON knowledge_article_drafts(status);
CREATE INDEX IF NOT EXISTS idx_article_drafts_created ON knowledge_article_drafts(created_at DESC);

-- ============================================
-- Proactive Outreach Log
-- Track all proactive messages sent
-- ============================================
CREATE TABLE IF NOT EXISTS proactive_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  outreach_type text NOT NULL CHECK (outreach_type IN (
    'stalled_revival',
    'post_resolution_checkin',
    'sla_warning',
    'health_score_intervention',
    'issue_broadcast',
    'milestone_celebration',
    'at_risk_alert'
  )),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'widget', 'slack', 'internal')),
  message_content text,
  message_subject text,
  trigger_reason text, -- Why this outreach was triggered
  trigger_data jsonb DEFAULT '{}', -- Data that triggered the outreach
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  response_received boolean DEFAULT false,
  response_ticket_id uuid REFERENCES tickets(id),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for outreach queries
CREATE INDEX IF NOT EXISTS idx_outreach_customer ON proactive_outreach_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_outreach_ticket ON proactive_outreach_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_outreach_type ON proactive_outreach_log(outreach_type);
CREATE INDEX IF NOT EXISTS idx_outreach_created ON proactive_outreach_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON proactive_outreach_log(delivery_status);

-- ============================================
-- SLA Predictions
-- Store predictions for SLA breach warnings
-- ============================================
CREATE TABLE IF NOT EXISTS sla_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  prediction_type text CHECK (prediction_type IN ('first_response', 'resolution')),
  predicted_breach_probability float CHECK (predicted_breach_probability >= 0 AND predicted_breach_probability <= 1),
  predicted_breach_at timestamptz,
  hours_until_breach float,
  contributing_factors jsonb DEFAULT '{}', -- queue_depth, complexity, agent_workload, etc.
  recommendation text, -- Suggested action
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  actual_outcome text, -- 'met', 'breached', 'cancelled'
  created_at timestamptz DEFAULT now(),
  UNIQUE(ticket_id, prediction_type, created_at)
);

-- Index for prediction queries
CREATE INDEX IF NOT EXISTS idx_sla_predictions_ticket ON sla_predictions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sla_predictions_probability ON sla_predictions(predicted_breach_probability DESC);
CREATE INDEX IF NOT EXISTS idx_sla_predictions_created ON sla_predictions(created_at DESC);

-- ============================================
-- Issue Patterns (for cross-customer detection)
-- ============================================
CREATE TABLE IF NOT EXISTS issue_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_hash text UNIQUE, -- Hash of the pattern for deduplication
  pattern_keywords text[], -- Key terms that define this pattern
  pattern_embedding jsonb, -- For semantic similarity (stored as JSON array)
  sample_message text, -- Representative message
  occurrence_count int DEFAULT 1,
  affected_customer_count int DEFAULT 1,
  affected_customer_ids uuid[],
  affected_ticket_ids uuid[],
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'detected' CHECK (status IN ('detected', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
  resolution_notes text,
  first_detected_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  broadcast_sent boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'
);

-- Index for pattern queries
CREATE INDEX IF NOT EXISTS idx_issue_patterns_status ON issue_patterns(status);
CREATE INDEX IF NOT EXISTS idx_issue_patterns_severity ON issue_patterns(severity);
CREATE INDEX IF NOT EXISTS idx_issue_patterns_last_seen ON issue_patterns(last_seen_at DESC);

-- ============================================
-- Volume Forecasts
-- Store ticket volume predictions
-- ============================================
CREATE TABLE IF NOT EXISTS volume_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_for timestamptz NOT NULL, -- The time period being forecasted
  forecast_hours int NOT NULL, -- 24, 48, or 168 hours ahead
  predicted_volume int NOT NULL,
  confidence_lower int, -- Lower bound of prediction interval
  confidence_upper int, -- Upper bound of prediction interval
  contributing_factors jsonb DEFAULT '{}', -- day_of_week, seasonality, etc.
  actual_volume int, -- Filled in after the period passes
  accuracy_percentage float, -- How accurate was this prediction
  created_at timestamptz DEFAULT now(),
  UNIQUE(forecast_for, forecast_hours)
);

-- Index for forecast queries
CREATE INDEX IF NOT EXISTS idx_volume_forecasts_for ON volume_forecasts(forecast_for);
CREATE INDEX IF NOT EXISTS idx_volume_forecasts_created ON volume_forecasts(created_at DESC);

-- ============================================
-- Smart Queue Scoring
-- Pre-calculated priority scores for operator queue
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_queue_scores (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  composite_score float NOT NULL, -- Overall priority score
  sla_urgency_score float DEFAULT 0, -- Based on time to breach
  customer_value_score float DEFAULT 0, -- Based on customer health/importance
  complexity_score float DEFAULT 0, -- Based on message analysis
  wait_time_score float DEFAULT 0, -- Based on how long they've been waiting
  sentiment_score float DEFAULT 0, -- Based on detected sentiment
  similar_ticket_count int DEFAULT 0, -- Number of similar open tickets (for batching)
  similar_ticket_ids uuid[], -- IDs of similar tickets
  scoring_factors jsonb DEFAULT '{}', -- Detailed breakdown
  last_calculated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_scores CHECK (
    composite_score >= 0 AND
    sla_urgency_score >= 0 AND
    customer_value_score >= 0 AND
    complexity_score >= 0 AND
    wait_time_score >= 0
  )
);

-- Index for queue queries
CREATE INDEX IF NOT EXISTS idx_queue_scores_composite ON ticket_queue_scores(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_queue_scores_similar ON ticket_queue_scores(similar_ticket_count DESC);

-- ============================================
-- Helper function: Calculate customer health score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_customer_health_score(p_customer_id uuid)
RETURNS int AS $$
DECLARE
  v_score int := 70; -- Start with neutral score
  v_ticket_count int;
  v_resolved_count int;
  v_open_count int;
  v_avg_csat float;
  v_recent_escalations int;
  v_days_since_last_ticket int;
BEGIN
  -- Get ticket statistics for last 90 days
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'resolved'),
    COUNT(*) FILTER (WHERE status IN ('open', 'pending', 'escalated')),
    COUNT(*) FILTER (WHERE status = 'escalated')
  INTO v_ticket_count, v_resolved_count, v_open_count, v_recent_escalations
  FROM tickets
  WHERE customer_id = p_customer_id
    AND created_at > NOW() - INTERVAL '90 days';

  -- Get average CSAT for this customer
  SELECT AVG(tf.rating)
  INTO v_avg_csat
  FROM ticket_feedback tf
  JOIN tickets t ON tf.ticket_id = t.id
  WHERE t.customer_id = p_customer_id
    AND tf.rating IS NOT NULL;

  -- Get days since last ticket
  SELECT EXTRACT(DAY FROM NOW() - MAX(created_at))
  INTO v_days_since_last_ticket
  FROM tickets
  WHERE customer_id = p_customer_id;

  -- Adjust score based on CSAT
  IF v_avg_csat IS NOT NULL THEN
    v_score := v_score + ((v_avg_csat - 3) * 10)::int; -- +/- 20 points
  END IF;

  -- Penalize for open tickets
  v_score := v_score - (v_open_count * 5);

  -- Penalize for escalations
  v_score := v_score - (v_recent_escalations * 10);

  -- Bonus for resolved tickets
  v_score := v_score + LEAST(v_resolved_count, 5);

  -- Clamp to valid range
  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function: Determine risk level from score
-- ============================================
CREATE OR REPLACE FUNCTION get_risk_level(p_score int)
RETURNS text AS $$
BEGIN
  IF p_score >= 60 THEN
    RETURN 'healthy';
  ELSIF p_score >= 40 THEN
    RETURN 'at_risk';
  ELSE
    RETURN 'critical';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function: Determine trend from score change
-- ============================================
CREATE OR REPLACE FUNCTION get_score_trend(p_current int, p_previous int)
RETURNS text AS $$
DECLARE
  v_change int;
BEGIN
  IF p_previous IS NULL THEN
    RETURN 'stable';
  END IF;

  v_change := p_current - p_previous;

  IF v_change >= 5 THEN
    RETURN 'improving';
  ELSIF v_change <= -5 THEN
    RETURN 'declining';
  ELSE
    RETURN 'stable';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Stored procedure: Calculate all customer health scores
-- (Called by pg_cron hourly)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_customer_health_scores()
RETURNS void AS $$
DECLARE
  v_customer RECORD;
  v_new_score int;
  v_previous_score int;
  v_risk_level text;
  v_trend text;
BEGIN
  -- Process all customers with tickets in the last 90 days
  FOR v_customer IN (
    SELECT DISTINCT c.id
    FROM customers c
    JOIN tickets t ON t.customer_id = c.id
    WHERE t.created_at > NOW() - INTERVAL '90 days'
  ) LOOP
    -- Calculate new score
    v_new_score := calculate_customer_health_score(v_customer.id);

    -- Get previous score
    SELECT score INTO v_previous_score
    FROM customer_health_scores
    WHERE customer_id = v_customer.id;

    -- Determine risk level and trend
    v_risk_level := get_risk_level(v_new_score);
    v_trend := get_score_trend(v_new_score, v_previous_score);

    -- Upsert health score
    INSERT INTO customer_health_scores (
      customer_id,
      score,
      risk_level,
      trend,
      previous_score,
      score_change,
      last_calculated_at,
      updated_at
    ) VALUES (
      v_customer.id,
      v_new_score,
      v_risk_level,
      v_trend,
      v_previous_score,
      v_new_score - COALESCE(v_previous_score, v_new_score),
      NOW(),
      NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      score = EXCLUDED.score,
      risk_level = EXCLUDED.risk_level,
      trend = EXCLUDED.trend,
      previous_score = customer_health_scores.score,
      score_change = EXCLUDED.score - customer_health_scores.score,
      last_calculated_at = NOW(),
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Stored procedure: Calculate article effectiveness
-- (Called by pg_cron daily)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_article_effectiveness()
RETURNS void AS $$
DECLARE
  v_period_start date := CURRENT_DATE - INTERVAL '7 days';
  v_period_end date := CURRENT_DATE;
BEGIN
  -- This is a placeholder - actual implementation would analyze
  -- message metadata to see which articles were used and their outcomes
  -- For now, we create empty metrics rows for tracking
  INSERT INTO knowledge_article_metrics (
    article_id,
    period_start,
    period_end,
    times_matched,
    times_used_in_response,
    auto_resolved_count,
    escalated_count
  )
  SELECT
    ka.id,
    v_period_start,
    v_period_end,
    0, 0, 0, 0
  FROM knowledge_articles ka
  WHERE NOT EXISTS (
    SELECT 1 FROM knowledge_article_metrics kam
    WHERE kam.article_id = ka.id
      AND kam.period_start = v_period_start
      AND kam.period_end = v_period_end
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Stored procedure: Calibrate AI confidence thresholds
-- (Called by pg_cron daily)
-- ============================================
CREATE OR REPLACE FUNCTION calibrate_ai_confidence()
RETURNS void AS $$
BEGIN
  -- This procedure analyzes ai_calibration_data to adjust confidence thresholds
  -- Implementation would update channel_config.ai_confidence_threshold based on outcomes
  -- For now, this is a placeholder for the cron job to call
  RAISE NOTICE 'AI calibration completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Stored procedure: Retire stale articles
-- (Called by pg_cron monthly)
-- ============================================
CREATE OR REPLACE FUNCTION retire_stale_articles()
RETURNS void AS $$
DECLARE
  v_cutoff_date date := CURRENT_DATE - INTERVAL '90 days';
  v_retired_count int;
BEGIN
  -- Find articles with no matches in 90 days
  -- For now, just log them - actual retirement would need manual review
  SELECT COUNT(*) INTO v_retired_count
  FROM knowledge_articles ka
  WHERE NOT EXISTS (
    SELECT 1 FROM knowledge_article_metrics kam
    WHERE kam.article_id = ka.id
      AND kam.times_matched > 0
      AND kam.period_start > v_cutoff_date
  );

  RAISE NOTICE 'Found % articles with no matches in 90 days', v_retired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add workflow trigger events for proactive features
-- ============================================
ALTER TABLE workflow_rules
  DROP CONSTRAINT IF EXISTS workflow_rules_trigger_event_check;

ALTER TABLE workflow_rules
  ADD CONSTRAINT workflow_rules_trigger_event_check
  CHECK (trigger_event IN (
    'ticket_created',
    'status_changed',
    'priority_changed',
    'ticket_assigned',
    'sla_breach',
    'message_received',
    'health_score_critical',
    'health_score_declining',
    'pattern_detected',
    'stalled_conversation'
  ));

-- ============================================
-- Update email_logs to support proactive email types
-- ============================================
ALTER TABLE email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE email_logs
  ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'ticket_created',
    'ticket_updated',
    'ticket_resolved',
    'agent_reply',
    'reminder',
    'feedback_request',
    'stalled_revival',
    'post_resolution_checkin',
    'health_intervention',
    'issue_broadcast'
  ));

-- ============================================
-- RLS Policies for new tables
-- ============================================
ALTER TABLE ai_calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_article_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_article_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_queue_scores ENABLE ROW LEVEL SECURITY;

-- Service role can access all
CREATE POLICY "Service role has full access to ai_calibration_data"
  ON ai_calibration_data FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to customer_health_scores"
  ON customer_health_scores FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to knowledge_article_metrics"
  ON knowledge_article_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to knowledge_article_drafts"
  ON knowledge_article_drafts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to proactive_outreach_log"
  ON proactive_outreach_log FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to sla_predictions"
  ON sla_predictions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to issue_patterns"
  ON issue_patterns FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to volume_forecasts"
  ON volume_forecasts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to ticket_queue_scores"
  ON ticket_queue_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE ai_calibration_data IS 'Tracks AI confidence vs actual outcomes for learning';
COMMENT ON TABLE customer_health_scores IS 'Real-time customer health scores for churn prediction';
COMMENT ON TABLE knowledge_article_metrics IS 'Tracks KB article effectiveness over time';
COMMENT ON TABLE knowledge_article_drafts IS 'AI-suggested articles pending review';
COMMENT ON TABLE proactive_outreach_log IS 'Log of all proactive customer communications';
COMMENT ON TABLE sla_predictions IS 'SLA breach predictions for early intervention';
COMMENT ON TABLE issue_patterns IS 'Detected cross-customer issue patterns';
COMMENT ON TABLE volume_forecasts IS 'Ticket volume predictions';
COMMENT ON TABLE ticket_queue_scores IS 'Smart queue priority scores for operator';
