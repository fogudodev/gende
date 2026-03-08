import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

const BUFFER_MINUTES = 10;

export const useBookings = (date?: Date) => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["bookings", professional?.id, date ? format(date, "yyyy-MM-dd") : "all"],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("*, services(name, category), clients(name, phone, email)")
        .eq("professional_id", professional!.id)
        .order("start_time", { ascending: true });

      if (date) {
        query = query
          .gte("start_time", startOfDay(date).toISOString())
          .lte("start_time", endOfDay(date).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useBookingsWeek = (date: Date) => {
  const { data: professional } = useProfessional();
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ["bookings-week", professional?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(name, category), clients(name, phone, email)")
        .eq("professional_id", professional!.id)
        .gte("start_time", startOfDay(weekStart).toISOString())
        .lte("start_time", endOfDay(weekEnd).toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useBookingsMonth = (date: Date) => {
  const { data: professional } = useProfessional();
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return useQuery({
    queryKey: ["bookings-month", professional?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(name, category), clients(name, phone, email)")
        .eq("professional_id", professional!.id)
        .gte("start_time", startOfDay(monthStart).toISOString())
        .lte("start_time", endOfDay(monthEnd).toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

/**
 * Generate available time slots for a given date considering existing bookings.
 * Each booking blocks: start_time to end_time + BUFFER_MINUTES
 */
export const getAvailableSlots = (
  existingBookings: any[],
  serviceDurationMinutes: number,
  startHour = 7,
  endHour = 21,
  intervalMinutes = 10,
  blockedTimes: any[] = [],
  slotDate?: Date
) => {
  const slots: string[] = [];

  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      if (h === endHour && m > 0) break;
      const slotStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push(slotStr);
    }
  }

  // Filter out slots that conflict with existing bookings (+ buffer)
  const activeBookings = (existingBookings || []).filter(b => b.status !== "cancelled");

  return slots.filter(slot => {
    const [sh, sm] = slot.split(":").map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = slotStartMin + serviceDurationMinutes;

    // Check against bookings
    for (const booking of activeBookings) {
      const bStart = new Date(booking.start_time);
      const bEnd = new Date(booking.end_time);
      const bStartMin = bStart.getHours() * 60 + bStart.getMinutes();
      const bEndMin = bEnd.getHours() * 60 + bEnd.getMinutes() + BUFFER_MINUTES;

      if (slotStartMin < bEndMin && slotEndMin > bStartMin) {
        return false;
      }
    }

    // Check against blocked times (ausências)
    for (const bt of blockedTimes || []) {
      const btStart = new Date(bt.start_time);
      const btEnd = new Date(bt.end_time);

      // If slotDate is provided, check if blocked time overlaps this date
      if (slotDate) {
        const dayStart = new Date(slotDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(slotDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Skip if blocked time doesn't overlap this day at all
        if (btEnd <= dayStart || btStart >= dayEnd) continue;

        // Full-day block: if blocked period spans the entire day
        if (btStart <= dayStart && btEnd >= dayEnd) return false;
      }

      const btStartMin = btStart.getHours() * 60 + btStart.getMinutes();
      const btEndMin = btEnd.getHours() * 60 + btEnd.getMinutes();

      // For multi-day blocks that start before this day, block from 00:00
      const effectiveStartMin = slotDate && btStart < slotDate ? 0 : btStartMin;
      // For multi-day blocks that end after this day, block until 24:00
      const effectiveEndMin = slotDate && btEnd > new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate(), 23, 59) ? 24 * 60 : btEndMin;

      if (slotStartMin < effectiveEndMin && slotEndMin > effectiveStartMin) {
        return false;
      }
    }

    return true;
  });
};

export const useCreateBooking = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async (booking: Omit<TablesInsert<"bookings">, "professional_id">) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...booking, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-week"] });
      qc.invalidateQueries({ queryKey: ["bookings-month"] });

      // Trigger booking_created WhatsApp automation (fire and forget)
      if (data && professional) {
        import("./useWhatsApp").then(({ triggerWhatsAppAutomation }) => {
          triggerWhatsAppAutomation(professional.id, data.id, "booking_created");
        });

        // Sync to Google Calendar (fire and forget)
        supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "create_event",
            professional_id: professional.id,
            booking_id: data.id,
            booking: {
              client_name: data.client_name,
              client_phone: data.client_phone,
              start_time: data.start_time,
              end_time: data.end_time,
              notes: data.notes,
              service_name: "",
            },
          },
        }).catch(() => { /* silent fail */ });
      }
    },
  });
};

export const useUpdateBooking = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"bookings"> & { id: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-week"] });
      qc.invalidateQueries({ queryKey: ["bookings-month"] });

      // If booking was cancelled, trigger waitlist processing
      if (data && data.status === "cancelled") {
        supabase.functions.invoke("waitlist-process", {
          body: {
            action: "process-cancellation",
            professionalId: data.professional_id,
            bookingId: data.id,
            serviceId: data.service_id,
            startTime: data.start_time,
            endTime: data.end_time,
            employeeId: data.employee_id,
          },
        }).catch((err) => { console.error("Waitlist process error:", err); });

        // Delete from Google Calendar if linked
        if ((data as any).google_calendar_event_id) {
          supabase.functions.invoke("google-calendar-sync", {
            body: {
              action: "delete_event",
              professional_id: data.professional_id,
              booking_id: data.id,
              event_id: (data as any).google_calendar_event_id,
            },
          }).catch(() => { /* silent fail */ });
        }
      }
    },
  });
};

export const useDeleteBooking = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Before deleting, fetch the booking to check for Google Calendar event
      const { data: booking } = await supabase.from("bookings").select("professional_id, google_calendar_event_id").eq("id", id).single();

      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;

      // Delete from Google Calendar if linked
      if (booking && (booking as any).google_calendar_event_id) {
        supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "delete_event",
            professional_id: booking.professional_id,
            booking_id: id,
            event_id: (booking as any).google_calendar_event_id,
          },
        }).catch(() => { /* silent fail */ });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-week"] });
      qc.invalidateQueries({ queryKey: ["bookings-month"] });
    },
  });
};
