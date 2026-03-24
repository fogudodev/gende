-- Allow admin and support users to upload files to any folder in professionals bucket
CREATE POLICY "Admin/support can upload any files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'professionals'
  AND public.is_support()
);

-- Allow admin and support users to update files
CREATE POLICY "Admin/support can update any files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'professionals'
  AND public.is_support()
);

-- Allow admin and support users to delete files
CREATE POLICY "Admin/support can delete any files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'professionals'
  AND public.is_support()
);

-- Also allow anon uploads to professionals bucket for impersonation scenarios
CREATE POLICY "Allow authenticated uploads to professionals"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'professionals'
);