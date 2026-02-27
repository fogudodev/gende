-- Allow admin to delete professionals
CREATE POLICY "Admin can delete professionals"
ON public.professionals
FOR DELETE
USING (is_admin());
