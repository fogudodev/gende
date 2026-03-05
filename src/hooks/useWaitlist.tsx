import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export type WaitlistEntry = {
  id: string;
  professional_id: string;
  service_id: string | null;
  client_name: string;
  client_phone: string;
  preferred_date: string;
  preferred_period: string;
  status: string;
  notes: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export const useWaitlist = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["waitlist", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WaitlistEntry[];
    },
    enabled: !!professional?.id,
  });
};

export const useUpdateWaitlistStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "notified") updates.notified_at = new Date().toISOString();
      const { error } = await supabase
        .from("waitlist" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });
};

export const useDeleteWaitlistEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("waitlist" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Entrada removida");
    },
    onError: () => toast.error("Erro ao remover"),
  });
};
