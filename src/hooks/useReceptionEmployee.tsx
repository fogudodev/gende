import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ReceptionEmployee {
  id: string;
  salon_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export const useReceptionEmployee = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reception-employee", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_employees")
        .select("*")
        .eq("user_id", user!.id)
        .eq("role", "reception")
        .maybeSingle();
      if (error) throw error;
      return data as ReceptionEmployee | null;
    },
    enabled: !!user?.id,
  });
};
