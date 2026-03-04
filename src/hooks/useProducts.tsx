import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface Product {
  id: string;
  professional_id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  stock_quantity: number;
  is_active: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["products", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (product: { name: string; description?: string; price?: number; cost_price?: number; stock_quantity?: number; is_active?: boolean; category?: string }) => {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Produto adicionado!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Produto removido!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};
