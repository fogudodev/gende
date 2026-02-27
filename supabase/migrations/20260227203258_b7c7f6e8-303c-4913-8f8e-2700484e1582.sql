
-- Add role column to salon_employees
ALTER TABLE public.salon_employees 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'professional';

-- Cash registers table (abertura/fechamento de caixa)
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.salon_employees(id),
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all cash registers" ON public.cash_registers FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Professionals manage own cash registers" ON public.cash_registers FOR ALL USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Reception employees view own salon cash registers" ON public.cash_registers FOR SELECT USING (
  professional_id IN (
    SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception'
  )
);
CREATE POLICY "Reception employees manage cash registers" ON public.cash_registers FOR INSERT WITH CHECK (
  professional_id IN (
    SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception'
  )
);
CREATE POLICY "Reception employees update cash registers" ON public.cash_registers FOR UPDATE USING (
  professional_id IN (
    SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception'
  )
);

-- Cash transactions table (movimentações do caixa)
CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'entry',
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  description text,
  booking_id uuid REFERENCES public.bookings(id),
  created_by uuid REFERENCES public.salon_employees(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all cash transactions" ON public.cash_transactions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Professionals manage own cash transactions" ON public.cash_transactions FOR ALL USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Reception employees view own salon transactions" ON public.cash_transactions FOR SELECT USING (
  professional_id IN (
    SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception'
  )
);
CREATE POLICY "Reception employees insert transactions" ON public.cash_transactions FOR INSERT WITH CHECK (
  professional_id IN (
    SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception'
  )
);

-- Add RLS policies for reception employees on existing tables
-- Bookings: reception can view and manage bookings for their salon
CREATE POLICY "Reception can view salon bookings" ON public.bookings FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);
CREATE POLICY "Reception can manage salon bookings" ON public.bookings FOR INSERT WITH CHECK (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);
CREATE POLICY "Reception can update salon bookings" ON public.bookings FOR UPDATE USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Clients: reception can view and manage clients
CREATE POLICY "Reception can view salon clients" ON public.clients FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);
CREATE POLICY "Reception can manage salon clients" ON public.clients FOR INSERT WITH CHECK (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);
CREATE POLICY "Reception can update salon clients" ON public.clients FOR UPDATE USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Services: reception can view services (already public for active, but need all)
CREATE POLICY "Reception can view salon services" ON public.services FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- WhatsApp conversations: reception can view
CREATE POLICY "Reception can view salon conversations" ON public.whatsapp_conversations FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Payments: reception can view and insert
CREATE POLICY "Reception can view salon payments" ON public.payments FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);
CREATE POLICY "Reception can insert salon payments" ON public.payments FOR INSERT WITH CHECK (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Salon employees: reception can view colleagues
CREATE POLICY "Reception can view salon employees" ON public.salon_employees FOR SELECT USING (
  salon_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Working hours: reception can view
CREATE POLICY "Reception can view salon working hours" ON public.working_hours FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Blocked times: reception can view
CREATE POLICY "Reception can view salon blocked times" ON public.blocked_times FOR SELECT USING (
  professional_id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Professionals: reception can view their salon's professional profile
CREATE POLICY "Reception can view salon professional" ON public.professionals FOR SELECT USING (
  id IN (SELECT salon_id FROM public.salon_employees WHERE user_id = auth.uid() AND role = 'reception')
);

-- Add trigger for updated_at on cash_registers
CREATE TRIGGER update_cash_registers_updated_at
BEFORE UPDATE ON public.cash_registers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add user_roles entry for reception employees (they use 'user' role for auth)
-- The role differentiation happens via salon_employees.role column
