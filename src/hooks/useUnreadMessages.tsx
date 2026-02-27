import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Hook that tracks the number of unread chat messages for the current user,
 * separated by chat type (payment / support).
 */
export const useUnreadMessages = () => {
  const { data: professional } = useProfessional();
  const qc = useQueryClient();

  const getLastSeen = (chatType: string) => {
    try {
      return localStorage.getItem(`chat_last_seen_${chatType}_${professional?.id}`) || "1970-01-01T00:00:00Z";
    } catch {
      return "1970-01-01T00:00:00Z";
    }
  };

  const { data = { payment: 0, support: 0 } } = useQuery({
    queryKey: ["unread-messages", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return { payment: 0, support: 0 };

      const paymentLastSeen = getLastSeen("payment");
      const supportLastSeen = getLastSeen("support");

      const [{ count: paymentCount }, { count: supportCount }] = await Promise.all([
        supabase
          .from("chat_messages" as any)
          .select("*", { count: "exact", head: true })
          .eq("professional_id", professional.id)
          .eq("chat_type", "payment")
          .neq("sender_role", "user")
          .gt("created_at", paymentLastSeen),
        supabase
          .from("chat_messages" as any)
          .select("*", { count: "exact", head: true })
          .eq("professional_id", professional.id)
          .eq("chat_type", "support")
          .neq("sender_role", "user")
          .gt("created_at", supportLastSeen),
      ]);

      return {
        payment: paymentCount || 0,
        support: supportCount || 0,
      };
    },
    enabled: !!professional?.id,
    refetchInterval: 10000,
  });

  const unreadPayment = data.payment;
  const unreadSupport = data.support;
  const unreadCount = unreadPayment + unreadSupport;

  const markAsSeen = (chatType: "payment" | "support") => {
    if (!professional?.id) return;
    localStorage.setItem(`chat_last_seen_${chatType}_${professional.id}`, new Date().toISOString());
    qc.invalidateQueries({ queryKey: ["unread-messages", professional.id] });
  };

  useEffect(() => {
    if (!professional?.id) return;
    const channel = supabase
      .channel("unread-counter")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `professional_id=eq.${professional.id}`,
        },
        (payload: any) => {
          if (payload.new?.sender_role !== "user") {
            qc.invalidateQueries({ queryKey: ["unread-messages", professional.id] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [professional?.id, qc]);

  return { unreadCount, unreadPayment, unreadSupport, markAsSeen };
};
