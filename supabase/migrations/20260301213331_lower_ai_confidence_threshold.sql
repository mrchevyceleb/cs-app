-- Lower AI confidence threshold from 85% to 70% to keep more tickets with AI
ALTER TABLE channel_config ALTER COLUMN ai_confidence_threshold SET DEFAULT 0.70;

UPDATE channel_config
SET ai_confidence_threshold = 0.70
WHERE ai_confidence_threshold = 0.85;
