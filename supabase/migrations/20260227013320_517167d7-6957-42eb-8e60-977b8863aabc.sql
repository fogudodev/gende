
-- Chat messages for payment receipts and support
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'user', -- 'user' or 'support'
  sender_name text,
  message text,
  attachment_url text,
  chat_type text NOT NULL DEFAULT 'payment', -- 'payment' or 'support'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own chat messages"
ON public.chat_messages FOR ALL
USING (professional_id = public.get_my_professional_id())
WITH CHECK (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all chat messages"
ON public.chat_messages FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Support can manage all chat messages"
ON public.chat_messages FOR ALL
USING (public.has_role(auth.uid(), 'support'))
WITH CHECK (public.has_role(auth.uid(), 'support'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
