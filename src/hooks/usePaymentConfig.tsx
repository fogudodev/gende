import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface PaymentConfig {
  id: string;
  professional_id: string;
  pix_key_type: string | null;
  pix_key: string | null;
  pix_beneficiary_name: string | null;
  signal_enabled: boolean;
  signal_type: "percentage" | "fixed";
  signal_value: number;
  accept_pix: boolean;
  accept_cash: boolean;
  accept_card: boolean;
  created_at: string;
  updated_at: string;
}

export const usePaymentConfig = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["payment-config", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("payment_config")
        .select("*")
        .eq("professional_id", professional!.id)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentConfig | null;
    },
    enabled: !!professional?.id,
  });
};

export const useSavePaymentConfig = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (config: Partial<Omit<PaymentConfig, "id" | "professional_id" | "created_at" | "updated_at">>) => {
      const { data: existing } = await api
        .from("payment_config")
        .select("id")
        .eq("professional_id", professional!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await api
          .from("payment_config")
          .update(config)
          .eq("id", existing.id);
        if (error) throw error;
        return { ...config, id: existing.id };
      } else {
        const { data, error } = await api
          .from("payment_config")
          .insert({ ...config, professional_id: professional!.id });
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-config"] }); toast.success("Configuração salva!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};
