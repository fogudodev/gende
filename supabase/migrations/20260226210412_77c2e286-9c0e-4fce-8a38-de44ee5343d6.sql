
CREATE OR REPLACE FUNCTION public.auto_create_commission_on_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee record;
  v_commission_amount numeric;
BEGIN
  -- Only fire when status changes to 'completed' and there's an employee
  IF NEW.status = 'completed' 
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.employee_id IS NOT NULL THEN

    -- Get employee commission percentage
    SELECT commission_percentage INTO v_employee
    FROM public.salon_employees
    WHERE id = NEW.employee_id AND is_active = true;

    IF v_employee IS NOT NULL THEN
      v_commission_amount := ROUND((NEW.price * v_employee.commission_percentage / 100), 2);

      -- Avoid duplicates
      IF NOT EXISTS (
        SELECT 1 FROM public.commissions
        WHERE booking_id = NEW.id AND employee_id = NEW.employee_id
      ) THEN
        INSERT INTO public.commissions (
          professional_id, employee_id, booking_id,
          booking_amount, commission_percentage, commission_amount, status
        ) VALUES (
          NEW.professional_id, NEW.employee_id, NEW.id,
          NEW.price, v_employee.commission_percentage, v_commission_amount, 'pending'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_commission_on_completed
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_commission_on_completed();
