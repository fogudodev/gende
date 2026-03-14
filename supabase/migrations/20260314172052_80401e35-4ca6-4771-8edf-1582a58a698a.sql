-- New signups should start with 30-day Enterprise trial access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 30-day Enterprise free trial on first signup
  INSERT INTO public.subscriptions (
    professional_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  VALUES (
    (SELECT id FROM public.professionals WHERE user_id = NEW.id),
    'enterprise',
    'active',
    now(),
    now() + interval '30 days',
    false
  );

  RETURN NEW;
END;
$$;

-- Backfill very recent signups created without trial
UPDATE public.subscriptions
SET
  plan_id = 'enterprise',
  status = 'active',
  current_period_start = COALESCE(current_period_start, now()),
  current_period_end = COALESCE(current_period_end, now() + interval '30 days'),
  cancel_at_period_end = false,
  updated_at = now()
WHERE stripe_subscription_id IS NULL
  AND (plan_id = 'none' OR plan_id = 'free')
  AND current_period_end IS NULL
  AND created_at >= now() - interval '24 hours';