-- 023: AI Agent Tooling
-- Tracks tool usage per agentic conversation turn and adds agent mode flag to channel config

-- ai_agent_sessions: tracks tool usage per conversation turn
CREATE TABLE IF NOT EXISTS ai_agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  channel text NOT NULL,
  result_type text NOT NULL CHECK (result_type IN ('response', 'escalation', 'timeout', 'error')),
  total_tool_calls integer DEFAULT 0,
  tool_calls_detail jsonb DEFAULT '[]'::jsonb,
  kb_articles_used text[] DEFAULT '{}',
  web_searches_performed integer DEFAULT 0,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10,6),
  total_duration_ms integer,
  escalation_reason text,
  escalation_summary text,
  created_at timestamptz DEFAULT now()
);

-- Index for finding sessions by ticket
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_ticket_id ON ai_agent_sessions(ticket_id);

-- Index for analytics: sessions by result type
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_result_type ON ai_agent_sessions(result_type);

-- Index for cost tracking over time
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_created_at ON ai_agent_sessions(created_at);

-- Add ai_agent_mode flag to channel_config (defaults off for safe rollout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channel_config' AND column_name = 'ai_agent_mode'
  ) THEN
    ALTER TABLE channel_config ADD COLUMN ai_agent_mode boolean DEFAULT false;
  END IF;
END $$;

-- RLS: service role can do everything, authenticated users can read their ticket sessions
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by backend API routes)
CREATE POLICY "Service role full access on ai_agent_sessions"
  ON ai_agent_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
