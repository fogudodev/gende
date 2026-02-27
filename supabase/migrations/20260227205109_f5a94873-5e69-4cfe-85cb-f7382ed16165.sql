
-- Fix infinite recursion in salon_employees RLS policy
-- The "Reception can view salon employees" policy references salon_employees within itself

DROP POLICY IF EXISTS "Reception can view salon employees" ON public.salon_employees;

-- Use a function to break the recursion cycle
CREATE OR REPLACE FUNCTION public.get_reception_salon_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT salon_id FROM public.salon_employees 
  WHERE user_id = auth.uid() AND role = 'reception' 
  LIMIT 1
$$;

-- Recreate the policy using the function instead of a subquery
CREATE POLICY "Reception can view salon employees"
ON public.salon_employees
FOR SELECT
USING (salon_id = get_reception_salon_id());

-- Also fix the professionals "Reception can view salon professional" policy 
-- which has the same recursion issue
DROP POLICY IF EXISTS "Reception can view salon professional" ON public.professionals;

CREATE POLICY "Reception can view salon professional"
ON public.professionals
FOR SELECT
USING (id = get_reception_salon_id());

-- Fix all other policies that reference salon_employees with subqueries
-- These also cause recursion when salon_employees is queried

-- blocked_times
DROP POLICY IF EXISTS "Reception can view salon blocked times" ON public.blocked_times;
CREATE POLICY "Reception can view salon blocked times"
ON public.blocked_times
FOR SELECT
USING (professional_id = get_reception_salon_id());

-- bookings
DROP POLICY IF EXISTS "Reception can view salon bookings" ON public.bookings;
CREATE POLICY "Reception can view salon bookings"
ON public.bookings
FOR SELECT
USING (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception can manage salon bookings" ON public.bookings;
CREATE POLICY "Reception can manage salon bookings"
ON public.bookings
FOR INSERT
WITH CHECK (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception can update salon bookings" ON public.bookings;
CREATE POLICY "Reception can update salon bookings"
ON public.bookings
FOR UPDATE
USING (professional_id = get_reception_salon_id());

-- clients
DROP POLICY IF EXISTS "Reception can view salon clients" ON public.clients;
CREATE POLICY "Reception can view salon clients"
ON public.clients
FOR SELECT
USING (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception can manage salon clients" ON public.clients;
CREATE POLICY "Reception can manage salon clients"
ON public.clients
FOR INSERT
WITH CHECK (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception can update salon clients" ON public.clients;
CREATE POLICY "Reception can update salon clients"
ON public.clients
FOR UPDATE
USING (professional_id = get_reception_salon_id());

-- services
DROP POLICY IF EXISTS "Reception can view salon services" ON public.services;
CREATE POLICY "Reception can view salon services"
ON public.services
FOR SELECT
USING (professional_id = get_reception_salon_id());

-- payments
DROP POLICY IF EXISTS "Reception can view salon payments" ON public.payments;
CREATE POLICY "Reception can view salon payments"
ON public.payments
FOR SELECT
USING (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception can insert salon payments" ON public.payments;
CREATE POLICY "Reception can insert salon payments"
ON public.payments
FOR INSERT
WITH CHECK (professional_id = get_reception_salon_id());

-- cash_registers
DROP POLICY IF EXISTS "Reception employees view own salon cash registers" ON public.cash_registers;
CREATE POLICY "Reception employees view own salon cash registers"
ON public.cash_registers
FOR SELECT
USING (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception employees manage cash registers" ON public.cash_registers;
CREATE POLICY "Reception employees manage cash registers"
ON public.cash_registers
FOR INSERT
WITH CHECK (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception employees update cash registers" ON public.cash_registers;
CREATE POLICY "Reception employees update cash registers"
ON public.cash_registers
FOR UPDATE
USING (professional_id = get_reception_salon_id());

-- cash_transactions
DROP POLICY IF EXISTS "Reception employees view own salon transactions" ON public.cash_transactions;
CREATE POLICY "Reception employees view own salon transactions"
ON public.cash_transactions
FOR SELECT
USING (professional_id = get_reception_salon_id());

DROP POLICY IF EXISTS "Reception employees insert transactions" ON public.cash_transactions;
CREATE POLICY "Reception employees insert transactions"
ON public.cash_transactions
FOR INSERT
WITH CHECK (professional_id = get_reception_salon_id());

-- whatsapp_conversations
DROP POLICY IF EXISTS "Reception can view salon conversations" ON public.whatsapp_conversations;
CREATE POLICY "Reception can view salon conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (professional_id = get_reception_salon_id());
