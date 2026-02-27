
-- Add payment_method column to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

-- Allow professionals to insert payments for their own bookings
CREATE POLICY "Professionals can insert own payments"
ON public.payments
FOR INSERT
WITH CHECK (professional_id = get_my_professional_id());

-- Allow professionals to update own payments
CREATE POLICY "Professionals can update own payments"
ON public.payments
FOR UPDATE
USING (professional_id = get_my_professional_id());
