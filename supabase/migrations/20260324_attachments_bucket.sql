-- Create the attachments storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read access to attachments
DO $$ BEGIN
  CREATE POLICY "Public read access for attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow service role uploads
DO $$ BEGIN
  CREATE POLICY "Service role upload access for attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND (auth.role() = 'service_role'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow service role deletes
DO $$ BEGIN
  CREATE POLICY "Service role delete access for attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments' AND (auth.role() = 'service_role'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
