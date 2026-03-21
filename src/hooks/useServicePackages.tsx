import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export type ServicePackage = {
  id: string;
  professional_id: string;
  name: string;
  description: string | null;
  service_id: string | null;
  total_sessions: number;
  price: number;
  original_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientPackage = {
  id: string;
  professional_id: string;
  client_id: string | null;
  package_id: string | null;
  client_name: string;
  client_phone: string | null;
  total_sessions: number;
  used_sessions: number;
  amount_paid: number;
  status: string;
  purchased_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export const useServicePackages = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["service-packages", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("service_packages" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ServicePackage[];
    },
    enabled: !!professional?.id,
  });
};

export const useClientPackages = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["client-packages", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("client_packages" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientPackage[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateServicePackage = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (pkg: Omit<ServicePackage, "id" | "professional_id" | "created_at" | "updated_at">) => {
      const { error } = await api
        .from("service_packages" as any)
        .insert({ ...pkg, professional_id: professional!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-packages"] });
      toast.success("Pacote criado com sucesso");
    },
    onError: () => toast.error("Erro ao criar pacote"),
  });
};

export const useUpdateServicePackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServicePackage> & { id: string }) => {
      const { error } = await api
        .from("service_packages" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-packages"] });
      toast.success("Pacote atualizado");
    },
    onError: () => toast.error("Erro ao atualizar pacote"),
  });
};

export const useDeleteServicePackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("service_packages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-packages"] });
      toast.success("Pacote removido");
    },
    onError: () => toast.error("Erro ao remover pacote"),
  });
};

export const useCreateClientPackage = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (cp: Omit<ClientPackage, "id" | "professional_id" | "created_at" | "updated_at">) => {
      const { error } = await api
        .from("client_packages" as any)
        .insert({ ...cp, professional_id: professional!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-packages"] });
      toast.success("Pacote vendido com sucesso");
    },
    onError: () => toast.error("Erro ao vender pacote"),
  });
};

export const useUpdateClientPackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientPackage> & { id: string }) => {
      const { error } = await api
        .from("client_packages" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-packages"] });
      toast.success("Pacote atualizado");
    },
    onError: () => toast.error("Erro ao atualizar pacote"),
  });
};
