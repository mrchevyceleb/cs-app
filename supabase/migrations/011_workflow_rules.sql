-- Sprint 6: Workflow Rules and Team Collaboration

-- Workflow Rules table for automation
CREATE TABLE IF NOT EXISTS workflow_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  trigger_event text NOT NULL, -- 'ticket_created', 'status_changed', 'priority_changed', 'ticket_assigned', 'sla_breach', 'message_received'
  conditions jsonb DEFAULT '[]', -- Array of conditions to match
  actions jsonb DEFAULT '[]', -- Array of actions to execute
  priority integer DEFAULT 0, -- Higher = runs first
  created_by uuid REFERENCES agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workflow execution log
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id uuid REFERENCES workflow_rules(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  conditions_matched jsonb,
  actions_executed jsonb,
  status text DEFAULT 'success', -- 'success', 'partial', 'failed'
  error_message text,
  executed_at timestamptz DEFAULT now()
);

-- Agent notifications table
CREATE TABLE IF NOT EXISTS agent_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'mention', 'handoff', 'assignment', 'escalation', 'sla_warning', 'feedback'
  title text NOT NULL,
  message text,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  from_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Ticket handoffs table for transfer history
CREATE TABLE IF NOT EXISTS ticket_handoffs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  from_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  to_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL NOT NULL,
  reason text, -- Why the handoff is happening
  notes text, -- Context for the receiving agent
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_rules_active ON workflow_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger ON workflow_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_ticket ON workflow_executions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_rule ON workflow_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent ON agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_unread ON agent_notifications(agent_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_handoffs_ticket ON ticket_handoffs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_to_agent ON ticket_handoffs(to_agent_id);

-- RLS policies
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_handoffs ENABLE ROW LEVEL SECURITY;

-- Workflow rules visible to all agents
CREATE POLICY "View workflow rules" ON workflow_rules FOR SELECT USING (true);
CREATE POLICY "Manage workflow rules" ON workflow_rules FOR ALL USING (true) WITH CHECK (true);

-- Workflow executions viewable by all
CREATE POLICY "View workflow executions" ON workflow_executions FOR SELECT USING (true);
CREATE POLICY "Insert workflow executions" ON workflow_executions FOR INSERT WITH CHECK (true);

-- Notifications: agents see their own
CREATE POLICY "View own notifications" ON agent_notifications FOR SELECT USING (agent_id = auth.uid() OR true); -- Allow all for now
CREATE POLICY "Insert notifications" ON agent_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own notifications" ON agent_notifications FOR UPDATE USING (agent_id = auth.uid() OR true);

-- Handoffs viewable by involved agents
CREATE POLICY "View handoffs" ON ticket_handoffs FOR SELECT USING (true);
CREATE POLICY "Manage handoffs" ON ticket_handoffs FOR ALL USING (true) WITH CHECK (true);

-- Seed some default workflow rules
INSERT INTO workflow_rules (name, description, trigger_event, conditions, actions, priority) VALUES
  (
    'Auto-assign urgent tickets',
    'Automatically assign urgent priority tickets to available senior agents',
    'ticket_created',
    '[{"field": "priority", "operator": "equals", "value": "urgent"}]'::jsonb,
    '[{"type": "add_tag", "value": "urgent-review"}]'::jsonb,
    100
  ),
  (
    'Notify on escalation',
    'Send notification to all online agents when a ticket is escalated',
    'status_changed',
    '[{"field": "new_status", "operator": "equals", "value": "escalated"}]'::jsonb,
    '[{"type": "notify_agents", "filter": "online"}]'::jsonb,
    90
  ),
  (
    'Auto-tag billing keywords',
    'Tag tickets containing billing keywords',
    'ticket_created',
    '[{"field": "subject", "operator": "contains", "value": "billing|invoice|payment|charge"}]'::jsonb,
    '[{"type": "add_tag", "value": "billing"}]'::jsonb,
    50
  ),
  (
    'SLA breach warning',
    'Notify assigned agent when SLA is about to breach',
    'sla_breach',
    '[{"field": "breach_type", "operator": "equals", "value": "warning"}]'::jsonb,
    '[{"type": "notify_assigned_agent"}]'::jsonb,
    80
  )
ON CONFLICT DO NOTHING;

-- Function to trigger workflow check
CREATE OR REPLACE FUNCTION check_workflow_rules(
  p_ticket_id uuid,
  p_trigger_event text,
  p_event_data jsonb DEFAULT '{}'
) RETURNS void AS $$
DECLARE
  v_rule RECORD;
BEGIN
  -- This is a placeholder - actual logic would be in application code
  -- We just log that workflows should be checked
  INSERT INTO workflow_executions (ticket_id, trigger_event, status, conditions_matched)
  VALUES (p_ticket_id, p_trigger_event, 'pending', p_event_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE workflow_rules IS 'Automation rules for ticket workflows';
COMMENT ON TABLE workflow_executions IS 'Log of workflow rule executions';
COMMENT ON TABLE agent_notifications IS 'In-app notifications for agents';
COMMENT ON TABLE ticket_handoffs IS 'Ticket transfer history between agents';
