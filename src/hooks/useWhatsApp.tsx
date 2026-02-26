import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import type { TablesUpdate } from "@/integrations/supabase/types";

export const useWhatsAppInstance = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["whatsapp-instance", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("professional_id", professional!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useWhatsAppAutomations = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["whatsapp-automations", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_automations")
        .select("*")
        .eq("professional_id", professional!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useToggleAutomation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_automations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-automations"] }),
  });
};

export const useWhatsAppLogs = (limit = 50) => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["whatsapp-logs", professional?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};
