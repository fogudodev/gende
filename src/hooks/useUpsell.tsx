import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UpsellRule = {
  id: string;
  professional_id: string;
  source_service_id: string;
  recommended_service_id: string;
  priority: number;
  promo_message: string | null;
  promo_price: number | null;
  is_active: boolean;
  suggestion_count: number;
  conversion_count: number;
  created_at: string;
  updated_at: string;
};

export type UpsellEvent = {
  id: string;
  professional_id: string;
  booking_id: string | null;
  source_service_id: string | null;
  recommended_service_id: string | null;
  client_phone: string | null;
  channel: string;
  status: string;
  upsell_revenue: number;
  created_at: string;
};

export const useUpsellRules = (professionalId?: string) => {
  return useQuery({
    queryKey: ["upsell-rules", professionalId],
    queryFn: async () => {
      let query = supabase
        .from("upsell_rules" as any)
        .select("*")
        .order("priority", { ascending: true });
      if (professionalId) {
        query = query.eq("professional_id", professionalId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as UpsellRule[];
    },
    enabled: !!professionalId,
  });
};

export const useUpsellRulesForService = (professionalId: string, sourceServiceId: string) => {
  return useQuery({
    queryKey: ["upsell-rules", professionalId, sourceServiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upsell_rules" as any)
        .select("*")
        .eq("professional_id", professionalId)
        .eq("source_service_id", sourceServiceId)
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data || []) as unknown as UpsellRule[];
    },
    enabled: !!professionalId && !!sourceServiceId,
  });
};

export const useUpsertUpsellRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<UpsellRule> & { professional_id: string; source_service_id: string; recommended_service_id: string }) => {
      const { error } = await supabase
        .from("upsell_rules" as any)
        .upsert(rule as any, { onConflict: "professional_id,source_service_id,recommended_service_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upsell-rules"] });
      toast.success("Regra de upsell salva");
    },
    onError: () => toast.error("Erro ao salvar regra de upsell"),
  });
};

export const useDeleteUpsellRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("upsell_rules" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upsell-rules"] });
      toast.success("Regra removida");
    },
    onError: () => toast.error("Erro ao remover regra"),
  });
};

export const useUpsellEvents = (professionalId?: string) => {
  return useQuery({
    queryKey: ["upsell-events", professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upsell_events" as any)
        .select("*")
        .eq("professional_id", professionalId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as UpsellEvent[];
    },
    enabled: !!professionalId,
  });
};

export const useTrackUpsellEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: {
      professional_id: string;
      booking_id?: string;
      source_service_id: string;
      recommended_service_id: string;
      client_phone?: string;
      channel: string;
      status: string;
      upsell_revenue?: number;
    }) => {
      const { error } = await supabase
        .from("upsell_events" as any)
        .insert(event as any);
      if (error) throw error;

      // Update counters on the rule
      if (event.status === "suggested" || event.status === "accepted") {
        const field = event.status === "accepted" ? "conversion_count" : "suggestion_count";
        // We can't do atomic increment easily, so just invalidate
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upsell-events"] });
      qc.invalidateQueries({ queryKey: ["upsell-rules"] });
    },
  });
};
