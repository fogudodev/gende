-- Add maintenance interval to services (how many days between maintenance appointments)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS maintenance_interval_days integer DEFAULT NULL;

-- Add post_sale_review trigger type to automation_trigger enum
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'maintenance_reminder';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'post_sale_review';
