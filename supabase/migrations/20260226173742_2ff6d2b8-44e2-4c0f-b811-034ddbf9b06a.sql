
-- Add blocked and feature flags to professionals
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_public_page boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blocked_reason text DEFAULT '';
