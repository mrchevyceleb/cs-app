-- Unique partial index on (channel, external_id) for atomic deduplication.
-- Prevents duplicate processing when webhooks retry concurrently.
-- Partial: only applies when external_id is NOT NULL (emails without Message-ID are not deduped).
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_inbound_logs_channel_external_id
  ON channel_inbound_logs (channel, external_id)
  WHERE external_id IS NOT NULL;
