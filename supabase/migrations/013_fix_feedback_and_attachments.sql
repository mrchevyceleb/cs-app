-- Fix feedback request defaults and attachment pre-upload schema

ALTER TABLE ticket_feedback
  ALTER COLUMN rating DROP NOT NULL,
  ALTER COLUMN submitted_at DROP DEFAULT;

ALTER TABLE message_attachments
  ALTER COLUMN message_id DROP NOT NULL;

-- Update feedback token generator to create unsubmitted requests
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
  VALUES (p_ticket_id, v_customer_id, NULL, v_token, now() + interval '7 days', NULL)
  ON CONFLICT (ticket_id) DO UPDATE SET
    feedback_token = v_token,
    token_expires_at = now() + interval '7 days'
  WHERE ticket_feedback.submitted_at IS NULL; -- Only update if not yet submitted

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
