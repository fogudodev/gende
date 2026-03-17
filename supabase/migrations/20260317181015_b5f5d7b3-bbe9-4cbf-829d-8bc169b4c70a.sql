
-- Function to auto-mark past bookings as no_show
CREATE OR REPLACE FUNCTION public.auto_mark_no_show()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE bookings
  SET status = 'no_show', updated_at = now()
  WHERE status IN ('pending', 'confirmed')
    AND end_time < now();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Create a cron job to run every hour
SELECT cron.schedule(
  'auto-mark-no-show',
  '0 * * * *',
  $$SELECT public.auto_mark_no_show()$$
);
