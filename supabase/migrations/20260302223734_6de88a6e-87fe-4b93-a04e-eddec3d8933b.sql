
-- Support users need SELECT access to various tables

CREATE POLICY "Support can view all professionals"
ON public.professionals FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can update professionals"
ON public.professionals FOR UPDATE
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can update subscriptions"
ON public.subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all bookings"
ON public.bookings FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all clients"
ON public.clients FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all whatsapp instances"
ON public.whatsapp_instances FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all whatsapp automations"
ON public.whatsapp_automations FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all daily message usage"
ON public.daily_message_usage FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all whatsapp logs"
ON public.whatsapp_logs FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all platform reviews"
ON public.platform_reviews FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all services"
ON public.services FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view all salon employees"
ON public.salon_employees FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can view plan limits"
ON public.plan_limits FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));
