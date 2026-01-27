-- Sprint 4: Customer Portal Schema
-- Access tokens for customer portal authentication and email logging

-- Customer access tokens for portal authentication
CREATE TABLE IF NOT EXISTS customer_access_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE, -- Optional: token for specific ticket
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_customer_tokens_token ON customer_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_customer_tokens_customer ON customer_access_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tokens_expires ON customer_access_tokens(expires_at);

-- Email log for tracking sent notifications
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  email_type text NOT NULL, -- 'ticket_created', 'ticket_updated', 'ticket_resolved', 'agent_reply', 'reminder'
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  provider_id text, -- Resend message ID
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Index for email tracking
CREATE INDEX IF NOT EXISTS idx_email_logs_ticket ON email_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer ON email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);

-- File attachments for messages
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL, -- MIME type
  file_size integer NOT NULL, -- bytes
  storage_path text NOT NULL, -- Supabase storage path
  public_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id);

-- RLS policies
ALTER TABLE customer_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Agents can view all tokens (for support purposes)
CREATE POLICY "Agents can view tokens" ON customer_access_tokens
  FOR SELECT USING (true);

-- System can manage tokens
CREATE POLICY "System can manage tokens" ON customer_access_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- Agents can view email logs
CREATE POLICY "Agents can view email logs" ON email_logs
  FOR SELECT USING (true);

CREATE POLICY "System can manage email logs" ON email_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Everyone can view attachments for tickets they have access to
CREATE POLICY "View attachments" ON message_attachments
  FOR SELECT USING (true);

CREATE POLICY "Insert attachments" ON message_attachments
  FOR INSERT WITH CHECK (true);

-- Function to generate access token
CREATE OR REPLACE FUNCTION generate_customer_token(
  p_customer_id uuid,
  p_ticket_id uuid DEFAULT NULL,
  p_expires_in_days integer DEFAULT 30
) RETURNS text AS $$
DECLARE
  v_token text;
BEGIN
  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Insert the token
  INSERT INTO customer_access_tokens (customer_id, ticket_id, token, expires_at)
  VALUES (p_customer_id, p_ticket_id, v_token, now() + (p_expires_in_days || ' days')::interval);

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate token
CREATE OR REPLACE FUNCTION validate_customer_token(p_token text)
RETURNS TABLE(customer_id uuid, ticket_id uuid) AS $$
BEGIN
  -- Update last_used_at and return customer info if valid
  UPDATE customer_access_tokens
  SET last_used_at = now()
  WHERE token = p_token AND expires_at > now();

  RETURN QUERY
  SELECT cat.customer_id, cat.ticket_id
  FROM customer_access_tokens cat
  WHERE cat.token = p_token AND cat.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE customer_access_tokens IS 'Secure access tokens for customer portal authentication';
COMMENT ON TABLE email_logs IS 'Log of all email notifications sent to customers';
COMMENT ON TABLE message_attachments IS 'File attachments for ticket messages';
