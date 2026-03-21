import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";

export const usePayments = (limit = 20) => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["payments", professional?.id, limit],
    queryFn: async () => {
      const { data, error } = await api
        .from("payments")
        .select("*, bookings(client_name, services(name))")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};
