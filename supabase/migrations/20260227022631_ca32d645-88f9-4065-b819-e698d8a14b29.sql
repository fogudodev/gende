
-- Platform reviews (about the platform itself, visible to admin)
CREATE TABLE public.platform_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a platform review (public booking flow)
CREATE POLICY "Public can insert platform reviews"
ON public.platform_reviews FOR INSERT
WITH CHECK (
  professional_id IS NOT NULL
  AND rating >= 1 AND rating <= 5
  AND client_name IS NOT NULL
  AND length(TRIM(BOTH FROM client_name)) >= 2
);

-- Admin can view all platform reviews
CREATE POLICY "Admin can view all platform reviews"
ON public.platform_reviews FOR SELECT
USING (is_admin());

-- Admin can manage all platform reviews
CREATE POLICY "Admin can manage all platform reviews"
ON public.platform_reviews FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
