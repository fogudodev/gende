import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface Review {
  id: string;
  professional_id: string;
  booking_id: string | null;
  employee_id: string | null;
  client_name: string;
  client_phone: string | null;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
}

export const useReviews = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["reviews", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!professional?.id,
  });
};

export const usePublicReviews = (professionalId: string) => {
  return useQuery({
    queryKey: ["public-reviews", professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!professionalId,
  });
};

export const useSubmitReview = () => {
  return useMutation({
    mutationFn: async (review: {
      professional_id: string;
      booking_id?: string;
      employee_id?: string;
      client_name: string;
      client_phone?: string;
      rating: number;
      comment?: string;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert(review)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Avaliação enviada! Obrigado."),
    onError: (e: Error) => toast.error("Erro ao enviar avaliação: " + e.message),
  });
};

export const useToggleReviewVisibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await api.from("reviews").update({ is_public }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(variables.is_public ? "Avaliação tornada pública" : "Avaliação ocultada");
    },
    onError: (e: Error) => toast.error("Erro ao alterar visibilidade: " + e.message),
  });
};
