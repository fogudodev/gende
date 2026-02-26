
-- Plan limits table (admin configurable)
CREATE TABLE public.plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL UNIQUE,
  daily_reminders integer NOT NULL DEFAULT 5,
  daily_campaigns integer NOT NULL DEFAULT 0,
  campaign_max_contacts integer NOT NULL DEFAULT 0,
  campaign_min_interval_hours integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage plan limits" ON public.plan_limits FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Authenticated can view plan limits" ON public.plan_limits FOR SELECT TO authenticated USING (true);

-- Seed defaults
INSERT INTO public.plan_limits (plan_id, daily_reminders, daily_campaigns, campaign_max_contacts, campaign_min_interval_hours) VALUES
  ('free', 5, 2, 10, 6),
  ('starter', 20, 5, 50, 3),
  ('pro', -1, -1, -1, 1);

-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  target_type text NOT NULL DEFAULT 'all_clients',
  total_contacts integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own campaigns" ON public.campaigns FOR ALL USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all campaigns" ON public.campaigns FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Campaign contacts
CREATE TABLE public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  phone text NOT NULL,
  client_name text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own campaign contacts" ON public.campaign_contacts FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE professional_id = get_my_professional_id()))
  WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE professional_id = get_my_professional_id()));
CREATE POLICY "Admin can manage all campaign contacts" ON public.campaign_contacts FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Daily message usage tracking
CREATE TABLE public.daily_message_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  reminders_sent integer NOT NULL DEFAULT 0,
  campaigns_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id, usage_date)
);

ALTER TABLE public.daily_message_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own usage" ON public.daily_message_usage FOR SELECT USING (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all usage" ON public.daily_message_usage FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_plan_limits_updated_at BEFORE UPDATE ON public.plan_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
