-- Migration 015: Channel Support
-- Adds multi-channel communication support (SMS, Email, Slack, API)

-- Add source/channel columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'dashboard'
  CHECK (source IN ('dashboard', 'portal', 'widget', 'sms', 'email', 'slack', 'api'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS routing_decision JSONB;

-- Create index for external_id lookups (e.g., Twilio message SID)
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id) WHERE external_id IS NOT NULL;

-- Add phone_number to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number) WHERE phone_number IS NOT NULL;

-- Channel inbound logs - track all incoming messages from external channels
CREATE TABLE IF NOT EXISTS channel_inbound_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'slack', 'api', 'webhook')),
  external_id TEXT,
  from_identifier TEXT NOT NULL, -- phone number, email, slack user ID, etc.
  to_identifier TEXT, -- our phone number, email, slack channel, etc.
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_channel_inbound_logs_channel ON channel_inbound_logs(channel);
CREATE INDEX IF NOT EXISTS idx_channel_inbound_logs_external_id ON channel_inbound_logs(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_inbound_logs_processed ON channel_inbound_logs(processed) WHERE processed = false;

-- Email threading support
CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id_header TEXT NOT NULL, -- Email Message-ID header
  in_reply_to TEXT, -- In-Reply-To header
  references_header TEXT, -- References header (comma-separated)
  subject TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_threads_message_id ON email_threads(message_id_header);
CREATE INDEX IF NOT EXISTS idx_email_threads_ticket_id ON email_threads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_in_reply_to ON email_threads(in_reply_to) WHERE in_reply_to IS NOT NULL;

-- Channel configuration
CREATE TABLE IF NOT EXISTS channel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL UNIQUE CHECK (channel IN ('sms', 'email', 'slack', 'widget')),
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  -- AI routing settings per channel
  ai_auto_respond BOOLEAN DEFAULT false,
  ai_confidence_threshold DECIMAL(3,2) DEFAULT 0.85,
  ai_escalation_keywords TEXT[], -- Keywords that trigger immediate escalation
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default channel configs
INSERT INTO channel_config (channel, enabled, config) VALUES
  ('widget', true, '{"greeting": "Hello! How can we help you today?"}'::jsonb),
  ('email', false, '{"inbound_address": null, "send_from": null}'::jsonb),
  ('sms', false, '{"phone_number": null, "provider": "twilio"}'::jsonb),
  ('slack', false, '{"workspace_id": null, "channel_id": null}'::jsonb)
ON CONFLICT (channel) DO NOTHING;

-- Add channel to tickets for tracking original source
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source_channel VARCHAR(20) DEFAULT 'widget'
  CHECK (source_channel IN ('widget', 'portal', 'sms', 'email', 'slack', 'api'));

-- Add preferred_channel to customers for reply routing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) DEFAULT 'email'
  CHECK (preferred_channel IN ('email', 'sms', 'slack', 'widget'));

-- Trigger to update channel_config.updated_at
CREATE OR REPLACE FUNCTION update_channel_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS channel_config_updated_at ON channel_config;
CREATE TRIGGER channel_config_updated_at
  BEFORE UPDATE ON channel_config
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_config_updated_at();
