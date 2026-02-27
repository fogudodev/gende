import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface UseChatNotificationsOptions {
  /** The role of the current viewer: "user" means professional, "admin" means admin/support */
  viewerRole: "user" | "admin";
  /** For user: their professional_id. For admin: the currently selected professional_id (or null to listen to all) */
  professionalId?: string | null;
  /** Filter by chat_type: "payment" | "support" */
  chatType: "payment" | "support";
  /** Whether notifications are enabled */
  enabled?: boolean;
}

/**
 * Hook that listens to realtime chat_messages inserts and shows
 * toast + browser notifications when a message arrives from the other side.
 */
export const useChatNotifications = ({
  viewerRole,
  professionalId,
  chatType,
  enabled = true,
}: UseChatNotificationsOptions) => {
  const permissionRequested = useRef(false);
  const { play: playNotificationSound } = useNotificationSound();

  // Request browser notification permission once
  useEffect(() => {
    if (permissionRequested.current) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
      permissionRequested.current = true;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Build a unique channel name
    const channelName = `chat-notify-${chatType}-${viewerRole}-${professionalId || "all"}`;

    // For user: filter by their professional_id
    // For admin: listen to all or a specific professional_id
    const filter = professionalId
      ? `professional_id=eq.${professionalId}`
      : undefined;

    const channelConfig: any = {
      event: "INSERT",
      schema: "public",
      table: "chat_messages",
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, (payload: any) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        // Only notify for the correct chat_type
        if (newMsg.chat_type !== chatType) return;

        // Don't notify for messages sent by the current viewer
        const isFromOtherSide =
          viewerRole === "user"
            ? newMsg.sender_role !== "user"
            : newMsg.sender_role === "user";

        if (!isFromOtherSide) return;

        const senderName = newMsg.sender_name || (viewerRole === "user" ? "Suporte" : "Usuário");
        const msgPreview = newMsg.message || "📎 Arquivo enviado";
        const chatLabel = chatType === "payment" ? "Pagamento" : "Suporte";

        // Play notification sound
        playNotificationSound();

        // Toast notification (always visible in-app)
        toast.info(`${senderName}: ${msgPreview}`, {
          description: `Chat de ${chatLabel}`,
          duration: 5000,
        });

        // Browser notification (if page is not focused)
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          document.hidden
        ) {
          try {
            new Notification(`Chat de ${chatLabel}`, {
              body: `${senderName}: ${msgPreview}`,
              icon: "/favicon.ico",
              tag: `chat-${chatType}-${newMsg.id}`,
            });
          } catch {
            // Browser may block notifications in some contexts
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerRole, professionalId, chatType, enabled]);
};
