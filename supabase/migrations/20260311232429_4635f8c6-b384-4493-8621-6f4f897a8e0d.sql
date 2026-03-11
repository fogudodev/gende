
-- Instagram accounts table
CREATE TABLE public.instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  instagram_user_id text NOT NULL,
  username text NOT NULL,
  account_name text,
  page_id text NOT NULL,
  access_token text NOT NULL,
  token_expiration timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  auto_comment_reply_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(professional_id)
);

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own instagram accounts" ON public.instagram_accounts
  FOR ALL TO authenticated
  USING (professional_id = get_my_professional_id())
  WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all instagram accounts" ON public.instagram_accounts
  FOR ALL TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Instagram messages table
CREATE TABLE public.instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  instagram_user_id text NOT NULL,
  sender_id text NOT NULL,
  sender_username text,
  message_text text,
  message_type text NOT NULL DEFAULT 'dm',
  direction text NOT NULL DEFAULT 'incoming',
  is_read boolean NOT NULL DEFAULT false,
  booking_id uuid REFERENCES public.bookings(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own instagram messages" ON public.instagram_messages
  FOR SELECT TO authenticated
  USING (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all instagram messages" ON public.instagram_messages
  FOR ALL TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Instagram keywords table
CREATE TABLE public.instagram_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  response_type text NOT NULL DEFAULT 'booking_link',
  custom_response text,
  is_active boolean NOT NULL DEFAULT true,
  trigger_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own instagram keywords" ON public.instagram_keywords
  FOR ALL TO authenticated
  USING (professional_id = get_my_professional_id())
  WITH CHECK (professional_id = get_my_professional_id());

CREATE POLICY "Admin can manage all instagram keywords" ON public.instagram_keywords
  FOR ALL TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add updated_at trigger
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON public.instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instagram_keywords_updated_at
  BEFORE UPDATE ON public.instagram_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
