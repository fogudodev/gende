INSERT INTO public.feature_flags (key, label, description, enabled, category)
VALUES ('courses', 'Gende Cursos', 'Módulo completo de gestão de cursos e treinamentos', true, 'operacional')
ON CONFLICT (key) DO NOTHING;