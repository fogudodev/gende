CREATE POLICY "Professionals can delete own expired conversations"
ON public.whatsapp_conversations
FOR DELETE
USING (professional_id = get_my_professional_id() AND status = 'expired');