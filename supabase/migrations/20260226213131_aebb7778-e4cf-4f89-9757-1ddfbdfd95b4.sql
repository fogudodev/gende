
-- Add new customization columns to professionals
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS cover_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bg_color text DEFAULT '#09090B',
  ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#FAFAFA',
  ADD COLUMN IF NOT EXISTS component_color text DEFAULT '#C4922A',
  ADD COLUMN IF NOT EXISTS welcome_title text DEFAULT 'Bem-vindo(a)!',
  ADD COLUMN IF NOT EXISTS welcome_description text DEFAULT 'Agende seu horário de forma rápida e fácil.',
  ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT 'Olá {nome}! Seja bem-vindo(a) ao nosso espaço. Estamos felizes em atendê-lo(a)!',
  ADD COLUMN IF NOT EXISTS reminder_message text DEFAULT 'Olá {nome}! Lembrete: você tem um agendamento amanhã às {horario}. Esperamos por você!',
  ADD COLUMN IF NOT EXISTS confirmation_message text DEFAULT 'Olá {nome}! Seu agendamento para {servico} foi confirmado para {data} às {horario}. Obrigado!';
