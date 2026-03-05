import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";

type Override = { feature_key: string; enabled: boolean };

/**
 * Fetches the current professional's feature overrides and provides
 * a function to check if a feature is enabled for them.
 * 
 * Logic: if an override exists → use it; otherwise default to enabled.
 */
export const useMyFeatureGate = () => {
  const { data: professional } = useProfessional();

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["my-feature-overrides", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_feature_overrides" as any)
        .select("feature_key, enabled")
        .eq("professional_id", professional!.id);
      if (error) throw error;
      return (data || []) as unknown as Override[];
    },
    enabled: !!professional?.id,
  });

  const overrideMap = new Map<string, boolean>();
  (overrides || []).forEach((o) => overrideMap.set(o.feature_key, o.enabled));

  /** Returns true if the feature is disabled for this professional */
  const isFeatureDisabledForMe = (featureKey: string): boolean => {
    if (overrideMap.has(featureKey)) return !overrideMap.get(featureKey)!;
    return false; // default: enabled
  };

  return { isFeatureDisabledForMe, isLoading };
};
