import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "./useAuth";

export const useProfessional = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["professional", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
