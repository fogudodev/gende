import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import type { Tables, TablesInsert } from "@/integrations/api/types";

export type BlockedTime = Tables<"blocked_times">;

export const useBlockedTimes = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["blocked-times", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("blocked_times")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useCreateBlockedTime = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async (blocked: Omit<TablesInsert<"blocked_times">, "professional_id">) => {
      const { data, error } = await api
        .from("blocked_times")
        .insert({ ...blocked, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked-times"] }),
  });
};

export const useDeleteBlockedTime = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.from("blocked_times").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked-times"] }),
  });
};
