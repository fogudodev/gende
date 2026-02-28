
-- Add columns for purchased add-ons to professional_limits
ALTER TABLE public.professional_limits 
ADD COLUMN IF NOT EXISTS extra_reminders_purchased integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_campaigns_purchased integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_contacts_purchased integer NOT NULL DEFAULT 0;
