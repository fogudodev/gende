
-- Atualizar trigger handle_new_user para suportar account_type e business_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.professionals (user_id, name, email, account_type, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'account_type')::account_type, 'autonomous'),
    COALESCE(NEW.raw_user_meta_data->>'business_name', '')
  );
  
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
$$;
