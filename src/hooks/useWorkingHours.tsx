import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";

export type WorkingHour = {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const getDayName = (day: number) => DAY_NAMES[day] || "";

export const useWorkingHours = () => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["working-hours", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("working_hours")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return data as WorkingHour[];
    },
    enabled: !!professional?.id,
  });
};

export const useUpsertWorkingHours = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async (hours: Omit<WorkingHour, "id" | "professional_id">[]) => {
      // Delete existing and re-insert
      await supabase
        .from("working_hours")
        .delete()
        .eq("professional_id", professional!.id);

      if (hours.length > 0) {
        const { error } = await supabase
          .from("working_hours")
          .insert(hours.map((h) => ({ ...h, professional_id: professional!.id })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["working-hours"] }),
  });
};
