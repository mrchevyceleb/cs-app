-- Backfill ai_confidence and ai_handled from ai_agent_sessions
UPDATE tickets t
SET
  ai_confidence = s.confidence,
  ai_handled = CASE WHEN s.result_type = 'response' THEN true ELSE false END,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ticket_id)
    ticket_id,
    result_type,
    COALESCE(
      (SELECT m.confidence FROM messages m WHERE m.id = ais.message_id),
      0
    ) / 100.0 AS confidence
  FROM ai_agent_sessions ais
  ORDER BY ticket_id, created_at DESC
) s
WHERE t.id = s.ticket_id
  AND t.ai_confidence IS NULL;

-- Catch remaining tickets with AI messages but no session records
UPDATE tickets t
SET
  ai_handled = true,
  ai_confidence = sub.confidence / 100.0,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ticket_id)
    ticket_id,
    COALESCE(confidence, 0) AS confidence
  FROM messages
  WHERE sender_type = 'ai'
    AND (metadata->>'fallback')::boolean IS NOT TRUE
  ORDER BY ticket_id, created_at DESC
) sub
WHERE t.id = sub.ticket_id
  AND t.ai_confidence IS NULL;
