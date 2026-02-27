import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Hook that tracks the number of unread chat messages for the current user.
 * It counts messages from the "other side" (support/admin) that arrived
 * after the user's last visit to each chat.
 */
export const useUnreadMessages = () => {
  const { data: professional } = useProfessional();
  const qc = useQueryClient();

  // Track last seen timestamps per chat type in localStorage
  const getLastSeen = (chatType: string) => {
    try {
      return localStorage.getItem(`chat_last_seen_${chatType}_${professional?.id}`) || "1970-01-01T00:00:00Z";
    } catch {
      return "1970-01-01T00:00:00Z";
    }
  };

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return 0;

      const paymentLastSeen = getLastSeen("payment");
      const supportLastSeen = getLastSeen("support");

      // Count unread payment messages (from support/admin)
      const { count: paymentCount } = await supabase
        .from("chat_messages" as any)
        .select("*", { count: "exact", head: true })
        .eq("professional_id", professional.id)
        .eq("chat_type", "payment")
        .neq("sender_role", "user")
        .gt("created_at", paymentLastSeen);

      // Count unread support messages (from support/admin)
      const { count: supportCount } = await supabase
        .from("chat_messages" as any)
        .select("*", { count: "exact", head: true })
        .eq("professional_id", professional.id)
        .eq("chat_type", "support")
        .neq("sender_role", "user")
        .gt("created_at", supportLastSeen);

      return (paymentCount || 0) + (supportCount || 0);
    },
    enabled: !!professional?.id,
    refetchInterval: 10000,
  });

  // Mark a chat type as seen
  const markAsSeen = (chatType: "payment" | "support") => {
    if (!professional?.id) return;
    localStorage.setItem(`chat_last_seen_${chatType}_${professional.id}`, new Date().toISOString());
    qc.invalidateQueries({ queryKey: ["unread-messages", professional.id] });
  };

  // Listen for realtime inserts to refresh count
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

  return { unreadCount, markAsSeen };
};
