
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'geral',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated can view feature flags"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view feature flags"
  ON public.feature_flags FOR SELECT
  TO anon
  USING (true);

INSERT INTO public.feature_flags (key, label, description, category, enabled) VALUES
  ('waitlist', 'Lista de Espera', 'Permite clientes entrarem em lista de espera quando não há horários disponíveis', 'experiência', false),
  ('service_packages', 'Pacotes de Serviços', 'Clientes podem comprar pacotes de X sessões com desconto', 'financeiro', false),
  ('employee_individual_hours', 'Horários Individuais por Funcionário', 'Cada funcionário pode ter seu próprio horário de trabalho', 'operacional', false),
  ('mobile_dashboard', 'Dashboard Mobile Otimizado', 'Visão rápida do dia e ações rápidas no mobile', 'operacional', false),
  ('nfse_integration', 'Emissão de NFSe', 'Integração com provedor de nota fiscal de serviço eletrônica', 'financeiro', false),
  ('recurring_bookings', 'Agendamentos Recorrentes', 'Permite criar agendamentos que se repetem automaticamente', 'experiência', false),
  ('smart_followup', 'Follow-up Inteligente', 'Mensagens automáticas para clientes inativos há X dias', 'automação', false),
  ('profitability_reports', 'Relatórios de Rentabilidade', 'Relatórios detalhados de lucratividade por serviço', 'financeiro', false),
  ('export_pdf_excel', 'Exportação PDF/Excel', 'Exportar relatórios em PDF e Excel', 'operacional', false);
