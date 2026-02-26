
-- 1. Criar enum para tipo de conta
CREATE TYPE public.account_type AS ENUM ('autonomous', 'salon');

-- 2. Adicionar coluna account_type na tabela professionals
ALTER TABLE public.professionals
ADD COLUMN account_type public.account_type NOT NULL DEFAULT 'autonomous';

-- 3. Criar tabela de funcionários do salão
CREATE TABLE public.salon_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  has_login BOOLEAN NOT NULL DEFAULT false,
  commission_percentage NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.salon_employees ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para salon_employees
CREATE POLICY "Salon owners manage own employees"
ON public.salon_employees FOR ALL
USING (salon_id = public.get_my_professional_id())
WITH CHECK (salon_id = public.get_my_professional_id());

CREATE POLICY "Admin can manage all salon employees"
ON public.salon_employees FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Public can view active salon employees"
ON public.salon_employees FOR SELECT
USING (is_active = true);

-- 6. Trigger para updated_at
CREATE TRIGGER update_salon_employees_updated_at
BEFORE UPDATE ON public.salon_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Índices
CREATE INDEX idx_salon_employees_salon_id ON public.salon_employees(salon_id);
CREATE INDEX idx_salon_employees_user_id ON public.salon_employees(user_id) WHERE user_id IS NOT NULL;
