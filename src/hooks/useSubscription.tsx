import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";

export const useSubscription = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["subscription", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("professional_id", professional!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};
