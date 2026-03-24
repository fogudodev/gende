-- Allow uploads from any user (including unauthenticated/PHP backend sessions)
-- The bucket is already public for reads, and paths are namespaced by professional_id
CREATE POLICY "Allow public uploads to professionals bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'professionals'
);