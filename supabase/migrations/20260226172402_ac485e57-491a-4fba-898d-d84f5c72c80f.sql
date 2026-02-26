
-- Create storage bucket for professional avatars and logos
INSERT INTO storage.buckets (id, name, public) VALUES ('professionals', 'professionals', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Professionals upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'professionals'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Professionals update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'professionals'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Professionals delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'professionals'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public read access for professionals bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'professionals');
