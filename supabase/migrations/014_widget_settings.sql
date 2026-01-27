-- Ensure pgcrypto extension is available for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Widget settings table for storing widget configuration
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'Support',
  greeting TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',
  primary_color TEXT NOT NULL DEFAULT '#4F46E5',
  position TEXT NOT NULL DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  theme TEXT NOT NULL DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generate initial API key if no settings exist (using UUID for uniqueness)
INSERT INTO widget_settings (api_key)
VALUES ('wk_' || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_widget_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER widget_settings_updated_at
  BEFORE UPDATE ON widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_settings_updated_at();

-- Enable RLS
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write widget settings
CREATE POLICY "Authenticated users can view widget settings"
  ON widget_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update widget settings"
  ON widget_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
