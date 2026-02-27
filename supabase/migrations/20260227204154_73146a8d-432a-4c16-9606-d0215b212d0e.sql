
-- Trigger to automatically create a cash entry when a booking is completed with payment
CREATE OR REPLACE FUNCTION public.auto_cash_entry_on_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_open_register record;
BEGIN
  -- Only fire when status changes to 'completed' and price > 0
  IF NEW.status = 'completed' 
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.price > 0 THEN

    -- Find an open cash register for this professional
    SELECT * INTO v_open_register
    FROM public.cash_registers
    WHERE professional_id = NEW.professional_id
      AND status = 'open'
    ORDER BY opened_at DESC
    LIMIT 1;

    -- Only insert if there's an open register
    IF v_open_register IS NOT NULL THEN
      -- Avoid duplicates
      IF NOT EXISTS (
        SELECT 1 FROM public.cash_transactions
        WHERE booking_id = NEW.id AND cash_register_id = v_open_register.id
      ) THEN
        INSERT INTO public.cash_transactions (
          cash_register_id, professional_id, type, amount,
          payment_method, description, booking_id
        ) VALUES (
          v_open_register.id, NEW.professional_id, 'entry', NEW.price,
          'other', 'Agendamento: ' || COALESCE(NEW.client_name, 'Cliente'), NEW.id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
CREATE TRIGGER auto_cash_entry_on_booking_completed
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_cash_entry_on_booking_completed();
