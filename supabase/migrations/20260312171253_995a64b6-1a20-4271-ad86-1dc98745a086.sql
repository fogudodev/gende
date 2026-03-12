INSERT INTO public.feature_flags (key, label, description, enabled, category)
VALUES ('instagram_dm', 'Instagram DM Inteligente', 'Automação de DMs e comentários do Instagram com IA', false, 'automação')
ON CONFLICT DO NOTHING;