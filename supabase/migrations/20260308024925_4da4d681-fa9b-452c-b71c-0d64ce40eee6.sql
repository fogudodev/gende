
-- Add priority and client_id to waitlist table
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.salon_employees(id) ON DELETE SET NULL;

-- Waitlist offers table: tracks each offer sent to a client for a specific slot
CREATE TABLE IF NOT EXISTS public.waitlist_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  waitlist_entry_id uuid REFERENCES public.waitlist(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  slot_start timestamptz NOT NULL,
  slot_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  reserved_until timestamptz,
  responded_at timestamptz,
  created_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own waitlist offers"
  ON public.waitlist_offers FOR ALL TO authenticated
  USING (professional_id = get_my_professional_id())
  WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all waitlist offers"
  ON public.waitlist_offers FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Waitlist settings table
CREATE TABLE IF NOT EXISTS public.waitlist_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  max_notifications integer NOT NULL DEFAULT 3,
  reservation_minutes integer NOT NULL DEFAULT 3,
  prioritize_vip boolean NOT NULL DEFAULT true,
  auto_process boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own waitlist settings"
  ON public.waitlist_settings FOR ALL TO authenticated
  USING (professional_id = get_my_professional_id())
  WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all waitlist settings"
  ON public.waitlist_settings FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
