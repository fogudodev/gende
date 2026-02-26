import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface Commission {
  id: string;
  professional_id: string;
  employee_id: string;
  booking_id: string | null;
  booking_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export const useCommissions = (employeeId?: string, status?: string) => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["commissions", professional?.id, employeeId, status],
    queryFn: async () => {
      let query = supabase
        .from("commissions")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (employeeId) query = query.eq("employee_id", employeeId);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateCommission = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (commission: Omit<Commission, "id" | "professional_id" | "created_at" | "paid_at">) => {
      const { data, error } = await supabase
        .from("commissions")
        .insert({ ...commission, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const usePayCommission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); toast.success("Comissões pagas!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};
