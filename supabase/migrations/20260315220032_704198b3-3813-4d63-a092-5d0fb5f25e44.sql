
-- Add course automation trigger types to the enum
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_enrollment_confirmed';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_payment_confirmed';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_reminder_7d';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_reminder_1d';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_reminder_day';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_send_location';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_send_link';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_rescheduled';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_cancelled';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_waitlist_new_class';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_certificate_sent';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_followup';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_feedback_request';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'course_next_offer';
