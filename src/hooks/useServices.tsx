import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export const useServices = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["services", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("services")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useCreateService = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async (service: Omit<TablesInsert<"services">, "professional_id">) => {
      const { data, error } = await api
        .from("services")
        .insert({ ...service, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
};

export const useUpdateService = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"services"> & { id: string }) => {
      const { data, error } = await api
        .from("services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
};

export const useDeleteService = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
};
