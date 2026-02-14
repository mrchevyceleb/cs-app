-- Migration 026: AI-First Automation
-- Adds queue_type and ai_exchange_count to tickets for AI-first workflow

-- Track how many AI exchanges have occurred on a ticket (email 3-exchange rule)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_exchange_count INTEGER NOT NULL DEFAULT 0;

-- Authoritative queue assignment: 'ai' = AI is handling, 'human' = needs human attention
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS queue_type TEXT NOT NULL DEFAULT 'ai'
  CHECK (queue_type IN ('ai', 'human'));

-- Index for efficient queue filtering
CREATE INDEX IF NOT EXISTS idx_tickets_queue_type ON tickets (queue_type);
CREATE INDEX IF NOT EXISTS idx_tickets_queue_status ON tickets (queue_type, status);

-- Backfill: escalated tickets belong in the human queue
UPDATE tickets SET queue_type = 'human' WHERE status = 'escalated';
