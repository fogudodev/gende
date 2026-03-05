
CREATE TABLE public.professional_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(professional_id, feature_key)
);

ALTER TABLE public.professional_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all overrides" ON public.professional_feature_overrides
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Professionals view own overrides" ON public.professional_feature_overrides
  FOR SELECT USING (professional_id = get_my_professional_id());

CREATE POLICY "Support can view overrides" ON public.professional_feature_overrides
  FOR SELECT USING (has_role(auth.uid(), 'support'::app_role));
