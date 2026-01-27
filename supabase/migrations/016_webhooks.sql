-- Migration 016: Webhooks Infrastructure
-- Supports outbound webhooks (notify external services) and inbound webhooks (receive from external services)

-- Outbound webhook endpoints configuration
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- Used to sign webhook payloads
  enabled BOOLEAN DEFAULT true,
  -- Event subscriptions (which events trigger this webhook)
  events TEXT[] NOT NULL DEFAULT ARRAY['ticket.created', 'ticket.updated', 'message.created'],
  -- Optional filters
  filter_status TEXT[], -- Only fire for these ticket statuses
  filter_priority TEXT[], -- Only fire for these priorities
  filter_tags TEXT[], -- Only fire for tickets with these tags
  -- Retry configuration
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  timeout_seconds INTEGER DEFAULT 30,
  -- Headers to include in requests
  headers JSONB DEFAULT '{}'::jsonb,
  -- Stats
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  -- Metadata
  created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_enabled ON webhook_endpoints(enabled) WHERE enabled = true;

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g., 'ticket.created', 'message.created'
  event_id TEXT NOT NULL, -- ID of the resource that triggered the event
  payload JSONB NOT NULL,
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  -- Response info
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  response_time_ms INTEGER,
  error_message TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- Inbound webhook sources (for Slack, Discord, custom integrations, etc.)
CREATE TABLE IF NOT EXISTS webhook_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('slack', 'discord', 'teams', 'custom')),
  -- Verification
  verification_token TEXT, -- For verifying incoming requests
  signing_secret TEXT, -- For HMAC signature verification
  -- Mapping configuration
  -- How to extract data from incoming payloads
  field_mapping JSONB DEFAULT '{
    "customer_identifier": "$.user.email",
    "message_content": "$.text",
    "external_id": "$.message_id"
  }'::jsonb,
  -- Auto-create tickets or only add to existing
  auto_create_tickets BOOLEAN DEFAULT true,
  default_priority TEXT DEFAULT 'normal',
  default_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Stats
  enabled BOOLEAN DEFAULT true,
  last_received_at TIMESTAMPTZ,
  total_received INTEGER DEFAULT 0,
  -- Metadata
  created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_sources_enabled ON webhook_sources(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_webhook_sources_type ON webhook_sources(type);

-- Webhook event types reference (for documentation/UI)
CREATE TABLE IF NOT EXISTS webhook_event_types (
  event_type TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  payload_schema JSONB, -- JSON Schema for the event payload
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert standard event types
INSERT INTO webhook_event_types (event_type, description) VALUES
  ('ticket.created', 'Fired when a new ticket is created'),
  ('ticket.updated', 'Fired when a ticket is updated (status, priority, assignment, etc.)'),
  ('ticket.resolved', 'Fired when a ticket is marked as resolved'),
  ('ticket.escalated', 'Fired when a ticket is escalated'),
  ('message.created', 'Fired when a new message is added to a ticket'),
  ('message.created.customer', 'Fired when a customer sends a message'),
  ('message.created.agent', 'Fired when an agent sends a message'),
  ('message.created.ai', 'Fired when AI sends a message'),
  ('customer.created', 'Fired when a new customer is created'),
  ('feedback.submitted', 'Fired when customer submits CSAT feedback'),
  ('sla.warning', 'Fired when a ticket SLA is approaching breach'),
  ('sla.breached', 'Fired when a ticket SLA is breached')
ON CONFLICT (event_type) DO NOTHING;

-- Trigger to update webhook_endpoints.updated_at
CREATE OR REPLACE FUNCTION update_webhook_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_endpoints_updated_at ON webhook_endpoints;
CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_endpoints_updated_at();

-- Trigger to update webhook_sources.updated_at
CREATE OR REPLACE FUNCTION update_webhook_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_sources_updated_at ON webhook_sources;
CREATE TRIGGER webhook_sources_updated_at
  BEFORE UPDATE ON webhook_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_sources_updated_at();
