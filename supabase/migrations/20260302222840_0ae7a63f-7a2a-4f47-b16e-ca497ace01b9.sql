
-- Table for admin-generated authorization codes
CREATE TABLE public.admin_auth_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone,
  used_by uuid,
  is_used boolean NOT NULL DEFAULT false
);

ALTER TABLE public.admin_auth_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all auth codes"
ON public.admin_auth_codes
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Support can validate codes (select only)
CREATE POLICY "Support can view auth codes"
ON public.admin_auth_codes
FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

-- Support can mark codes as used
CREATE POLICY "Support can update auth codes"
ON public.admin_auth_codes
FOR UPDATE
USING (has_role(auth.uid(), 'support'::app_role));
