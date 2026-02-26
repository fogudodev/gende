import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { format, startOfDay, endOfDay } from "date-fns";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};

export const useDeleteBooking = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};
