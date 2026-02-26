
-- Reviews table for client feedback
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.salon_employees(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own reviews" ON public.reviews
FOR ALL USING (professional_id = get_my_professional_id())
WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all reviews" ON public.reviews
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Public can insert reviews" ON public.reviews
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view public reviews" ON public.reviews
FOR SELECT USING (is_public = true);

CREATE INDEX idx_reviews_professional ON public.reviews(professional_id);
CREATE INDEX idx_reviews_employee ON public.reviews(employee_id);

-- Expenses table for tracking costs
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Geral',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  employee_id uuid REFERENCES public.salon_employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own expenses" ON public.expenses
FOR ALL USING (professional_id = get_my_professional_id())
WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all expenses" ON public.expenses
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX idx_expenses_professional ON public.expenses(professional_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commissions table for tracking payouts to employees
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.salon_employees(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  booking_amount numeric NOT NULL DEFAULT 0,
  commission_percentage numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own commissions" ON public.commissions
FOR ALL USING (professional_id = get_my_professional_id())
WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all commissions" ON public.commissions
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX idx_commissions_professional ON public.commissions(professional_id);
CREATE INDEX idx_commissions_employee ON public.commissions(employee_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
