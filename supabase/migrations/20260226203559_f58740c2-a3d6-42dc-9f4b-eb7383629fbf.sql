
-- 1. Tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own products"
ON public.products FOR ALL
USING (professional_id = public.get_my_professional_id())
WITH CHECK (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all products"
ON public.products FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_products_professional ON public.products(professional_id);

-- 2. Tabela de cupons de desconto
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  min_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id, code)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own coupons"
ON public.coupons FOR ALL
USING (professional_id = public.get_my_professional_id())
WITH CHECK (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all coupons"
ON public.coupons FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Public can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true);

CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_coupons_professional ON public.coupons(professional_id);
CREATE INDEX idx_coupons_code ON public.coupons(professional_id, code);

-- 3. Tabela de configuração de pagamento
CREATE TABLE public.payment_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE UNIQUE,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key TEXT,
  pix_beneficiary_name TEXT,
  signal_enabled BOOLEAN NOT NULL DEFAULT false,
  signal_type TEXT NOT NULL DEFAULT 'percentage' CHECK (signal_type IN ('percentage', 'fixed')),
  signal_value NUMERIC NOT NULL DEFAULT 0,
  accept_pix BOOLEAN NOT NULL DEFAULT true,
  accept_cash BOOLEAN NOT NULL DEFAULT true,
  accept_card BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own payment config"
ON public.payment_config FOR ALL
USING (professional_id = public.get_my_professional_id())
WITH CHECK (professional_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all payment config"
ON public.payment_config FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Public can view payment config"
ON public.payment_config FOR SELECT
USING (true);

CREATE TRIGGER update_payment_config_updated_at
BEFORE UPDATE ON public.payment_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
