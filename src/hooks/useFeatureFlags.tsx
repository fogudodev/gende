import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  category: string;
  created_at: string;
  updated_at: string;
};

export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags" as any)
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FeatureFlag[];
    },
  });
};

export const useIsFeatureEnabled = (key: string) => {
  const { data: flags, isLoading } = useFeatureFlags();
  const flag = flags?.find((f) => f.key === key);
  return { enabled: flag?.enabled ?? false, isLoading };
};

export const useToggleFeatureFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("feature_flags" as any)
        .update({ enabled, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Feature flag atualizada");
    },
    onError: () => toast.error("Erro ao atualizar feature flag"),
  });
};
