import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface SalonEmployee {
  id: string;
  salon_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  specialty: string | null;
  is_active: boolean;
  has_login: boolean;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export const useSalonEmployees = () => {
  const { data: professional } = useProfessional();

  const query = useQuery({
    queryKey: ["salon-employees", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("salon_employees")
        .select("*")
        .eq("salon_id", professional!.id)
        .order("name");
      if (error) throw error;
      return data as SalonEmployee[];
    },
    enabled: !!professional?.id,
  });

  return query;
};

export const useCreateSalonEmployee = () => {
  const queryClient = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async (employee: { name: string; email?: string; phone?: string; specialty?: string; commission_percentage?: number; is_active?: boolean; has_login?: boolean; role?: string }) => {
      const { data, error } = await api
        .from("salon_employees")
        .insert({ ...employee, salon_id: professional!.id });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-employees"] });
      toast.success("Funcionário adicionado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar funcionário: " + error.message);
    },
  });
};

export const useUpdateSalonEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalonEmployee> & { id: string }) => {
      const { data, error } = await api
        .from("salon_employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-employees"] });
      toast.success("Funcionário atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
};

export const useDeleteSalonEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("salon_employees")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-employees"] });
      toast.success("Funcionário removido!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });
};
