import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export const useProfessionalLimits = (professionalId?: string) => {
  return useQuery({
    queryKey: ["professional-limits", professionalId],
    queryFn: async () => {
      const query = api.from("professional_limits" as any).select("*");
      if (professionalId) {
        query.eq("professional_id", professionalId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useUpsertProfessionalLimits = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      professional_id: string;
      daily_reminders: number | null;
      daily_campaigns: number | null;
      campaign_max_contacts: number | null;
      campaign_min_interval_hours: number | null;
    }) => {
      const { data, error } = await (api.from("professional_limits" as any) as any)
        .upsert(
          {
            professional_id: params.professional_id,
            daily_reminders: params.daily_reminders,
            daily_campaigns: params.daily_campaigns,
            campaign_max_contacts: params.campaign_max_contacts,
            campaign_min_interval_hours: params.campaign_min_interval_hours,
          },
          { onConflict: "professional_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professional-limits"] });
    },
  });
};

export const useDeleteProfessionalLimits = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (professionalId: string) => {
      const { error } = await (api.from("professional_limits" as any) as any)
        .delete()
        .eq("professional_id", professionalId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professional-limits"] });
    },
  });
};
