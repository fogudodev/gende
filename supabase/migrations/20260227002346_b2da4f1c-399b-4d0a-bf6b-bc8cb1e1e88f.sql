
-- Add google_calendar_event_id to bookings for cancellation sync
ALTER TABLE public.bookings ADD COLUMN google_calendar_event_id text;
