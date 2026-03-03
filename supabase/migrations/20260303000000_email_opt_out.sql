-- Add email opt-out columns to customers table
-- Supports CAN-SPAM/GDPR compliant unsubscribe for proactive emails

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_opt_out_at TIMESTAMPTZ;

-- Index for efficient filtering of opted-out customers in broadcast/outreach queries
CREATE INDEX IF NOT EXISTS idx_customers_email_opt_out
  ON customers (email_opt_out) WHERE email_opt_out = TRUE;

COMMENT ON COLUMN customers.email_opt_out IS 'Whether the customer has opted out of proactive/marketing emails. Transactional emails (ticket updates, agent replies) are exempt.';
COMMENT ON COLUMN customers.email_opt_out_at IS 'Timestamp when the customer opted out of proactive emails.';
