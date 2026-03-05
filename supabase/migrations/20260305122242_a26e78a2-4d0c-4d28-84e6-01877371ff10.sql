
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  preferred_date date NOT NULL,
  preferred_period text NOT NULL DEFAULT 'any',
  status text NOT NULL DEFAULT 'waiting',
  notes text,
  notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own waitlist"
  ON public.waitlist FOR ALL
  TO authenticated
  USING (professional_id = get_my_professional_id())
  WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all waitlist"
  ON public.waitlist FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public can insert waitlist"
  ON public.waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (professional_id IS NOT NULL AND client_name IS NOT NULL AND length(trim(client_name)) >= 2);

CREATE POLICY "Support can view all waitlist"
  ON public.waitlist FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role));
