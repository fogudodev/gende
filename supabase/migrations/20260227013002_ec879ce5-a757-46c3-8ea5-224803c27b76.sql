
-- Create professional-specific limit overrides
CREATE TABLE public.professional_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  daily_reminders integer,
  daily_campaigns integer,
  campaign_max_contacts integer,
  campaign_min_interval_hours integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id)
);

ALTER TABLE public.professional_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage professional limits"
ON public.professional_limits FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Support can manage professional limits"
ON public.professional_limits FOR ALL
USING (public.has_role(auth.uid(), 'support'))
WITH CHECK (public.has_role(auth.uid(), 'support'));

CREATE POLICY "Professionals view own limits"
ON public.professional_limits FOR SELECT
USING (professional_id = public.get_my_professional_id());

-- Add support role check function
CREATE OR REPLACE FUNCTION public.is_support()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('support', 'admin')
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_professional_limits_updated_at
BEFORE UPDATE ON public.professional_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
