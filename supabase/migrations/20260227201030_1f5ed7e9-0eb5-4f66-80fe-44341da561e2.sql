
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS followup_message text DEFAULT 'Olá {nome}! 👋 Notamos que você não finalizou seu agendamento. Ainda gostaria de agendar? Estamos à disposição! 😊';
