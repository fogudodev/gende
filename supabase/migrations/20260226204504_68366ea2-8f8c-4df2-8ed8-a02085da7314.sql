
-- Add employee_id to bookings for salon employee tracking
ALTER TABLE public.bookings
ADD COLUMN employee_id uuid REFERENCES public.salon_employees(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_bookings_employee_id ON public.bookings(employee_id);
