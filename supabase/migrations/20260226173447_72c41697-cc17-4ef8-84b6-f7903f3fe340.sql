
-- Create a function to auto-assign admin role based on email
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@gende.io' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for admin auto-assignment
CREATE TRIGGER on_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role();

-- Create a helper function to check if current user is admin (no table param needed)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Allow admin to SELECT all professionals
CREATE POLICY "Admin can view all professionals"
ON public.professionals FOR SELECT
USING (public.is_admin());

-- Allow admin to UPDATE all professionals
CREATE POLICY "Admin can update all professionals"
ON public.professionals FOR UPDATE
USING (public.is_admin());

-- Allow admin to SELECT all bookings
CREATE POLICY "Admin can view all bookings"
ON public.bookings FOR SELECT
USING (public.is_admin());

-- Allow admin to UPDATE all bookings
CREATE POLICY "Admin can manage all bookings"
ON public.bookings FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admin to SELECT all clients
CREATE POLICY "Admin can view all clients"
ON public.clients FOR SELECT
USING (public.is_admin());

-- Allow admin to manage all clients
CREATE POLICY "Admin can manage all clients"
ON public.clients FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admin to SELECT all services
CREATE POLICY "Admin can view all services"
ON public.services FOR SELECT
USING (public.is_admin());

-- Allow admin to manage all services
CREATE POLICY "Admin can manage all services"
ON public.services FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admin to SELECT all subscriptions
CREATE POLICY "Admin can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.is_admin());

-- Allow admin to manage all subscriptions
CREATE POLICY "Admin can manage all subscriptions"
ON public.subscriptions FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admin to SELECT all payments
CREATE POLICY "Admin can view all payments"
ON public.payments FOR SELECT
USING (public.is_admin());

-- Allow admin to SELECT all whatsapp instances
CREATE POLICY "Admin can view all whatsapp instances"
ON public.whatsapp_instances FOR SELECT
USING (public.is_admin());

-- Allow admin to manage all whatsapp instances
CREATE POLICY "Admin can manage all whatsapp instances"
ON public.whatsapp_instances FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admin to SELECT all whatsapp automations
CREATE POLICY "Admin can view all whatsapp automations"
ON public.whatsapp_automations FOR SELECT
USING (public.is_admin());

-- Allow admin to manage all whatsapp automations
CREATE POLICY "Admin can manage all whatsapp automations"
ON public.whatsapp_automations FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admin to SELECT all whatsapp logs
CREATE POLICY "Admin can view all whatsapp logs"
ON public.whatsapp_logs FOR SELECT
USING (public.is_admin());

-- Allow admin to view all working hours
CREATE POLICY "Admin can view all working hours"
ON public.working_hours FOR SELECT
USING (public.is_admin());

-- Allow admin to view all user roles
CREATE POLICY "Admin can view all user roles"
ON public.user_roles FOR SELECT
USING (public.is_admin());

-- Allow admin to manage user roles
CREATE POLICY "Admin can manage all user roles"
ON public.user_roles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
