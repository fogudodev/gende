
-- Add system customization columns
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS system_accent_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS system_sidebar_color text DEFAULT NULL;
