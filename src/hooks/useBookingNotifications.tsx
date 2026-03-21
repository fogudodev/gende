import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { format } from "date-fns";

interface UseBookingNotificationsOptions {
  professionalId?: string | null;
  enabled?: boolean;
}

/**
 * Listens for new bookings via realtime and shows toast + browser push notifications
 * to the professional/receptionist when a client books via the public page.
 */
export const useBookingNotifications = ({
  professionalId,
  enabled = true,
}: UseBookingNotificationsOptions) => {
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
    if (!enabled || !professionalId) return;

    const channel = supabase
      .channel(`booking-notify-${professionalId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `professional_id=eq.${professionalId}`,
        },
        (payload: any) => {
          const booking = payload.new;
          if (!booking) return;

          const clientName = booking.client_name || "Cliente";
          const startTime = booking.start_time
            ? format(new Date(booking.start_time), "dd/MM 'às' HH:mm")
            : "";

          const title = "📅 Novo Agendamento!";
          const body = `${clientName} agendou para ${startTime}`;

          // Play sound
          playNotificationSound();

          // In-app toast
          toast.info(body, {
            description: title,
            duration: 8000,
          });

          // Browser notification (when tab is not focused)
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            try {
              new Notification(title, {
                body,
                icon: "/favicon.ico",
                tag: `booking-${booking.id}`,
              });
            } catch {
              // Browser may block notifications in some contexts
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId, enabled, playNotificationSound]);
};
