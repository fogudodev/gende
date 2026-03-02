
CREATE OR REPLACE FUNCTION public.get_support_users()
RETURNS TABLE(user_id uuid, name text, email text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id as user_id,
    COALESCE(u.raw_user_meta_data->>'name', '') as name,
    u.email,
    u.created_at
  FROM auth.users u
  INNER JOIN public.user_roles r ON r.user_id = u.id
  WHERE r.role = 'support'
  ORDER BY u.created_at DESC
$$;
