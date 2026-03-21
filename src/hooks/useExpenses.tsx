import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface Expense {
  id: string;
  professional_id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  employee_id: string | null;
  created_at: string;
}

export const useExpenses = (startDate?: string, endDate?: string) => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["expenses", professional?.id, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("expense_date", { ascending: false });
      if (startDate) query = query.gte("expense_date", startDate);
      if (endDate) query = query.lte("expense_date", endDate);
      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateExpense = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (expense: Omit<Expense, "id" | "professional_id" | "created_at"> & { updated_at?: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Despesa registrada!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Despesa removida!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};
