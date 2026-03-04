
CREATE TABLE public.addon_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own purchases"
  ON public.addon_purchases FOR SELECT
  USING (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all purchases"
  ON public.addon_purchases FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
