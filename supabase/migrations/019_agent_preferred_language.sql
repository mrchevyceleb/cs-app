-- Add preferred_language column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- Update existing agents to have 'en' as default (already covered by DEFAULT, but good practice)
UPDATE agents SET preferred_language = 'en' WHERE preferred_language IS NULL;
