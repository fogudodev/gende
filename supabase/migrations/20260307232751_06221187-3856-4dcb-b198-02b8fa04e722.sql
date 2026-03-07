
-- Allow public/anon users to INSERT upsell_events (for tracking suggestions on public booking page)
CREATE POLICY "Public can insert upsell events"
ON public.upsell_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
