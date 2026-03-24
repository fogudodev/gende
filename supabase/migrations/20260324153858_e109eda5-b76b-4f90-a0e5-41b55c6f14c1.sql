-- Remove overly permissive anon policy
DROP POLICY IF EXISTS "Allow authenticated uploads to professionals" ON storage.objects;