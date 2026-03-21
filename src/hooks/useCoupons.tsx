import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface Coupon {
  id: string;
  professional_id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  min_amount: number | null;
  created_at: string;
  updated_at: string;
}

export const useCoupons = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["coupons", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateCoupon = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (coupon: { code: string; description?: string; discount_type?: string; discount_value?: number; max_uses?: number | null; is_active?: boolean; valid_until?: string | null; min_amount?: number }) => {
      const { data, error } = await supabase
        .from("coupons")
        .insert({ ...coupon, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Cupom criado!"); },
    onError: () => { /* handled by caller for duplicate detection */ },
  });
};

export const useUpdateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await api.from("coupons").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Cupom atualizado!"); },
    onError: () => { /* handled by caller for duplicate detection */ },
  });
};

export const useDeleteCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Cupom removido!"); },
    onError: (e: Error) => toast.error("Erro ao remover: " + e.message),
  });
};
