-- Fix tickets that got backfilled with 0% confidence because their
-- linked messages had NULL/0 confidence values.
-- Assign reasonable defaults based on ai_agent_sessions.result_type:
--   response → 0.75 (the AI did respond successfully)
--   escalation/timeout → 0.30 (low confidence, correctly escalated)

-- 1. Tickets with ai_agent_sessions records but 0 confidence
UPDATE tickets t
SET
  ai_confidence = CASE
    WHEN s.result_type = 'response' THEN 0.75
    WHEN s.result_type = 'escalation' THEN 0.30
    WHEN s.result_type = 'timeout' THEN 0.30
    ELSE 0.50
  END,
  ai_handled = CASE WHEN s.result_type = 'response' THEN true ELSE false END,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ticket_id)
    ticket_id,
    result_type
  FROM ai_agent_sessions
  ORDER BY ticket_id, created_at DESC
) s
WHERE t.id = s.ticket_id
  AND (t.ai_confidence IS NULL OR t.ai_confidence = 0);

-- 2. Remaining tickets with AI messages but still 0 confidence and no sessions
UPDATE tickets t
SET
  ai_confidence = 0.75,
  ai_handled = true,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ticket_id) ticket_id
  FROM messages
  WHERE sender_type = 'ai'
    AND (metadata->>'fallback')::boolean IS NOT TRUE
  ORDER BY ticket_id, created_at DESC
) sub
WHERE t.id = sub.ticket_id
  AND (t.ai_confidence IS NULL OR t.ai_confidence = 0);
