import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useIsAdmin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user?.id,
  });
};

export const useAllProfessionals = () => {
  return useQuery({
    queryKey: ["admin-professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*, subscriptions(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useAllBookings = () => {
  return useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, professionals(name, business_name), services(name)")
        .order("start_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
};

export const useAllPayments = () => {
  return useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, professionals(name, business_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profRes, bookRes, clientRes, payRes, subRes] = await Promise.all([
        supabase.from("professionals").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "completed"),
        supabase.from("subscriptions").select("plan_id"),
      ]);

      const totalRevenue = (payRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const activeSubs = (subRes.data || []).filter(s => s.plan_id !== "free").length;

      return {
        totalProfessionals: profRes.count || 0,
        totalBookings: bookRes.count || 0,
        totalClients: clientRes.count || 0,
        totalRevenue,
        activeSubscriptions: activeSubs,
        totalSubscriptions: (subRes.data || []).length,
      };
    },
  });
};

export const useAllWhatsAppInstances = () => {
  return useQuery({
    queryKey: ["admin-whatsapp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*, professionals(name, business_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useAllWhatsAppLogs = (limit = 200) => {
  return useQuery({
    queryKey: ["admin-whatsapp-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select("*, professionals(name, business_name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
};

export const useSupportUsers = () => {
  return useQuery({
    queryKey: ["admin-support-users"],
    queryFn: async () => {
      // Get all user_ids with support role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "support");
      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);

      // Get professional profiles for these users
      const { data: pros, error: prosError } = await supabase
        .from("professionals")
        .select("id, name, email, user_id, created_at")
        .in("user_id", userIds);
      if (prosError) throw prosError;

      return pros || [];
    },
  });
};

export const useRemoveSupportRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "support");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-users"] });
      toast.success("Papel de suporte removido");
    },
    onError: () => toast.error("Erro ao remover papel"),
  });
};
