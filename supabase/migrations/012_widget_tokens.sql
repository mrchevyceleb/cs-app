-- Widget Token Extensions
-- Extends customer_access_tokens for widget authentication

-- Add source column to track where token was created
ALTER TABLE customer_access_tokens
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'portal';

-- Add metadata column for additional token info
ALTER TABLE customer_access_tokens
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment for new columns
COMMENT ON COLUMN customer_access_tokens.source IS 'Source of token creation: portal or widget';
COMMENT ON COLUMN customer_access_tokens.metadata IS 'Additional metadata like origin domain, user agent, etc.';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_customer_tokens_source ON customer_access_tokens(source);

-- Make expires_at nullable for widget tokens (can be long-lived)
ALTER TABLE customer_access_tokens
ALTER COLUMN expires_at DROP NOT NULL;

-- Update generate_customer_token function to support source and metadata
CREATE OR REPLACE FUNCTION generate_customer_token(
  p_customer_id uuid,
  p_ticket_id uuid DEFAULT NULL,
  p_expires_in_days integer DEFAULT 30,
  p_source VARCHAR(20) DEFAULT 'portal',
  p_metadata JSONB DEFAULT '{}'
) RETURNS text AS $$
DECLARE
  v_token text;
  v_expires_at timestamptz;
BEGIN
  -- Generate a secure random token with prefix based on source
  IF p_source = 'widget' THEN
    v_token := 'wt_' || encode(gen_random_bytes(32), 'hex');
  ELSE
    v_token := encode(gen_random_bytes(32), 'hex');
  END IF;

  -- Calculate expiration (NULL if expires_in_days is 0 or negative)
  IF p_expires_in_days > 0 THEN
    v_expires_at := now() + (p_expires_in_days || ' days')::interval;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Insert the token
  INSERT INTO customer_access_tokens (customer_id, ticket_id, token, expires_at, source, metadata)
  VALUES (p_customer_id, p_ticket_id, v_token, v_expires_at, p_source, p_metadata);

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update validate_customer_token to return source
CREATE OR REPLACE FUNCTION validate_customer_token(p_token text)
RETURNS TABLE(customer_id uuid, ticket_id uuid, source VARCHAR(20)) AS $$
BEGIN
  -- Update last_used_at and return customer info if valid
  UPDATE customer_access_tokens
  SET last_used_at = now()
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now());

  RETURN QUERY
  SELECT cat.customer_id, cat.ticket_id, cat.source
  FROM customer_access_tokens cat
  WHERE cat.token = p_token
    AND (cat.expires_at IS NULL OR cat.expires_at > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM customer_access_tokens
  WHERE expires_at IS NOT NULL AND expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Remove expired access tokens. Can be called periodically via cron.';
