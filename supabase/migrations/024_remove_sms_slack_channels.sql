-- Migration 024: Remove SMS and Slack channels
-- These channels are being removed from the application.
-- Phone number column is kept for contact info purposes.

-- 1. Update customers with sms/slack preferred_channel to 'email'
UPDATE customers
SET preferred_channel = 'email'
WHERE preferred_channel IN ('sms', 'slack');

-- 2. Delete channel_config rows for sms and slack
DELETE FROM channel_config
WHERE channel IN ('sms', 'slack');

-- 3. Update check constraint on channel_config.channel
ALTER TABLE channel_config
  DROP CONSTRAINT IF EXISTS channel_config_channel_check;
ALTER TABLE channel_config
  ADD CONSTRAINT channel_config_channel_check
  CHECK (channel IN ('email', 'widget'));

-- 4. Update check constraint on messages.source
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_source_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_source_check
  CHECK (source IN ('dashboard', 'portal', 'widget', 'email', 'api'));

-- 5. Update check constraint on tickets.source_channel
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_source_channel_check;
ALTER TABLE tickets
  ADD CONSTRAINT tickets_source_channel_check
  CHECK (source_channel IN ('dashboard', 'portal', 'widget', 'email', 'api'));

-- 6. Update check constraint on customers.preferred_channel
ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_preferred_channel_check;
ALTER TABLE customers
  ADD CONSTRAINT customers_preferred_channel_check
  CHECK (preferred_channel IN ('email', 'widget'));
