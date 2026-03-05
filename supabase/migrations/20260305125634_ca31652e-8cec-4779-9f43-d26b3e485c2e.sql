
CREATE TABLE public.employee_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.salon_employees(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (employee_id, day_of_week)
);

ALTER TABLE public.employee_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all employee hours" ON public.employee_working_hours FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Salon owners manage own employee hours" ON public.employee_working_hours FOR ALL USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Public can view employee hours" ON public.employee_working_hours FOR SELECT USING (true);
