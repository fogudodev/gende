
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip professional creation for reception employees
  IF (NEW.raw_user_meta_data->>'is_reception')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Skip professional creation for support users
  IF (NEW.raw_user_meta_data->>'is_support')::boolean = true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.professionals (user_id, name, email, account_type, business_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'account_type')::account_type, 'autonomous'),
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'professional');
  
  INSERT INTO public.subscriptions (professional_id, plan_id, status)
  VALUES (
    (SELECT id FROM public.professionals WHERE user_id = NEW.id),
    'none',
    'active'
  );
  
  RETURN NEW;
END;
$function$;
