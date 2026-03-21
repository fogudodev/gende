import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export type WaitlistSettings = {
  id: string;
  professional_id: string;
  enabled: boolean;
  max_notifications: number;
  reservation_minutes: number;
  prioritize_vip: boolean;
  auto_process: boolean;
};

export const useWaitlistSettings = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["waitlist-settings", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("waitlist_settings" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WaitlistSettings | null;
    },
    enabled: !!professional?.id,
  });
};

export const useUpsertWaitlistSettings = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async (settings: Partial<WaitlistSettings>) => {
      const { error } = await api
        .from("waitlist_settings" as any)
        .upsert({
          professional_id: professional!.id,
          ...settings,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "professional_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist-settings"] });
      toast.success("Configurações salvas");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });
};
