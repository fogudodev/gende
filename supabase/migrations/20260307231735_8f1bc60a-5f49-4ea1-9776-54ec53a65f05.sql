
-- Upsell rules: which services complement which
CREATE TABLE public.upsell_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  source_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  recommended_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 1,
  promo_message text,
  promo_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  suggestion_count integer NOT NULL DEFAULT 0,
  conversion_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id, source_service_id, recommended_service_id)
);

-- Track upsell events (suggestions and conversions)
CREATE TABLE public.upsell_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  source_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  recommended_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_phone text,
  channel text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'suggested',
  upsell_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upsell_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_events ENABLE ROW LEVEL SECURITY;

-- RLS for upsell_rules
CREATE POLICY "Professionals manage own upsell rules"
  ON public.upsell_rules FOR ALL TO authenticated
  USING (professional_id = public.get_my_professional_id())
  WITH CHECK (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all upsell rules"
  ON public.upsell_rules FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view active upsell rules"
  ON public.upsell_rules FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- RLS for upsell_events
CREATE POLICY "Professionals manage own upsell events"
  ON public.upsell_events FOR ALL TO authenticated
  USING (professional_id = public.get_my_professional_id())
  WITH CHECK (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all upsell events"
  ON public.upsell_events FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Updated_at trigger
CREATE TRIGGER update_upsell_rules_updated_at
  BEFORE UPDATE ON public.upsell_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
