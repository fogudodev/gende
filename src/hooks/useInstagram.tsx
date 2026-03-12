import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export const useInstagramAccount = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["instagram-account", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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
      const { error } = await supabase
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
      const { error } = await supabase
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
    onMutate: () => {
      const popup = window.open("about:blank", "_blank");
      return { popup };
    },
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/instagram-callback`;
      const { data, error } = await supabase.functions.invoke("instagram-oauth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.auth_url as string;
    },
    onSuccess: async (authUrl, _variables, context) => {
      const isEmbeddedPreview = window.self !== window.top;

      if (isEmbeddedPreview) {
        const popup = context?.popup && !context.popup.closed
          ? context.popup
          : window.open("about:blank", "_blank");

        if (popup) {
          const doc = popup.document;
          doc.title = "Conectar Instagram";
          doc.body.innerHTML = "";
          doc.body.style.margin = "0";
          doc.body.style.fontFamily = "system-ui, -apple-system, sans-serif";

          const container = doc.createElement("div");
          container.style.cssText = "max-width: 760px; margin: 0 auto; padding: 24px; line-height: 1.5;";

          const title = doc.createElement("h2");
          title.textContent = "Conexão manual do Instagram";
          title.style.margin = "0 0 8px";

          const description = doc.createElement("p");
          description.textContent = "O Facebook bloqueia o login dentro do preview. Copie o link abaixo e abra em uma aba normal do seu navegador.";
          description.style.margin = "0 0 12px";

          const textarea = doc.createElement("textarea");
          textarea.value = authUrl;
          textarea.readOnly = true;
          textarea.style.cssText = "width: 100%; min-height: 140px; padding: 10px; font-size: 12px;";

          const actions = doc.createElement("div");
          actions.style.cssText = "display: flex; gap: 8px; margin-top: 12px;";

          const copyButton = doc.createElement("button");
          copyButton.textContent = "Copiar link";
          copyButton.style.cssText = "padding: 8px 12px; cursor: pointer;";
          copyButton.onclick = async () => {
            try {
              await popup.navigator.clipboard.writeText(authUrl);
              copyButton.textContent = "Copiado!";
            } catch {
              textarea.focus();
              textarea.select();
            }
          };

          const closeButton = doc.createElement("button");
          closeButton.textContent = "Fechar";
          closeButton.style.cssText = "padding: 8px 12px; cursor: pointer;";
          closeButton.onclick = () => popup.close();

          actions.appendChild(copyButton);
          actions.appendChild(closeButton);
          container.appendChild(title);
          container.appendChild(description);
          container.appendChild(textarea);
          container.appendChild(actions);
          doc.body.appendChild(container);

          textarea.focus();
          textarea.select();
          toast.warning("Link aberto em nova aba para cópia manual.");
          return;
        }

        try {
          await navigator.clipboard.writeText(authUrl);
          toast.success("Link copiado! Abra em uma aba normal do navegador para conectar.");
        } catch {
          toast.error(`Não foi possível abrir popup. Link: ${authUrl}`, { duration: 25000 });
        }
        return;
      }

      if (context?.popup && !context.popup.closed) {
        context.popup.location.href = authUrl;
        return;
      }

      window.open(authUrl, "_blank");
    },
    onError: (err: any, _variables, context) => {
      if (context?.popup && !context.popup.closed) {
        context.popup.close();
      }
      toast.error(err.message || "Erro ao conectar Instagram");
    },
  });

  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      const redirectUri = `${window.location.origin}/instagram-callback`;
      const { data, error } = await supabase.functions.invoke("instagram-oauth", {
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

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-oauth", {
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
      const { data: messages, error } = await supabase
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
