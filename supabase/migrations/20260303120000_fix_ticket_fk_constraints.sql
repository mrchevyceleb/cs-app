-- Fix FK constraints on tickets that are missing ON DELETE clauses.
-- These default to RESTRICT and silently block ticket deletion.

-- proactive_outreach_log.response_ticket_id (from migration 020)
ALTER TABLE proactive_outreach_log
  DROP CONSTRAINT IF EXISTS proactive_outreach_log_response_ticket_id_fkey;

ALTER TABLE proactive_outreach_log
  ADD CONSTRAINT proactive_outreach_log_response_ticket_id_fkey
  FOREIGN KEY (response_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;

-- kb_search_logs.ticket_id (from migration 021)
ALTER TABLE kb_search_logs
  DROP CONSTRAINT IF EXISTS kb_search_logs_ticket_id_fkey;

ALTER TABLE kb_search_logs
  ADD CONSTRAINT kb_search_logs_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;
