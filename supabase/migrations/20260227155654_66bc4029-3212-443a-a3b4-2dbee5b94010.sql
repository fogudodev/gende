-- Drop the existing restrictive upload policy
DROP POLICY "Professionals upload own files" ON storage.objects;

-- Create a new policy that checks professional_id via the professionals table
CREATE POLICY "Professionals upload own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'professionals' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Also fix update and delete policies
DROP POLICY "Professionals update own files" ON storage.objects;
CREATE POLICY "Professionals update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'professionals' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
  )
);

DROP POLICY "Professionals delete own files" ON storage.objects;
CREATE POLICY "Professionals delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'professionals' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
  )
);