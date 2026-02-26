
-- Make the public insert policy more restrictive: require professional_id and rating
DROP POLICY "Public can insert reviews" ON public.reviews;

CREATE POLICY "Public can insert reviews with valid data" ON public.reviews
FOR INSERT WITH CHECK (
  professional_id IS NOT NULL 
  AND rating >= 1 
  AND rating <= 5
  AND client_name IS NOT NULL
  AND length(trim(client_name)) >= 2
);
