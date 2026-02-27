
-- Junction table: employee <-> service
CREATE TABLE public.employee_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.salon_employees(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, service_id)
);

ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;

-- Salon owner can manage
CREATE POLICY "Salon owners manage employee services"
ON public.employee_services
FOR ALL
USING (
  employee_id IN (
    SELECT id FROM public.salon_employees WHERE salon_id = get_my_professional_id()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.salon_employees WHERE salon_id = get_my_professional_id()
  )
);

-- Admin full access
CREATE POLICY "Admin can manage all employee services"
ON public.employee_services
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Public can view (needed for public booking to filter by employee)
CREATE POLICY "Public can view employee services"
ON public.employee_services
FOR SELECT
USING (true);
