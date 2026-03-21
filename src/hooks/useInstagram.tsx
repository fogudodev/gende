import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export const useInstagramAccount = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["instagram-account", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("instagram_accounts" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!professional?.id,
  });
};

export const useInstagramMessages = (limit = 50) => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["instagram-messages", professional?.id, limit],
    queryFn: async () => {
      const { data, error } = await api
        .from("instagram_messages" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!professional?.id,
  });
};

export const useInstagramKeywords = () => {
  const { data: professional } = useProfessional();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instagram-keywords", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("instagram_keywords" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!professional?.id,
  });

  const addKeyword = useMutation({
    mutationFn: async ({ keyword, response_type, custom_response }: {
      keyword: string;
      response_type: string;
      custom_response?: string;
    }) => {
      const { error } = await api
        .from("instagram_keywords" as any)
        .insert({
          professional_id: professional!.id,
          keyword,
          response_type,
          custom_response,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-keywords"] });
      toast.success("Palavra-chave adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar palavra-chave"),
  });

  const deleteKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("instagram_keywords" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-keywords"] });
      toast.success("Palavra-chave removida!");
    },
    onError: () => toast.error("Erro ao remover palavra-chave"),
  });

  const toggleKeyword = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await api
        .from("instagram_keywords" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-keywords"] });
    },
  });

  return { ...query, addKeyword, deleteKeyword, toggleKeyword };
};

export const useInstagramConnect = () => {
  const queryClient = useQueryClient();

  const connect = useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/instagram-callback`;
      const { data, error } = await api.functions.invoke("instagram-oauth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.auth_url as string;
    },
    onSuccess: (authUrl) => {
      const popup = window.open(authUrl, "instagram_oauth", "width=600,height=750");
      if (!popup) {
        toast.error("Não foi possível abrir a janela de autenticação do Instagram");
        return;
      }
      popup.focus();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao conectar Instagram"),
  });

  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      const redirectUri = `${window.location.origin}/instagram-callback`;
      const { data, error } = await api.functions.invoke("instagram-oauth", {
        body: { action: "exchange_code", code, redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-account"] });
      toast.success("Instagram conectado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao conectar Instagram"),
  });

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; code?: string } | null;
      if (!payload || payload.type !== "instagram_oauth_code" || !payload.code) return;
      exchangeCode.mutate(payload.code);
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [exchangeCode.mutate]);

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.functions.invoke("instagram-oauth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-account"] });
      toast.success("Instagram desconectado!");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao desconectar"),
  });

  return { connect, exchangeCode, disconnect };
};

export const useInstagramStats = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["instagram-stats", professional?.id],
    queryFn: async () => {
      const { data: messages, error } = await api
        .from("instagram_messages" as any)
        .select("direction, message_type, booking_id, created_at")
        .eq("professional_id", professional!.id);
      if (error) throw error;

      const msgs = (messages || []) as any[];
      const incoming = msgs.filter((m) => m.direction === "incoming").length;
      const outgoing = msgs.filter((m) => m.direction === "outgoing").length;
      const bookings = msgs.filter((m) => m.booking_id).length;
      const conversionRate = incoming > 0 ? ((bookings / incoming) * 100).toFixed(1) : "0";

      return { incoming, outgoing, bookings, conversionRate };
    },
    enabled: !!professional?.id,
  });
};
