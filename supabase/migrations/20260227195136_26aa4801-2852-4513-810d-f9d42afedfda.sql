
-- Tabela para rastrear conversas de agendamento via WhatsApp com IA
CREATE TABLE public.whatsapp_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_phone text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para buscar conversa ativa por telefone + profissional
CREATE UNIQUE INDEX idx_whatsapp_conv_active ON public.whatsapp_conversations (professional_id, client_phone) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Profissionais podem ver suas próprias conversas
CREATE POLICY "Professionals view own conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (professional_id = get_my_professional_id());

-- Admin pode gerenciar todas as conversas
CREATE POLICY "Admin can manage all conversations"
ON public.whatsapp_conversations
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
