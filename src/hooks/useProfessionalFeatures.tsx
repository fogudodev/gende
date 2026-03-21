import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export type ProfessionalFeatureOverride = {
  id: string;
  professional_id: string;
  feature_key: string;
  enabled: boolean;
};

export const useAllProfessionalFeatures = () => {
  return useQuery({
    queryKey: ["professional-feature-overrides"],
    queryFn: async () => {
      const { data, error } = await api
        .from("professional_feature_overrides" as any)
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as ProfessionalFeatureOverride[];
    },
  });
};

export const useToggleProfessionalFeature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      professionalId,
      featureKey,
      enabled,
    }: {
      professionalId: string;
      featureKey: string;
      enabled: boolean;
    }) => {
      const { error } = await api
        .from("professional_feature_overrides" as any)
        .upsert(
          {
            professional_id: professionalId,
            feature_key: featureKey,
            enabled,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "professional_id,feature_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professional-feature-overrides"] });
      toast.success("Funcionalidade atualizada");
    },
    onError: () => toast.error("Erro ao atualizar funcionalidade"),
  });
};
