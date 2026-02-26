
-- ============================================
-- GLOW SaaS - Complete Database Schema
-- ============================================

-- 1. ENUM TYPES
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing', 'incomplete');
CREATE TYPE public.whatsapp_status AS ENUM ('connected', 'disconnected', 'connecting', 'error');
CREATE TYPE public.automation_trigger AS ENUM ('booking_created', 'reminder_24h', 'reminder_3h', 'post_service', 'reactivation_30d');
CREATE TYPE public.app_role AS ENUM ('admin', 'professional', 'user');

-- 2. TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  business_name text DEFAULT '',
  slug text UNIQUE,
  bio text DEFAULT '',
  primary_color text DEFAULT '#C4922A',
  logo_url text DEFAULT '',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'professional',
  UNIQUE(user_id, role)
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  category text DEFAULT 'Geral',
  active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(professional_id, day_of_week)
);

CREATE TABLE public.blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  notes text DEFAULT '',
  client_name text DEFAULT '',
  client_phone text DEFAULT '',
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL UNIQUE REFERENCES public.professionals(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_customer_id text,
  plan_id text DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  max_bookings_per_month integer DEFAULT 50,
  max_services integer DEFAULT 5,
  max_clients integer DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL UNIQUE REFERENCES public.professionals(id) ON DELETE CASCADE,
  instance_name text NOT NULL DEFAULT '',
  instance_id text,
  status whatsapp_status NOT NULL DEFAULT 'disconnected',
  phone_number text DEFAULT '',
  qr_code text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  trigger_type automation_trigger NOT NULL,
  message_template text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  automation_id uuid REFERENCES public.whatsapp_automations(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  message_content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  delivered_at timestamptz,
  error_message text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_services_professional ON public.services(professional_id);
CREATE INDEX idx_clients_professional ON public.clients(professional_id);
CREATE INDEX idx_bookings_professional ON public.bookings(professional_id);
CREATE INDEX idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_working_hours_professional ON public.working_hours(professional_id);
CREATE INDEX idx_blocked_times_professional ON public.blocked_times(professional_id);
CREATE INDEX idx_whatsapp_logs_professional ON public.whatsapp_logs(professional_id);
CREATE INDEX idx_professionals_slug ON public.professionals(slug);
CREATE INDEX idx_professionals_user_id ON public.professionals(user_id);

-- ============================================
-- TRIGGERS (updated_at)
-- ============================================
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_automations_updated_at BEFORE UPDATE ON public.whatsapp_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS (after tables exist)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_professional_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.professionals WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- AUTO-CREATE PROFESSIONAL PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.professionals (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'professional');
  
  INSERT INTO public.subscriptions (professional_id, plan_id, status)
  VALUES (
    (SELECT id FROM public.professionals WHERE user_id = NEW.id),
    'free',
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals can view own profile" ON public.professionals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Professionals can update own profile" ON public.professionals FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Public can view professional by slug" ON public.professionals FOR SELECT TO anon USING (slug IS NOT NULL);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own services" ON public.services FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());
CREATE POLICY "Public can view active services" ON public.services FOR SELECT TO anon USING (active = true);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own clients" ON public.clients FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());

ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own working hours" ON public.working_hours FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());
CREATE POLICY "Public can view working hours" ON public.working_hours FOR SELECT TO anon USING (is_active = true);

ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own blocked times" ON public.blocked_times FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own bookings" ON public.bookings FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (professional_id = public.get_my_professional_id());

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own whatsapp instance" ON public.whatsapp_instances FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());

ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own automations" ON public.whatsapp_automations FOR ALL TO authenticated USING (professional_id = public.get_my_professional_id()) WITH CHECK (professional_id = public.get_my_professional_id());

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals view own whatsapp logs" ON public.whatsapp_logs FOR SELECT TO authenticated USING (professional_id = public.get_my_professional_id());

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals view own payments" ON public.payments FOR SELECT TO authenticated USING (professional_id = public.get_my_professional_id());

-- ============================================
-- SECURE BOOKING RPC (for public booking page)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_professional_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
  p_client_name text,
  p_client_phone text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service record;
  v_end_time timestamptz;
  v_day_of_week integer;
  v_start_time_of_day time;
  v_end_time_of_day time;
  v_working record;
  v_conflict_count integer;
  v_blocked_count integer;
  v_booking_id uuid;
  v_client_id uuid;
BEGIN
  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND professional_id = p_professional_id AND active = true;
  IF v_service IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado ou inativo');
  END IF;

  v_end_time := p_start_time + (v_service.duration_minutes || ' minutes')::interval;
  v_day_of_week := EXTRACT(DOW FROM p_start_time);
  v_start_time_of_day := p_start_time::time;
  v_end_time_of_day := v_end_time::time;

  SELECT * INTO v_working FROM public.working_hours
  WHERE professional_id = p_professional_id AND day_of_week = v_day_of_week AND is_active = true;
  IF v_working IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profissional não trabalha neste dia');
  END IF;
  IF v_start_time_of_day < v_working.start_time OR v_end_time_of_day > v_working.end_time THEN
    RETURN json_build_object('success', false, 'error', 'Horário fora do expediente');
  END IF;

  SELECT COUNT(*) INTO v_conflict_count FROM public.bookings
  WHERE professional_id = p_professional_id AND status NOT IN ('cancelled')
    AND (p_start_time, v_end_time) OVERLAPS (start_time, end_time);
  IF v_conflict_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Horário já ocupado');
  END IF;

  SELECT COUNT(*) INTO v_blocked_count FROM public.blocked_times
  WHERE professional_id = p_professional_id
    AND (p_start_time, v_end_time) OVERLAPS (start_time, end_time);
  IF v_blocked_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Horário bloqueado pelo profissional');
  END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE professional_id = p_professional_id AND phone = p_client_phone LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (professional_id, name, phone)
    VALUES (p_professional_id, p_client_name, p_client_phone)
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO public.bookings (
    professional_id, client_id, service_id, start_time, end_time, status,
    price, duration_minutes, client_name, client_phone
  ) VALUES (
    p_professional_id, v_client_id, p_service_id, p_start_time, v_end_time, 'pending',
    v_service.price, v_service.duration_minutes, p_client_name, p_client_phone
  ) RETURNING id INTO v_booking_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'price', v_service.price, 'duration_minutes', v_service.duration_minutes, 'end_time', v_end_time);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_booking TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_booking TO authenticated;

-- ============================================
-- GET AVAILABLE SLOTS RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_professional_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service record;
  v_working record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_day_of_week integer;
  v_conflict_count integer;
  v_blocked_count integer;
  v_slots json[];
BEGIN
  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND professional_id = p_professional_id AND active = true;
  IF v_service IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado');
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date);
  SELECT * INTO v_working FROM public.working_hours
  WHERE professional_id = p_professional_id AND day_of_week = v_day_of_week AND is_active = true;
  IF v_working IS NULL THEN
    RETURN json_build_object('success', true, 'slots', '[]'::json);
  END IF;

  v_slot_start := p_date + v_working.start_time;
  v_slots := ARRAY[]::json[];

  WHILE (v_slot_start + (v_service.duration_minutes || ' minutes')::interval) <= (p_date + v_working.end_time) LOOP
    v_slot_end := v_slot_start + (v_service.duration_minutes || ' minutes')::interval;
    SELECT COUNT(*) INTO v_conflict_count FROM public.bookings
    WHERE professional_id = p_professional_id AND status NOT IN ('cancelled')
      AND (v_slot_start, v_slot_end) OVERLAPS (start_time, end_time);
    SELECT COUNT(*) INTO v_blocked_count FROM public.blocked_times
    WHERE professional_id = p_professional_id
      AND (v_slot_start, v_slot_end) OVERLAPS (start_time, end_time);
    IF v_conflict_count = 0 AND v_blocked_count = 0 THEN
      v_slots := array_append(v_slots, json_build_object('start_time', v_slot_start, 'end_time', v_slot_end));
    END IF;
    v_slot_start := v_slot_start + interval '30 minutes';
  END LOOP;

  RETURN json_build_object('success', true, 'slots', array_to_json(v_slots));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots TO authenticated;
