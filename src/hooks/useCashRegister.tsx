import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export const useOpenCashRegister = (professionalId: string | undefined) => {
  return useQuery({
    queryKey: ["open-cash-register", professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("professional_id", professionalId!)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
};

export const useCashRegisters = (professionalId: string | undefined, limit = 30) => {
  return useQuery({
    queryKey: ["cash-registers", professionalId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("professional_id", professionalId!)
        .order("opened_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
};

export const useCashTransactions = (cashRegisterId: string | undefined) => {
  return useQuery({
    queryKey: ["cash-transactions", cashRegisterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_transactions")
        .select("*")
        .eq("cash_register_id", cashRegisterId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!cashRegisterId,
  });
};

export const useOpenCashRegisterMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      professionalId,
      openedBy,
      openingAmount,
    }: {
      professionalId: string;
      openedBy?: string;
      openingAmount: number;
    }) => {
      const insertData: any = {
        professional_id: professionalId,
        opening_amount: openingAmount,
        status: "open",
      };
      if (openedBy) insertData.opened_by = openedBy;
      const { data, error } = await supabase
        .from("cash_registers")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-registers"] });
      qc.invalidateQueries({ queryKey: ["open-cash-register"] });
      toast.success("Caixa aberto com sucesso!");
    },
    onError: (error: Error) => toast.error("Erro ao abrir caixa: " + error.message),
  });
};

export const useCloseCashRegisterMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      closingAmount,
      expectedAmount,
      notes,
    }: {
      id: string;
      closingAmount: number;
      expectedAmount: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("cash_registers")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          notes,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-registers"] });
      qc.invalidateQueries({ queryKey: ["open-cash-register"] });
      toast.success("Caixa fechado com sucesso!");
    },
    onError: (error: Error) => toast.error("Erro ao fechar caixa: " + error.message),
  });
};

export const useAddCashTransaction = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: {
      cash_register_id: string;
      professional_id: string;
      type: string;
      amount: number;
      payment_method?: string;
      description?: string;
      booking_id?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("cash_transactions")
        .insert(transaction)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-transactions"] });
      toast.success("Movimentação registrada!");
    },
    onError: (error: Error) => toast.error("Erro: " + error.message),
  });
};
