import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UnreadMessage {
  id: string;
  message: string | null;
  sender_name: string | null;
  chat_type: string;
  created_at: string;
  attachment_url: string | null;
}

/**
 * Hook that tracks unread chat messages separated by type,
 * and provides the actual recent unread messages for display.
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

  const { data = { payment: 0, support: 0, recentMessages: [] as UnreadMessage[] } } = useQuery({
    queryKey: ["unread-messages", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return { payment: 0, support: 0, recentMessages: [] };

      const paymentLastSeen = getLastSeen("payment");
      const supportLastSeen = getLastSeen("support");

      const [{ count: paymentCount }, { count: supportCount }, { data: recentPayment }, { data: recentSupport }] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", professional.id)
          .eq("chat_type", "payment")
          .neq("sender_role", "user")
          .gt("created_at", paymentLastSeen),
        supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", professional.id)
          .eq("chat_type", "support")
          .neq("sender_role", "user")
          .gt("created_at", supportLastSeen),
        supabase
          .from("chat_messages")
          .select("id, message, sender_name, chat_type, created_at, attachment_url")
          .eq("professional_id", professional.id)
          .eq("chat_type", "payment")
          .neq("sender_role", "user")
          .gt("created_at", paymentLastSeen)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("chat_messages")
          .select("id, message, sender_name, chat_type, created_at, attachment_url")
          .eq("professional_id", professional.id)
          .eq("chat_type", "support")
          .neq("sender_role", "user")
          .gt("created_at", supportLastSeen)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const allRecent = [...((recentPayment as any[]) || []), ...((recentSupport as any[]) || [])]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10) as UnreadMessage[];

      return {
        payment: paymentCount || 0,
        support: supportCount || 0,
        recentMessages: allRecent,
      };
    },
    enabled: !!professional?.id,
    refetchInterval: 10000,
  });

  const unreadPayment = data.payment;
  const unreadSupport = data.support;
  const unreadCount = unreadPayment + unreadSupport;
  const recentMessages = data.recentMessages;

  const markAsSeen = (chatType: "payment" | "support") => {
    if (!professional?.id) return;
    localStorage.setItem(`chat_last_seen_${chatType}_${professional.id}`, new Date().toISOString());
    qc.invalidateQueries({ queryKey: ["unread-messages", professional.id] });
  };

  const markAllAsSeen = () => {
    if (!professional?.id) return;
    const now = new Date().toISOString();
    localStorage.setItem(`chat_last_seen_payment_${professional.id}`, now);
    localStorage.setItem(`chat_last_seen_support_${professional.id}`, now);
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
    return () => { api.removeChannel(channel); };
  }, [professional?.id, qc]);

  return { unreadCount, unreadPayment, unreadSupport, recentMessages, markAsSeen, markAllAsSeen };
};
