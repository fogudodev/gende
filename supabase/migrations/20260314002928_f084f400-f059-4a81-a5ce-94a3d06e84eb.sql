
-- Loyalty configuration per professional
CREATE TABLE public.loyalty_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  cashback_enabled boolean NOT NULL DEFAULT false,
  default_cashback_percent numeric NOT NULL DEFAULT 5,
  levels_enabled boolean NOT NULL DEFAULT false,
  referral_enabled boolean NOT NULL DEFAULT false,
  referral_reward_amount numeric NOT NULL DEFAULT 20,
  referral_new_client_bonus numeric NOT NULL DEFAULT 20,
  challenges_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id)
);
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own loyalty config" ON public.loyalty_config FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all loyalty config" ON public.loyalty_config FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Cashback rules
CREATE TABLE public.cashback_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  rule_type text NOT NULL DEFAULT 'service',
  cashback_percent numeric NOT NULL DEFAULT 5,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  start_hour time,
  end_hour time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cashback_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own cashback rules" ON public.cashback_rules FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all cashback rules" ON public.cashback_rules FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Client cashback balances
CREATE TABLE public.client_cashback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, professional_id)
);
ALTER TABLE public.client_cashback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own client cashback" ON public.client_cashback FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all client cashback" ON public.client_cashback FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Cashback transactions
CREATE TABLE public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'earn',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own cashback transactions" ON public.cashback_transactions FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all cashback transactions" ON public.cashback_transactions FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Loyalty levels definition
CREATE TABLE public.loyalty_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_visits integer NOT NULL DEFAULT 0,
  min_spent numeric NOT NULL DEFAULT 0,
  cashback_bonus_percent numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#CD7F32',
  benefits text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own loyalty levels" ON public.loyalty_levels FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all loyalty levels" ON public.loyalty_levels FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Client loyalty tracking
CREATE TABLE public.client_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  level_id uuid REFERENCES public.loyalty_levels(id) ON DELETE SET NULL,
  total_visits integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  referral_count integer NOT NULL DEFAULT 0,
  last_visit_at timestamptz,
  avg_days_between_visits numeric,
  retention_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, professional_id)
);
ALTER TABLE public.client_loyalty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own client loyalty" ON public.client_loyalty FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all client loyalty" ON public.client_loyalty FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Client referrals
CREATE TABLE public.client_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  referrer_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  referred_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reward_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.client_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own referrals" ON public.client_referrals FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all referrals" ON public.client_referrals FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Loyalty challenges
CREATE TABLE public.loyalty_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL DEFAULT 'visits',
  target_value integer NOT NULL DEFAULT 3,
  reward_type text NOT NULL DEFAULT 'cashback',
  reward_value numeric NOT NULL DEFAULT 0,
  reward_description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own challenges" ON public.loyalty_challenges FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all challenges" ON public.loyalty_challenges FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Challenge progress per client
CREATE TABLE public.challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.loyalty_challenges(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, client_id)
);
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own challenge progress" ON public.challenge_progress FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all challenge progress" ON public.challenge_progress FOR ALL USING (is_admin()) WITH CHECK (is_admin());
