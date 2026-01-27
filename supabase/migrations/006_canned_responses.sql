-- Sprint 2: Canned Responses Schema
-- Create table for saved response templates

CREATE TABLE IF NOT EXISTS canned_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  shortcut text, -- Optional keyboard shortcut like /greet
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE, -- NULL = shared with all agents
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_canned_responses_agent_id ON canned_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_category ON canned_responses(category);
CREATE INDEX IF NOT EXISTS idx_canned_responses_shortcut ON canned_responses(shortcut);

-- RLS policies
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Agents can see their own responses and shared responses (agent_id IS NULL)
CREATE POLICY "Agents can view own and shared responses" ON canned_responses
  FOR SELECT
  USING (agent_id IS NULL OR agent_id = auth.uid());

-- Agents can insert their own responses
CREATE POLICY "Agents can insert own responses" ON canned_responses
  FOR INSERT
  WITH CHECK (agent_id = auth.uid() OR agent_id IS NULL);

-- Agents can update their own responses (not shared ones unless they're admin)
CREATE POLICY "Agents can update own responses" ON canned_responses
  FOR UPDATE
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Agents can delete their own responses
CREATE POLICY "Agents can delete own responses" ON canned_responses
  FOR DELETE
  USING (agent_id = auth.uid());

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_canned_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canned_responses_updated_at
  BEFORE UPDATE ON canned_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_canned_responses_updated_at();

-- Seed some default shared responses
INSERT INTO canned_responses (title, content, shortcut, category, agent_id) VALUES
  ('Greeting', 'Hello! Thank you for contacting R-Link support. How can I help you today?', '/greet', 'greeting', NULL),
  ('Request More Info', 'Could you please provide more details about your issue? This will help me assist you better.', '/moreinfo', 'clarification', NULL),
  ('Checking Account', 'Let me check your account information. Please hold on for a moment.', '/checking', 'process', NULL),
  ('Escalation Notice', 'I understand your concern. I''m escalating this to our specialist team who can better assist you with this matter.', '/escalate', 'escalation', NULL),
  ('Resolution Confirmation', 'I''m glad I could help resolve your issue! Is there anything else I can assist you with today?', '/resolved', 'closing', NULL),
  ('Follow-up Promise', 'I''ll follow up on this and get back to you within 24 hours with an update.', '/followup', 'promise', NULL),
  ('Apology', 'I sincerely apologize for the inconvenience this has caused. Let me see what I can do to make this right.', '/sorry', 'apology', NULL),
  ('Technical Issue', 'It seems like you''re experiencing a technical issue. Let me guide you through some troubleshooting steps.', '/tech', 'technical', NULL)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE canned_responses IS 'Pre-written response templates for agents. agent_id NULL means shared across all agents.';
